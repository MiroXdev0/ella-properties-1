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

const loginSchema = z.object({
  email: z.string().trim().email("Невалиден имейл").max(255),
  password: z.string().min(6, "Минимум 6 символа").max(100),
});

function AuthPage() {
  const navigate = useNavigate();
  const settings = useSiteSettings();
  const signUp = useServerFn(publicSignUp);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
        toast.success("Изпратихме ви линк за нова парола.");
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
              ? "Регистрацията е изключена от администратор."
              : "Възникна грешка при регистрацията.",
          );
          return;
        }
        toast.success("Регистрацията е успешна. Проверете имейла си за потвърждение.");
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
      toast.success("Добре дошли!");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Възникна грешка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-deep text-white">
      <Toaster position="top-center" />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/70 hover:text-gold">
          <ArrowLeft className="h-4 w-4" /> Към сайта
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-gold text-navy-deep">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl">Админ Панел</div>
              <div className="text-xs uppercase tracking-[0.2em] text-gold">Елла Недвижими Имоти</div>
            </div>
          </div>

          <h1 className="font-display text-2xl">
            {mode === "login" && "Вход в системата"}
            {mode === "signup" && "Регистрация"}
            {mode === "forgot" && "Забравена парола"}
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {mode === "login" && "Влезте, за да управлявате имотите и съдържанието."}
            {mode === "signup" && "Създайте нов акаунт за достъп до админ панела."}
            {mode === "forgot" && "Ще получите линк за смяна на паролата."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-white/80">Имейл</Label>
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
                <Label htmlFor="password" className="text-white/80">Парола</Label>
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
              {mode === "login" && "Влез"}
              {mode === "signup" && "Регистрирай се"}
              {mode === "forgot" && "Изпрати линк"}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-sm">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("forgot")} className="text-left text-white/70 hover:text-gold">
                  Забравена парола?
                </button>
                {settings.allow_registration && (
                  <button onClick={() => setMode("signup")} className="text-left text-white/70 hover:text-gold">
                    Нямате акаунт? Регистрирайте се
                  </button>
                )}
              </>
            )}
            {mode !== "login" && (
              <button onClick={() => setMode("login")} className="text-left text-white/70 hover:text-gold">
                ← Обратно към вход
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}





