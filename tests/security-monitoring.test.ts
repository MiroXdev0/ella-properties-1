import { describe, expect, it } from "bun:test";

import type { AdminContext } from "../src/lib/admin/security-authorization.server";
import { requireSecurityMonitorAdmin } from "../src/lib/admin/security-authorization.server";
import {
  DEFAULT_SECURITY_THRESHOLDS,
  SecurityRequestTracker,
  classifySecurityRequest,
  markSecuritySignal,
  safeSecurityCsvCell,
} from "../src/lib/security-monitoring";
import type { SecurityObservation } from "../src/lib/security-monitoring";
import { persistSecurityObservation } from "../src/lib/security-monitoring.server";

const sourceIp = "203.0.113.42";
const start = 1_800_000_000_000;

function makeRequest(
  pathname: string,
  options: { method?: string; headers?: Record<string, string> } = {},
): Request {
  return new Request(`https://ella.example${pathname}`, {
    method: options.method ?? "GET",
    headers: {
      "cf-connecting-ip": sourceIp,
      ...options.headers,
    },
  });
}

function tracker(overrides: Partial<typeof DEFAULT_SECURITY_THRESHOLDS> = {}) {
  return new SecurityRequestTracker({ ...DEFAULT_SECURITY_THRESHOLDS, ...overrides });
}

