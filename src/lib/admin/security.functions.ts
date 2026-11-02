import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireSecurityMonitorAdmin } from "@/lib/admin/security-authorization.server";
import { safeSecurityCsvCell } from "@/lib/security-monitoring";

const severitySchema = z.enum(["low", "medium", "high", "critical"]);
const categorySchema = z.enum(["admin", "authentication", "api", "property", "form", "traffic"]);
const reviewStatusSchema = z.enum([
  "new",
  "reviewed",
  "investigating",
  "resolved",
  "false_positive",
]);
const routeSchema = z
  .string()
  .regex(/^\/(?:[A-Za-z0-9:_-]{1,60}(?:\/[A-Za-z0-9:_-]{1,60}){0,5})?$/)
  .max(200);
const dashboardRangeSchema = z
  .object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  })
  .refine((value) => Date.parse(value.from) < Date.parse(value.to), {
    message: "Invalid security dashboard range",
  });

const dashboardSchema = z.object({
  totalEvents: z.number().int().nonnegative(),
  last24Hours: z.number().int().nonnegative(),
  highRiskVisitors: z.number().int().nonnegative(),
  criticalEvents: z.number().int().nonnegative(),
  activeRestrictions: z.number().int().nonnegative(),
  failedAuthentication: z.number().int().nonnegative(),
  suspiciousApiActivity: z.number().int().nonnegative(),
  automatedTraffic: z.number().int().nonnegative(),
  bySeverity: z.record(z.string(), z.number().int().nonnegative()),
  byCategory: z.record(z.string(), z.number().int().nonnegative()),
  eventsOverTime: z.array(
    z.object({
      bucket: z.string().datetime(),
      event_count: z.number().int().nonnegative(),
    }),
  ),
  topRoutes: z.array(
    z.object({
      route: z.string(),
      occurrence_count: z.number().int().nonnegative(),
    }),
  ),
  topSignals: z.array(
    z.object({
      signal: z.string(),
      occurrence_count: z.number().int().nonnegative(),
    }),
  ),
  riskDistribution: z.record(z.string(), z.number().int().nonnegative()),
  recentHighRisk: z.array(
    z.object({
      id: z.string().uuid(),
      visitor_id: z.string().uuid().nullable(),
      source_id: z.string().min(1).max(12),
      category: categorySchema,
      event_type: z.string(),
      severity: severitySchema,
      risk_score: z.number().int(),
      route: z.string(),
      last_seen: z.string().datetime(),
    }),
  ),
});

export const getSecurityOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => dashboardRangeSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSecurityMonitorAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("site_security_dashboard", {
      p_from: data.from,
      p_to: data.to,
    });
    if (error || !result || typeof result !== "object" || Array.isArray(result)) {
      console.error("[security-monitor] Unable to load dashboard analytics");
      throw new Error("Unable to load site security analytics");
    }

    const parsed = dashboardSchema.safeParse(result);
    if (!parsed.success) {
      console.error("[security-monitor] Dashboard response validation failed");
      throw new Error("Site security analytics returned invalid data");
    }
    return parsed.data;
  });

const eventFiltersSchema = z
  .object({
    page: z.number().int().min(1).max(100_000).default(1),
    pageSize: z.number().int().min(10).max(50).default(25),
    search: z.string().trim().max(80).default(""),
    severity: severitySchema.optional(),
    category: categorySchema.optional(),
    route: routeSchema.optional(),
    visitorId: z.string().uuid().optional(),
    reviewStatus: reviewStatusSchema.optional(),
    fromDate: z.string().date().optional(),
    toDate: z.string().date().optional(),
    sort: z
      .enum(["last_seen", "severity", "risk_score", "occurrence_count", "route", "review_status"])
      .default("last_seen"),
    direction: z.enum(["asc", "desc"]).default("desc"),
  })
  .superRefine((data, context) => {
    if (data.fromDate && data.toDate && data.fromDate > data.toDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toDate"],
        message: "End date must be on or after start date",
      });
    }
  });

