import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageProvider";
import { getRegistrationEnabled, publicSignUp } from "@/lib/auth.functions";

export const Route = createFileRoute("/signup")({
  beforeLoad: async ({ context }) => {
    const enabled = await context.queryClient.fetchQuery({
      queryKey: ["registration-enabled"],
      queryFn: () => getRegistrationEnabled(),
      staleTime: 0,
    });
    if (!enabled) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [{ title: "Регистрация — Елла Недвижими Имоти" }, { name: "robots", content: "noindex" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const signUp = useServerFn(publicSignUp);
  const fetchRegistrationEnabled = useServerFn(getRegistrationEnabled);
  const refreshRegistrationState = useQuery({
    queryKey: ["registration-enabled"],
    queryFn: () => fetchRegistrationEnabled(),
    staleTime: 0,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const schema = z
      .object({
        email: z.string().trim().email(t("auth.invalidEmail")).max(255, t("auth.emailTooLong")),
        password: z
          .string()
          .min(8, t("auth.signupMinPassword"))
          .max(100, t("auth.passwordTooLong")),
        passwordConfirmation: z.string(),
      })
      .refine((values) => values.password === values.passwordConfirmation, {
        message: t("auth.passwordMismatch"),
        path: ["passwordConfirmation"],
      });
    const parsed = schema.safeParse({ email, password, passwordConfirmation });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("auth.signupError"));
      return;
    }

    setLoading(true);
    try {
      const result = await signUp({
        data: { email: parsed.data.email, password: parsed.data.password },
      });
      if (!result.ok) {
        if (result.reason === "disabled") {
          await refreshRegistrationState.refetch();
          toast.error(t("auth.signupDisabled"));
          await navigate({ to: "/auth" });
          return;
        }
        if (result.reason === "exists") {
          toast.error(t("auth.accountExists"));
          return;
        }
        toast.error(t("auth.signupError"));
        return;
      }
      toast.success(
        result.emailConfirmationRequired ? t("auth.signupCheckEmail") : t("auth.signupSuccess"),
      );
      await navigate({ to: "/auth" });
    } catch (error) {
      console.error("[signup] Registration request failed", error);
      toast.error(t("auth.signupError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div lang={language} className="min-h-screen bg-navy-deep text-white">
      <Toaster position="top-center" />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/70 hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" /> {t("nav.backToSite")}
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-gold text-navy-deep">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl">{t("auth.adminPanel")}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-gold">
                Елла Недвижими Имоти
              </div>
            </div>
          </div>
          <h1 className="font-display text-2xl">{t("auth.signupTitle")}</h1>
          <p className="mt-1 text-sm text-white/60">{t("auth.signupDescription")}</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="signup-email" className="text-white/80">
                {t("auth.email")}
              </Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 border-white/15 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <Label htmlFor="signup-password" className="text-white/80">
                {t("auth.password")}
              </Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1.5 border-white/15 bg-white/5 text-white"
              />
            </div>
            <div>
              <Label htmlFor="signup-password-confirmation" className="text-white/80">
                {t("auth.confirmPassword")}
              </Label>
              <Input
                id="signup-password-confirmation"
                type="password"
                autoComplete="new-password"
                required
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                className="mt-1.5 border-white/15 bg-white/5 text-white"
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-gold text-navy-deep hover:bg-gold-soft"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("auth.signup")}
            </Button>
          </form>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center gap-2 text-sm text-white/70 hover:text-gold"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("auth.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
