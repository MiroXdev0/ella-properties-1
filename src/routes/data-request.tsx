import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { legalHead } from "@/lib/seo";
import { submitDataRequest, DATA_REQUEST_TYPES } from "@/lib/inquiries.functions";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { bg } from "@/i18n/bg";

export const Route = createFileRoute("/data-request")({
  head: () =>
    legalHead(
      "Права върху личните данни — Елла Недвижими Имоти",
      "Подайте искане за достъп, корекция, изтриване, преносимост на личните данни или оттегляне на съгласие.",
      "/data-request",
    ),
  component: DataRequestPage,
});

function DataRequestPage() {
  const { language, t } = useLanguage();
  const send = useServerFn(submitDataRequest);
  const [startedAt] = useState(() => Date.now());
  const [f, setF] = useState({ type: "access", name: "", email: "", phone: "", details: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error" | "rate">("idle");

  function validate() {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = t("request.nameError");
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = t("request.emailError");
    if (f.phone && !/^[0-9+()\s\-./]{5,40}$/.test(f.phone.trim())) e.phone = t("request.phoneError");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setStatus("sending");
    try {
      const r = await send({ data: { ...f, started_at: startedAt } });
      setStatus(r.ok ? "done" : r.reason === "rate_limited" ? "rate" : "error");
    } catch {
      setStatus("error");
    }
  }

  const err = (k: string) =>
    errors[k] ? <p id={`${k}-err`} className="mt-1 text-sm text-destructive">{errors[k]}</p> : null;

  return (
    <LegalLayout title="Права върху личните данни">
      <div lang={language}>
        <p>{t("request.intro")}</p>
        <p>{t("request.cookiesNote")}</p>

      <div aria-live="polite">
        {status === "done" && <p className="rounded-lg border border-border bg-muted p-4">{t("request.done")}</p>}
        {status === "error" && <p className="text-destructive">{t("request.error")}</p>}
        {status === "rate" && <p className="text-destructive">{t("request.rate")}</p>}
      </div>

      {status !== "done" && (
        <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="hidden" aria-hidden="true">
            <label>Уебсайт<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></label>
          </div>
          <div>
            <Label htmlFor="dr-type">{t("request.type")}</Label>
            <select
              id="dr-type"
              value={f.type}
              onChange={(e) => setF({ ...f, type: e.target.value })}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {Object.entries(DATA_REQUEST_TYPES).map(([v, label]) => {
                const key = ({
                  access: "request.typeAccess",
                  export: "request.typeExport",
                  correction: "request.typeCorrection",
                  deletion: "request.typeDeletion",
                  withdraw: "request.typeWithdraw",
                } as const satisfies Record<keyof typeof DATA_REQUEST_TYPES, keyof typeof bg>)[v as keyof typeof DATA_REQUEST_TYPES];
                return <option key={v} value={v}>{t(key, label)}</option>;
              })}
            </select>
          </div>
          <div>
            <Label htmlFor="dr-name">{t("request.name")}</Label>
            <Input id="dr-name" autoComplete="name" required aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} value={f.name} maxLength={100} onChange={(e) => setF({ ...f, name: e.target.value })} className="mt-1.5" />
            {err("name")}
          </div>
          <div>
            <Label htmlFor="dr-email">{t("request.email")}</Label>
            <Input id="dr-email" type="email" autoComplete="email" required aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} value={f.email} maxLength={255} onChange={(e) => setF({ ...f, email: e.target.value })} className="mt-1.5" />
            {err("email")}
          </div>
          <div>
            <Label htmlFor="dr-phone">{t("request.phone")}</Label>
            <Input id="dr-phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-err" : undefined} value={f.phone} maxLength={40} onChange={(e) => setF({ ...f, phone: e.target.value })} className="mt-1.5" />
            {err("phone")}
          </div>
          <div>
            <Label htmlFor="dr-details">{t("request.details")}</Label>
            <Textarea id="dr-details" value={f.details} maxLength={1500} onChange={(e) => setF({ ...f, details: e.target.value })} className="mt-1.5 min-h-[120px]" />
          </div>
          <Button type="submit" disabled={status === "sending"}>
            {status === "sending" ? t("request.sending") : t("request.send")}
          </Button>
        </form>
      )}
      </div>
    </LegalLayout>
  );
}


