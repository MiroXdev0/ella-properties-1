import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  unrestrictHoneypotVisitor,
  verifyHoneypotRestriction,
} from "@/lib/admin/honeypot.functions";
import { getSecurityRestrictions } from "@/lib/admin/security.functions";
import { Route as AuthenticatedRoute } from "./route";

export const Route = createFileRoute("/_authenticated/admin/restrictions")({
  head: () => ({
    meta: [
      { title: "IP Restrictions — Ella Properties" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: RestrictionManagement,
});

const RESTRICTION_STATUSES = [
  "pending",
  "active",
  "pending_removal",
  "expired",
  "unbanned",
  "failed",
] as const;
type RestrictionStatus = (typeof RESTRICTION_STATUSES)[number];
const STATUS_LABELS: Record<RestrictionStatus, string> = {
  pending: "Pending",
  active: "Active",
  pending_removal: "Pending removal",
  expired: "Expired",
  unbanned: "Removed",
  failed: "Failed",
};

function formatDate(value: string | null): string {
  if (!value) return "No expiration";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function RestrictionManagement() {
  const { isAdmin } = AuthenticatedRoute.useRouteContext();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<RestrictionStatus | "">("");
  const [pendingUnban, setPendingUnban] = useState<{
    id: string;
    visitorId: string;
    ipAddress: string | null;
    enforcementMode: string;
  } | null>(null);
  const restrictionsQuery = useQuery({
    queryKey: ["site-security", "restrictions", page, status],
    queryFn: () =>
      getSecurityRestrictions({
        data: { page, pageSize: 25, ...(status ? { status } : {}) },
      }),
    enabled: isAdmin,
  });
  const refreshRelated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["site-security", "restrictions"] }),
      queryClient.invalidateQueries({ queryKey: ["site-security", "overview"] }),
      queryClient.invalidateQueries({ queryKey: ["site-security", "audit"] }),
      queryClient.invalidateQueries({ queryKey: ["honeypot", "events"] }),
    ]);
  };
  const verifyMutation = useMutation({
    mutationFn: ({ restrictionId, visitorId }: { restrictionId: string; visitorId: string }) =>
      verifyHoneypotRestriction({ data: { restrictionId, visitorId } }),
    onSuccess: async (result) => {
      if (result.verified) {
        toast.success(
          result.reason === "worker_enforced"
            ? "Worker restriction record is active"
            : "Cloudflare rule is present and matches this restriction",
        );
      } else toast.error(`Enforcement check failed: ${result.reason}`);
      await refreshRelated();
    },
    onError: (error) => toast.error(error.message || "Unable to check restriction enforcement"),
  });
  const unbanMutation = useMutation({
    mutationFn: (restriction: NonNullable<typeof pendingUnban>) =>
      unrestrictHoneypotVisitor({
        data: { visitorId: restriction.visitorId, restrictionId: restriction.id, confirmed: true },
      }),
    onSuccess: async (result) => {
      setPendingUnban(null);
      toast.success(
        result.enforcementMode === "worker_only"
          ? "Worker restriction removed"
          : "Cloudflare confirmed the restriction was removed",
      );
      await refreshRelated();
    },
    onError: (error) => toast.error(error.message || "Unable to remove the restriction"),
  });

  if (!isAdmin) return <Navigate to="/admin" />;

  const rows = restrictionsQuery.data?.restrictions ?? [];
  const total = restrictionsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));
  const activeCount = rows.filter((item) => item.status === "active").length;
  const pendingCount = rows.filter((item) =>
    ["pending", "pending_removal"].includes(item.status),
  ).length;

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Security operations · Manual enforcement
          </p>
          <h1 className="font-display text-3xl font-medium text-navy sm:text-4xl">
            IP restrictions
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Restrictions are administrator-initiated. Worker-only restrictions apply to requests
            reaching this Worker; zone restrictions use verified Cloudflare edge rules.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void restrictionsQuery.refetch()}
          disabled={restrictionsQuery.isFetching}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${restrictionsQuery.isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </header>

      <section className="flex flex-wrap gap-x-8 gap-y-3 border-y border-slate-200 bg-white/70 px-4 py-4 sm:px-6">
        <p className="text-sm text-slate-700">
          <span className="font-semibold tabular-nums text-navy">{activeCount}</span> active on this
          page
        </p>
        <p className="text-sm text-slate-700">
          <span className="font-semibold tabular-nums text-navy">{pendingCount}</span> pending on
          this page
        </p>
        <p className="text-sm text-slate-700">
          <span className="font-semibold tabular-nums text-navy">{total}</span> total matching
          records
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 p-4 sm:px-6">
          <div>
            <h2 className="font-semibold text-navy">Restriction history</h2>
            <p className="mt-1 text-xs text-slate-500">Most recently created records first.</p>
          </div>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            Status
            <select
              className="min-h-11 min-w-44 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.currentTarget.value as RestrictionStatus | "");
              }}
            >
              <option value="">All statuses</option>
              {RESTRICTION_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {restrictionsQuery.isError ? (
          <div role="alert" className="p-6 text-sm text-rose-900">
            Restriction history could not be loaded.
            <Button
              className="ml-2"
              variant="link"
              onClick={() => void restrictionsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : restrictionsQuery.isLoading ? (
          <div role="status" className="space-y-3 p-6" aria-label="Loading IP restrictions">
            <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-700" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-navy">No matching restriction records</p>
            <p className="mt-1 text-xs text-slate-500">
              Use a different status filter or review a flagged visitor.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((restriction) => {
              const label =
                STATUS_LABELS[restriction.status as RestrictionStatus] ?? restriction.status;
              const visitor = restriction.visitor;
              return (
                <article
                  key={restriction.id}
                  className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(12rem,0.8fr)_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="break-all font-mono text-sm font-medium text-navy">
                        {restriction.ip_address ?? "IP unavailable"}
                      </code>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${restriction.status === "active" ? "bg-emerald-50 text-emerald-900" : ["pending", "pending_removal"].includes(restriction.status) ? "bg-amber-50 text-amber-950" : restriction.status === "failed" ? "bg-rose-50 text-rose-900" : "bg-slate-100 text-slate-700"}`}
                      >
                        {label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{restriction.reason}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {restriction.duration.replaceAll("_", " ")}
                      {restriction.expires_at
                        ? ` · expires ${formatDate(restriction.expires_at)}`
                        : " · no expiration"}
                      {restriction.released_at
                        ? ` · released ${formatDate(restriction.released_at)}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {visitor?.country ?? "Country unavailable"}
                      {visitor?.city ? ` · ${visitor.city}` : ""}
                      {visitor?.region ? `, ${visitor.region}` : ""}
                    </p>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600">
                    <p>
                      Administrator:{" "}
                      <span className="font-medium text-slate-800">
                        {restriction.administratorName}
                      </span>
                    </p>
                    <p>Created: {formatDate(restriction.created_at)}</p>
                    <p>
                      Enforcement:{" "}
                      {restriction.enforcement_mode === "worker_only"
                        ? "Worker-only"
                        : "Cloudflare zone"}
                    </p>
                    <p>
                      {restriction.enforcement_mode === "worker_only"
                        ? "Last Worker status check"
                        : "Last Cloudflare verification"}
                      : {formatDate(restriction.last_verified_at)}
                    </p>
                    {restriction.cloudflare_rule_id && (
                      <p className="break-all font-mono text-[10px] text-slate-500">
                        Rule {restriction.cloudflare_rule_id}
                      </p>
                    )}
                    {restriction.visitor_id && (
                      <Link
                        to="/admin/honeypot/$visitorId"
                        params={{ visitorId: restriction.visitor_id }}
                        className="inline-flex min-h-9 items-center text-xs font-medium text-amber-800 underline underline-offset-2"
                      >
                        Open visitor record
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {restriction.status === "active" && restriction.visitor_id && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={verifyMutation.isPending}
                          onClick={() =>
                            verifyMutation.mutate({
                              restrictionId: restriction.id,
                              visitorId: restriction.visitor_id!,
                            })
                          }
                        >
                          <ShieldAlert className="mr-1.5 h-4 w-4" aria-hidden="true" />
                          {restriction.enforcement_mode === "worker_only"
                            ? "Check Worker"
                            : "Verify"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={unbanMutation.isPending}
                          onClick={() =>
                            setPendingUnban({
                              id: restriction.id,
                              visitorId: restriction.visitor_id!,
                              ipAddress: restriction.ip_address,
                              enforcementMode: restriction.enforcement_mode,
                            })
                          }
                        >
                          <Ban className="mr-1.5 h-4 w-4" aria-hidden="true" />
                          Unban
                        </Button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {rows.length > 0 && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </footer>
        )}
      </section>

      <AlertDialog
        open={Boolean(pendingUnban)}
        onOpenChange={(open) => !open && setPendingUnban(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this IP restriction?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingUnban?.enforcementMode === "worker_only"
                ? "Requests reaching this Worker will no longer be blocked for this IP."
                : "Cloudflare removal must succeed and be verified before the record is marked removed."}{" "}
              This action will affect {pendingUnban?.ipAddress ?? "the selected IP address"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unbanMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!pendingUnban || unbanMutation.isPending}
              onClick={() => pendingUnban && unbanMutation.mutate(pendingUnban)}
            >
              {unbanMutation.isPending ? "Removing…" : "Confirm unban"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
