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
  PanelLeft,
  PanelLeftClose,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Database,
  Ban,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { bg } from "@/i18n/bg";
import { useLanguage } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  label: keyof typeof bg;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  adminOnly?: boolean;
  section?: keyof typeof bg;
};

const NAV: NavItem[] = [
  {
    to: "/admin",
    label: "admin.nav.dashboard",
    icon: LayoutDashboard,
    exact: true,
    section: "admin.nav.section.workspace",
  },
  {
    to: "/admin/properties",
    label: "admin.nav.properties",
    icon: Home,
    adminOnly: true,
    section: "admin.nav.section.properties",
  },
  {
    to: "/admin/inquiries",
    label: "admin.nav.inquiries",
    icon: MessageSquare,
  },
  {
    to: "/admin/pages",
    label: "admin.nav.pages",
    icon: FileText,
    adminOnly: true,
    section: "admin.nav.section.administration",
  },
  { to: "/admin/team", label: "admin.nav.team", icon: Users, adminOnly: true },
  { to: "/admin/users", label: "admin.nav.users", icon: Users, adminOnly: true },
  { to: "/admin/settings", label: "admin.nav.settings", icon: Settings, adminOnly: true },
  {
    to: "/admin/security",
    label: "admin.nav.security",
    icon: ShieldCheck,
    adminOnly: true,
    exact: true,
    section: "admin.nav.section.security",
  },
  {
    to: "/admin/honeypot",
    label: "admin.nav.honeypot",
    icon: ShieldAlert,
    adminOnly: true,
  },
  {
    to: "/admin/restrictions",
    label: "admin.nav.restrictions",
    icon: Ban,
    adminOnly: true,
    exact: true,
  },
  {
    to: "/admin/audit",
    label: "admin.nav.audit",
    icon: ScrollText,
    adminOnly: true,
    exact: true,
  },
  {
    to: "/admin/security-health",
    label: "admin.nav.health",
    icon: Database,
    adminOnly: true,
    exact: true,
  },
];

function AdminLayout() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role, isAdmin } = Route.useRouteContext();
  const [email, setEmail] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("[admin] Unable to load current account", error);
          return;
        }
        setEmail(data.user?.email ?? "");
      })
      .catch((error: unknown) => {
        if (active) console.error("[admin] Unable to load current account", error);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (!event.matches) setOpen(false);
    };

    if (mediaQuery.matches) document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    mediaQuery.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      mediaQuery.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await navigate({ to: "/auth" });
    } catch (error) {
      console.error("[admin] Sign out failed", error);
      toast.error(t("admin.nav.signOutError"));
    } finally {
      setSigningOut(false);
    }
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  const items = NAV.filter((n) => (n.adminOnly ? isAdmin : true));

  const currentPage = items.find((item) => isActive(item.to, item.exact));
  const initials = email ? email.slice(0, 1).toLocaleUpperCase() : "E";

  return (
    <div className="flex min-h-screen w-full bg-[#f5f6f8] text-slate-900 selection:bg-gold/30">
      <Toaster position="top-center" richColors />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(19rem,88vw)] flex-col bg-[#10213b] text-white shadow-2xl shadow-navy/10 transition-[width,transform] duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 lg:shadow-none",
          collapsed ? "lg:w-[5rem]" : "lg:w-72",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label={t("admin.nav.title")}
      >
        <div
          className={cn(
            "flex h-[5.25rem] items-center gap-3 border-b border-white/10",
            collapsed ? "px-3 lg:justify-center" : "px-6",
          )}
        >
          <Link
            to="/"
            aria-label={t("nav.backToSite")}
            className={cn(
              "flex min-w-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#10213b]",
              collapsed && "lg:hidden",
            )}
          >
            <img
              src="/logo-in-site.png"
              alt="Елла Недвижими Имоти"
              width={588}
              height={280}
              className="h-auto w-36 max-w-full object-contain"
            />
          </Link>
          {collapsed && (
            <Link
              to="/"
              aria-label={t("nav.backToSite")}
              className="hidden min-h-11 min-w-11 items-center justify-center rounded-md text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:inline-flex"
            >
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setOpen(false)}
            aria-label={t("admin.nav.close")}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav
          id="admin-primary-navigation"
          className={cn("flex-1 overflow-y-auto py-6", collapsed ? "px-2 lg:px-2" : "px-4")}
        >
          <div
            className={cn(
              "mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35",
              collapsed && "lg:hidden",
            )}
          >
            {t("admin.nav.section.administration")}
          </div>
          <div className="flex flex-col gap-1">
            {items.map((n) => {
              const active = isActive(n.to, n.exact);
              return (
                <div key={n.to}>
                  {n.section && (
                    <div
                      className={cn(
                        "mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35",
                        collapsed && "lg:hidden",
                      )}
                    >
                      {t(n.section)}
                    </div>
                  )}
                  <Link
                    to={n.to}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? t(n.label) : undefined}
                    aria-label={collapsed ? t(n.label) : undefined}
                    className={cn(
                      "group flex min-h-11 items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#10213b]",
                      collapsed ? "justify-center px-2 lg:px-0" : "px-3",
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/65 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors",
                        active
                          ? "bg-gold text-navy-deep"
                          : "text-white/55 group-hover:bg-white/10 group-hover:text-white",
                      )}
                    >
                      <n.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate", collapsed && "lg:hidden")}>
                      {t(n.label)}
                    </span>
                    {active && (
                      <ChevronRight
                        className={cn("ml-auto h-4 w-4 text-gold", collapsed && "lg:hidden")}
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        </nav>

        <div className={cn("border-t border-white/10 p-4", collapsed && "lg:p-2")}>
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl bg-white/[0.055] p-3",
              collapsed && "lg:justify-center lg:p-2",
            )}
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/30 bg-gold/15 font-display text-lg text-gold">
              {initials}
            </div>
            <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
              <div className="truncate text-xs font-medium text-white/85">
                {email || t("admin.nav.accountLoading")}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/40">
                {role === "admin" ? t("admin.nav.roleAdmin") : t("admin.nav.roleEditor")}
              </div>
            </div>
          </div>
          <button
            onClick={signOut}
            disabled={signingOut}
            className={cn(
              "mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-wait disabled:opacity-60",
              collapsed && "lg:justify-center lg:px-0",
            )}
            title={collapsed ? t("admin.nav.signOut") : undefined}
            aria-busy={signingOut}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className={cn(collapsed && "lg:hidden")}>{t("admin.nav.signOut")}</span>
          </button>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("admin.nav.closeOverlay")}
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
            aria-label={open ? t("admin.nav.close") : t("admin.nav.open")}
            aria-expanded={open}
            aria-controls="admin-primary-navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-11 w-11 rounded-xl text-navy hover:bg-slate-100 lg:inline-flex"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? t("admin.nav.expand") : t("admin.nav.collapse")}
            aria-expanded={!collapsed}
            title={collapsed ? t("admin.nav.expand") : t("admin.nav.collapse")}
          >
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {t("admin.nav.section.workspace")}
            </span>
            <ChevronRight
              className="hidden h-3.5 w-3.5 text-slate-300 sm:inline"
              aria-hidden="true"
            />
            <span className="truncate font-semibold text-navy">
              {currentPage ? t(currentPage.label) : t("admin.nav.title")}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <span className="hidden text-xs text-muted-foreground md:inline">{email}</span>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-navy transition-colors hover:border-gold/60 hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:px-4 sm:text-sm"
            >
              <span className="hidden sm:inline">{t("admin.nav.site")}</span>
              <span className="sm:hidden">{t("admin.nav.siteShort")}</span>
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
