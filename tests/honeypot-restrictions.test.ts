import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  CloudflareRestrictionCleanupError,
  assertRestrictionIsSafe,
  cloudflareFailureMessage,
  createCloudflareRestriction,
  createHoneypotRestrictionGuard,
  expireHoneypotRestrictions,
  removeCloudflareRestriction,
  restrictionRequiresWorkerBlock,
  verifyCloudflareRestriction,
} from "../src/lib/honeypot/cloudflare.server";
import {
  getHoneypotRestrictionExpiry,
  resolveHoneypotEnforcementMode,
} from "../src/lib/honeypot/restriction-policy";

const zoneId = "a".repeat(32);
const ruleId = "b".repeat(32);
const originalFetch = globalThis.fetch;
const originalEnvironment = {
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ZONE_ID: process.env.CLOUDFLARE_ZONE_ID,
  CLOUDFLARE_ZONE_HOSTNAME: process.env.CLOUDFLARE_ZONE_HOSTNAME,
  HONEYPOT_ENFORCEMENT_MODE: process.env.HONEYPOT_ENFORCEMENT_MODE,
  HONEYPOT_TRUSTED_IPS: process.env.HONEYPOT_TRUSTED_IPS,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

function rule(overrides: Record<string, unknown> = {}) {
  return {
    id: ruleId,
    configuration: { target: "ip", value: "203.0.113.10" },
    mode: "block",
    notes: "Ella honeypot restriction restriction-123",
    ...overrides,
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function cloudflareSuccess(result: unknown) {
  return jsonResponse({ success: true, result });
}

function setCloudflareFetch(handler: typeof fetch) {
  globalThis.fetch = handler;
}

beforeEach(() => {
  process.env.CLOUDFLARE_API_TOKEN = "test-token";
  process.env.CLOUDFLARE_ZONE_ID = zoneId;
  process.env.CLOUDFLARE_ZONE_HOSTNAME = "example.com";
  process.env.HONEYPOT_ENFORCEMENT_MODE = "cloudflare_zone";
  process.env.HONEYPOT_TRUSTED_IPS = "";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("honeypot IP restriction policy", () => {
  it("calculates temporary and permanent expiration correctly", () => {
    const createdAt = new Date("2026-11-01T12:00:00.000Z");
    expect(getHoneypotRestrictionExpiry("1_hour", createdAt)).toBe("2026-11-01T13:00:00.000Z");
    expect(getHoneypotRestrictionExpiry("24_hours", createdAt)).toBe("2026-11-02T12:00:00.000Z");
    expect(getHoneypotRestrictionExpiry("7_days", createdAt)).toBe("2026-11-08T12:00:00.000Z");
    expect(getHoneypotRestrictionExpiry("permanent", createdAt)).toBeNull();
  });

  it("uses the documented enforcement mode and rejects unknown modes", () => {
    expect(resolveHoneypotEnforcementMode(undefined)).toBe("cloudflare_zone");
    expect(resolveHoneypotEnforcementMode("worker_only")).toBe("worker_only");
    expect(() => resolveHoneypotEnforcementMode("workers.dev")).toThrow(
      "HONEYPOT_ENFORCEMENT_MODE must be cloudflare_zone or worker_only",
    );
  });

  it("blocks active and pending removal rows and pending rows with an external rule", () => {
    expect(restrictionRequiresWorkerBlock("active", ruleId)).toBe(true);
    expect(restrictionRequiresWorkerBlock("active", null)).toBe(true);
    expect(restrictionRequiresWorkerBlock("pending_removal", ruleId)).toBe(true);
    expect(restrictionRequiresWorkerBlock("pending", ruleId)).toBe(true);
    expect(restrictionRequiresWorkerBlock("pending", null)).toBe(false);
    expect(restrictionRequiresWorkerBlock("failed", null)).toBe(false);
    expect(restrictionRequiresWorkerBlock("expired", null)).toBe(false);
  });

  it("protects the current administrator IP and configured trusted addresses", () => {
    try {
      assertRestrictionIsSafe("203.0.113.10", "203.0.113.10", false);
      throw new Error("Expected current administrator IP protection");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(409);
    }

    process.env.HONEYPOT_TRUSTED_IPS = "203.0.113.11";
    try {
      assertRestrictionIsSafe("203.0.113.11", "203.0.113.12", false);
      throw new Error("Expected trusted IP protection");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(409);
    }
  });

  it("blocks workers.dev requests using the database-backed Worker guard", async () => {
    const observedIps: string[] = [];
    const guard = createHoneypotRestrictionGuard(async (ip) => {
      observedIps.push(ip);
      return true;
    });

    const response = await guard(
      new Request("https://ella-properties-1.miroxdev2026.workers.dev/", {
        headers: { "cf-connecting-ip": "203.0.113.10" },
      }),
    );
    expect(response?.status).toBe(403);
    expect(observedIps).toEqual(["203.0.113.10"]);
  });

  it("does not query the database for hostnames covered by the configured zone", async () => {
    let lookupCount = 0;
    const guard = createHoneypotRestrictionGuard(async () => {
      lookupCount += 1;
      return true;
    });
    const response = await guard(
      new Request("https://app.example.com/", {
        headers: { "cf-connecting-ip": "203.0.113.10" },
      }),
    );
    expect(response).toBeNull();
    expect(lookupCount).toBe(0);
  });

  it("uses Worker enforcement for custom hostnames when worker_only mode is selected", async () => {
    process.env.HONEYPOT_ENFORCEMENT_MODE = "worker_only";
    let lookupCount = 0;
    const guard = createHoneypotRestrictionGuard(async () => {
      lookupCount += 1;
      return true;
    });
    const response = await guard(
      new Request("https://app.example.com/", {
        headers: { "cf-connecting-ip": "203.0.113.10" },
      }),
    );
    expect(response?.status).toBe(403);
    expect(lookupCount).toBe(1);
  });

  it("fails closed with 503 when it cannot check a restriction", async () => {
    const guard = createHoneypotRestrictionGuard(async () => {
      throw new Error("database unavailable");
    });
    const response = await guard(
      new Request("https://ella-properties-1.miroxdev2026.workers.dev/", {
        headers: { "cf-connecting-ip": "203.0.113.10" },
      }),
    );
    expect(response?.status).toBe(503);
  });
});

describe("Cloudflare IP Access Rules", () => {
  it("creates a block rule and verifies it by reading it back", async () => {
    const requests: Array<{ url: string; method: string; body?: string }> = [];
    setCloudflareFetch(async (input, init) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? "GET", body: init?.body?.toString() });
      if (init?.method === "POST") return cloudflareSuccess(rule());
      return cloudflareSuccess(rule());
    });

    const result = await createCloudflareRestriction("203.0.113.10", "restriction-123");
    expect(result).toBe(ruleId);
    expect(requests.map((request) => request.method)).toEqual(["POST", "GET"]);
    expect(requests[0].url).toContain(`/zones/${zoneId}/firewall/access_rules/rules`);
    expect(JSON.parse(requests[0].body ?? "{}")).toMatchObject({
      mode: "block",
      configuration: { target: "ip", value: "203.0.113.10" },
      notes: "Ella honeypot restriction restriction-123",
    });
  });

  it("expires an expired database restriction after Cloudflare confirms removal", async () => {
    const supabaseUrl = "https://supabase-test.invalid";
    const visitorId = "00000000-0000-4000-8000-000000000001";
    const restrictionId = "00000000-0000-4000-8000-000000000002";
    process.env.SUPABASE_URL = supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";

    let ruleExists = true;
    const restrictionStatuses: string[] = [];
    const auditRecords: Array<Record<string, unknown>> = [];
    const expiringRule = rule({ notes: `Ella honeypot restriction ${restrictionId}` });
    setCloudflareFetch(async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.origin === supabaseUrl) {
        if (url.pathname.endsWith("/honeypot_ip_restrictions") && init?.method === "GET") {
          return url.searchParams.get("status") === "eq.active"
            ? jsonResponse([
                {
                  id: restrictionId,
                  visitor_id: visitorId,
                  ip_address: "203.0.113.10",
                  cloudflare_rule_id: ruleId,
                  expires_at: new Date(Date.now() - 60_000).toISOString(),
                  status: "active",
                },
              ])
            : jsonResponse([]);
        }
        if (url.pathname.endsWith("/honeypot_ip_restrictions") && init?.method === "PATCH") {
          restrictionStatuses.push(
            String((JSON.parse(String(init.body)) as { status: string }).status),
          );
          return new Response(null, { status: 204 });
        }
        if (url.pathname.endsWith("/honeypot_events") && init?.method === "PATCH") {
          return new Response(null, { status: 204 });
        }
        if (url.pathname.endsWith("/honeypot_admin_audit") && init?.method === "POST") {
          auditRecords.push(JSON.parse(String(init.body)) as Record<string, unknown>);
          return new Response(null, { status: 201 });
        }
        throw new Error(`Unexpected Supabase request: ${init?.method} ${url.pathname}`);
      }

      if (init?.method === "DELETE") {
        ruleExists = false;
        return jsonResponse({ success: true, result: { id: ruleId } });
      }
      if (ruleExists) return cloudflareSuccess(expiringRule);
      return jsonResponse({ success: false, errors: [{ code: 1000, message: "Not found" }] }, 404);
    });

    await expireHoneypotRestrictions();
    expect(restrictionStatuses).toEqual(["pending_removal", "expired"]);
    expect(auditRecords).toHaveLength(1);
    expect(auditRecords[0]).toMatchObject({
      action: "restriction_expired",
      outcome: "success",
      restriction_id: restrictionId,
    });
  });

  it("expires worker-only restrictions without calling the Cloudflare API", async () => {
    const supabaseUrl = "https://supabase-test.invalid";
    const visitorId = "00000000-0000-4000-8000-000000000011";
    const restrictionId = "00000000-0000-4000-8000-000000000012";
    process.env.SUPABASE_URL = supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    process.env.HONEYPOT_ENFORCEMENT_MODE = "worker_only";

    const restrictionStatuses: string[] = [];
    const auditRecords: Array<Record<string, unknown>> = [];
    setCloudflareFetch(async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.origin !== supabaseUrl) {
        throw new Error("Worker-only restriction expiry must not call Cloudflare");
      }
      if (url.pathname.endsWith("/honeypot_ip_restrictions") && init?.method === "GET") {
        return url.searchParams.get("status") === "eq.active"
          ? jsonResponse([
              {
                id: restrictionId,
                visitor_id: visitorId,
                ip_address: "203.0.113.12",
                cloudflare_rule_id: null,
                enforcement_mode: "worker_only",
                expires_at: new Date(Date.now() - 60_000).toISOString(),
                status: "active",
              },
            ])
          : jsonResponse([]);
      }
      if (url.pathname.endsWith("/honeypot_ip_restrictions") && init?.method === "PATCH") {
        restrictionStatuses.push(
          String((JSON.parse(String(init.body)) as { status: string }).status),
        );
        return jsonResponse({ id: restrictionId });
      }
      if (url.pathname.endsWith("/honeypot_events") && init?.method === "PATCH") {
        return new Response(null, { status: 204 });
      }
      if (url.pathname.endsWith("/honeypot_admin_audit") && init?.method === "POST") {
        auditRecords.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return new Response(null, { status: 201 });
      }
      throw new Error(`Unexpected Supabase request: ${init?.method} ${url.pathname}`);
    });

    await expireHoneypotRestrictions();
    expect(restrictionStatuses).toEqual(["expired"]);
    expect(auditRecords).toHaveLength(1);
    expect(auditRecords[0]).toMatchObject({
      action: "restriction_expired",
      outcome: "success",
      restriction_id: restrictionId,
      details: { enforcement_mode: "worker_only" },
    });
  });

  it("rejects invalid IP addresses before calling Cloudflare", async () => {
    let requestCount = 0;
    setCloudflareFetch(async () => {
      requestCount += 1;
      return cloudflareSuccess(rule());
    });
    await expect(createCloudflareRestriction("not-an-ip", "restriction-123")).rejects.toThrow(
      "Invalid IP address",
    );
    expect(requestCount).toBe(0);
  });

  it("reports Cloudflare authentication and rate-limit failures", async () => {
    setCloudflareFetch(async () =>
      jsonResponse({ success: false, errors: [{ code: 10000, message: "Unauthorized" }] }, 403),
    );
    try {
      await createCloudflareRestriction("203.0.113.10", "restriction-123");
      throw new Error("Expected authentication failure");
    } catch (error) {
      expect(cloudflareFailureMessage(error)).toBe("Cloudflare rejected the request (HTTP 403)");
    }

    setCloudflareFetch(async () =>
      jsonResponse({ success: false, errors: [{ code: 1015, message: "Rate limited" }] }, 429),
    );
    try {
      await createCloudflareRestriction("203.0.113.10", "restriction-123");
      throw new Error("Expected rate-limit failure");
    } catch (error) {
      expect(cloudflareFailureMessage(error)).toBe(
        "Cloudflare rate-limited the request; retry in a moment",
      );
    }
  });

  it("rejects a zone ID whose API hostname does not match configuration", async () => {
    setCloudflareFetch(async () =>
      jsonResponse({ success: true, result: { name: "wrong.example", status: "active" } }),
    );
    await expect(
      verifyCloudflareRestriction("203.0.113.10", "restriction-123", ruleId, "example.com"),
    ).rejects.toThrow("Configured Cloudflare zone hostname does not match the zone ID");
  });

  it("marks missing or changed Cloudflare rules as unverified", async () => {
    setCloudflareFetch(async (input) => {
      const url = String(input);
      if (url.endsWith(`/zones/${zoneId}`)) {
        return jsonResponse({ success: true, result: { name: "example.com", status: "active" } });
      }
      return jsonResponse({ success: false, errors: [{ code: 1000, message: "Not found" }] }, 404);
    });
    expect(
      await verifyCloudflareRestriction("203.0.113.10", "restriction-123", ruleId, "example.com"),
    ).toEqual({ verified: false, reason: "missing" });
  });

  it("rolls back a rule that fails verification and tracks cleanup failure", async () => {
    let deleteAttempted = false;
    setCloudflareFetch(async (_input, init) => {
      if (init?.method === "POST") return cloudflareSuccess(rule());
      if (init?.method === "DELETE") {
        deleteAttempted = true;
        return jsonResponse({ success: false, errors: [{ code: 10000, message: "Denied" }] }, 403);
      }
      return cloudflareSuccess(rule({ mode: "challenge" }));
    });

    try {
      await createCloudflareRestriction("203.0.113.10", "restriction-123");
      throw new Error("Expected verification failure");
    } catch (error) {
      expect(error).toBeInstanceOf(CloudflareRestrictionCleanupError);
      expect((error as CloudflareRestrictionCleanupError).cloudflareRuleId).toBe(ruleId);
      expect(cloudflareFailureMessage(error)).toContain("removal is pending automatic retry");
    }
    expect(deleteAttempted).toBe(true);
  });

  it("removes a rule and confirms that it no longer exists", async () => {
    let deleted = false;
    setCloudflareFetch(async (_input, init) => {
      if (init?.method === "DELETE") {
        deleted = true;
        return jsonResponse({ success: true, result: { id: ruleId } });
      }
      if (deleted) {
        return jsonResponse(
          { success: false, errors: [{ code: 1000, message: "Not found" }] },
          404,
        );
      }
      return cloudflareSuccess(rule());
    });
    await removeCloudflareRestriction("203.0.113.10", "restriction-123", ruleId);
    expect(deleted).toBe(true);
  });
});
