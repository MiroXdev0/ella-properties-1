import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ipSchema = z.string().ip();
const ruleSchema = z.object({
  id: z.string().min(1).max(32),
  configuration: z.object({ target: z.string(), value: z.string() }),
  mode: z.string(),
  notes: z.string().nullable().optional(),
});

type CloudflareRule = z.infer<typeof ruleSchema>;

class CloudflareApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class CloudflareRestrictionCleanupError extends Error {
  constructor(
    readonly cloudflareRuleId: string,
    options?: ErrorOptions,
  ) {
    super("Cloudflare restriction verification failed and cleanup is pending", options);
  }
}

export function cloudflareFailureMessage(error: unknown): string {
  if (error instanceof CloudflareRestrictionCleanupError) {
    return "Cloudflare rule verification failed; removal is pending automatic retry";
  }
  if (error instanceof CloudflareApiError) {
    if (error.status === 429) return "Cloudflare rate-limited the request; retry in a moment";
    return `Cloudflare rejected the request (HTTP ${error.status})`;
  }
  return "Cloudflare could not verify the enforcement operation";
}

function getCloudflareConfig() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId || !/^[a-f0-9]{32}$/i.test(zoneId)) {
    throw new Error("Cloudflare restriction credentials are not configured");
  }
  return {
    token,
    zoneId,
    baseUrl: `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/firewall/access_rules/rules`,
  };
}

