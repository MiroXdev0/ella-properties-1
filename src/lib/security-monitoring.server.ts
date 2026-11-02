import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SecurityObservation } from "@/lib/security-monitoring";
import { DEFAULT_SECURITY_THRESHOLDS, SecurityRequestTracker } from "@/lib/security-monitoring";

type WorkerExecutionContext = {
  waitUntil: (promise: Promise<unknown>) => void;
};

function configuredThreshold(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (Number.isSafeInteger(value) && value >= min && value <= max) return value;
  console.error(`[security-monitor] Invalid ${name}; using its documented default`);
  return fallback;
}

const tracker = new SecurityRequestTracker({
  ...DEFAULT_SECURITY_THRESHOLDS,
  windowMs: configuredThreshold("SECURITY_MONITOR_WINDOW_SECONDS", 300, 60, 900) * 1000,
  signalMinScore: configuredThreshold("SECURITY_MONITOR_MIN_SCORE", 4, 3, 10),
});

async function hashValue(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashSourceIp(ipAddress: string): Promise<string> {
  const secret = process.env.HONEYPOT_HASH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("HONEYPOT_HASH_SECRET must contain at least 32 characters");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ipAddress));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function storeSecurityObservation(observation: SecurityObservation): Promise<void> {
  const sourceHash = await hashSourceIp(observation.sourceIp);
  const bucketStart = Math.floor(Date.parse(observation.detectedAt) / 600_000) * 600_000;
  const dedupeKey = await hashValue(
    `${sourceHash}|${observation.category}|${observation.eventType}|${observation.route}|${bucketStart}`,
  );
  const { error } = await supabaseAdmin.rpc("record_site_security_event", {
    p_category: observation.category,
    p_event_type: observation.eventType,
    p_dedupe_key: dedupeKey,
    p_http_status: observation.httpStatus,
    p_observed_requests: observation.observedRequests,
    p_request_method: observation.requestMethod,
    p_risk_score: observation.riskScore,
    p_route: observation.route,
    p_severity: observation.severity,
    p_signals: observation.signals,
    p_source_hash: sourceHash,
    p_window_started_at: new Date(bucketStart).toISOString(),
    p_correlation_id: crypto.randomUUID(),
  });
  if (error) throw new Error("Security event database write failed");
}

export async function persistSecurityObservation(
  observation: SecurityObservation,
  store: (event: SecurityObservation) => Promise<void> = storeSecurityObservation,
): Promise<void> {
  try {
    await store(observation);
  } catch {
    console.error("[security-monitor] Security event persistence failed");
  }
}

export function queueSecurityRequestMonitoring(
  request: Request,
  response: Response,
  executionContext: unknown,
): void {
  const observation = tracker.observe(request, response.status);
  if (!observation) return;

  const write = persistSecurityObservation(observation);
  if (
    executionContext !== null &&
    typeof executionContext === "object" &&
    "waitUntil" in executionContext &&
    typeof (executionContext as WorkerExecutionContext).waitUntil === "function"
  ) {
    try {
      (executionContext as WorkerExecutionContext).waitUntil(write);
      return;
    } catch {
      console.error("[security-monitor] Background event scheduling failed");
    }
  }
  void write;
}

export async function runSecurityMonitoringRetention(): Promise<void> {
  const [events, audit] = await Promise.all([
    supabaseAdmin.rpc("purge_site_security_events"),
    supabaseAdmin.rpc("purge_site_security_admin_audit"),
  ]);
  if (events.error || audit.error) {
    throw new Error("Unable to purge expired site security records");
  }
}
