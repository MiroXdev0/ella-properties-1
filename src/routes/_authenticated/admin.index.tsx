import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  CheckCircle2,
  KeyRound,
  TrendingUp,
  MessageSquare,
  Plus,
  Users,
  Settings,
  FileText,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { fetchStats } from "@/lib/admin/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Route as AuthenticatedRoute } from "./route";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { isAdmin } = AuthenticatedRoute.useRouteContext();
  const statsQuery = useQuery({ queryKey: ["admin-stats"], queryFn: fetchStats });

  const recentQuery = useQuery({
    queryKey: ["admin-recent-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, type, status, price, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const recentInquiriesQuery = useQuery({
    queryKey: ["admin-recent-inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select("id, name, message, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const recentProperties = recentQuery.data ?? [];
  const recentInquiries = recentInquiriesQuery.data ?? [];
  const stats = statsQuery.data;
  const cards = [
    { label: "Общо имоти", value: stats?.total, icon: Home },
    { label: "Публикувани", value: stats?.active, icon: CheckCircle2 },
    { label: "Чернови", value: stats?.drafts, icon: Settings },
    { label: "Продадени", value: stats?.sold, icon: TrendingUp },
    { label: "Под наем", value: stats?.rent, icon: KeyRound },
    { label: "Нови запитвания", value: stats?.newInquiries, icon: MessageSquare },
  ];

  return (
    <div className="space-y-7">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#10213b] px-6 py-7 text-white shadow-xl shadow-navy/10 sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute -right-10 -top-24 -z-10 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-1 -top-16 -z-10 h-48 w-48 rounded-full border border-gold/20" />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Табло за управление
            </div>
            <h1 className="font-display text-3xl leading-tight text-white sm:text-4xl">
              Добре дошли в админ панела
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/60">
              Всичко важно за обявите и запитванията Ви — подредено на едно място.
            </p>
          </div>
          <Button
            asChild
            className="min-h-12 rounded-xl bg-gold px-5 font-semibold text-navy hover:bg-gold/90"
          >
            <Link to="/admin/properties">
              <Plus className="mr-2 h-4 w-4" /> Добави имот
            </Link>
          </Button>
        </div>
      </section>

      {statsQuery.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <span>Статистиката не можа да се зареди: {statsQuery.error.message}</span>
          <Button variant="outline" size="sm" onClick={() => void statsQuery.refetch()}>
            Опитай отново
          </Button>
        </div>
      )}

      <section aria-label="Статистика" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Card
            key={c.label}
            className="group border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="flex items-center gap-4 p-5 sm:p-6">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f3f1ea] text-navy transition-colors group-hover:bg-gold/20">
                <c.icon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-semibold tabular-nums text-navy sm:text-3xl">
                  {statsQuery.isLoading ? "…" : (c.value ?? "—")}
                </div>
                <div className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                  {c.label}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
        <Card className="order-2 min-w-0 border border-slate-200/80 bg-white shadow-sm xl:order-1">
          <CardContent className="p-5 sm:p-7">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
              Навигация
            </div>
            <h2 className="mt-1 font-display text-2xl text-navy">Бърз достъп</h2>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                asChild
                variant="outline"
                className="w-full min-w-0 whitespace-normal justify-start"
              >
                <Link to="/admin/inquiries">
                  <MessageSquare className="mr-2 h-4 w-4" /> Виж запитвания
                </Link>
              </Button>
              {isAdmin && (
                <>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full min-w-0 whitespace-normal justify-start"
                  >
                    <Link to="/admin/team">
                      <Users className="mr-2 h-4 w-4" /> Управление на екипа
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full min-w-0 whitespace-normal justify-start"
                  >
                    <Link to="/admin/settings">
                      <Settings className="mr-2 h-4 w-4" /> Редакция на сайта
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full min-w-0 whitespace-normal justify-start"
                  >
                    <Link to="/admin/pages">
                      <FileText className="mr-2 h-4 w-4" /> Управление на страници
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="order-1 min-w-0 border border-slate-200/80 bg-white shadow-sm xl:order-2">
          <CardContent className="p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                  Обяви
                </div>
                <h2 className="mt-1 font-display text-2xl text-navy">Последно добавени имоти</h2>
              </div>
              <Link
                to="/admin/properties"
                className="text-xs font-medium text-navy hover:text-gold"
              >
                Всички →
              </Link>
            </div>
            <div className="mt-4 divide-y">
              {recentQuery.isLoading ? (
                <div role="status" className="py-8 text-center text-sm text-muted-foreground">
                  Зареждане...
                </div>
              ) : recentQuery.isError ? (
                <div
                  role="alert"
                  className="flex items-center justify-between gap-3 py-4 text-sm text-destructive"
                >
                  <span>Имоти: {recentQuery.error.message}</span>
                  <Button size="sm" variant="outline" onClick={() => void recentQuery.refetch()}>
                    Опитай отново
                  </Button>
                </div>
              ) : recentProperties.length > 0 ? (
                recentProperties.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.type} · {p.status}
                      </div>
                    </div>
                    <div className="font-display text-lg text-navy">
                      € {Number(p.price).toLocaleString("bg-BG")}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Все още няма добавени имоти.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                Клиенти
              </div>
              <h2 className="mt-1 font-display text-2xl text-navy">Последни запитвания</h2>
            </div>
            <Link to="/admin/inquiries" className="text-sm font-medium text-navy hover:text-gold">
              Всички →
            </Link>
          </div>
          <div className="mt-4 divide-y">
            {recentInquiriesQuery.isLoading ? (
              <div role="status" className="py-8 text-center text-sm text-muted-foreground">
                Зареждане...
              </div>
            ) : recentInquiriesQuery.isError ? (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 py-4 text-sm text-destructive"
              >
                <span>Запитвания: {recentInquiriesQuery.error.message}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void recentInquiriesQuery.refetch()}
                >
                  Опитай отново
                </Button>
              </div>
            ) : recentInquiries.length > 0 ? (
              recentInquiries.map((i) => (
                <div key={i.id} className="flex items-start justify-between py-3">
                  <div className="min-w-0">
                    <div className="font-medium">{i.name}</div>
                    <div className="line-clamp-1 text-sm text-muted-foreground">{i.message}</div>
                  </div>
                  <span className="ml-3 shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                    {i.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Няма получени запитвания.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
