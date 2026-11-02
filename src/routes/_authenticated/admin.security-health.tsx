import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, CircleHelp, Database, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSecurityHealth } from "@/lib/admin/security.functions";
import { Route as AuthenticatedRoute } from "./route";

export const Route = createFileRoute("/_authenticated/admin/security-health")({
  head: () => ({
    meta: [
      { title: "Security System Health — Ella Properties" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SecurityHealth,
});

function formatDate(value: string | null): string {
  if (!value) return "No persisted event recorded";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function SecurityHealth() {
  const { isAdmin } = AuthenticatedRoute.useRouteContext();
  const healthQuery = useQuery({
    queryKey: ["site-security", "health"],
    queryFn: () => getSecurityHealth({ data: {} }),
    enabled: isAdmin,
    staleTime: 30_000,
  });

  if (!isAdmin) return <Navigate to="/admin" />;

  const health = healthQuery.data;
  const measuredItems = [
    {
      label: "Supabase connectivity",
      value:
        health?.database === "available"
          ? "Available"
          : health?.database === "unavailable"
            ? "Unavailable"
            : "Loading",
      description: "Server-side read probe to the security-event table.",
      icon: Database,
      good: health?.database === "available",
      unknown: false,
    },
    {
      label: "Cloudflare Worker status",
      value: "Unknown",
      description:
        "The application has no independent Worker health endpoint or external status probe.",
      icon: Activity,
      good: false,
      unknown: true,
    },
    {
      label: "Monitoring pipeline",
      value: "Unknown",
      description:
        "No independent worker heartbeat is persisted; a recent event does not prove continuous availability.",
      icon: CircleHelp,
      good: false,
      unknown: true,
    },
    {
      label: "Recent database errors",
      value: "Unknown",
      description: "Database errors are not stored in a queryable health log.",
      icon: CircleHelp,
      good: false,
      unknown: true,
    },
    {
      label: "Event ingestion failures",
      value: "Unknown",
      description:
        "Write failures are logged in the Worker; they are not durably counted for this dashboard.",
      icon: CircleHelp,
      good: false,
      unknown: true,
    },
    {
      label: "Retention execution",
      value: "Unknown",
      description:
        "The existing Cron invokes retention, but successful run timestamps are not persisted.",
      icon: CircleHelp,
      good: false,
      unknown: true,
    },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Security operations · Diagnostics
          </p>
          <h1 className="font-display text-3xl font-medium text-navy sm:text-4xl">System health</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Only directly measured checks are marked available. Missing telemetry is shown as
            unknown rather than inferred from event volume.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void healthQuery.refetch()}
          disabled={healthQuery.isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${healthQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh checks
        </Button>
      </header>

      {healthQuery.isError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950"
        >
          The health check could not be completed. Retry to test connectivity again.
          <Button className="ml-3" variant="outline" onClick={() => void healthQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}

      <section
        aria-label="Measured health checks"
        className="divide-y divide-slate-200 border-y border-slate-200 bg-white"
      >
        {measuredItems.map((item) => (
          <article key={item.label} className="flex flex-wrap items-start gap-4 px-4 py-5 sm:px-6">
            <item.icon
              className={`mt-1 h-5 w-5 shrink-0 ${item.unknown ? "text-slate-500" : item.good ? "text-emerald-700" : "text-rose-700"}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-medium text-navy">{item.label}</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.unknown ? "bg-slate-100 text-slate-700" : item.good ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}
                >
                  {healthQuery.isLoading && item.label === "Supabase connectivity"
                    ? "Checking"
                    : item.value}
                </span>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-700" aria-hidden="true" />
            <h2 className="font-semibold text-navy">Monitoring configuration</h2>
          </div>
          {healthQuery.isLoading ? (
            <div
              className="mt-4 h-24 animate-pulse rounded-lg bg-slate-100"
              role="status"
              aria-label="Checking configuration"
            />
          ) : health ? (
            <dl className="mt-4 divide-y divide-slate-100">
              <div className="flex justify-between gap-3 py-3">
                <dt className="text-sm text-slate-600">Server Supabase credentials</dt>
                <dd className="text-sm font-medium text-navy">
                  {health.configuration.supabaseServerCredentialsConfigured
                    ? "Configured"
                    : "Missing"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-3">
                <dt className="text-sm text-slate-600">Source pseudonym key</dt>
                <dd className="text-sm font-medium text-navy">
                  {health.configuration.sourceHashSecretConfigured ? "Configured" : "Missing"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-3">
                <dt className="text-sm text-slate-600">Threshold overrides</dt>
                <dd className="text-sm font-medium text-navy">
                  {health.configuration.thresholdsConfigured ? "Configured" : "Defaults in effect"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Configuration values could not be checked.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Secret values are never returned or displayed.
          </p>
        </article>

        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h2 className="font-semibold text-navy">Most recent persisted event</h2>
          <p className="mt-1 text-xs text-slate-500">
            A database observation, not an ingestion uptime metric.
          </p>
          <p className="mt-4 text-lg font-medium tabular-nums text-navy">
            {healthQuery.isLoading
              ? "Checking…"
              : health?.database === "unavailable"
                ? "Unavailable"
                : formatDate(health?.latestPersistedEventAt ?? null)}
          </p>
          {health?.checkedAt && (
            <p className="mt-2 text-xs text-slate-500">
              Database probe completed {formatDate(health.checkedAt)}.
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
