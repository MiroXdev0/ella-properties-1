export const SECURITY_SIGNAL_CODES = [
  "high_request_rate",
  "repeated_endpoint",
  "multi_endpoint_burst",
  "sensitive_route_frequency",
  "property_page_enumeration",
  "client_error_burst",
  "unexpected_method",
  "malformed_api_burst",
  "unauthorized_admin_attempt",
  "form_honeypot_filled",
  "form_submitted_too_fast",
  "registration_failed",
  "invalid_auth_token",
] as const;

export type SecuritySignalCode = (typeof SECURITY_SIGNAL_CODES)[number];
export type SecurityCategory = "admin" | "authentication" | "api" | "property" | "form" | "traffic";
export type SecuritySeverity = "low" | "medium" | "high" | "critical";

export type SecurityObservation = {
  category: SecurityCategory;
  eventType: string;
  sourceIp: string;
  route: string;
  requestMethod: string;
  httpStatus: number;
  riskScore: number;
  severity: SecuritySeverity;
  signals: SecuritySignalCode[];
  observedRequests: number;
  detectedAt: string;
};

type RouteClassification = {
  category: SecurityCategory;
  route: string;
  sensitive: boolean;
  propertyPath: boolean;
  serverFunction: boolean;
};

type RequestSample = {
  at: number;
  route: string;
  category: SecurityCategory;
  status: number;
  method: string;
  serverFunction: boolean;
  explicitSignals: SecuritySignalCode[];
  propertyPath: string | null;
  unexpectedContentType: boolean;
  endpointFingerprint: string;
};

type SourceWindow = {
  samples: RequestSample[];
  lastEmittedAt: Map<string, number>;
};

export type SecurityMonitoringThresholds = {
  windowMs: number;
  endpointRepeatCount: number;
  sensitiveRouteCount: number;
  highRequestCount: number;
  propertyRequestCount: number;
  propertyPathCount: number;
  clientErrorCount: number;
  signalMinScore: number;
};

export const DEFAULT_SECURITY_THRESHOLDS: SecurityMonitoringThresholds = {
  windowMs: 5 * 60_000,
  endpointRepeatCount: 8,
  sensitiveRouteCount: 5,
  highRequestCount: 30,
  propertyRequestCount: 30,
  propertyPathCount: 20,
  clientErrorCount: 6,
  signalMinScore: 4,
};

export const SECURITY_SIGNAL_INFO: Record<
  SecuritySignalCode,
  { label: string; kind: "observed" | "inferred"; weight: number }
> = {
  high_request_rate: { label: "High request rate", kind: "inferred", weight: 3 },
  repeated_endpoint: { label: "Repeated endpoint requests", kind: "inferred", weight: 2 },
  multi_endpoint_burst: { label: "Requests across many paths", kind: "inferred", weight: 2 },
  sensitive_route_frequency: { label: "Sensitive-route frequency", kind: "inferred", weight: 3 },
  property_page_enumeration: {
    label: "Property-page enumeration pattern",
    kind: "inferred",
    weight: 3,
  },
  client_error_burst: { label: "Repeated client errors", kind: "observed", weight: 2 },
  unexpected_method: { label: "Repeated unexpected methods", kind: "observed", weight: 2 },
  malformed_api_burst: { label: "Repeated malformed API responses", kind: "observed", weight: 2 },
  unauthorized_admin_attempt: {
    label: "Repeated denied admin access",
    kind: "observed",
    weight: 4,
  },
  form_honeypot_filled: { label: "Form honeypot field filled", kind: "observed", weight: 4 },
  form_submitted_too_fast: {
    label: "Form submitted unusually quickly",
    kind: "inferred",
    weight: 2,
  },
  registration_failed: { label: "Server-side registration failure", kind: "observed", weight: 1 },
  invalid_auth_token: { label: "Invalid authentication token", kind: "observed", weight: 2 },
};

