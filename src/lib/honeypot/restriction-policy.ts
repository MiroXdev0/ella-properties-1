export type HoneypotRestrictionDuration = "1_hour" | "24_hours" | "7_days" | "permanent";
export type HoneypotEnforcementMode = "cloudflare_zone" | "worker_only";

export function resolveHoneypotEnforcementMode(
  configuredMode: string | undefined,
): HoneypotEnforcementMode {
  const mode = configuredMode?.trim() || "cloudflare_zone";
  if (mode === "cloudflare_zone" || mode === "worker_only") return mode;
  throw new Error("HONEYPOT_ENFORCEMENT_MODE must be cloudflare_zone or worker_only");
}

const durationMilliseconds: Record<Exclude<HoneypotRestrictionDuration, "permanent">, number> = {
  "1_hour": 60 * 60 * 1000,
  "24_hours": 24 * 60 * 60 * 1000,
  "7_days": 7 * 24 * 60 * 60 * 1000,
};

export function getHoneypotRestrictionExpiry(
  duration: HoneypotRestrictionDuration,
  createdAt: Date,
): string | null {
  if (duration === "permanent") return null;
  return new Date(createdAt.getTime() + durationMilliseconds[duration]).toISOString();
}
