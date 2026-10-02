import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, CheckCircle2, KeyRound, TrendingUp, MessageSquare, Plus, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { fetchStats } from "@/lib/admin/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: fetchStats });

  const { data: recent } = useQuery({
    queryKey: ["admin-recent-properties"],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, title, type, status, price, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: recentInquiries } = useQuery({
    queryKey: ["admin-recent-inquiries"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inquiries")
        .select("id, name, message, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const cards = [
    { label: "Общо имоти", value: stats?.total ?? 0, icon: Home, color: "bg-navy text-white" },
    { label: "Активни обяви", value: stats?.active ?? 0, icon: CheckCircle2, color: "bg-emerald-600 text-white" },
    { label: "Продадени", value: stats?.sold ?? 0, icon: TrendingUp, color: "bg-amber-500 text-white" },
    { label: "Под наем", value: stats?.rent ?? 0, icon: KeyRound, color: "bg-sky-600 text-white" },
    { label: "Нови запитвания", value: stats?.newInquiries ?? 0, icon: MessageSquare, color: "bg-rose-500 text-white" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-navy">Добре дошли в админ панела</h1>
        <p className="text-sm text-muted-foreground">Преглед на дейността и съдържанието</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`grid h-12 w-12 place-items-center rounded-xl ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-navy">{c.value}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-display text-xl text-navy">Бързи действия</h3>
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild className="justify-start bg-navy hover:bg-navy-deep">
                <Link to="/admin/properties"><Plus className="mr-2 h-4 w-4" /> Добави имот</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/inquiries"><MessageSquare className="mr-2 h-4 w-4" /> Виж запитвания</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/team"><Users className="mr-2 h-4 w-4" /> Управление на екипа</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-navy">Последно добавени имоти</h3>
              <Link to="/admin/properties" className="text-xs text-navy hover:text-gold">Всички →</Link>
            </div>
            <div className="mt-4 divide-y">
              {recent && recent.length > 0 ? recent.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.type} · {p.status}</div>
                  </div>
                  <div className="font-display text-lg text-navy">€ {Number(p.price).toLocaleString("bg-BG")}</div>
                </div>
              )) : <div className="py-8 text-center text-sm text-muted-foreground">Все още няма добавени имоти.</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-navy">Последни запитвания</h3>
            <Link to="/admin/inquiries" className="text-xs text-navy hover:text-gold">Всички →</Link>
          </div>
          <div className="mt-4 divide-y">
            {recentInquiries && recentInquiries.length > 0 ? recentInquiries.map((i) => (
              <div key={i.id} className="flex items-start justify-between py-3">
                <div className="min-w-0">
                  <div className="font-medium">{i.name}</div>
                  <div className="line-clamp-1 text-sm text-muted-foreground">{i.message}</div>
                </div>
                <span className="ml-3 shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs">{i.status}</span>
              </div>
            )) : <div className="py-8 text-center text-sm text-muted-foreground">Няма получени запитвания.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}





