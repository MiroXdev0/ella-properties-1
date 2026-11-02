import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const eventStatuses = [
  "new",
  "investigating",
  "confirmed_suspicious",
  "restricted",
  "dismissed",
] as const;
const restrictionDurations = ["1_hour", "24_hours", "7_days", "permanent"] as const;
const ipSchema = z.string().ip();
const zoneHostnameSchema = z
  .string()
  .regex(/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/);

type AdminContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

async function requireHoneypotAdmin(context: AdminContext): Promise<void> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    console.error("[honeypot] Administrator authorization check failed");
    throw new Response("Unable to verify administrator access", { status: 500 });
  }
  if (!data) throw new Response("Administrator access required", { status: 403 });
}

function assertQuerySucceeded(error: { message: string } | null, message: string): void {
  if (error) {
    console.error(`[honeypot] ${message}`);
    throw new Error(message);
  }
}

function requireQueryData<T>(
  data: T | null,
  error: { message: string } | null,
  message: string,
): T {
  assertQuerySucceeded(error, message);
  if (data === null) throw new Error(message);
  return data;
}

const overviewSchema = z.object({});
export const getHoneypotOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => overviewSchema.parse(data))
  .handler(async ({ context }) => {
    await requireHoneypotAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [events, visitors, restrictions, investigation, lastDay, volume] = await Promise.all([
      supabaseAdmin.from("honeypot_events").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("honeypot_visitors").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("honeypot_ip_restrictions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabaseAdmin
        .from("honeypot_events")
        .select("id", { count: "exact", head: true })
        .in("status", ["new", "investigating"]),
      supabaseAdmin
        .from("honeypot_events")
        .select("id", { count: "exact", head: true })
        .gte("detected_at", since),
      supabaseAdmin.rpc("honeypot_hourly_volume"),
    ]);

    const firstError = [
      events.error,
      visitors.error,
      restrictions.error,
      investigation.error,
      lastDay.error,
      volume.error,
    ].find(Boolean);
    assertQuerySucceeded(firstError ?? null, "Unable to load honeypot overview");

    return {
      totalEvents: events.count ?? 0,
      uniqueSources: visitors.count ?? 0,
      activeRestrictions: restrictions.count ?? 0,
      awaitingInvestigation: investigation.count ?? 0,
      last24Hours: lastDay.count ?? 0,
      hourlyVolume: volume.data ?? [],
      captureConfigured: Boolean(
        process.env.HONEYPOT_HASH_SECRET && process.env.HONEYPOT_HASH_SECRET.length >= 32,
      ),
      enforcementConfigured: Boolean(
        process.env.CLOUDFLARE_API_TOKEN &&
        process.env.CLOUDFLARE_ZONE_ID &&
        process.env.CLOUDFLARE_ZONE_HOSTNAME,
      ),
    };
  });

const listEventsSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  pageSize: z.number().int().min(10).max(50).default(25),
  search: z.string().trim().max(80).default(""),
  status: z.enum(eventStatuses).optional(),
  countryCode: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .optional(),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
  sort: z.enum(["detected_at", "status", "endpoint", "request_count"]).default("detected_at"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export const getHoneypotEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => listEventsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireHoneypotAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const start = (data.page - 1) * data.pageSize;
    const select =
      "id, visitor_id, detected_at, detection_reason, hostname, endpoint, request_method, referrer, user_agent, status, visitor:honeypot_visitors!honeypot_events_visitor_id_fkey!inner(id, ip_address, country, country_code, city, region, operating_system, browser, browser_version, device_type, asn, as_organization, hosting_classification, metadata_sources, is_trusted, first_seen, last_seen, request_count)";
    let query = supabaseAdmin.from("honeypot_events").select(select, { count: "exact" });

    if (data.status) query = query.eq("status", data.status);
    if (data.countryCode) query = query.eq("visitor.country_code", data.countryCode.toUpperCase());
    if (data.fromDate) query = query.gte("detected_at", `${data.fromDate}T00:00:00.000Z`);
    if (data.toDate) query = query.lte("detected_at", `${data.toDate}T23:59:59.999Z`);

    const safeSearch = data.search
      .replace(/[\\%_*,"()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (safeSearch) {
      const exactIp = ipSchema.safeParse(data.search);
      if (exactIp.success) {
        query = query.eq("visitor.ip_address", exactIp.data);
      } else {
        query = query.or(
          `hostname.ilike.%${safeSearch}%,endpoint.ilike.%${safeSearch}%,detection_reason.ilike.%${safeSearch}%,user_agent.ilike.%${safeSearch}%`,
        );
      }
    }

    if (data.sort === "request_count") {
      query = query.order("request_count", {
        referencedTable: "visitor",
        ascending: data.direction === "asc",
      });
    } else {
      query = query.order(data.sort, { ascending: data.direction === "asc" });
    }
    const { data: events, error, count } = await query.range(start, start + data.pageSize - 1);
    assertQuerySucceeded(error, "Unable to load honeypot events");

    const visitorIds = [...new Set((events ?? []).map((event) => event.visitor_id))];
    let protectedVisitorIds: string[] = [];
    if (visitorIds.length) {
      const { data: restrictions, error: restrictionError } = await supabaseAdmin
        .from("honeypot_ip_restrictions")
        .select("visitor_id")
        .in("visitor_id", visitorIds)
        .in("status", ["pending", "active", "pending_removal"]);
      assertQuerySucceeded(restrictionError, "Unable to load restriction status");
      protectedVisitorIds = [
        ...new Set((restrictions ?? []).flatMap((restriction) => restriction.visitor_id ?? [])),
      ];
    }

    return {
      events: events ?? [],
      protectedVisitorIds,
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

const investigationSchema = z.object({
  visitorId: z.string().uuid(),
  page: z.number().int().min(1).max(100_000).default(1),
});

export const getHoneypotInvestigation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => investigationSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireHoneypotAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: visitor, error: visitorError } = await supabaseAdmin
      .from("honeypot_visitors")
      .select(
        "id, ip_address, country, country_code, city, region, operating_system, browser, browser_version, device_type, asn, as_organization, hosting_classification, user_agent, metadata_sources, identity_purged_at, is_trusted, first_seen, last_seen, request_count, updated_at",
      )
      .eq("id", data.visitorId)
      .maybeSingle();
    assertQuerySucceeded(visitorError, "Unable to load visitor details");
    if (!visitor) throw new Response("Visitor not found", { status: 404 });

    const pageSize = 100;
    const offset = (data.page - 1) * pageSize;
    const [activity, notes, audit, restrictions, latestEvent] = await Promise.all([
      supabaseAdmin
        .from("honeypot_activity")
        .select(
          "id, occurred_at, event:honeypot_events!honeypot_activity_event_visitor_fkey!inner(id, detected_at, detection_reason, hostname, endpoint, request_method, referrer, user_agent, status)",
          { count: "exact" },
        )
        .eq("visitor_id", data.visitorId)
        .order("occurred_at", { ascending: false })
        .range(offset, offset + pageSize - 1),
      supabaseAdmin
        .from("honeypot_admin_notes")
        .select("id, event_id, administrator_id, note, created_at")
        .eq("visitor_id", data.visitorId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("honeypot_admin_audit")
        .select(
          "id, event_id, restriction_id, administrator_id, action, outcome, details, created_at",
        )
        .eq("visitor_id", data.visitorId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("honeypot_ip_restrictions")
        .select(
          "id, ip_address, cloudflare_rule_id, status, duration, reason, administrator_id, created_at, expires_at, released_at, updated_at",
        )
        .eq("visitor_id", data.visitorId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("honeypot_events")
        .select("referrer")
        .eq("visitor_id", data.visitorId)
        .order("detected_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    assertQuerySucceeded(
      activity.error ?? notes.error ?? audit.error ?? restrictions.error ?? latestEvent.error,
      "Unable to load visitor activity",
    );

    return {
      visitor,
      activity: activity.data ?? [],
      activityTotal: activity.count ?? 0,
      activityPage: data.page,
      activityPageSize: pageSize,
      notes: notes.data ?? [],
      audit: audit.data ?? [],
      restrictions: restrictions.data ?? [],
      latestReferrer: latestEvent.data?.referrer ?? null,
    };
  });

const changeStatusSchema = z.object({
  eventId: z.string().uuid(),
  status: z.enum(["new", "investigating", "confirmed_suspicious", "dismissed"]),
});

export const updateHoneypotEventStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => changeStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireHoneypotAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: findError } = await supabaseAdmin
      .from("honeypot_events")
      .select("id, visitor_id, status")
      .eq("id", data.eventId)
      .maybeSingle();
    assertQuerySucceeded(findError, "Unable to load event status");
    if (!existing) throw new Response("Event not found", { status: 404 });

    if (data.status === "dismissed") {
      const { count, error } = await supabaseAdmin
        .from("honeypot_ip_restrictions")
        .select("id", { count: "exact", head: true })
        .eq("visitor_id", existing.visitor_id)
        .eq("status", "active");
      assertQuerySucceeded(error, "Unable to verify the visitor restriction status");
      if ((count ?? 0) > 0) {
        throw new Response("Remove the active IP restriction before dismissing this event", {
          status: 409,
        });
      }
    }

    const auditResult = await supabaseAdmin.from("honeypot_admin_audit").insert({
      visitor_id: existing.visitor_id,
      event_id: existing.id,
      administrator_id: context.userId,
      action: "event_status_changed",
      outcome: "pending",
      details: { from: existing.status, to: data.status },
    });
    assertQuerySucceeded(auditResult.error, "Unable to audit the event status change");

    const { error: updateError } = await supabaseAdmin
      .from("honeypot_events")
      .update({ status: data.status })
      .eq("id", data.eventId);
    if (updateError) {
      const { error: failedAuditError } = await supabaseAdmin.from("honeypot_admin_audit").insert({
        visitor_id: existing.visitor_id,
        event_id: existing.id,
        administrator_id: context.userId,
        action: "event_status_changed",
        outcome: "failed",
        details: { from: existing.status, to: data.status },
      });
      if (failedAuditError) console.error("[honeypot] Failed status change audit was not recorded");
      assertQuerySucceeded(updateError, "Unable to update the event status");
    }

    const { error: auditUpdateError } = await supabaseAdmin.from("honeypot_admin_audit").insert({
      visitor_id: existing.visitor_id,
      event_id: existing.id,
      administrator_id: context.userId,
      action: "event_status_changed",
      outcome: "success",
      details: { from: existing.status, to: data.status },
    });
    assertQuerySucceeded(auditUpdateError, "Event status changed but audit confirmation failed");
    return { ok: true };
  });

const addNoteSchema = z.object({
  visitorId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  note: z.string().trim().min(1).max(2000),
});

export const addHoneypotInvestigationNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => addNoteSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireHoneypotAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.eventId) {
      const { count, error } = await supabaseAdmin
        .from("honeypot_events")
        .select("id", { count: "exact", head: true })
        .eq("id", data.eventId)
        .eq("visitor_id", data.visitorId);
      assertQuerySucceeded(error, "Unable to verify the linked event");
      if (!count) throw new Response("Event does not belong to this visitor", { status: 404 });
    }

    const auditResult = await supabaseAdmin.from("honeypot_admin_audit").insert({
      visitor_id: data.visitorId,
      event_id: data.eventId ?? null,
      administrator_id: context.userId,
      action: "note_added",
      outcome: "pending",
    });
    assertQuerySucceeded(auditResult.error, "Unable to audit the investigation note");

    const noteResult = await supabaseAdmin
      .from("honeypot_admin_notes")
      .insert({
        visitor_id: data.visitorId,
        event_id: data.eventId ?? null,
        administrator_id: context.userId,
        note: data.note,
      })
      .select("id")
      .single();
    if (noteResult.error || !noteResult.data) {
      const { error: failedAuditError } = await supabaseAdmin.from("honeypot_admin_audit").insert({
        visitor_id: data.visitorId,
        event_id: data.eventId ?? null,
        administrator_id: context.userId,
        action: "note_added",
        outcome: "failed",
      });
      if (failedAuditError) console.error("[honeypot] Failed note audit was not recorded");
      assertQuerySucceeded(noteResult.error, "Unable to save the investigation note");
      throw new Error("Unable to save the investigation note");
    }
    const note = noteResult.data;

    const { error: auditUpdateError } = await supabaseAdmin.from("honeypot_admin_audit").insert({
      visitor_id: data.visitorId,
      event_id: data.eventId ?? null,
      administrator_id: context.userId,
      action: "note_added",
      outcome: "success",
      details: { note_id: note.id },
    });
    assertQuerySucceeded(auditUpdateError, "Note saved but audit confirmation failed");
    return { ok: true };
  });

