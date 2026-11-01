import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ipSchema = z.string().ip();
const ruleSchema = z.object({
  id: z.string().min(1),
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

function getCloudflareConfig() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) {
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
  return parseCloudflarePayload(payload, response);
}

function assertOwnedRule(rule: CloudflareRule, restrictionId: string, ipAddress: string): void {
  if (
    rule.mode !== "block" ||
    rule.configuration.target !== ipTarget(ipAddress) ||
    rule.configuration.value.toLowerCase() !== ipAddress.toLowerCase() ||
    rule.notes !== `Ella honeypot restriction ${restrictionId}`
  ) {
    throw new Error("Cloudflare rule verification failed");
  }
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
    configuration: { target: ipTarget(ipAddress), value: ipAddress },
    notes,
  });
  const created = parseCloudflarePayload(payload, response);
  try {
    assertOwnedRule(created, restrictionId, ipAddress);
    const verified = await getRule(created.id);
    if (!verified) throw new Error("Cloudflare did not retain the created IP restriction");
    assertOwnedRule(verified, restrictionId, ipAddress);
    return verified.id;
  } catch {
    if (
      created.mode === "block" &&
      created.configuration.target === ipTarget(ipAddress) &&
      created.configuration.value.toLowerCase() === ipAddress.toLowerCase() &&
      created.notes === notes
    ) {
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
      } catch {
        console.error("[honeypot] Unverified Cloudflare restriction may require manual cleanup");
      }
    }
    throw new Error("Cloudflare did not verify the created IP restriction");
  }
}

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
    .eq("status", "pending_removal")
    .order("updated_at", { ascending: true })
    .limit(50);
  if (pendingError) throw new Error("Unable to load pending honeypot restriction removals");

  const restrictions = new Map(
    [...(expired ?? []), ...(pending ?? [])].map((restriction) => [restriction.id, restriction]),
  );

  for (const restriction of restrictions.values()) {
    const isExpired = restriction.expires_at !== null && restriction.expires_at <= now;
    if (restriction.status === "active") {
      const { error } = await supabaseAdmin
        .from("honeypot_ip_restrictions")
        .update({ status: "pending_removal", updated_at: now })
        .eq("id", restriction.id)
        .eq("status", "active");
      if (error) {
        console.error("[honeypot] Unable to prepare an expired restriction for removal");
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
    } catch {
      console.error("[honeypot] Cloudflare restriction removal failed; it will be retried");
      continue;
    }

    const nextStatus = isExpired ? "expired" : "unbanned";
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
      action: isExpired ? "restriction_expired" : "restriction_removed",
      outcome: "success",
      details: { automated: true, cloudflare_rule_id: restriction.cloudflare_rule_id },
    });
    if (auditError) console.error("[honeypot] Unable to record restriction expiration audit");
  }
}