describe("site security request monitoring", () => {
  it("quotes CSV values and neutralizes spreadsheet formulas", () => {
    expect(safeSecurityCsvCell('route,"quoted"')).toBe('"route,""quoted"""');
    expect(safeSecurityCsvCell('=HYPERLINK("https://example.test")')).toBe(
      '"\'=HYPERLINK(""https://example.test"")"',
    );
    expect(safeSecurityCsvCell(null)).toBe('""');
  });

  it("classifies relevant routes and excludes ordinary static assets", () => {
    expect(classifySecurityRequest(makeRequest("/admin/users"))?.category).toBe("admin");
    expect(classifySecurityRequest(makeRequest("/properties/flat-1"))?.category).toBe("property");
    expect(classifySecurityRequest(makeRequest("/assets/site.css"))).toBeNull();
    expect(classifySecurityRequest(makeRequest("/images/building.webp"))).toBeNull();
  });

  it("uses only Cloudflare's connecting IP rather than client-supplied forwarding headers", () => {
    const request = new Request("https://ella.example/admin", {
      headers: { "x-forwarded-for": sourceIp },
    });
    expect(tracker({ endpointRepeatCount: 1 }).observe(request, 403, start)).toBeNull();
  });

  it("does not flag ordinary property browsing at the enumeration threshold", () => {
    const monitor = tracker();
    const results = Array.from({ length: 18 }, (_, index) =>
      monitor.observe(makeRequest(`/properties/listing-${index}`), 200, start + index * 1_000),
    );
    expect(results.every((result) => result === null)).toBe(true);
    expect(DEFAULT_SECURITY_THRESHOLDS.propertyRequestCount).toBe(30);
    expect(DEFAULT_SECURITY_THRESHOLDS.propertyPathCount).toBe(20);
  });

  it("requires multiple contributing signals and records their risk score", () => {
    const monitor = tracker({
      endpointRepeatCount: 3,
      sensitiveRouteCount: 3,
      highRequestCount: 100,
    });
    monitor.observe(makeRequest("/admin/security"), 200, start);
    monitor.observe(makeRequest("/admin/security"), 200, start + 1_000);
    const event = monitor.observe(makeRequest("/admin/security"), 200, start + 2_000);

    expect(event?.signals).toEqual(["repeated_endpoint", "sensitive_route_frequency"]);
    expect(event?.riskScore).toBe(5);
    expect(event?.severity).toBe("low");
  });

  it("detects fast requests spread across many endpoint paths", () => {
    const monitor = tracker({
      endpointRepeatCount: 100,
      sensitiveRouteCount: 100,
      highRequestCount: 20,
    });
    let event: SecurityObservation | null = null;
    for (let index = 0; index < 20; index += 1) {
      event = monitor.observe(makeRequest(`/api/resource-${index}`), 200, start + index * 100);
    }

    expect(event?.signals).toContain("multi_endpoint_burst");
    expect(event?.signals).toContain("high_request_rate");
    expect(event?.riskScore).toBe(5);
  });

  it("suppresses duplicate events for one minute and emits again after the interval", () => {
    const monitor = tracker({
      endpointRepeatCount: 3,
      sensitiveRouteCount: 3,
      highRequestCount: 100,
    });
    monitor.observe(makeRequest("/admin/security"), 200, start);
    monitor.observe(makeRequest("/admin/security"), 200, start + 1_000);
    expect(monitor.observe(makeRequest("/admin/security"), 200, start + 2_000)).not.toBeNull();
    expect(monitor.observe(makeRequest("/admin/security"), 200, start + 3_000)).toBeNull();
    expect(monitor.observe(makeRequest("/admin/security"), 200, start + 62_000)).not.toBeNull();
  });

  it("does not treat standard API methods or CORS preflights as unexpected", () => {
    const monitor = tracker({
      endpointRepeatCount: 100,
      sensitiveRouteCount: 100,
      highRequestCount: 100,
    });
    for (let index = 0; index < 4; index += 1) {
      expect(
        monitor.observe(makeRequest("/api/resource", { method: "PATCH" }), 200, start + index),
      ).toBeNull();
      expect(
        monitor.observe(makeRequest("/api/resource", { method: "OPTIONS" }), 204, start + index),
      ).toBeNull();
    }
  });

  it("rejects a denied administrator even while recording its security signal", async () => {
    type Query = {
      select: () => Query;
      eq: () => Query;
      maybeSingle: () => Promise<{ data: null; error: null }>;
    };
    const query: Query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    const context = {
      supabase: { from: () => query },
      userId: "00000000-0000-4000-8000-000000000001",
    } as unknown as AdminContext;
    const previousError = console.error;
    console.error = () => undefined;
    try {
      let thrown: unknown;
      try {
        await requireSecurityMonitorAdmin(context, makeRequest("/admin/security"));
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(Response);
      expect((thrown as Response).status).toBe(403);
    } finally {
      console.error = previousError;
    }
  });

  it("contains event persistence errors so telemetry cannot break a response", async () => {
    const previousError = console.error;
    console.error = () => undefined;
    try {
      await expect(
        persistSecurityObservation(
          {
            category: "traffic",
            eventType: "abnormal_request_frequency",
            sourceIp,
            route: "/",
            requestMethod: "GET",
            httpStatus: 200,
            riskScore: 5,
            severity: "low",
            signals: ["high_request_rate", "repeated_endpoint"],
            observedRequests: 30,
            detectedAt: new Date(start).toISOString(),
          },
          async () => {
            throw new Error("database unavailable");
          },
        ),
      ).resolves.toBeUndefined();
    } finally {
      console.error = previousError;
    }
  });

  it("records explicit form signals without storing submitted contents", () => {
    const monitor = tracker({ highRequestCount: 100 });
    const signalRequest = makeRequest("/_server", {
      headers: { "x-tsr-serverfn": "true" },
    });
    markSecuritySignal(signalRequest, "form_honeypot_filled");
    expect(monitor.observe(signalRequest, 200, start)).toBeNull();
    monitor.observe(
      makeRequest("/_server", { headers: { "x-tsr-serverfn": "true" } }),
      200,
      start + 1,
    );
    const event = monitor.observe(
      makeRequest("/_server", { headers: { "x-tsr-serverfn": "true" } }),
      200,
      start + 2,
    );
    expect(event?.signals).toContain("form_honeypot_filled");
    expect(event?.category).toBe("form");
    expect(event?.eventType).toBe("automated_form_submission_pattern");
    expect(JSON.stringify(event)).not.toContain("website");
  });
});
