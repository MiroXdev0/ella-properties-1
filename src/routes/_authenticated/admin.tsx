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
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Админ панел — Елла Недвижими Имоти" }] }),
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

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900">
      <Toaster position="top-center" richColors />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/5 bg-navy-deep text-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gold text-navy-deep">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg">Елла</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80">Admin CRM</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {items.map((n) => {
            const active = isActive(n.to, n.exact);
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-gold text-navy-deep font-medium"
                    : "text-white/75 hover:bg-white/5 hover:text-white",
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-3">
          <div className="px-2 py-1 text-xs text-white/50 truncate">{email}</div>
          <div className="px-2 pb-1 text-[10px] uppercase tracking-widest text-gold/70">
            {role === "admin" ? "Администратор" : "Редактор"}
          </div>
          <button
            onClick={signOut}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Изход
          </button>
        </div>
      </aside>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white px-4 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Меню"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="font-display text-xl text-navy">Админ панел</div>
          <div className="ml-auto">
            <Link to="/" className="text-sm text-muted-foreground hover:text-navy">
              Виж сайта →
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}