export function safeSecurityCsvCell(value: unknown): string {
  const text = String(value ?? "");
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

const SIGNAL_CATEGORIES: Partial<Record<SecuritySignalCode, SecurityCategory>> = {
  form_honeypot_filled: "form",
  form_submitted_too_fast: "form",
  registration_failed: "authentication",
  invalid_auth_token: "authentication",
  unauthorized_admin_attempt: "admin",
};

const explicitSignals = new WeakMap<Request, Set<SecuritySignalCode>>();
const MAX_TRACKED_SOURCES = 2_000;
const MAX_SAMPLES_PER_SOURCE = 120;

function propertyPathFingerprint(path: string): string {
  let hash = 2166136261;
  for (const character of path.slice(0, 300)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function markSecuritySignal(request: Request | undefined, signal: SecuritySignalCode): void {
  if (!request) return;
  let signals = explicitSignals.get(request);
  if (!signals) {
    signals = new Set();
    explicitSignals.set(request, signals);
  }
  signals.add(signal);
}

function takeExplicitSignals(request: Request): SecuritySignalCode[] {
  const signals = [...(explicitSignals.get(request) ?? [])];
  explicitSignals.delete(request);
  return signals;
}

function canonicalIp(value: string | null): string | null {
  if (!value) return null;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    const parts = value.split(".").map(Number);
    if (parts.some((part) => part < 0 || part > 255)) return null;
    return parts.join(".");
  }
  if (!value.includes(":")) return null;
  try {
    return new URL(`http://[${value}]/`).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeRoute(pathname: string): RouteClassification | null {
  const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (
    path.startsWith("/assets/") ||
    path.startsWith("/_build/") ||
    path.startsWith("/_assets/") ||
    /\.(?:avif|bmp|css|gif|ico|jpe?g|js|map|mp3|mp4|otf|pdf|png|svg|ttf|webm|webp|woff2?)$/i.test(
      path,
    ) ||
    ["/favicon.ico", "/robots.txt", "/sitemap.xml", "/manifest.webmanifest"].includes(path)
  ) {
    return null;
  }

  if (path === "/_server" || path.startsWith("/_server/")) {
    return {
      category: "api",
      route: "/_server",
      sensitive: true,
      propertyPath: false,
      serverFunction: true,
    };
  }
  if (path === "/auth" || path === "/signup" || path === "/reset-password") {
    return {
      category: "authentication",
      route: path,
      sensitive: true,
      propertyPath: false,
      serverFunction: false,
    };
  }
  if (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/_authenticated/")) {
    return {
      category: "admin",
      route: path === "/admin" ? "/admin" : "/admin/:route",
      sensitive: true,
      propertyPath: false,
      serverFunction: false,
    };
  }
  if (path === "/properties" || /^\/properties\/[^/]+$/.test(path)) {
    return {
      category: "property",
      route: path === "/properties" ? "/properties" : "/properties/:id",
      sensitive: false,
      propertyPath: path !== "/properties",
      serverFunction: false,
    };
  }
  if (path === "/" || path.startsWith("/imoti-v/")) {
    return {
      category: "property",
      route: path === "/" ? "/" : "/imoti-v/:slug",
      sensitive: false,
      propertyPath: path !== "/",
      serverFunction: false,
    };
  }
  if (path.startsWith("/api/")) {
    return {
      category: "api",
      route: path.startsWith("/api/public/media/") ? "/api/public/media/:path" : "/api/:route",
      sensitive: true,
      propertyPath: false,
      serverFunction: false,
    };
  }
  return {
    category: "traffic",
    route: "/unmatched",
    sensitive: false,
    propertyPath: false,
    serverFunction: false,
  };
}

export function classifySecurityRequest(request: Request): RouteClassification | null {
  if (request.headers.get("x-tsr-serverfn") === "true") {
    return {
      category: "api",
      route: "/_server",
      sensitive: true,
      propertyPath: false,
      serverFunction: true,
    };
  }
  return normalizeRoute(new URL(request.url).pathname);
}

function severityFor(score: number): SecuritySeverity {
  if (score >= 13) return "critical";
  if (score >= 9) return "high";
  if (score >= 6) return "medium";
  return "low";
}

function eventTypeFor(category: SecurityCategory, signals: SecuritySignalCode[]): string {
  if (signals.includes("unauthorized_admin_attempt")) return "repeated_admin_access_denied";
  if (
    category === "authentication" ||
    signals.includes("registration_failed") ||
    signals.includes("invalid_auth_token")
  ) {
    return "authentication_activity_burst";
  }
  if (category === "form") return "automated_form_submission_pattern";
  if (category === "property" && signals.includes("property_page_enumeration")) {
    return "property_enumeration_pattern";
  }
  if (category === "api" && signals.includes("malformed_api_burst")) {
    return "malformed_api_request_burst";
  }
  if (category === "traffic" && signals.includes("client_error_burst")) {
    return "repeated_unmatched_route_requests";
  }
  return "abnormal_request_frequency";
}

export class SecurityRequestTracker {
  private readonly sources = new Map<string, SourceWindow>();

  constructor(
    private readonly thresholds: SecurityMonitoringThresholds = DEFAULT_SECURITY_THRESHOLDS,
  ) {}

  observe(request: Request, httpStatus: number, now = Date.now()): SecurityObservation | null {
    const classification = classifySecurityRequest(request);
    const sourceIp = canonicalIp(request.headers.get("cf-connecting-ip"));
    if (!classification || !sourceIp) {
      takeExplicitSignals(request);
      return null;
    }

    let sourceWindow = this.sources.get(sourceIp);
    if (!sourceWindow) {
      if (this.sources.size >= MAX_TRACKED_SOURCES) {
        const oldestKey = this.sources.keys().next().value;
        if (oldestKey) this.sources.delete(oldestKey);
      }
      sourceWindow = { samples: [], lastEmittedAt: new Map() };
      this.sources.set(sourceIp, sourceWindow);
    } else {
      this.sources.delete(sourceIp);
      this.sources.set(sourceIp, sourceWindow);
    }

    const explicit = takeExplicitSignals(request);
    const method = request.method.toUpperCase().slice(0, 16);
    const path = new URL(request.url).pathname;
    const endpointFingerprint = propertyPathFingerprint(path);
    sourceWindow.samples.push({
      at: now,
      route: classification.route,
      category: classification.category,
      status: httpStatus,
      method,
      serverFunction: classification.serverFunction,
      explicitSignals: explicit,
      propertyPath: classification.propertyPath ? propertyPathFingerprint(path) : null,
      endpointFingerprint,
      unexpectedContentType:
        classification.category === "api" &&
        !classification.serverFunction &&
        method === "POST" &&
        !/^(application\/json|multipart\/form-data)(?:;|$)/i.test(
          request.headers.get("content-type")?.trim() ?? "",
        ),
    });
    const cutoff = now - this.thresholds.windowMs;
    sourceWindow.samples = sourceWindow.samples.filter((sample) => sample.at >= cutoff);
    if (sourceWindow.samples.length > MAX_SAMPLES_PER_SOURCE) {
      sourceWindow.samples.splice(0, sourceWindow.samples.length - MAX_SAMPLES_PER_SOURCE);
    }
    const samples = sourceWindow.samples;
    const recentSamples = samples.filter((sample) => now - sample.at <= 60_000);
    const signals = new Set<SecuritySignalCode>();
    const endpointCount = samples.filter(
      (sample) =>
        !sample.serverFunction &&
        sample.endpointFingerprint === endpointFingerprint &&
        now - sample.at <= 60_000,
    ).length;
    const sensitiveCount = samples.filter(
      (sample) => sample.category === classification.category && now - sample.at <= 60_000,
    ).length;
    const clientErrors = samples.filter((sample) => sample.status >= 400 && sample.status < 500);
    const malformedApiRequests = samples.filter(
      (sample) =>
        sample.category === "api" &&
        ([400, 405, 415, 422].includes(sample.status) || sample.unexpectedContentType),
    );
    const propertySamples = samples.filter((sample) => sample.propertyPath !== null);
    const distinctPropertyPaths = new Set(propertySamples.map((sample) => sample.propertyPath));
    const distinctEndpoints = new Set(recentSamples.map((sample) => sample.endpointFingerprint));
    const adminDenials = samples.filter(
      (sample) =>
        sample.explicitSignals.includes("unauthorized_admin_attempt") ||
        (sample.category === "admin" && (sample.status === 401 || sample.status === 403)),
    );
    const unexpectedMethods = samples.filter((sample) => {
      if (sample.method === "OPTIONS") return false;
      if (["GET", "HEAD", "POST"].includes(sample.method)) return false;
      return (
        !["api", "admin"].includes(sample.category) ||
        !["PUT", "PATCH", "DELETE"].includes(sample.method)
      );
    });

    if (samples.length >= this.thresholds.highRequestCount) signals.add("high_request_rate");
    if (!classification.serverFunction && endpointCount >= this.thresholds.endpointRepeatCount) {
      signals.add("repeated_endpoint");
    }
    if (recentSamples.length >= 20 && distinctEndpoints.size >= 12) {
      signals.add("multi_endpoint_burst");
    }
    if (classification.sensitive && sensitiveCount >= this.thresholds.sensitiveRouteCount) {
      signals.add("sensitive_route_frequency");
    }
    if (
      propertySamples.length >= this.thresholds.propertyRequestCount &&
      distinctPropertyPaths.size >= this.thresholds.propertyPathCount
    ) {
      signals.add("property_page_enumeration");
    }
    if (clientErrors.length >= this.thresholds.clientErrorCount) signals.add("client_error_burst");
    if (unexpectedMethods.length >= 3) signals.add("unexpected_method");
    if (malformedApiRequests.length >= 3) signals.add("malformed_api_burst");
    if (adminDenials.length >= 3) signals.add("unauthorized_admin_attempt");
    for (const sample of samples) {
      for (const signal of sample.explicitSignals) signals.add(signal);
    }

    const signalList = [...signals];
    const riskScore = signalList.reduce(
      (total, signal) => total + SECURITY_SIGNAL_INFO[signal].weight,
      0,
    );
    if (samples.length < 3 || riskScore < this.thresholds.signalMinScore) return null;

    const signalCategory = signalList
      .map((signal) => SIGNAL_CATEGORIES[signal])
      .find((category): category is SecurityCategory => category !== undefined);
    const category = signalCategory ?? classification.category;
    const eventType = eventTypeFor(category, signalList);
    const suppressionKey = `${eventType}:${classification.route}`;
    const lastEmittedAt = sourceWindow.lastEmittedAt.get(suppressionKey) ?? 0;
    if (now - lastEmittedAt < 60_000) return null;
    sourceWindow.lastEmittedAt.set(suppressionKey, now);

    return {
      category,
      eventType,
      sourceIp,
      route: classification.route,
      requestMethod: method,
      httpStatus,
      riskScore,
      severity: severityFor(riskScore),
      signals: signalList,
      observedRequests: samples.length,
      detectedAt: new Date(now).toISOString(),
    };
  }
}
