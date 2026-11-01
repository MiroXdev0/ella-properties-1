import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, ShieldBan } from "lucide-react";

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
import { restrictHoneypotVisitor } from "@/lib/admin/honeypot.functions";

type Props = {
  visitorId: string;
  ipAddress: string | null;
  isTrusted: boolean;
  reason?: string;
  disabled?: boolean;
};

const durationOptions = [
  { value: "1_hour", label: "1 hour" },
  { value: "24_hours", label: "24 hours" },
  { value: "7_days", label: "7 days" },
  { value: "permanent", label: "Permanent" },
] as const;

export function HoneypotRestrictionDialog({
  visitorId,
  ipAddress,
  isTrusted,
  reason: initialReason,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<(typeof durationOptions)[number]["value"]>("24_hours");
  const [reason, setReason] = useState(initialReason ?? "Accessed a honeypot endpoint");
  const [errorMessage, setErrorMessage] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      restrictHoneypotVisitor({
        data: {
          visitorId,
          ipAddress: ipAddress ?? "",
          duration,
          reason: reason.trim(),
          confirmed: true,
        },
      }),
    onSuccess: async () => {
      setOpen(false);
      setErrorMessage("");
      await queryClient.invalidateQueries({ queryKey: ["honeypot"] });
    },
    onError: (error) => setErrorMessage(error.message),
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!mutation.isPending) {
          setOpen(nextOpen);
          if (nextOpen) setErrorMessage("");
        }
      }}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-10 border-rose-200 text-rose-800 hover:bg-rose-50"
        disabled={disabled || isTrusted || !ipAddress}
        onClick={() => setOpen(true)}
        title={
          isTrusted || !ipAddress
            ? "This address cannot be restricted"
            : "Review and restrict this IP at Cloudflare"
        }
      >
        <ShieldBan className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Ban IP
      </Button>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Apply a Cloudflare IP restriction?</AlertDialogTitle>
          <AlertDialogDescription>
            This changes the live zone IP Access Rules. The rule is verified with Cloudflare before
            it is shown as active. Your current IP and configured trusted addresses are protected.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="text-xs font-medium text-slate-500">Address</div>
            <code className="mt-1 block break-all font-mono text-slate-900">
              {ipAddress ?? "Unavailable"}
            </code>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">
            Duration
            <select
              value={duration}
              onChange={(event) =>
                setDuration(event.target.value as (typeof durationOptions)[number]["value"])
              }
              className="flex h-11 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              disabled={mutation.isPending}
            >
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Restriction reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-lg border border-input bg-card p-3 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              disabled={mutation.isPending}
            />
          </label>
          {duration === "permanent" && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              Permanent restrictions remain until an administrator removes them.
            </p>
          )}
          {errorMessage && (
            <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-900">
              {errorMessage}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending || !reason.trim() || !ipAddress}
            onClick={() => mutation.mutate()}
            className="min-h-11"
          >
            {mutation.isPending ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ShieldBan className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Confirm restriction
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
