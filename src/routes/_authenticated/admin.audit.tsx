import { useMemo, useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Search, ScrollText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSecurityAudit } from "@/lib/admin/security.functions";
import { Route as AuthenticatedRoute } from "./route";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "Activity & Audit Logs — Ella Properties" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminAuditLog,
});

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function AdminAuditLog() {
  const { isAdmin } = AuthenticatedRoute.useRouteContext();
  const [search, setSearch] = useState("");
  const auditQuery = useQuery({
    queryKey: ["site-security", "audit"],
    queryFn: () => getSecurityAudit({ data: {} }),
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const entries = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return (auditQuery.data ?? []).filter((entry) =>
      [
        entry.action,
        entry.outcome,
        entry.administratorName,
        entry.targetId,
        entry.previousStatus,
        entry.newStatus,
        JSON.stringify(entry.details),
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(needle),
    );
  }, [auditQuery.data, search]);

  if (!isAdmin) return <Navigate to="/admin" />;

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Administration · Security operations
          </p>
          <h1 className="font-display text-3xl font-medium text-navy sm:text-4xl">
            Activity &amp; audit logs
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Append-only security review history and honeypot administration actions. The latest 50
            records are loaded from each source before the combined view is bounded.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void auditQuery.refetch()}
          disabled={auditQuery.isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${auditQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 sm:px-6">
          <label className="relative block w-full max-w-md">
            <span className="sr-only">Search audit records</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              className="pl-9"
              placeholder="Search action, administrator, or target"
            />
          </label>
          <span className="text-xs tabular-nums text-slate-500">
            {auditQuery.data
              ? `${entries.length} matching of ${auditQuery.data.length} recent records`
              : " "}
          </span>
        </div>

        {auditQuery.isError ? (
          <div role="alert" className="p-6 text-sm text-rose-900">
            Audit history could not be loaded.
            <Button className="ml-2" variant="link" onClick={() => void auditQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : auditQuery.isLoading ? (
          <div role="status" className="space-y-3 p-6" aria-label="Loading audit history">
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ScrollText className="mx-auto h-6 w-6 text-slate-500" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-navy">No matching audit records</p>
            <p className="mt-1 text-xs text-slate-500">
              {search
                ? "Clear the search to review recent administrative actions."
                : "Security review and enforcement actions will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    When
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Administrator
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Action
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Result / state
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Target
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="align-top hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-800">{entry.administratorName}</td>
                    <td className="px-5 py-4">
                      <span className="font-medium text-navy">
                        {entry.action.replaceAll("_", " ")}
                      </span>
                      {entry.details && (
                        <p className="mt-1 max-w-sm break-words text-xs text-slate-500">
                          {JSON.stringify(entry.details).slice(0, 240)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-700">
                      {entry.previousStatus || entry.newStatus
                        ? `${entry.previousStatus ?? "new"} → ${entry.newStatus ?? "—"}`
                        : entry.outcome}
                    </td>
                    <td className="px-5 py-4">
                      {entry.visitorId ? (
                        <Link
                          to="/admin/honeypot/$visitorId"
                          params={{ visitorId: entry.visitorId }}
                          className="font-mono text-xs text-amber-800 underline underline-offset-2"
                        >
                          Visitor · {entry.visitorId.slice(0, 8)}…
                        </Link>
                      ) : entry.targetId ? (
                        <Link
                          to="/admin/security"
                          hash="events"
                          className="font-mono text-xs text-amber-800 underline underline-offset-2"
                        >
                          Event · {entry.targetId.slice(0, 8)}…
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-500">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
