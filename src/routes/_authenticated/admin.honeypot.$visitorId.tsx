import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  Ban,
  Clock3,
  Globe2,
  LoaderCircle,
  MessageSquareText,
  Monitor,
  Network,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Unplug,
} from "lucide-react";

import { HoneypotRestrictionDialog } from "@/components/admin/HoneypotRestrictionDialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Route as AuthenticatedRoute } from "./route";
import {
  addHoneypotInvestigationNote,
  getHoneypotInvestigation,
  unrestrictHoneypotVisitor,
  updateHoneypotEventStatus,
} from "@/lib/admin/honeypot.functions";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/honeypot/$visitorId")({
  head: () => ({
    meta: [
      { title: "Visitor investigation — Honeypot Monitor" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: HoneypotInvestigation,
});

const EVENT_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "investigating", label: "Investigating" },
  { value: "confirmed_suspicious", label: "Confirmed suspicious" },
  { value: "dismissed", label: "Dismissed" },
] as const;

const statusClass: Record<string, string> = {
  new: "bg-sky-50 text-sky-900 ring-sky-200",
  investigating: "bg-amber-50 text-amber-950 ring-amber-200",
  confirmed_suspicious: "bg-orange-50 text-orange-950 ring-orange-200",
  restricted: "bg-rose-50 text-rose-950 ring-rose-200",
  dismissed: "bg-slate-100 text-slate-700 ring-slate-200",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function countryFlag(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...Array.from(code, (letter) => letter.charCodeAt(0) + 127397));
}

function metadataSource(metadata: Json, key: string): string {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const source = metadata[key];
    if (typeof source === "string" && source) return source;
  }
  return "Unavailable";
}

function statusLabel(status: string): string {
  return EVENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function statusPill(status: string) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${statusClass[status] ?? statusClass.new}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    event_status_changed: "Event status changed",
    note_added: "Investigation note added",
    restriction_requested: "IP restriction requested",
    restriction_activated: "Cloudflare restriction verified",
    restriction_failed: "Cloudflare restriction failed",
    restriction_removal_requested: "Restriction removal requested",
    restriction_removal_failed: "Cloudflare restriction removal failed",
    restriction_removed: "Cloudflare restriction removed",
    restriction_expired: "Temporary restriction expired",
  };
  return labels[action] ?? action;
}

