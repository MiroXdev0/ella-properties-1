import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Home,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  Building2,
  FileText,
  Menu,
  X,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Админ панел — Елла Недвижими Имоти" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: "/admin", label: "Табло", icon: LayoutDashboard, exact: true },
  { to: "/admin/properties", label: "Имоти", icon: Home, adminOnly: true },
  { to: "/admin/inquiries", label: "Запитвания", icon: MessageSquare },
  { to: "/admin/pages", label: "Страници", icon: FileText, adminOnly: true },
  { to: "/admin/team", label: "Екип", icon: Users, adminOnly: true },
  { to: "/admin/users", label: "Потребители", icon: Users, adminOnly: true },
  { to: "/admin/settings", label: "Настройки", icon: Settings, adminOnly: true },
];

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role, isAdmin } = Route.useRouteContext();
  const [email, setEmail] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  const items = NAV.filter((n) => (n.adminOnly ? isAdmin : true));

  const currentPage = items.find((item) => isActive(item.to, item.exact));
  const initials = email ? email.slice(0, 1).toLocaleUpperCase() : "E";

  return (
    <div className="flex min-h-screen w-full bg-[#f5f6f8] text-slate-900 selection:bg-gold/30">
      <Toaster position="top-center" richColors />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(19rem,88vw)] flex-col bg-[#10213b] text-white shadow-2xl shadow-navy/10 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Основна навигация"
      >
        <div className="flex h-[5.25rem] items-center gap-3 border-b border-white/10 px-6">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gold text-navy-deep shadow-lg shadow-black/10">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-xl tracking-wide">Елла</div>
            <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
              Недвижими имоти
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Затвори менюто"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-7">
          <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
            Работно пространство
          </div>
          <div className="flex flex-col gap-1.5">
            {items.map((n) => {
              const active = isActive(n.to, n.exact);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#10213b]",
                    active
                      ? "bg-white/10 text-white shadow-inner shadow-white/[0.02]"
                      : "text-white/65 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg transition-colors",
                      active
                        ? "bg-gold text-navy-deep"
                        : "bg-white/[0.05] text-white/55 group-hover:bg-white/10 group-hover:text-white",
                    )}
                  >
                    <n.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {n.label}
                  {active && (
                    <ChevronRight className="ml-auto h-4 w-4 text-gold" aria-hidden="true" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-9 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-gold">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Панел за управление
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/50">
              Обяви, запитвания и съдържание на едно място.
            </p>
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.055] p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/30 bg-gold/15 font-display text-lg text-gold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-white/85">
                {email || "Зареждане..."}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/40">
                {role === "admin" ? "Администратор" : "Редактор"}
              </div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Изход
          </button>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Затвори навигацията"
          className="fixed inset-0 z-30 cursor-default bg-navy/45 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-[4.5rem] items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-xl text-navy hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Меню"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">Работно пространство</span>
            <ChevronRight
              className="hidden h-3.5 w-3.5 text-slate-300 sm:inline"
              aria-hidden="true"
            />
            <span className="truncate font-semibold text-navy">
              {currentPage?.label ?? "Админ панел"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <span className="hidden text-xs text-muted-foreground md:inline">{email}</span>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-navy transition-colors hover:border-gold/60 hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:px-4 sm:text-sm"
            >
              <span className="hidden sm:inline">Към сайта</span>
              <span className="sm:hidden">Сайт</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </header>
        <main className="flex-1 px-4 py-7 sm:px-6 sm:py-9 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