function normalizedSearch(search: string): string {
  return search
    .replace(/[\\%_*,"'():]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const getSecurityEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => eventFiltersSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSecurityMonitorAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const offset = (data.page - 1) * data.pageSize;
    let query = supabaseAdmin
      .from("site_security_events")
      .select(
        "id, visitor_id, source_hash, category, event_type, severity, risk_score, request_method, route, http_status, signals, correlation_id, first_seen, last_seen, occurrence_count, observed_requests, review_status, reviewed_by, reviewed_at",
        { count: "exact" },
      );

    if (data.severity) query = query.eq("severity", data.severity);
    if (data.category) query = query.eq("category", data.category);
    if (data.route) query = query.eq("route", data.route);
    if (data.visitorId) query = query.eq("visitor_id", data.visitorId);
    if (data.reviewStatus) query = query.eq("review_status", data.reviewStatus);
    if (data.fromDate) query = query.gte("last_seen", `${data.fromDate}T00:00:00.000Z`);
    if (data.toDate) query = query.lte("last_seen", `${data.toDate}T23:59:59.999Z`);

    const search = normalizedSearch(data.search);
    if (/^[a-f0-9]{8,64}$/i.test(data.search)) {
      query = query.like("source_hash", `${data.search.toLowerCase()}%`);
    } else if (search) {
      query = query.or(
        `route.ilike.%${search}%,event_type.ilike.%${search}%,category.ilike.%${search}%`,
      );
    }

    query = query.order(data.sort, { ascending: data.direction === "asc" });
    const { data: events, error, count } = await query.range(offset, offset + data.pageSize - 1);
    if (error) {
      console.error("[security-monitor] Unable to load events");
      throw new Error("Unable to load site security events");
    }
    return {
      events: events ?? [],
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

const reviewEventsSchema = z.object({
  eventIds: z
    .array(z.string().uuid())
    .min(1)
    .max(50)
    .refine((eventIds) => new Set(eventIds).size === eventIds.length, "Event IDs must be unique"),
  status: reviewStatusSchema,
});

export const updateSecurityEventStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => reviewEventsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSecurityMonitorAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin.rpc("review_site_security_events", {
      p_event_ids: data.eventIds,
      p_review_status: data.status,
      p_administrator_id: context.userId,
    });
    if (error || typeof updated !== "number") {
      console.error("[security-monitor] Unable to update event review status");
      throw new Error("Unable to update security event review status");
    }
    return { updated };
  });

const visitorReviewSchema = z.object({
  visitorId: z.string().uuid(),
  status: z.enum(["new", "investigating", "cleared"]),
});

export const updateSecurityVisitorStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => visitorReviewSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSecurityMonitorAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin.rpc("review_site_security_visitor", {
      p_visitor_id: data.visitorId,
      p_review_status: data.status,
      p_administrator_id: context.userId,
    });
    if (error || typeof updated !== "boolean") {
      console.error("[security-monitor] Unable to update visitor review status");
      throw new Error("Unable to update visitor review status");
    }
    return { updated };
  });

const restrictionListSchema = z.object({
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.number().int().min(10).max(50).default(25),
  status: z
    .enum(["pending", "active", "pending_removal", "unbanned", "expired", "failed"])
    .optional(),
});

