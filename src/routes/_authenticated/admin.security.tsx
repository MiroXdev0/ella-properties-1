import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Copy,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  exportSecurityEvents,
  getSecurityEvents,
  getSecurityOverview,
  updateSecurityEventStatus,
} from "@/lib/admin/security.functions";
import {
  SECURITY_SIGNAL_INFO,
  type SecurityCategory,
  type SecuritySeverity,
  type SecuritySignalCode,
} from "@/lib/security-monitoring";
import type { Json } from "@/integrations/supabase/types";
import { Route as AuthenticatedRoute } from "./route";

export const Route = createFileRoute("/_authenticated/admin/security")({
  head: () => ({
    meta: [
      { title: "Site Security Monitor — Ella Properties" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SiteSecurityMonitor,
});

const SEVERITIES: Array<SecuritySeverity | ""> = ["", "low", "medium", "high", "critical"];
const CATEGORIES: Array<SecurityCategory | ""> = [
  "",
  "admin",
  "authentication",
  "api",
  "property",
  "form",
  "traffic",
];
const SORTS = ["last_seen", "severity", "risk_score", "occurrence_count", "route"] as const;
type SortKey = (typeof SORTS)[number];
const REVIEW_STATUSES = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "false_positive", label: "False positive" },
] as const;
type ReviewStatus = (typeof REVIEW_STATUSES)[number]["value"];
type TimeRange = "1h" | "24h" | "7d" | "30d" | "custom";

const severityStyles: Record<SecuritySeverity, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-950",
  high: "bg-orange-100 text-orange-950",
  critical: "bg-rose-100 text-rose-950",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function displayLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function statusLabel(status: string): string {
  return REVIEW_STATUSES.find((item) => item.value === status)?.label ?? status;
}

function getSignalCodes(value: Json): SecuritySignalCode[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (signal): signal is SecuritySignalCode =>
      typeof signal === "string" && Object.hasOwn(SECURITY_SIGNAL_INFO, signal),
  );
}

function SiteSecurityMonitor() {
  const { isAdmin } = AuthenticatedRoute.useRouteContext();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<SecuritySeverity | "">("");
  const [category, setCategory] = useState<SecurityCategory | "">("");
  const [route, setRoute] = useState("");
  const [visitorId, setVisitorId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | "">("");
  const [sort, setSort] = useState<SortKey>("last_seen");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const visitorIdInvalid = Boolean(visitorId && !/^[0-9a-f-]{36}$/i.test(visitorId));
  const dateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);
  const customFrom = Date.parse(customRange.from);
  const customTo = Date.parse(customRange.to);
  const customRangeInvalid =
    timeRange === "custom" &&
    (!Number.isFinite(customFrom) ||
      !Number.isFinite(customTo) ||
      customFrom >= customTo ||
      customTo > Date.now() + 60_000 ||
      customFrom < customTo - 30 * 24 * 60 * 60_000);
  const dashboardWindow = useMemo(() => {
    const to = timeRange === "custom" && customRange.to ? new Date(customRange.to) : new Date();
    const presetDuration: Record<Exclude<TimeRange, "custom">, number> = {
      "1h": 3_600_000,
      "24h": 86_400_000,
      "7d": 604_800_000,
      "30d": 2_592_000_000,
    };
    const from =
      timeRange === "custom" && customRange.from
        ? new Date(customRange.from)
        : new Date(
            to.getTime() - (timeRange === "custom" ? 86_400_000 : presetDuration[timeRange]),
          );
    return { from: from.toISOString(), to: to.toISOString() };
  }, [customRange.from, customRange.to, timeRange]);

  const overviewQuery = useQuery({
    queryKey: ["site-security", "overview", timeRange, customRange],
    queryFn: () => getSecurityOverview({ data: dashboardWindow }),
    enabled: isAdmin && !customRangeInvalid,
    refetchInterval: 60_000,
  });
  const eventsQuery = useQuery({
    queryKey: [
      "site-security",
      "events",
      page,
      search,
      severity,
      category,
      route,
      visitorId,
      fromDate,
      toDate,
      reviewStatus,
      sort,
      direction,
    ],
    queryFn: () =>
      getSecurityEvents({
        data: {
          page,
          pageSize: 25,
          search,
          ...(severity ? { severity } : {}),
          ...(category ? { category } : {}),
          ...(route ? { route } : {}),
          ...(visitorId ? { visitorId } : {}),
          ...(fromDate ? { fromDate } : {}),
          ...(toDate ? { toDate } : {}),
          ...(reviewStatus ? { reviewStatus } : {}),
          sort,
          direction,
        },
      }),
    enabled: isAdmin && !visitorIdInvalid && !dateRangeInvalid,
  });
  const statusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: ReviewStatus }) =>
      updateSecurityEventStatus({ data: { eventIds: ids, status } }),
    onSuccess: async ({ updated }) => {
      toast.success(`${updated} event${updated === 1 ? "" : "s"} updated`);
      setSelectedIds([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["site-security", "events"] }),
        queryClient.invalidateQueries({ queryKey: ["site-security", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["site-security", "audit"] }),
      ]);
    },
    onError: (error) => toast.error(error.message || "Unable to update event status"),
  });
  const exportMutation = useMutation({
    mutationFn: () =>
      exportSecurityEvents({
        data: {
          search,
          ...(severity ? { severity } : {}),
          ...(category ? { category } : {}),
          ...(route ? { route } : {}),
          ...(visitorId ? { visitorId } : {}),
          ...(fromDate ? { fromDate } : {}),
          ...(toDate ? { toDate } : {}),
          ...(reviewStatus ? { reviewStatus } : {}),
          sort,
          direction,
          limit: 500,
        },
      }),
    onSuccess: (csv) => {
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `ella-security-events-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Filtered events exported (maximum 500 rows)");
    },
    onError: (error) => toast.error(error.message || "Unable to export events"),
  });

  const overview = overviewQuery.data;
  const events = eventsQuery.data?.events ?? [];
  const total = eventsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));
  const highRisk = overview?.recentHighRisk ?? [];
  const stats = [
    { label: "Security events", value: overview?.totalEvents, icon: Activity },
    { label: "Events · 24 hours", value: overview?.last24Hours, icon: Clock3 },
    { label: "High-risk sources", value: overview?.highRiskVisitors, icon: AlertTriangle },
    { label: "Critical events", value: overview?.criticalEvents, icon: ShieldAlert },
    { label: "Active restrictions", value: overview?.activeRestrictions, icon: ShieldCheck },
    { label: "Authentication signals", value: overview?.failedAuthentication, icon: ShieldAlert },
    { label: "API signals", value: overview?.suspiciousApiActivity, icon: Activity },
    { label: "Automation patterns", value: overview?.automatedTraffic, icon: Activity },
  ];
  const visibleIds = events.map((event) => event.id);
  const selectedVisibleIds = selectedIds.filter((id) => visibleIds.includes(id));
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedVisibleIds.includes(id));

  useEffect(() => {
    setSelectedIds([]);
  }, [
    page,
    search,
    severity,
    category,
    route,
    visitorId,
    fromDate,
    toDate,
    reviewStatus,
    sort,
    direction,
  ]);

  useEffect(() => {
    if (!eventsQuery.data) return;
    const lastPage = Math.max(1, Math.ceil(eventsQuery.data.total / 25));
    if (page > lastPage) setPage(lastPage);
  }, [eventsQuery.data, page]);

  if (!isAdmin) return <Navigate to="/admin" />;

  function resetFilters() {
    setPage(1);
    setSearch("");
    setSeverity("");
    setCategory("");
    setRoute("");
    setVisitorId("");
    setFromDate("");
    setToDate("");
    setReviewStatus("");
    setSort("last_seen");
    setDirection("desc");
    setSelectedIds([]);
  }

  function toggleSelected(eventId: string) {
    setSelectedIds((current) =>
      current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId],
    );
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-3xl">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            Advanced · Security
          </div>
          <h1 className="font-display text-3xl font-medium text-navy sm:text-4xl">
            Security operations
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Server-observed request patterns and risk signals. Scores are automated assessments, not
            proof of malicious activity; restrictions remain manual.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/honeypot"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-navy hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Visitors <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/admin/security-health"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-navy hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            System health <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Button
            variant="outline"
            onClick={() => void Promise.all([overviewQuery.refetch(), eventsQuery.refetch()])}
            disabled={overviewQuery.isFetching || eventsQuery.isFetching}
            aria-label="Refresh security data"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${overviewQuery.isFetching || eventsQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </header>

      <section className="flex flex-wrap items-end justify-between gap-4 border-y border-slate-200 bg-white/70 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            Analytics period
            <select
              className="min-h-11 min-w-40 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={timeRange}
              onChange={(event) => setTimeRange(event.currentTarget.value as TimeRange)}
            >
              <option value="1h">Last hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          {timeRange === "custom" && (
            <>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                From
                <Input
                  type="datetime-local"
                  value={customRange.from}
                  onChange={(event) =>
                    setCustomRange((current) => ({ ...current, from: event.currentTarget.value }))
                  }
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                To
                <Input
                  type="datetime-local"
                  value={customRange.to}
                  onChange={(event) =>
                    setCustomRange((current) => ({ ...current, to: event.currentTarget.value }))
                  }
                />
              </label>
            </>
          )}
        </div>
        <p className="max-w-md text-xs leading-relaxed text-slate-500">
          Analytics use recorded event episodes in this period. Risk estimates are not confirmation
          of malicious activity.
        </p>
        {customRangeInvalid && (
          <p role="alert" className="basis-full text-sm text-rose-800">
            Select a valid start and end time; the range must be increasing and no longer than 30
            days.
          </p>
        )}
      </section>

      {overviewQuery.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950"
        >
          <span>Security overview could not be loaded. No placeholder statistics are shown.</span>
          <Button variant="outline" onClick={() => void overviewQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}

      <section
        aria-label="Security overview"
        className="grid gap-x-6 gap-y-5 border-b border-slate-200 bg-white/70 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-start gap-3">
            <stat.icon className="mt-1 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <div className="text-2xl font-semibold tabular-nums text-navy">
                {overviewQuery.isLoading ? "…" : stat.value}
              </div>
              <div className="mt-0.5 text-xs text-slate-600">{stat.label}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-navy">Security activity</h2>
            <p className="mt-1 text-xs text-slate-500">
              Recorded events per time bucket · selected period
            </p>
          </div>
          <span className="text-xs text-slate-500">Database aggregates · up to 24 intervals</span>
        </div>
        {overviewQuery.isLoading ? (
          <div
            className="mt-4 h-56 animate-pulse rounded-lg bg-slate-100"
            role="status"
            aria-label="Loading security analytics"
          />
        ) : overviewQuery.isError ? (
          <p role="status" className="mt-4 grid h-56 place-items-center text-sm text-slate-500">
            Activity analytics are unavailable. Retry to reload measured data.
          </p>
        ) : (
          <div className="mt-4 h-56" role="img" aria-label="Security events over time">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={overview?.eventsOverTime ?? []}
                margin={{ left: -20, right: 8, top: 8 }}
              >
                <CartesianGrid vertical={false} stroke="#e8eaf0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="bucket"
                  tickFormatter={(value: string) =>
                    new Intl.DateTimeFormat("en", {
                      month: timeRange === "30d" ? "short" : undefined,
                      day: timeRange === "30d" || timeRange === "7d" ? "numeric" : undefined,
                      hour: timeRange === "30d" ? undefined : "numeric",
                    }).format(new Date(value))
                  }
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  minTickGap={32}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                />
                <Tooltip
                  labelFormatter={(value) => formatDate(String(value))}
                  formatter={(value) => [value, "Events"]}
                  contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0", fontSize: 12 }}
                />
                <Bar
                  dataKey="event_count"
                  name="Event episodes"
                  fill="#a66c08"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-4">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h2 className="font-semibold text-navy">Severity breakdown</h2>
          <p className="mt-1 text-xs text-slate-500">Aggregated signals in the 90-day window</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["low", "medium", "high", "critical"] as const).map((level) => (
              <div key={level} className="min-w-[7rem] flex-1 rounded-xl bg-slate-50 p-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${severityStyles[level]}`}
                >
                  {level}
                </span>
                <p className="mt-3 text-xl font-semibold tabular-nums text-navy">
                  {overview?.bySeverity[level] ?? 0}
                </p>
              </div>
            ))}
          </div>
          <h3 className="mt-5 text-sm font-medium text-navy">Categories</h3>
          <ul className="mt-2 space-y-2">
            {CATEGORIES.filter(Boolean).map((item) => (
              <li key={item} className="flex justify-between gap-3 text-sm">
                <span className="capitalize text-slate-600">{displayLabel(item!)}</span>
                <span className="tabular-nums font-medium text-slate-800">
                  {overview?.byCategory[item!] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h2 className="font-semibold text-navy">Most targeted routes</h2>
          <p className="mt-1 text-xs text-slate-500">
            Counts represent aggregated detection episodes
          </p>
          {overview?.topRoutes.length ? (
            <ol className="mt-4 divide-y divide-slate-100">
              {overview.topRoutes.map((item) => (
                <li key={item.route} className="flex items-center justify-between gap-3 py-3">
                  <code className="break-all text-sm text-slate-800">{item.route}</code>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs tabular-nums text-slate-700">
                    {item.occurrence_count}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No route aggregates yet.</p>
          )}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h2 className="font-semibold text-navy">Frequent detection signals</h2>
          <p className="mt-1 text-xs text-slate-500">
            Observed facts and inferred patterns, counted separately per event
          </p>
          {overview?.topSignals.length ? (
            <ol className="mt-4 divide-y divide-slate-100">
              {overview.topSignals.map((item) => {
                const signal = Object.hasOwn(SECURITY_SIGNAL_INFO, item.signal)
                  ? SECURITY_SIGNAL_INFO[item.signal as SecuritySignalCode]
                  : null;
                return (
                  <li key={item.signal} className="flex items-start justify-between gap-3 py-3">
                    <span className="min-w-0 text-sm text-slate-700">
                      {signal?.label ?? displayLabel(item.signal)}
                      <span className="mt-1 block text-[11px] text-slate-500">
                        {signal?.kind ?? "unclassified"} signal
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs tabular-nums text-slate-700">
                      {item.occurrence_count}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No signal aggregates in this period.</p>
          )}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h2 className="font-semibold text-navy">Recent high-risk sources</h2>
          <p className="mt-1 text-xs text-slate-500">
            Pseudonymous identifiers; no raw IP stored here
          </p>
          {highRisk.length ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {highRisk.map((item) => (
                <li key={item.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${severityStyles[item.severity]}`}
                    >
                      {item.severity} · {item.risk_score}
                    </span>
                    <time className="text-xs text-slate-500">{formatDate(item.last_seen)}</time>
                  </div>
                  <p className="mt-2 break-all font-mono text-xs text-slate-700">
                    {item.source_id}… · {item.route}
                  </p>
                  {item.visitor_id && (
                    <Link
                      to="/admin/honeypot/$visitorId"
                      params={{ visitorId: item.visitor_id }}
                      className="mt-2 inline-flex text-xs font-medium text-amber-800 underline underline-offset-2"
                    >
                      Open related visitor history
                    </Link>
                  )}
                  <p className="mt-1 text-[11px] text-slate-500">
                    Automated risk assessment · not confirmed
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No high-risk signals recorded.</p>
          )}
        </section>
      </div>

      <section
        id="events"
        className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
      >
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <h2 className="font-semibold text-navy">Security events</h2>
          <p className="mt-1 text-xs text-slate-600">
            Detection is based on Cloudflare-observed request metadata and response outcomes.
            Signals are not attacker classifications.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="relative block sm:col-span-2 xl:col-span-1">
              <span className="sr-only">Search route, event type, or source hash</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <Input
                className="pl-9"
                value={search}
                maxLength={80}
                placeholder="Search events or source hash"
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.currentTarget.value);
                }}
              />
            </label>
            <label>
              <span className="sr-only">Severity filter</span>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={severity}
                onChange={(event) => {
                  setPage(1);
                  setSeverity(event.currentTarget.value as SecuritySeverity | "");
                }}
              >
                {SEVERITIES.map((item) => (
                  <option key={item || "all"} value={item}>
                    {item ? displayLabel(item) : "All severities"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Category filter</span>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={category}
                onChange={(event) => {
                  setPage(1);
                  setCategory(event.currentTarget.value as SecurityCategory | "");
                }}
              >
                {CATEGORIES.map((item) => (
                  <option key={item || "all"} value={item}>
                    {item ? displayLabel(item) : "All categories"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Review state filter</span>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={reviewStatus}
                onChange={(event) => {
                  setPage(1);
                  setReviewStatus(event.currentTarget.value as ReviewStatus | "");
                }}
              >
                <option value="">All review states</option>
                {REVIEW_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Route filter</span>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={route}
                onChange={(event) => {
                  setPage(1);
                  setRoute(event.currentTarget.value);
                }}
              >
                <option value="">All routes</option>
                {(overview?.topRoutes ?? []).map((item) => (
                  <option key={item.route} value={item.route}>
                    {item.route}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Visitor ID filter</span>
              <Input
                value={visitorId}
                maxLength={36}
                placeholder="Visitor UUID"
                onChange={(event) => {
                  setPage(1);
                  setVisitorId(event.currentTarget.value.trim());
                }}
              />
            </label>
            <label>
              <span className="sr-only">From date</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setPage(1);
                  setFromDate(event.currentTarget.value);
                }}
              />
            </label>
            <label>
              <span className="sr-only">To date</span>
              <Input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setPage(1);
                  setToDate(event.currentTarget.value);
                }}
              />
            </label>
            <label>
              <span className="sr-only">Sort events</span>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={sort}
                onChange={(event) => setSort(event.currentTarget.value as SortKey)}
              >
                {SORTS.map((item) => (
                  <option key={item} value={item}>
                    Sort: {displayLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDirection((current) => (current === "asc" ? "desc" : "asc"))}
                aria-label={`Current order ${direction === "asc" ? "ascending" : "descending"}`}
              >
                {direction === "asc" ? "Ascending" : "Descending"}
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="bulk-review-status">
                Status for selected events
              </label>
              <select
                id="bulk-review-status"
                className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue=""
                onChange={(event) => {
                  const status = event.currentTarget.value;
                  if (status) {
                    statusMutation.mutate({
                      ids: selectedVisibleIds,
                      status: status as ReviewStatus,
                    });
                    event.currentTarget.value = "";
                  }
                }}
                disabled={!selectedVisibleIds.length || statusMutation.isPending}
              >
                <option value="">Set status for selected…</option>
                {REVIEW_STATUSES.filter((item) => item.value !== "new").map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">{selectedVisibleIds.length} selected</span>
            </div>
            <Button
              variant="outline"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              title="Export up to 500 matching events"
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {exportMutation.isPending ? "Preparing CSV…" : "Export filtered CSV"}
            </Button>
          </div>
          {visitorIdInvalid && (
            <p role="alert" className="mt-2 text-xs text-rose-800">
              Enter a complete visitor UUID to filter by visitor.
            </p>
          )}
          {dateRangeInvalid && (
            <p role="alert" className="mt-2 text-xs text-rose-800">
              End date must be on or after start date.
            </p>
          )}
        </div>

        {eventsQuery.isError ? (
          <div role="alert" className="p-6 text-sm text-rose-900">
            Events could not be loaded.{" "}
            <Button variant="link" onClick={() => void eventsQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : eventsQuery.isLoading ? (
          <div role="status" className="space-y-3 p-6" aria-label="Loading security events">
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : events.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ShieldCheck className="mx-auto h-7 w-7 text-emerald-700" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-navy">No matching security signals</p>
            <p className="mt-1 text-xs text-slate-500">Try widening the filters or date range.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-3">
                      <label className="inline-flex min-h-11 min-w-11 items-center justify-center">
                        <span className="sr-only">Select all visible events</span>
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={() =>
                            setSelectedIds((current) =>
                              allVisibleSelected
                                ? current.filter((id) => !visibleIds.includes(id))
                                : [...new Set([...current, ...visibleIds])],
                            )
                          }
                          className="h-4 w-4 accent-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </label>
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Severity / risk
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Category / event
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Request
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Source
                    </th>
                    <th scope="col" className="px-5 py-3">
                      First / last seen
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Activity
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Review state
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((event) => {
                    const signals = getSignalCodes(event.signals);
                    return (
                      <tr key={event.id} className="align-top">
                        <td className="px-3 py-3">
                          <label className="inline-flex min-h-11 min-w-11 items-center justify-center">
                            <span className="sr-only">Select event {event.id}</span>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(event.id)}
                              onChange={() => toggleSelected(event.id)}
                              className="h-4 w-4 accent-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </label>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityStyles[event.severity as SecuritySeverity]}`}
                          >
                            {event.severity}
                          </span>
                          <p className="mt-2 tabular-nums text-sm font-semibold text-navy">
                            {event.risk_score} points
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">Automated · unverified</p>
                          <p className="mt-1 text-xs tabular-nums text-slate-600">
                            {event.observed_requests === 120
                              ? "≥120 source request samples in the rolling window"
                              : `${event.observed_requests} source request samples in the rolling window`}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="capitalize text-slate-600">
                            {displayLabel(event.category)}
                          </span>
                          <p className="mt-1 font-medium text-navy">
                            {displayLabel(event.event_type)}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <code className="break-all text-xs text-slate-800">{event.route}</code>
                          <p className="mt-1 text-xs text-slate-500">
                            {event.request_method} · HTTP {event.http_status}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <code className="font-mono text-xs text-slate-700">
                            {event.source_hash.slice(0, 12)}…
                          </code>
                          {event.visitor_id && (
                            <Link
                              to="/admin/honeypot/$visitorId"
                              params={{ visitorId: event.visitor_id }}
                              className="mt-2 block text-xs font-medium text-amber-800 underline underline-offset-2"
                            >
                              Open visitor history
                            </Link>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          <p>{formatDate(event.first_seen)}</p>
                          <p className="mt-1">{formatDate(event.last_seen)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <details className="max-w-xs">
                            <summary className="cursor-pointer text-xs font-medium text-amber-800">
                              {event.occurrence_count} repeated detection update
                              {event.occurrence_count === 1 ? "" : "s"} · signals
                            </summary>
                            <ul className="mt-3 space-y-2">
                              {signals.map((signal) => {
                                const detail = SECURITY_SIGNAL_INFO[signal];
                                return (
                                  <li key={signal} className="text-xs text-slate-700">
                                    <span className="font-medium">{detail.label}</span>
                                    <span className="ml-1 text-slate-500">
                                      +{detail.weight} · {detail.kind}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                            <p className="mt-3 break-all font-mono text-[10px] text-slate-500">
                              Correlation: {event.correlation_id}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="mt-2"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(event.id);
                                  toast.success("Event ID copied");
                                } catch {
                                  toast.error("Clipboard access is unavailable");
                                }
                              }}
                            >
                              <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                              Copy event ID
                            </Button>
                          </details>
                        </td>
                        <td className="px-5 py-4">
                          <label className="sr-only" htmlFor={`review-${event.id}`}>
                            Review state for event {event.id}
                          </label>
                          <select
                            id={`review-${event.id}`}
                            className="min-h-10 rounded-md border border-input bg-background px-2 text-xs"
                            value={event.review_status}
                            disabled={statusMutation.isPending}
                            onChange={(change) =>
                              statusMutation.mutate({
                                ids: [event.id],
                                status: change.currentTarget.value as ReviewStatus,
                              })
                            }
                          >
                            {REVIEW_STATUSES.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                          {event.reviewed_at && (
                            <p className="mt-1 text-[10px] text-slate-500">
                              Updated {formatDate(event.reviewed_at)}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
              <p className="text-xs text-slate-600">
                {total} aggregated events · page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