function detailsText(details: Json): string {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  const entries = Object.entries(details)
    .filter(([key, value]) => key !== "cloudflare_rule_id" && typeof value === "string")
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${value}`);
  return entries.join(" · ");
}

type TimelineEntry = {
  id: string;
  at: string;
  title: string;
  description: string;
  kind: "request" | "note" | "admin";
  eventId?: string;
  eventStatus?: string;
};

function HoneypotInvestigation() {
  const { isAdmin } = AuthenticatedRoute.useRouteContext();
  const { visitorId } = Route.useParams();
  const [activityPage, setActivityPage] = useState(1);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [actionError, setActionError] = useState("");
  const [unbanRestrictionId, setUnbanRestrictionId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const queryKey = ["honeypot", "visitor", visitorId, activityPage];
  const investigationQuery = useQuery({
    queryKey,
    queryFn: () => getHoneypotInvestigation({ data: { visitorId, page: activityPage } }),
    enabled: isAdmin,
  });

  const invalidateVisitor = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["honeypot", "visitor", visitorId] }),
      queryClient.invalidateQueries({ queryKey: ["honeypot", "events"] }),
      queryClient.invalidateQueries({ queryKey: ["honeypot", "overview"] }),
    ]);
  };

  const noteMutation = useMutation({
    mutationFn: () => addHoneypotInvestigationNote({ data: { visitorId, note: note.trim() } }),
    onSuccess: async () => {
      setNote("");
      setNoteError("");
      await invalidateVisitor();
    },
    onError: (error) => setNoteError(error.message),
  });
  const statusMutation = useMutation({
    mutationFn: (input: {
      eventId: string;
      status: (typeof EVENT_STATUS_OPTIONS)[number]["value"];
    }) => updateHoneypotEventStatus({ data: input }),
    onSuccess: invalidateVisitor,
    onError: (error) => setActionError(error.message),
  });
  const unbanMutation = useMutation({
    mutationFn: (restrictionId: string) =>
      unrestrictHoneypotVisitor({
        data: { visitorId, restrictionId, confirmed: true },
      }),
    onSuccess: async () => {
      setUnbanRestrictionId(null);
      setActionError("");
      await invalidateVisitor();
    },
    onError: (error) => setActionError(error.message),
  });

  if (!isAdmin) return <Navigate to="/admin" />;

  const record = investigationQuery.data;
  const visitor = record?.visitor;
  const restrictions = record?.restrictions ?? [];
  const currentRestriction = restrictions.find((item) => item.status === "active");
  const pendingRestriction = restrictions.some((item) =>
    ["pending", "pending_removal"].includes(item.status),
  );
  const hasLiveRestriction = Boolean(currentRestriction || pendingRestriction);
  const eventCount = record?.activityTotal ?? 0;
  const pageSize = record?.activityPageSize ?? 100;
  const totalPages = Math.max(1, Math.ceil(eventCount / pageSize));

  const timeline: TimelineEntry[] = [
    ...(record?.activity ?? []).map((item): TimelineEntry => ({
      id: `request-${item.id}`,
      at: item.occurred_at,
      title: item.event.detection_reason,
      description: `${item.event.request_method} ${item.event.hostname}${item.event.endpoint}`,
      kind: "request",
      eventId: item.event.id,
      eventStatus: item.event.status,
    })),
    ...(record?.notes ?? []).map((item): TimelineEntry => ({
      id: `note-${item.id}`,
      at: item.created_at,
      title: "Investigation note",
      description: item.note,
      kind: "note",
    })),
    ...(record?.audit ?? []).map((item): TimelineEntry => ({
      id: `audit-${item.id}`,
      at: item.created_at,
      title: actionLabel(item.action),
      description: detailsText(item.details) || `Outcome: ${item.outcome}`,
      kind: "admin",
      eventId: item.event_id ?? undefined,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const start = visitor ? new Date(visitor.first_seen).getTime() : 0;
  const end = visitor ? new Date(visitor.last_seen).getTime() : 0;
  const durationHours = (end - start) / 3_600_000;
  const requestsPerHour =
    visitor && durationHours > 0 ? (visitor.request_count / durationHours).toFixed(1) : null;
  const metadataItems = visitor
    ? [
        { label: "Operating system", value: visitor.operating_system, source: "operatingSystem" },
        {
          label: "Browser",
          value: visitor.browser
            ? `${visitor.browser}${visitor.browser_version ? ` ${visitor.browser_version}` : ""}`
            : null,
          source: "browser",
        },
        { label: "Device", value: visitor.device_type, source: "deviceType" },
        { label: "Country", value: visitor.country, source: "country" },
        { label: "City", value: visitor.city, source: "city" },
        { label: "Region", value: visitor.region, source: "region" },
        { label: "ASN", value: visitor.asn ? `AS${visitor.asn}` : null, source: "asn" },
        {
          label: "Network organization",
          value: visitor.as_organization,
          source: "asOrganization",
        },
        {
          label: "Hosting classification",
          value: visitor.hosting_classification,
          source: "hostingClassification",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Link
        to="/admin/honeypot"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Honeypot Monitor
      </Link>

      {investigationQuery.isError ? (
        <section
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-950"
        >
          <h1 className="font-semibold">Visitor record unavailable</h1>
          <p className="mt-1">
            The investigation could not be loaded or you do not have administrator access.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void investigationQuery.refetch()}
          >
            Retry
          </Button>
        </section>
      ) : investigationQuery.isLoading || !visitor ? (
        <div role="status" className="space-y-4" aria-label="Loading visitor record">
          <div className="h-28 animate-pulse rounded-2xl bg-white" />
          <div className="h-80 animate-pulse rounded-2xl bg-white" />
        </div>
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-5 rounded-2xl bg-[#10213b] p-5 text-white shadow-sm sm:p-7">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                Visitor investigation
                {visitor.is_trusted && (
                  <span className="rounded-full border border-emerald-200/30 px-2 py-1 text-[10px] text-emerald-100">
                    Trusted address · restriction disabled
                  </span>
                )}
              </div>
              <h1 className="mt-3 break-all font-mono text-2xl font-semibold sm:text-3xl">
                {visitor.ip_address ?? "IP address unavailable"}
              </h1>
              <p className="mt-2 text-sm text-white/65">
                {countryFlag(visitor.country_code)} {visitor.country ?? "Country unavailable"}
                {visitor.country_code ? ` (${visitor.country_code})` : ""}
                {visitor.city ? ` · ${visitor.city}` : ""}
                {visitor.region ? `, ${visitor.region}` : ""}
              </p>
              <p className="mt-2 text-xs text-white/55">
                First detected {formatDate(visitor.first_seen)} · Last activity{" "}
                {formatDate(visitor.last_seen)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!hasLiveRestriction && (
                <HoneypotRestrictionDialog
                  visitorId={visitor.id}
                  ipAddress={visitor.ip_address}
                  isTrusted={visitor.is_trusted}
                />
              )}
              {currentRestriction && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                  onClick={() => {
                    setActionError("");
                    setUnbanRestrictionId(currentRestriction.id);
                  }}
                >
                  <Unplug className="mr-2 h-4 w-4" aria-hidden="true" />
                  Unban IP
                </Button>
              )}
            </div>
          </header>

          {pendingRestriction && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
            >
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                A Cloudflare restriction operation is pending. The enforcement status is not shown
                as active until Cloudflare confirms it.
              </p>
            </div>
          )}
          {visitor.identity_purged_at && (
            <div
              role="status"
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
            >
              Source metadata was purged on {formatDate(visitor.identity_purged_at)} under the
              90-day retention policy. The restriction record retains only the IP address needed to
              administer the active Cloudflare rule.
            </div>
          )}
          {actionError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950"
            >
              {actionError}
            </div>
          )}

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.8fr)]">
            <section
              aria-labelledby="activity-title"
              className="min-w-0 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:px-6">
                <div>
                  <h2 id="activity-title" className="font-semibold text-navy">
                    Activity timeline
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Newest first · {eventCount.toLocaleString()} recorded requests
                  </p>
                </div>
                <span className="text-xs tabular-nums text-slate-500">
                  Page {activityPage} of {totalPages}
                </span>
              </div>

              {timeline.length === 0 ? (
                <p className="px-6 py-10 text-sm text-slate-600">
                  No activity has been recorded for this source.
                </p>
              ) : (
                <ol className="divide-y divide-slate-100">
                  {timeline.map((item) => (
                    <li key={item.id} className="flex gap-3 px-5 py-4 sm:px-6">
                      <span
                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.kind === "request" ? "bg-amber-50 text-amber-800" : item.kind === "note" ? "bg-sky-50 text-sky-800" : "bg-slate-100 text-slate-700"}`}
                      >
                        {item.kind === "request" ? (
                          <Globe2 className="h-4 w-4" aria-hidden="true" />
                        ) : item.kind === "note" ? (
                          <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-medium text-navy">{item.title}</h3>
                          {item.eventStatus && statusPill(item.eventStatus)}
                        </div>
                        <p className="mt-1 break-words text-sm leading-relaxed text-slate-700">
                          {item.description}
                        </p>
                        <time className="mt-2 block text-xs text-slate-500" dateTime={item.at}>
                          {formatDate(item.at)}
                        </time>
                        {item.kind === "request" && item.eventId && item.eventStatus && (
                          <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                            Review status
                            <select
                              value={
                                item.eventStatus === "restricted"
                                  ? "confirmed_suspicious"
                                  : item.eventStatus
                              }
                              disabled={
                                statusMutation.isPending || item.eventStatus === "restricted"
                              }
                              onChange={(event) => {
                                const nextStatus = EVENT_STATUS_OPTIONS.find(
                                  (option) => option.value === event.target.value,
                                )?.value;
                                if (nextStatus) {
                                  setActionError("");
                                  statusMutation.mutate({
                                    eventId: item.eventId!,
                                    status: nextStatus,
                                  });
                                }
                              }}
                              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                            >
                              {EVENT_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 sm:px-6">
                <span className="text-xs tabular-nums text-slate-600">
                  {eventCount === 0
                    ? "No requests"
                    : `Requests ${(activityPage - 1) * pageSize + 1}–${Math.min(activityPage * pageSize, eventCount)} of ${eventCount}`}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-10"
                    disabled={activityPage <= 1 || investigationQuery.isFetching}
                    onClick={() => setActivityPage((value) => Math.max(1, value - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-10"
                    disabled={activityPage >= totalPages || investigationQuery.isFetching}
                    onClick={() => setActivityPage((value) => Math.min(totalPages, value + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </section>

            <div className="space-y-5">
              <section
                aria-labelledby="metadata-title"
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
              >
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-amber-700" aria-hidden="true" />
                  <h2 id="metadata-title" className="font-semibold text-navy">
                    Visitor intelligence
                  </h2>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Latest observed metadata · updated {formatDate(visitor.updated_at)}
                </p>
                <dl className="mt-4 divide-y divide-slate-100">
                  {metadataItems.map((item) => (
                    <div key={item.label} className="py-3 first:pt-0 last:pb-0">
                      <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
                      <dd className="mt-1 break-words text-sm text-slate-900">
                        {item.value || "Unavailable"}
                      </dd>
                      <dd className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        {metadataSource(visitor.metadata_sources, item.source)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-600">
                  <Network className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  ISP identification is unavailable from the current Cloudflare request metadata.
                </div>
              </section>

              <section
                aria-labelledby="frequency-title"
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-700" aria-hidden="true" />
                  <h2 id="frequency-title" className="font-semibold text-navy">
                    Request frequency
                  </h2>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs text-slate-500">Recorded requests</dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums text-navy">
                      {visitor.request_count}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Approx. lifetime average</dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums text-navy">
                      {requestsPerHour ? `${requestsPerHour}/h` : "—"}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  Average is based on the time between first and last detection, not a maliciousness
                  score.
                </p>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="text-xs font-medium text-slate-500">User-Agent</div>
                  <p className="mt-1 break-all font-mono text-xs leading-relaxed text-slate-800">
                    {visitor.user_agent ?? "Unavailable"}
                  </p>
                  <div className="mt-4 text-xs font-medium text-slate-500">Latest referrer</div>
                  <p className="mt-1 break-all text-xs text-slate-800">
                    {record.latestReferrer ?? "Not supplied"}
                  </p>
                </div>
              </section>

              <section
                aria-labelledby="restriction-title"
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
              >
                <div className="flex items-center gap-2">
                  <Ban className="h-4 w-4 text-amber-700" aria-hidden="true" />
                  <h2 id="restriction-title" className="font-semibold text-navy">
                    Enforcement history
                  </h2>
                </div>
                {restrictions.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-600">No IP restriction has been applied.</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {restrictions.map((restriction) => (
                      <li
                        key={restriction.id}
                        className="border-t border-slate-100 pt-4 first:border-0 first:pt-0"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-xs text-slate-800">
                            {restriction.ip_address ??
                              "Address retained only while restriction is active"}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${restriction.status === "active" ? "bg-rose-50 text-rose-900" : restriction.status === "pending" || restriction.status === "pending_removal" ? "bg-amber-50 text-amber-950" : "bg-slate-100 text-slate-700"}`}
                          >
                            {restriction.status.replaceAll("_", " ")}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">
                          {restriction.reason}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {restriction.duration.replaceAll("_", " ")} · created{" "}
                          {formatDate(restriction.created_at)}
                          {restriction.expires_at
                            ? ` · expires ${formatDate(restriction.expires_at)}`
                            : ""}
                          {restriction.released_at
                            ? ` · released ${formatDate(restriction.released_at)}`
                            : ""}
                        </p>
                        {restriction.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 min-h-10"
                            onClick={() => {
                              setActionError("");
                              setUnbanRestrictionId(restriction.id);
                            }}
                          >
                            <Unplug className="mr-2 h-4 w-4" aria-hidden="true" />
                            Unban this IP
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section
                aria-labelledby="notes-title"
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
              >
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-amber-700" aria-hidden="true" />
                  <h2 id="notes-title" className="font-semibold text-navy">
                    Administrative notes
                  </h2>
                </div>
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setNoteError("");
                    noteMutation.mutate();
                  }}
                >
                  <label
                    htmlFor="investigation-note"
                    className="block text-xs font-medium text-slate-600"
                  >
                    Add a note
                  </label>
                  <textarea
                    id="investigation-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Record relevant investigation context. Avoid unrelated personal information."
                    className="w-full rounded-lg border border-input bg-card p-3 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                  {noteError && (
                    <p role="alert" className="text-sm text-rose-800">
                      {noteError}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="min-h-11"
                    disabled={noteMutation.isPending || !note.trim()}
                  >
                    {noteMutation.isPending && (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    )}
                    Add investigation note
                  </Button>
                </form>
                {record.notes.length > 0 && (
                  <ul className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                    {record.notes.map((item) => (
                      <li key={item.id} className="text-sm leading-relaxed text-slate-700">
                        <p className="whitespace-pre-wrap break-words">{item.note}</p>
                        <time
                          className="mt-1 block text-xs text-slate-500"
                          dateTime={item.created_at}
                        >
                          {formatDate(item.created_at)}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      <AlertDialog
        open={Boolean(unbanRestrictionId)}
        onOpenChange={(open) => {
          if (!open && !unbanMutation.isPending) setUnbanRestrictionId(null);
        }}
      >
        <AlertDialogContent className="sm:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this IP restriction?</AlertDialogTitle>
            <AlertDialogDescription>
              The Cloudflare rule will be deleted and verified before the restriction is marked as
              removed. Other independent Cloudflare rules may still apply.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unbanMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={unbanMutation.isPending || !unbanRestrictionId}
              onClick={() => unbanRestrictionId && unbanMutation.mutate(unbanRestrictionId)}
            >
              {unbanMutation.isPending && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Confirm unban
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