const restrictIpSchema = z.object({
  visitorId: z.string().uuid(),
  ipAddress: ipSchema,
  duration: z.enum(restrictionDurations),
  reason: z.string().trim().min(1).max(500),
  confirmed: z.literal(true),
});

export const restrictHoneypotVisitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => restrictIpSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireHoneypotAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getHoneypotRestrictionExpiry } = await import("@/lib/honeypot/restriction-policy");
    const {
      CloudflareRestrictionCleanupError,
      createCloudflareRestriction,
      assertRestrictionIsSafe,
      cloudflareFailureMessage,
      removeCloudflareRestriction,
      verifyCloudflareZoneHostname,
    } = await import("@/lib/honeypot/cloudflare.server");
    const zoneHostname = zoneHostnameSchema.safeParse(
      process.env.CLOUDFLARE_ZONE_HOSTNAME?.trim().toLowerCase() ?? "",
    );
    if (!zoneHostname.success) {
      throw new Response("A valid proxied Cloudflare zone hostname is required for restrictions", {
        status: 409,
      });
    }
    const request = getRequest();
    const currentAdminIp = request?.headers.get("cf-connecting-ip") ?? null;
    const { data: visitor, error: visitorError } = await supabaseAdmin
      .from("honeypot_visitors")
      .select("id, ip_address, is_trusted")
      .eq("id", data.visitorId)
      .maybeSingle();
    assertQuerySucceeded(visitorError, "Unable to verify visitor details");
    if (!visitor || !visitor.ip_address || visitor.ip_address !== data.ipAddress) {
      throw new Response("Visitor IP address could not be verified", { status: 409 });
    }
    assertRestrictionIsSafe(data.ipAddress, currentAdminIp, visitor.is_trusted);

    await verifyCloudflareZoneHostname(zoneHostname.data);

    const { count: existingCount, error: existingError } = await supabaseAdmin
      .from("honeypot_ip_restrictions")
      .select("id", { count: "exact", head: true })
      .eq("visitor_id", data.visitorId)
      .in("status", ["pending", "active", "pending_removal"]);
    assertQuerySucceeded(existingError, "Unable to verify existing IP restrictions");
    if ((existingCount ?? 0) > 0) {
      throw new Response("This visitor already has an active or pending IP restriction", {
        status: 409,
      });
    }
    const { count: ipRestrictionCount, error: ipRestrictionError } = await supabaseAdmin
      .from("honeypot_ip_restrictions")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", data.ipAddress)
      .in("status", ["pending", "active", "pending_removal"]);
    assertQuerySucceeded(ipRestrictionError, "Unable to verify restrictions for this IP");
    if ((ipRestrictionCount ?? 0) > 0) {
      throw new Response("This IP already has an active or pending restriction", { status: 409 });
    }

    const now = new Date();
    const expiresAt = getHoneypotRestrictionExpiry(data.duration, now);
    const restrictionResult = await supabaseAdmin
      .from("honeypot_ip_restrictions")
      .insert({
        visitor_id: data.visitorId,
        ip_address: data.ipAddress,
        duration: data.duration,
        reason: data.reason,
        administrator_id: context.userId,
        created_at: now.toISOString(),
        expires_at: expiresAt,
        status: "pending",
      })
      .select("id")
      .single();
    if (restrictionResult.error?.code === "23505") {
      throw new Response("This IP already has an active or pending restriction", { status: 409 });
    }
    const restriction = requireQueryData(
      restrictionResult.data,
      restrictionResult.error,
      "Unable to prepare the IP restriction",
    );

    const auditResult = await supabaseAdmin.from("honeypot_admin_audit").insert({
      visitor_id: data.visitorId,
      restriction_id: restriction.id,
      administrator_id: context.userId,
      action: "restriction_requested",
      outcome: "pending",
      details: { duration: data.duration, reason: data.reason },
    });
    if (auditResult.error) {
      await supabaseAdmin
        .from("honeypot_ip_restrictions")
        .update({ status: "failed", released_at: new Date().toISOString() })
        .eq("id", restriction.id);
      assertQuerySucceeded(auditResult.error, "Unable to audit the IP restriction");
      throw new Error("Unable to audit the IP restriction");
    }

    let ruleId: string;
    try {
      ruleId = await createCloudflareRestriction(data.ipAddress, restriction.id);
    } catch (error) {
      console.error("[honeypot] Cloudflare restriction creation or verification failed", error);
      const failedAt = new Date().toISOString();
      const cleanupError = error instanceof CloudflareRestrictionCleanupError ? error : null;
      const { error: failedError } = await supabaseAdmin
        .from("honeypot_ip_restrictions")
        .update({
          status: cleanupError ? "pending_removal" : "failed",
          cloudflare_rule_id: cleanupError?.cloudflareRuleId ?? null,
          released_at: cleanupError ? null : failedAt,
          updated_at: failedAt,
        })
        .eq("id", restriction.id)
        .eq("status", "pending");
      const { error: failedAuditError } = await supabaseAdmin.from("honeypot_admin_audit").insert({
        visitor_id: data.visitorId,
        restriction_id: restriction.id,
        administrator_id: context.userId,
        action: "restriction_failed",
        outcome: "failed",
        details: { duration: data.duration, cleanup_pending: Boolean(cleanupError) },
      });
      if (failedError || failedAuditError) {
        console.error("[honeypot] Failed IP restriction could not be fully recorded");
      }
      if (failedError && cleanupError) {
        try {
          await removeCloudflareRestriction(
            data.ipAddress,
            restriction.id,
            cleanupError.cloudflareRuleId,
          );
        } catch (cleanupError) {
          console.error(
            "[honeypot] Unverified Cloudflare restriction could not be recorded or removed",
            cleanupError,
          );
        }
      }
      throw new Error(cloudflareFailureMessage(error));
    }

    const activatedAt = new Date().toISOString();
    const { data: activatedRestriction, error: activationError } = await supabaseAdmin
      .from("honeypot_ip_restrictions")
      .update({
        status: "active",
        cloudflare_rule_id: ruleId,
        updated_at: activatedAt,
      })
      .eq("id", restriction.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (activationError || !activatedRestriction) {
      console.error("[honeypot] Cloudflare restricted the IP but restriction persistence failed");
      const { data: pendingRemoval, error: pendingRemovalError } = await supabaseAdmin
        .from("honeypot_ip_restrictions")
        .update({
          status: "pending_removal",
          cloudflare_rule_id: ruleId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", restriction.id)
        .select("id")
        .maybeSingle();
      const pendingRemovalNotTracked = pendingRemovalError || !pendingRemoval;
      if (pendingRemovalNotTracked) {
        console.error(
          "[honeypot] Cloudflare restriction could not be tracked for automatic cleanup",
          pendingRemovalError,
        );
      }
      let cloudflareRemovalPending = false;
      try {
        await removeCloudflareRestriction(data.ipAddress, restriction.id, ruleId);
        const { data: failedState, error: cleanupStateError } = await supabaseAdmin
          .from("honeypot_ip_restrictions")
          .update({
            status: "failed",
            cloudflare_rule_id: null,
            released_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", restriction.id)
          .in("status", ["pending", "pending_removal"])
          .select("id")
          .maybeSingle();
        if (cleanupStateError || !failedState) {
          console.error("[honeypot] Cloudflare rule was removed but cleanup state was not saved");
        }
      } catch (cleanupError) {
        cloudflareRemovalPending = true;
        console.error("[honeypot] Cloudflare restriction cleanup is pending retry", cleanupError);
        if (pendingRemovalNotTracked) {
          const { data: retracked, error: trackingRetryError } = await supabaseAdmin
            .from("honeypot_ip_restrictions")
            .update({
              status: "pending_removal",
              cloudflare_rule_id: ruleId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", restriction.id)
            .select("id")
            .maybeSingle();
          if (trackingRetryError || !retracked) {
            console.error(
              "[honeypot] Unremoved Cloudflare rule could not be tracked for automatic retry",
              trackingRetryError,
            );
          }
        }
      }
      const { error: failedAuditError } = await supabaseAdmin.from("honeypot_admin_audit").insert({
        visitor_id: data.visitorId,
        restriction_id: restriction.id,
        administrator_id: context.userId,
        action: "restriction_failed",
        outcome: "failed",
        details: {
          duration: data.duration,
          cleanup_pending: cloudflareRemovalPending,
          restriction_tracking_failed: Boolean(pendingRemovalNotTracked),
        },
      });
      if (failedAuditError) console.error("[honeypot] Failed activation audit was not recorded");
      throw new Error(
        cloudflareRemovalPending
          ? pendingRemovalNotTracked
            ? "Cloudflare restriction removal is pending, but its retry state could not be saved"
            : "Cloudflare restriction removal is pending automatic retry"
          : pendingRemovalNotTracked
            ? "Cloudflare restriction was removed, but the failed status could not be saved"
            : "Restriction activation failed; Cloudflare rule was removed",
      );
    }

    const { error: eventError } = await supabaseAdmin
      .from("honeypot_events")
      .update({ status: "restricted" })
      .eq("visitor_id", data.visitorId)
      .neq("status", "dismissed");
    const { error: auditUpdateError } = await supabaseAdmin.from("honeypot_admin_audit").insert({
      visitor_id: data.visitorId,
      restriction_id: restriction.id,
      administrator_id: context.userId,
      action: "restriction_activated",
      outcome: "success",
      details: { duration: data.duration, cloudflare_rule_id: ruleId },
    });
    if (eventError || auditUpdateError) {
      console.error("[honeypot] IP restriction succeeded but related records need review");
      throw new Error("IP restriction is active; some audit records need review");
    }
    return { ok: true, restrictionId: restriction.id, expiresAt };
  });

const verifyRestrictionSchema = z.object({
  visitorId: z.string().uuid(),
  restrictionId: z.string().uuid(),
});

export const verifyHoneypotRestriction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => verifyRestrictionSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireHoneypotAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyCloudflareRestriction, cloudflareFailureMessage } =
      await import("@/lib/honeypot/cloudflare.server");
    const { data: restriction, error: restrictionError } = await supabaseAdmin
      .from("honeypot_ip_restrictions")
      .select("id, visitor_id, ip_address, cloudflare_rule_id, status")
      .eq("id", data.restrictionId)
      .eq("visitor_id", data.visitorId)
      .maybeSingle();
    assertQuerySucceeded(restrictionError, "Unable to load the IP restriction");
    if (!restriction) throw new Response("IP restriction not found", { status: 404 });
    if (
      restriction.status !== "active" ||
      !restriction.visitor_id ||
      !restriction.ip_address ||
      !restriction.cloudflare_rule_id
    ) {
      return { verified: false, reason: "restriction_not_active" as const };
    }

    const zoneHostname = zoneHostnameSchema.safeParse(
      process.env.CLOUDFLARE_ZONE_HOSTNAME?.trim().toLowerCase() ?? "",
    );
    if (!zoneHostname.success) {
      throw new Response("A valid Cloudflare zone hostname is required for verification", {
        status: 409,
      });
    }

    let verification: Awaited<ReturnType<typeof verifyCloudflareRestriction>>;
    try {
      verification = await verifyCloudflareRestriction(
        restriction.ip_address,
        restriction.id,
        restriction.cloudflare_rule_id,
        zoneHostname.data,
      );
    } catch (error) {
      console.error("[honeypot] Cloudflare restriction verification request failed", error);
      throw new Error(cloudflareFailureMessage(error));
    }
    if (verification.verified) {
      const { data: updated, error: verifyTimestampError } = await supabaseAdmin
        .from("honeypot_ip_restrictions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", restriction.id)
        .eq("status", "active")
        .select("id")
        .maybeSingle();
      assertQuerySucceeded(verifyTimestampError, "Unable to save Cloudflare verification time");
      if (!updated) {
        throw new Response("Restriction status changed during verification; reload the record", {
          status: 409,
        });
      }
      return verification;
    }

    const failedAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("honeypot_ip_restrictions")
      .update({ status: "failed", released_at: failedAt, updated_at: failedAt })
      .eq("id", restriction.id)
      .eq("status", "active");
    if (updateError) {
      console.error("[honeypot] Failed verification could not synchronize restriction status");
      throw new Error("Cloudflare enforcement is unverified and restriction status needs review");
    }

    const { error: eventError } = await supabaseAdmin
      .from("honeypot_events")
      .update({ status: "confirmed_suspicious" })
      .eq("visitor_id", restriction.visitor_id)
      .eq("status", "restricted");
    const { error: auditError } = await supabaseAdmin.from("honeypot_admin_audit").insert({
      visitor_id: restriction.visitor_id,
      restriction_id: restriction.id,
      administrator_id: context.userId,
      action: "restriction_failed",
      outcome: "failed",
      details: { phase: "verification", reason: verification.reason },
    });
    if (eventError || auditError) {
      console.error("[honeypot] Failed verification state needs administrative review");
      throw new Error("Cloudflare enforcement failed verification; related records need review");
    }
    return verification;
  });

const unrestrictSchema = z.object({
  visitorId: z.string().uuid(),
  restrictionId: z.string().uuid(),
  confirmed: z.literal(true),
});

export const unrestrictHoneypotVisitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => unrestrictSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireHoneypotAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { removeCloudflareRestriction } = await import("@/lib/honeypot/cloudflare.server");
    const { data: restriction, error: findError } = await supabaseAdmin
      .from("honeypot_ip_restrictions")
      .select("id, visitor_id, ip_address, cloudflare_rule_id, status")
      .eq("id", data.restrictionId)
      .eq("visitor_id", data.visitorId)
      .maybeSingle();
    assertQuerySucceeded(findError, "Unable to load the IP restriction");
    if (!restriction || restriction.status !== "active") {
      throw new Response("This IP restriction is not active", { status: 409 });
    }
    if (!restriction.ip_address || !restriction.cloudflare_rule_id) {
      throw new Error("Active restriction is missing its Cloudflare rule information");
    }

    const auditResult = await supabaseAdmin.from("honeypot_admin_audit").insert({
      visitor_id: data.visitorId,
      restriction_id: restriction.id,
      administrator_id: context.userId,
      action: "restriction_removal_requested",
      outcome: "pending",
    });
    assertQuerySucceeded(auditResult.error, "Unable to audit the restriction removal");

    const requestedAt = new Date().toISOString();
    const { error: pendingError } = await supabaseAdmin
      .from("honeypot_ip_restrictions")
      .update({ status: "pending_removal", updated_at: requestedAt })
      .eq("id", restriction.id)
      .eq("status", "active");
    if (pendingError) {
      const { error: failedAuditError } = await supabaseAdmin.from("honeypot_admin_audit").insert({
        visitor_id: data.visitorId,
        restriction_id: restriction.id,
        administrator_id: context.userId,
        action: "restriction_removal_failed",
        outcome: "failed",
        details: { phase: "preparing_removal" },
      });
      if (failedAuditError) console.error("[honeypot] Failed unban audit was not recorded");
      assertQuerySucceeded(pendingError, "Unable to prepare restriction removal");
    }

    try {
      await removeCloudflareRestriction(
        restriction.ip_address,
        restriction.id,
        restriction.cloudflare_rule_id,
      );
    } catch (error) {
      console.error("[honeypot] Cloudflare restriction removal failed", error);
      const { error: restoreError } = await supabaseAdmin
        .from("honeypot_ip_restrictions")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", restriction.id)
        .eq("status", "pending_removal");
      const { error: auditUpdateError } = await supabaseAdmin.from("honeypot_admin_audit").insert({
        visitor_id: data.visitorId,
        restriction_id: restriction.id,
        administrator_id: context.userId,
        action: "restriction_removal_failed",
        outcome: "failed",
      });
      if (restoreError || auditUpdateError) {
        console.error("[honeypot] Failed restriction removal state could not be fully recorded");
      }
      throw new Error("Cloudflare could not verify restriction removal");
    }

    const removedAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("honeypot_ip_restrictions")
      .update({ status: "unbanned", released_at: removedAt, updated_at: removedAt })
      .eq("id", restriction.id)
      .eq("status", "pending_removal");
    if (updateError) {
      console.error("[honeypot] Cloudflare removed the IP rule but database status update failed");
      throw new Error("Cloudflare removed the IP restriction; database status needs review");
    }

    const { error: eventError } = await supabaseAdmin
      .from("honeypot_events")
      .update({ status: "confirmed_suspicious" })
      .eq("visitor_id", data.visitorId)
      .eq("status", "restricted");
    const { error: auditUpdateError } = await supabaseAdmin.from("honeypot_admin_audit").insert({
      visitor_id: data.visitorId,
      restriction_id: restriction.id,
      administrator_id: context.userId,
      action: "restriction_removed",
      outcome: "success",
      details: { cloudflare_rule_id: restriction.cloudflare_rule_id },
    });
    if (eventError || auditUpdateError) {
      console.error("[honeypot] Restriction removed but related records need review");
      throw new Error("IP restriction was removed; some audit records need review");
    }
    return { ok: true };
  });
