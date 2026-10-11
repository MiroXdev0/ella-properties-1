import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { useLanguage } from "@/i18n/LanguageProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Нова парола — Елла Недвижими Имоти" },
      {
        name: "description",
        content: "Задайте нова парола за достъп до административния панел на Елла Недвижими Имоти.",
      },
      { property: "og:title", content: "Нова парола — Елла Недвижими Имоти" },
      {
        property: "og:description",
        content: "Задайте нова парола за административния панел на Елла Недвижими Имоти.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<"checking" | "ready" | "invalid">(
    "checking",
  );

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const callbackParams = [searchParams, hashParams];
    const hasCallbackError = callbackParams.some(
      (params) => params.has("error") || params.has("error_code"),
    );
    const hasRecoveryCallback =
      searchParams.has("code") ||
      searchParams.get("type") === "recovery" ||
      hashParams.get("type") === "recovery";

    if (hasCallbackError || !hasRecoveryCallback) {
      setRecoveryStatus("invalid");
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setRecoveryStatus("ready");
      } else if (event === "SIGNED_OUT") {
        setRecoveryStatus("invalid");
      }
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error("[PasswordReset] Unable to read recovery session", error);
          setRecoveryStatus("invalid");
        } else if (!data.session) {
          setRecoveryStatus("invalid");
        } else {
          setRecoveryStatus((status) => (status === "checking" ? "invalid" : status));
        }
      })
      .catch((error: unknown) => {
        console.error("[PasswordReset] Unable to read recovery session", error);
        setRecoveryStatus("invalid");
      });

    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (recoveryStatus !== "ready") return;
    if (password.length < 6) {
      toast.error(t("auth.minPassword"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const expired =
          error.status === 401 ||
          error.code === "otp_expired" ||
          error.code === "session_not_found" ||
          error.code === "refresh_token_not_found";
        if (expired) setRecoveryStatus("invalid");
        toast.error(expired ? t("reset.invalid") : error.message);
        return;
      }
      toast.success(t("reset.changed"));
      navigate({ to: "/admin" });
    } catch (error) {
      console.error("[PasswordReset] Unable to update password", error);
      toast.error(t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div lang={language} className="min-h-screen bg-navy-deep text-white">
      <Toaster position="top-center" />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <h1 className="font-display text-2xl">{t("reset.title")}</h1>
          {recoveryStatus === "checking" ? (
            <p className="mt-4 text-sm text-white/70" role="status">
              {t("reset.checking")}
            </p>
          ) : recoveryStatus === "invalid" ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-white/70" role="alert">
                {t("reset.invalid")}
              </p>
              <Button
                asChild
                className="h-11 w-full rounded-full bg-gold text-navy-deep hover:bg-gold-soft"
              >
                <Link to="/auth">{t("reset.requestNewLink")}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="new-password" className="text-white/80">
                  {t("reset.newPassword")}
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={100}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 border-white/15 bg-white/5 text-white"
                />
              </div>
              <Button
                disabled={loading}
                className="h-11 w-full rounded-full bg-gold text-navy-deep hover:bg-gold-soft"
              >
                {t("reset.save")}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