export const getSecurityRestrictions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => restrictionListSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSecurityMonitorAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("honeypot_ip_restrictions")
      .select(
        "id, visitor_id, ip_address, cloudflare_rule_id, enforcement_mode, status, duration, reason, administrator_id, created_at, expires_at, released_at, updated_at, last_verified_at, visitor:honeypot_visitors!honeypot_ip_restrictions_visitor_id_fkey(country, country_code, city, region, last_seen)",
        { count: "exact" },
      );
    if (data.status) query = query.eq("status", data.status);
    query = query.order("created_at", { ascending: false });
    const offset = (data.page - 1) * data.pageSize;
    const {
      data: restrictions,
      error,
      count,
    } = await query.range(offset, offset + data.pageSize - 1);
    if (error) {
      console.error("[security-monitor] Unable to load IP restriction records");
      throw new Error("Unable to load IP restriction records");
    }
    const administratorIds = [
      ...new Set((restrictions ?? []).map((restriction) => restriction.administrator_id)),
    ];
    const { data: profiles, error: profileError } = administratorIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", administratorIds)
      : { data: [], error: null };
    if (profileError) {
      console.error("[security-monitor] Unable to resolve restriction administrator identities");
      throw new Error("Unable to load restriction administrator identities");
    }
    const names = new Map(
      (profiles ?? []).map((profile) => [profile.user_id, profile.display_name]),
    );
    return {
      restrictions: (restrictions ?? []).map((restriction) => ({
        ...restriction,
        administratorName:
          names.get(restriction.administrator_id) ??
          `Administrator ${restriction.administrator_id.slice(0, 8)}`,
      })),
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

const exportEventsSchema = z
  .object({
    search: z.string().trim().max(80).default(""),
    severity: severitySchema.optional(),
    category: categorySchema.optional(),
    route: routeSchema.optional(),
    visitorId: z.string().uuid().optional(),
    reviewStatus: reviewStatusSchema.optional(),
    fromDate: z.string().date().optional(),
    toDate: z.string().date().optional(),
    sort: z
      .enum(["last_seen", "severity", "risk_score", "occurrence_count", "route", "review_status"])
      .default("last_seen"),
    direction: z.enum(["asc", "desc"]).default("desc"),
    limit: z.number().int().min(1).max(500).default(500),
  })
  .superRefine((data, context) => {
    if (data.fromDate && data.toDate && data.fromDate > data.toDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toDate"],
        message: "End date must be on or after start date",
      });
    }
  });

export const exportSecurityEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => exportEventsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSecurityMonitorAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("site_security_events")
      .select(
        "id, visitor_id, source_hash, category, event_type, severity, risk_score, request_method, route, http_status, signals, correlation_id, first_seen, last_seen, occurrence_count, review_status",
      );

    if (data.severity) query = query.eq("severity", data.severity);
    if (data.category) query = query.eq("category", data.category);
    if (data.route) query = query.eq("route", data.route);
    if (data.visitorId) query = query.eq("visitor_id", data.visitorId);
    if (data.reviewStatus) query = query.eq("review_status", data.reviewStatus);
    if (data.fromDate) query = query.gte("last_seen", `${data.fromDate}T00:00:00.000Z`);
    if (data.toDate) query = query.lte("last_seen", `${data.toDate}T23:59:59.999Z`);

    const search = normalizedSearch(data.search);
    if (/^[a-f0-9]{8,64}$/i.test(data.search)) {
      query = query.like("source_hash", `${data.search.toLowerCase()}%`);
    } else if (search) {
      query = query.or(
        `route.ilike.%${search}%,event_type.ilike.%${search}%,category.ilike.%${search}%`,
      );
    }

    query = query.order(data.sort, { ascending: data.direction === "asc" }).limit(data.limit);
    const { data: events, error } = await query;
    if (error) {
      console.error("[security-monitor] Unable to export events");
      throw new Error("Unable to export site security events");
    }

    const headers = [
      "event_id",
      "visitor_id",
      "source_id",
      "category",
      "event_type",
      "severity",
      "risk_score",
      "review_status",
      "method",
      "route",
      "http_status",
      "first_seen",
      "last_seen",
      "occurrences",
      "signals",
      "correlation_id",
    ];
    const rows = (events ?? []).map((event) => {
      const signals = Array.isArray(event.signals)
        ? event.signals.filter((signal): signal is string => typeof signal === "string")
        : [];
      return [
        event.id,
        event.visitor_id,
        event.source_hash.slice(0, 12),
        event.category,
        event.event_type,
        event.severity,
        event.risk_score,
        event.review_status,
        event.request_method,
        event.route,
        event.http_status,
        event.first_seen,
        event.last_seen,
        event.occurrence_count,
        signals.join("|"),
        event.correlation_id,
      ]
        .map(safeSecurityCsvCell)
        .join(",");
    });
    return [headers.map(safeSecurityCsvCell).join(","), ...rows].join("\r\n");
  });

