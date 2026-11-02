import { useDeferredValue, useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe2,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { HoneypotRestrictionDialog } from "@/components/admin/HoneypotRestrictionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getHoneypotEvents, getHoneypotOverview } from "@/lib/admin/honeypot.functions";
import { Route as AuthenticatedRoute } from "./route";

export const Route = createFileRoute("/_authenticated/admin/honeypot")({
  head: () => ({
    meta: [
      { title: "Honeypot Monitor — Ella Properties" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: HoneypotMonitor,
});

const EVENT_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "investigating", label: "Investigating" },
  { value: "confirmed_suspicious", label: "Confirmed suspicious" },
  { value: "restricted", label: "Restricted" },
  { value: "dismissed", label: "Dismissed" },
] as const;
const SORT_OPTIONS = ["detected_at", "status", "endpoint", "request_count"] as const;
type EventStatusFilter = (typeof EVENT_STATUSES)[number]["value"];
type EventSort = (typeof SORT_OPTIONS)[number];

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

function flagForCountry(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...Array.from(code, (letter) => letter.charCodeAt(0) + 127397));
}

function StatusBadge({ status }: { status: string }) {
  const label = EVENT_STATUSES.find((item) => item.value === status)?.label ?? status;
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${statusClass[status] ?? statusClass.new}`}
    >
      {label}
    </span>
  );
}

function HoneypotMonitor() {
  const { isAdmin } = AuthenticatedRoute.useRouteContext();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<EventStatusFilter>("");
  const [countryCode, setCountryCode] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState<EventSort>("detected_at");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const dateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  const overviewQuery = useQuery({
    queryKey: ["honeypot", "overview"],
    queryFn: () => getHoneypotOverview({ data: {} }),
    enabled: isAdmin,
    refetchInterval: 60_000,
  });
  const eventsQuery = useQuery({
    queryKey: [
      "honeypot",
      "events",
      page,
      deferredSearch,
      status,
      countryCode,
      fromDate,
      toDate,
      sort,
      direction,
    ],
    queryFn: () =>
      getHoneypotEvents({
        data: {
          page,
          pageSize: 25,
          search: deferredSearch,
          ...(status ? { status } : {}),
          ...(countryCode ? { countryCode } : {}),
          ...(fromDate ? { fromDate } : {}),
          ...(toDate ? { toDate } : {}),
          sort,
          direction,
        },
      }),
    enabled: isAdmin && !dateRangeInvalid,
  });

  if (!isAdmin) return <Navigate to="/admin" />;

  const overview = overviewQuery.data;
  const events = eventsQuery.data?.events ?? [];
  const protectedVisitorIds = new Set(eventsQuery.data?.protectedVisitorIds ?? []);
  const total = eventsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));
  const activeFilters = Boolean(search || status || countryCode || fromDate || toDate);

  function resetFilters() {
    setSearch("");
    setStatus("");
    setCountryCode("");
    setFromDate("");
    setToDate("");
    setSort("detected_at");
    setDirection("desc");
    setPage(1);
  }

  const statItems = [
    { label: "Total honeypot events", value: overview?.totalEvents, icon: Activity },
    { label: "Unique flagged sources", value: overview?.uniqueSources, icon: Globe2 },
    { label: "Currently restricted IPs", value: overview?.activeRestrictions, icon: Shield },
    {
      label: "Awaiting investigation",
      value: overview?.awaitingInvestigation,
      icon: AlertTriangle,
    },
    { label: "Recorded in 24 hours", value: overview?.last24Hours, icon: Clock3 },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            Advanced · Security
          </div>
          <h1 className="font-display text-3xl font-medium text-navy sm:text-4xl">
            Honeypot Monitor
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Decoy access and source activity. A detection is a signal for review, not a verdict.
          </p>
        </div>
        <div className="space-y-2 rounded-xl bg-white px-4 py-3 text-xs ring-1 ring-slate-200">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${overview?.captureConfigured ? "bg-emerald-600" : "bg-amber-500"}`}
            />
            <span className="font-medium text-slate-800">
              {overview?.captureConfigured
                ? "Event capture configured"
                : "Capture configuration required"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${overview?.enforcementConfigured ? "bg-emerald-600" : "bg-slate-400"}`}
            />
            <span className="text-slate-600">
              {overview?.enforcementConfigured
                ? "Cloudflare settings present; verified per action"
                : "Zone ID, hostname, and API token required"}
            </span>
          </div>
        </div>
      </header>

      {overviewQuery.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950"
        >
          <span>Overview data could not be loaded. No placeholder statistics are shown.</span>
          <Button variant="outline" onClick={() => void overviewQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}

      <section
        aria-label="Honeypot overview"
        className="grid gap-x-6 gap-y-5 border-y border-slate-200 bg-white/70 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-5"
      >
        {statItems.map((item) => (
          <div key={item.label} className="flex min-w-0 items-start gap-3">
            <item.icon className="mt-1 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-2xl font-semibold tabular-nums text-navy">
                {overviewQuery.isLoading ? "…" : (item.value ?? "—")}
              </div>
              <div className="mt-0.5 text-xs leading-snug text-slate-600">{item.label}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.65fr)]">
        <div className="min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-navy">Request activity</h2>
              <p className="mt-1 text-xs text-slate-600">Recorded events by hour · last 24 hours</p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-slate-600">
              <span className="h-2 w-2 rounded-full bg-amber-600" aria-hidden="true" />
              Decoy requests
            </div>
          </div>
          {overviewQuery.isLoading ? (
            <div
              className="mt-5 h-48 animate-pulse rounded-lg bg-slate-100"
              aria-label="Loading chart"
            />
          ) : overviewQuery.isError ? (
            <p role="status" className="mt-5 grid h-48 place-items-center text-sm text-slate-500">
              Activity chart unavailable.
            </p>
          ) : (
            <div className="mt-4 h-48" role="img" aria-label="Hourly honeypot event volume chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={overview?.hourlyVolume ?? []}
                  margin={{ left: -20, right: 8, top: 8 }}
                >
                  <CartesianGrid vertical={false} stroke="#e8eaf0" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(value: string) =>
                      new Intl.DateTimeFormat("en", { hour: "numeric" }).format(new Date(value))
                    }
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    minTickGap={28}
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
                  <Area
                    type="monotone"
                    dataKey="event_count"
                    stroke="#a66c08"
                    fill="#d4a84e"
                    fillOpacity={0.16}
                    strokeWidth={2}
                    activeDot={{ r: 4, fill: "#a66c08" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <aside className="flex flex-col justify-between rounded-2xl bg-[#10213b] p-5 text-white shadow-sm sm:p-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Evidence-first review
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Browser, operating system, and device details are inferred from the User-Agent.
              Country and ASN data are supplied by Cloudflare when available.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Location, browser, or network provider alone never triggers an automatic restriction.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Restrictions are refused unless every recorded request for a source used a hostname
              within the configured zone, and Cloudflare confirms that the zone ID matches it.
              Cloudflare zone rules do not cover <code>workers.dev</code>, so uncovered hostnames
              also check active restrictions at the Worker before serving the site.
            </p>
          </div>
          <div className="mt-5 border-t border-white/15 pt-4 text-xs leading-relaxed text-white/55">
            IP addresses are visible to administrators only. Request bodies, cookies, and
            authorization headers are never collected.
          </div>
        </aside>
      </section>

      <section
        aria-labelledby="recent-events-title"
        className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <h2 id="recent-events-title" className="font-semibold text-navy">
              Recent events
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {eventsQuery.isLoading
                ? "Loading events…"
                : `${total.toLocaleString()} matching events`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-amber-600" aria-hidden="true" />
            Page {page} of {totalPages}
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <label className="relative block sm:col-span-2 xl:col-span-2">
            <span className="sr-only">Search hostname, endpoint, reason, browser, or IP</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search host, endpoint, reason, IP"
              className="pl-9"
            />
          </label>
          <label className="block">
            <span className="sr-only">Filter by event status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(
                  EVENT_STATUSES.find((item) => item.value === event.target.value)?.value ?? "",
                );
                setPage(1);
              }}
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {EVENT_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Filter by country code</span>
            <Input
              value={countryCode}
              onChange={(event) => {
                setCountryCode(
                  event.target.value
                    .replace(/[^a-z]/gi, "")
                    .slice(0, 2)
                    .toUpperCase(),
                );
                setPage(1);
              }}
              placeholder="Country code"
              maxLength={2}
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="sr-only">Start date</span>
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="block">
            <span className="sr-only">End date</span>
            <Input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <div className="flex gap-2 xl:col-span-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Sort events</span>
              <select
                value={sort}
                onChange={(event) => {
                  const selected = SORT_OPTIONS.find((option) => option === event.target.value);
                  if (selected) setSort(selected);
                }}
                className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="detected_at">Detection time</option>
                <option value="request_count">Request count</option>
                <option value="status">Status</option>
                <option value="endpoint">Endpoint</option>
              </select>
            </label>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              aria-label={`Sort ${direction === "desc" ? "ascending" : "descending"}`}
              onClick={() => setDirection((value) => (value === "desc" ? "asc" : "desc"))}
            >
              {direction === "desc" ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {dateRangeInvalid && (
          <p
            role="alert"
            className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-950"
          >
            The start date must be on or before the end date.
          </p>
        )}
        {activeFilters && (
          <div className="flex justify-end border-b border-slate-100 px-4 py-2">
            <button
              type="button"
              className="min-h-10 px-2 text-sm font-medium text-navy underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              onClick={resetFilters}
            >
              Clear filters
            </button>
          </div>
        )}

        {eventsQuery.isError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 p-6 text-sm text-rose-900"
          >
            <span>Events could not be loaded.</span>
            <Button variant="outline" onClick={() => void eventsQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : eventsQuery.isLoading ? (
          <div role="status" className="space-y-3 p-6" aria-label="Loading events">
            <div className="h-10 animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded bg-slate-100" />
          </div>
        ) : events.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <ShieldCheck className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" />
            <h3 className="mt-3 font-medium text-navy">No matching honeypot events</h3>
            <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-600">
              Events appear here when a visitor requests a monitored decoy endpoint. Adjust the
              filters to review a wider range.
            </p>
            {activeFilters && (
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Country
                    </th>
                    <th scope="col" className="px-4 py-3">
                      IP address
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Operating system
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Browser
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Detection reason
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Requests
                    </th>
                    <th scope="col" className="px-4 py-3">
                      First seen
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Last seen
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((event) => {
                    const visitor = event.visitor;
                    const alreadyRestricted = protectedVisitorIds.has(visitor.id);
                    return (
                      <tr key={event.id} className="align-top text-slate-700 hover:bg-amber-50/30">
                        <td className="px-4 py-4">
                          <span className="mr-1.5" aria-hidden="true">
                            {flagForCountry(visitor.country_code)}
                          </span>
                          <span>{visitor.country ?? visitor.country_code ?? "Unknown"}</span>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs">
                          {visitor.ip_address ?? "Unavailable"}
                        </td>
                        <td className="px-4 py-4">{visitor.operating_system ?? "Unavailable"}</td>
                        <td className="px-4 py-4">
                          {visitor.browser
                            ? `${visitor.browser}${visitor.browser_version ? ` ${visitor.browser_version}` : ""}`
                            : "Unavailable"}
                        </td>
                        <td className="max-w-56 px-4 py-4">
                          <code
                            className="block truncate text-[11px] text-slate-500"
                            title={event.hostname}
                          >
                            {event.hostname}
                          </code>
                          <span className="mt-1 block line-clamp-2" title={event.detection_reason}>
                            {event.detection_reason} · {event.endpoint}
                          </span>
                        </td>
                        <td className="px-4 py-4 tabular-nums">{visitor.request_count}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs">
                          {formatDate(visitor.first_seen)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs">
                          {formatDate(visitor.last_seen)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={event.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button asChild size="sm" variant="outline" className="min-h-10">
                              <Link
                                to="/admin/honeypot/$visitorId"
                                params={{ visitorId: event.visitor_id }}
                              >
                                Investigate
                              </Link>
                            </Button>
                            <HoneypotRestrictionDialog
                              visitorId={visitor.id}
                              ipAddress={visitor.ip_address}
                              isTrusted={visitor.is_trusted}
                              reason={event.detection_reason}
                              disabled={alreadyRestricted}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
              {events.map((event) => {
                const visitor = event.visitor;
                const alreadyRestricted = protectedVisitorIds.has(visitor.id);
                return (
                  <article key={event.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-sm text-navy">
                          {visitor.ip_address ?? "Unavailable"}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {flagForCountry(visitor.country_code)}{" "}
                          {visitor.country ?? visitor.country_code ?? "Unknown"}
                          {visitor.city ? ` · ${visitor.city}` : ""}
                        </div>
                      </div>
                      <StatusBadge status={event.status} />
                    </div>
                    <p className="text-sm text-slate-700">{event.detection_reason}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      <code className="max-w-full break-all">
                        {event.hostname}
                        {event.endpoint}
                      </code>
                      <span>{visitor.operating_system ?? "OS unavailable"}</span>
                      <span>{visitor.browser ?? "Browser unavailable"}</span>
                      <span>{visitor.request_count} requests</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button asChild size="sm" variant="outline" className="min-h-10">
                        <Link
                          to="/admin/honeypot/$visitorId"
                          params={{ visitorId: event.visitor_id }}
                        >
                          Investigate
                        </Link>
                      </Button>
                      <HoneypotRestrictionDialog
                        visitorId={visitor.id}
                        ipAddress={visitor.ip_address}
                        isTrusted={visitor.is_trusted}
                        reason={event.detection_reason}
                        disabled={alreadyRestricted}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:px-6">
              <p className="text-xs tabular-nums text-slate-600">
                Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of{" "}
                {total.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-10"
                  disabled={page <= 1 || eventsQuery.isFetching}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" /> Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-10"
                  disabled={page >= totalPages || eventsQuery.isFetching}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