async function callCloudflare(
  url: string,
  method: "GET" | "POST" | "DELETE",
  body?: unknown,
): Promise<{ response: Response; payload: unknown }> {
  const { token } = getCloudflareConfig();
  const response = await fetch(url, {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Cloudflare returned an invalid response");
  }
  return { response, payload };
}

function parseCloudflarePayload(payload: unknown, response: Response): CloudflareRule {
  const envelope = z
    .object({
      success: z.literal(true),
      result: ruleSchema,
    })
    .safeParse(payload);
  if (!response.ok || !envelope.success) {
    throw new CloudflareApiError(
      "Cloudflare rejected the IP restriction operation",
      response.status,
    );
  }
  return envelope.data.result;
}

function ipTarget(ipAddress: string): "ip" | "ip6" {
  return ipAddress.includes(":") ? "ip6" : "ip";
}

function canonicalIp(ipAddress: string): string | null {
  if (!ipSchema.safeParse(ipAddress).success) return null;
  if (!ipAddress.includes(":")) {
    return ipAddress
      .split(".")
      .map((part) => String(Number(part)))
      .join(".");
  }
  try {
    return new URL(`http://[${ipAddress}]/`).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    return null;
  }
}

export function assertRestrictionIsSafe(
  targetIp: string,
  administratorIp: string | null,
  visitorIsTrusted: boolean,
): void {
  const target = canonicalIp(targetIp);
  const currentAdmin = administratorIp ? canonicalIp(administratorIp) : null;
  if (!target || !currentAdmin) {
    throw new Response("Unable to verify the IP restriction safety checks", { status: 409 });
  }

  const trusted = (process.env.HONEYPOT_TRUSTED_IPS ?? "")
    .split(",")
    .map((address) => canonicalIp(address.trim()))
    .filter((address): address is string => address !== null);
  if (visitorIsTrusted || target === currentAdmin || trusted.includes(target)) {
    throw new Response("This address is protected from restrictions", { status: 409 });
  }
}

async function getRule(ruleId: string): Promise<CloudflareRule | null> {
  const { baseUrl } = getCloudflareConfig();
  const { response, payload } = await callCloudflare(
    `${baseUrl}/${encodeURIComponent(ruleId)}`,
    "GET",
  );
  if (response.status === 404) return null;
  const rule = parseCloudflarePayload(payload, response);
  if (rule.id !== ruleId) throw new Error("Cloudflare returned a different rule ID");
  return rule;
}

function assertOwnedRule(rule: CloudflareRule, restrictionId: string, ipAddress: string): void {
  const expectedIp = canonicalIp(ipAddress);
  const actualIp = canonicalIp(rule.configuration.value);
  if (
    rule.mode !== "block" ||
    rule.configuration.target !== ipTarget(ipAddress) ||
    !expectedIp ||
    actualIp !== expectedIp ||
    rule.notes !== `Ella honeypot restriction ${restrictionId}`
  ) {
    throw new Error("Cloudflare rule verification failed");
  }
}

export async function verifyCloudflareRestriction(
  ipAddress: string,
  restrictionId: string,
  cloudflareRuleId: string,
  zoneHostname: string,
): Promise<{ verified: boolean; reason: "verified" | "missing" | "mismatch" }> {
  await verifyCloudflareZoneHostname(zoneHostname);
  const rule = await getRule(cloudflareRuleId);
  if (!rule) return { verified: false, reason: "missing" };
  try {
    assertOwnedRule(rule, restrictionId, ipAddress);
  } catch {
    return { verified: false, reason: "mismatch" };
  }
  return { verified: true, reason: "verified" };
}

export async function createCloudflareRestriction(
  ipAddress: string,
  restrictionId: string,
): Promise<string> {
  if (!ipSchema.safeParse(ipAddress).success) throw new Error("Invalid IP address");
  const { baseUrl } = getCloudflareConfig();
  const notes = `Ella honeypot restriction ${restrictionId}`;
  const { response, payload } = await callCloudflare(baseUrl, "POST", {
    mode: "block",
    configuration: { target: ipTarget(ipAddress), value: canonicalIp(ipAddress) },
    notes,
  });
  const created = parseCloudflarePayload(payload, response);
  try {
    assertOwnedRule(created, restrictionId, ipAddress);
    const verified = await getRule(created.id);
    if (!verified) throw new Error("Cloudflare did not retain the created IP restriction");
    assertOwnedRule(verified, restrictionId, ipAddress);
    return verified.id;
  } catch (verificationError) {
    const isOwnedRule =
      created.mode === "block" &&
      created.configuration.target === ipTarget(ipAddress) &&
      canonicalIp(created.configuration.value) === canonicalIp(ipAddress) &&
      created.notes === notes;
    if (!isOwnedRule) {
      throw new Error("Cloudflare returned an unrecognized IP restriction", {
        cause: verificationError,
      });
    }

    try {
      const { response: deleteResponse, payload: deletePayload } = await callCloudflare(
        `${baseUrl}/${encodeURIComponent(created.id)}`,
        "DELETE",
      );
      const deleted = z
        .object({ success: z.literal(true), result: z.object({ id: z.string() }) })
        .safeParse(deletePayload);
      if (
        !deleteResponse.ok ||
        !deleted.success ||
        deleted.data.result.id !== created.id ||
        (await getRule(created.id))
      ) {
        throw new Error("Cloudflare rollback could not be verified");
      }
    } catch (cleanupError) {
      console.error("[honeypot] Unverified Cloudflare restriction cleanup failed", cleanupError);
      throw new CloudflareRestrictionCleanupError(created.id, {
        cause: verificationError,
      });
    }

    throw new Error("Cloudflare did not verify the created IP restriction", {
      cause: verificationError,
    });
  }
}

export function createHoneypotRestrictionGuard(
  isRestricted: (ipAddress: string) => Promise<boolean>,
): (request: Request) => Promise<Response | null> {
  return async (request) => {
    const zoneHostname = process.env.CLOUDFLARE_ZONE_HOSTNAME?.trim().toLowerCase();
    const requestHostname = new URL(request.url).hostname.toLowerCase().replace(/\.$/, "");
    const zoneHostnameIsValid =
      !!zoneHostname &&
      zoneHostname.length <= 253 &&
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(zoneHostname) &&
      zoneHostname !== "workers.dev" &&
      !zoneHostname.endsWith(".workers.dev") &&
      zoneHostname !== "pages.dev" &&
      !zoneHostname.endsWith(".pages.dev");
    if (
      zoneHostnameIsValid &&
      (requestHostname === zoneHostname || requestHostname.endsWith(`.${zoneHostname}`))
    ) {
      return null;
    }

    const headerIp = request.headers.get("cf-connecting-ip");
    const ipAddress = headerIp ? canonicalIp(headerIp) : null;
    if (!ipAddress) return null;

    try {
      if (!(await isRestricted(ipAddress))) return null;
    } catch (error) {
      console.error("[honeypot] Request enforcement lookup failed", error);
      return new Response("Temporarily unable to verify access", {
        status: 503,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    return new Response("Access restricted", {
      status: 403,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  };
}

export function restrictionRequiresWorkerBlock(status: string, cloudflareRuleId: string | null) {
  return (
    status === "active" ||
    status === "pending_removal" ||
    (status === "pending" && cloudflareRuleId !== null)
  );
}

export const enforceHoneypotRestriction = createHoneypotRestrictionGuard(async (ipAddress) => {
  const { data, error } = await supabaseAdmin
    .from("honeypot_ip_restrictions")
    .select("id, status, cloudflare_rule_id")
    .eq("ip_address", ipAddress)
    .in("status", ["pending", "active", "pending_removal"]);
  if (error) throw new Error("Unable to verify active IP restrictions");
  return (data ?? []).some((restriction) =>
    restrictionRequiresWorkerBlock(restriction.status, restriction.cloudflare_rule_id),
  );
});

export async function verifyCloudflareZoneHostname(hostname: string): Promise<void> {
  const { zoneId } = getCloudflareConfig();
  const url = `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}`;
  const { response, payload } = await callCloudflare(url, "GET");
  const zone = z
    .object({
      success: z.literal(true),
      result: z.object({ name: z.string(), status: z.string() }),
    })
    .safeParse(payload);
  if (!response.ok || !zone.success || zone.data.result.status !== "active") {
    throw new Error("Cloudflare zone could not be verified");
  }
  if (zone.data.result.name.toLowerCase() !== hostname.toLowerCase()) {
    throw new Error("Configured Cloudflare zone hostname does not match the zone ID");
  }
}

export async function removeCloudflareRestriction(
  ipAddress: string,
  restrictionId: string,
  cloudflareRuleId: string,
): Promise<void> {
  if (!ipSchema.safeParse(ipAddress).success) throw new Error("Invalid IP address");
  const rule = await getRule(cloudflareRuleId);
  if (!rule) return;
  assertOwnedRule(rule, restrictionId, ipAddress);

  const { baseUrl } = getCloudflareConfig();
  const { response, payload } = await callCloudflare(
    `${baseUrl}/${encodeURIComponent(cloudflareRuleId)}`,
    "DELETE",
  );
  const deleted = z
    .object({ success: z.literal(true), result: z.object({ id: z.string() }) })
    .safeParse(payload);
  if (!response.ok || !deleted.success || deleted.data.result.id !== cloudflareRuleId) {
    throw new CloudflareApiError("Cloudflare rejected the IP restriction removal", response.status);
  }
  if (await getRule(cloudflareRuleId)) {
    throw new Error("Cloudflare still reports the IP restriction as active");
  }
}

export async function expireCloudflareRestrictions(): Promise<void> {
  const now = new Date().toISOString();
  const { data: expired, error: expiredError } = await supabaseAdmin
    .from("honeypot_ip_restrictions")
    .select("id, visitor_id, ip_address, cloudflare_rule_id, expires_at, status")
    .eq("status", "active")
    .not("expires_at", "is", null)
    .lte("expires_at", now)
    .order("expires_at", { ascending: true })
    .limit(50);
  if (expiredError) throw new Error("Unable to load expired honeypot restrictions");

  const { data: pending, error: pendingError } = await supabaseAdmin
    .from("honeypot_ip_restrictions")
    .select("id, visitor_id, ip_address, cloudflare_rule_id, expires_at, status")
    .in("status", ["pending", "pending_removal"])
    .not("cloudflare_rule_id", "is", null)
    .order("updated_at", { ascending: true })
    .limit(50);
  if (pendingError) throw new Error("Unable to load pending honeypot restriction removals");

  const restrictions = new Map(
    [...(expired ?? []), ...(pending ?? [])].map((restriction) => [restriction.id, restriction]),
  );

  for (const restriction of restrictions.values()) {
    const isExpired = restriction.expires_at !== null && restriction.expires_at <= now;
    if (restriction.status === "active" || restriction.status === "pending") {
      const { error } = await supabaseAdmin
        .from("honeypot_ip_restrictions")
        .update({ status: "pending_removal", updated_at: now })
        .eq("id", restriction.id)
        .eq("status", restriction.status);
      if (error) {
        console.error("[honeypot] Unable to prepare a restriction for removal");
        continue;
      }
    }

    try {
      if (restriction.ip_address && restriction.cloudflare_rule_id) {
        await removeCloudflareRestriction(
          restriction.ip_address,
          restriction.id,
          restriction.cloudflare_rule_id,
        );
      } else {
        throw new Error("Restriction is missing its Cloudflare rule information");
      }
    } catch (error) {
      console.error("[honeypot] Cloudflare restriction removal failed; it will be retried", error);
      continue;
    }

    const nextStatus =
      restriction.status === "pending" ? "failed" : isExpired ? "expired" : "unbanned";
    const { error: updateError } = await supabaseAdmin
      .from("honeypot_ip_restrictions")
      .update({
        status: nextStatus,
        released_at: now,
        updated_at: now,
      })
      .eq("id", restriction.id)
      .eq("status", "pending_removal");
    if (updateError) {
      console.error("[honeypot] Cloudflare restriction removed but status update failed");
      continue;
    }

    if (restriction.visitor_id) {
      const { error: eventError } = await supabaseAdmin
        .from("honeypot_events")
        .update({ status: "confirmed_suspicious" })
        .eq("visitor_id", restriction.visitor_id)
        .eq("status", "restricted");
      if (eventError)
        console.error("[honeypot] Unable to refresh event statuses after unrestriction");
    }

    const { error: auditError } = await supabaseAdmin.from("honeypot_admin_audit").insert({
      visitor_id: restriction.visitor_id,
      restriction_id: restriction.id,
      administrator_id: null,
      action:
        restriction.status === "pending"
          ? "restriction_failed"
          : isExpired
            ? "restriction_expired"
            : "restriction_removed",
      outcome: "success",
      details: {
        automated: true,
        cloudflare_rule_id: restriction.cloudflare_rule_id,
        orphaned_pending_rule: restriction.status === "pending",
      },
    });
    if (auditError) console.error("[honeypot] Unable to record restriction expiration audit");
  }
}