export const getSecurityAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({}).parse(data))
  .handler(async ({ context }) => {
    await requireSecurityMonitorAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [securityAudit, honeypotAudit] = await Promise.all([
      supabaseAdmin
        .from("site_security_admin_audit")
        .select(
          "id, administrator_id, event_id, visitor_id, action, previous_status, new_status, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("honeypot_admin_audit")
        .select(
          "id, administrator_id, visitor_id, event_id, restriction_id, action, outcome, details, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (securityAudit.error || honeypotAudit.error) {
      console.error("[security-monitor] Unable to load administrative audit history");
      throw new Error("Unable to load administrative audit history");
    }

    const entries = [
      ...(securityAudit.data ?? []).map((entry) => ({
        id: `security:${entry.id}`,
        administratorId: entry.administrator_id,
        action: entry.action,
        outcome: "success",
        targetId: entry.event_id ?? entry.visitor_id,
        visitorId: entry.visitor_id,
        previousStatus: entry.previous_status,
        newStatus: entry.new_status,
        details: null,
        createdAt: entry.created_at,
      })),
      ...(honeypotAudit.data ?? []).map((entry) => ({
        id: `honeypot:${entry.id}`,
        administratorId: entry.administrator_id,
        action: entry.action,
        outcome: entry.outcome,
        targetId: entry.visitor_id ?? entry.event_id ?? entry.restriction_id,
        visitorId: entry.visitor_id,
        previousStatus: null,
        newStatus: null,
        details: entry.details,
        createdAt: entry.created_at,
      })),
    ]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 50);

    const administratorIds = [
      ...new Set(
        entries.flatMap((entry) => (entry.administratorId ? [entry.administratorId] : [])),
      ),
    ];
    const { data: profiles, error: profileError } = administratorIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", administratorIds)
      : { data: [], error: null };
    if (profileError) {
      console.error("[security-monitor] Unable to resolve audit administrator names");
      throw new Error("Unable to load audit administrator identities");
    }
    const names = new Map(
      (profiles ?? []).map((profile) => [profile.user_id, profile.display_name]),
    );
    return entries.map((entry) => ({
      ...entry,
      administratorName: entry.administratorId
        ? (names.get(entry.administratorId) ?? "Administrator")
        : "System or unavailable",
    }));
  });

export const getSecurityHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({}).parse(data))
  .handler(async ({ context }) => {
    await requireSecurityMonitorAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const checkedAt = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("site_security_events")
      .select("last_seen")
      .order("last_seen", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) console.error("[security-monitor] Health database probe failed");
    return {
      checkedAt,
      database: error ? ("unavailable" as const) : ("available" as const),
      latestPersistedEventAt: error ? null : (data?.last_seen ?? null),
      workerStatus: "unknown" as const,
      ingestionFailures: "unknown" as const,
      retentionLastRun: "unknown" as const,
      configuration: {
        supabaseServerCredentialsConfigured: Boolean(
          process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
        ),
        sourceHashSecretConfigured: Boolean(
          process.env.HONEYPOT_HASH_SECRET && process.env.HONEYPOT_HASH_SECRET.length >= 32,
        ),
        thresholdsConfigured: Boolean(
          process.env.SECURITY_MONITOR_WINDOW_SECONDS || process.env.SECURITY_MONITOR_MIN_SCORE,
        ),
      },
    };
  });
