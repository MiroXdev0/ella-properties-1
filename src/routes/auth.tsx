import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Building2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { publicSignUp } from "@/lib/auth.functions";
import { useLanguage } from "@/i18n/LanguageProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Вход — Елла Недвижими Имоти" },
      {
        name: "description",
        content:
          "Влезте в своя профил в Елла Недвижими Имоти, за да управлявате имотите и запитванията на агенцията.",
      },
      { property: "og:title", content: "Вход в административния панел — Елла Недвижими Имоти" },
      {
        property: "og:description",
        content: "Достъп до административния панел на Елла Недвижими Имоти.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const settings = useSiteSettings();
  const { language, t } = useLanguage();
  const signUp = useServerFn(publicSignUp);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const loginSchema = z.object({
    email: z.string().trim().email(t("auth.invalidEmail")).max(255, t("auth.emailTooLong")),
    password: z.string().min(6, t("auth.minPassword")).max(100, t("auth.passwordTooLong")),
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success(t("auth.emailSent"));
        setMode("login");
        return;
      }
      if (mode === "signup") {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Невалидни данни");
          return;
        }
        // Server-side check of the registration switch; the hidden form is only cosmetic.
        const res = await signUp({
          data: {
            email: parsed.data.email,
            password: parsed.data.password,
            redirectTo: window.location.origin,
          },
        });
        if (!res.ok) {
          toast.error(
            res.reason === "disabled"
              ? t("auth.signupDisabled")
              : t("auth.signupError"),
          );
          return;
        }
        toast.success(t("auth.signupSuccess"));
        setMode("login");
        return;
      }
      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Невалидни данни");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) throw error;
      toast.success(t("auth.welcome"));
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div lang={language} className="min-h-screen bg-navy-deep text-white">
      <Toaster position="top-center" />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-4 flex justify-end"><LanguageSwitcher /></div>
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/70 hover:text-gold">
          <ArrowLeft className="h-4 w-4" /> {t("nav.backToSite")}
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-gold text-navy-deep">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl">{t("auth.adminPanel")}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-gold">Елла Недвижими Имоти</div>
            </div>
          </div>

          <h1 className="font-display text-2xl">
            {mode === "login" && t("auth.loginTitle")}
            {mode === "signup" && t("auth.signupTitle")}
            {mode === "forgot" && t("auth.forgotTitle")}
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {mode === "login" && t("auth.loginDescription")}
            {mode === "signup" && t("auth.signupDescription")}
            {mode === "forgot" && t("auth.forgotDescription")}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-white/80">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 border-white/15 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
            {mode !== "forgot" && (
              <div>
                <Label htmlFor="password" className="text-white/80">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 border-white/15 bg-white/5 text-white"
                />
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-full bg-gold text-navy-deep hover:bg-gold-soft"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" && t("auth.login")}
              {mode === "signup" && t("auth.signup")}
              {mode === "forgot" && t("auth.sendLink")}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-sm">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("forgot")} className="text-left text-white/70 hover:text-gold">
                  {t("auth.forgot")}
                </button>
                {settings.allow_registration && (
                  <button onClick={() => setMode("signup")} className="text-left text-white/70 hover:text-gold">
                    {t("auth.noAccount")}
                  </button>
                )}
              </>
            )}
            {mode !== "login" && (
              <button onClick={() => setMode("login")} className="text-left text-white/70 hover:text-gold">
                {t("auth.backToLogin")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



