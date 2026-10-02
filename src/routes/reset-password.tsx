import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Нова парола — Елла Недвижими Имоти" },
      {
        name: "description",
        content:
          "Задайте нова парола за достъп до административния панел на Елла Недвижими Имоти.",
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
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Минимум 6 символа");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Паролата е сменена.");
    navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen bg-navy-deep text-white">
      <Toaster position="top-center" />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <h1 className="font-display text-2xl">Задайте нова парола</h1>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="new-password" className="text-white/80">Нова парола</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 border-white/15 bg-white/5 text-white"
              />
            </div>
            <Button disabled={loading} className="h-11 w-full rounded-full bg-gold text-navy-deep hover:bg-gold-soft">
              Запази
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}





