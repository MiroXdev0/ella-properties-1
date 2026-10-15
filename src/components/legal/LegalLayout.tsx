import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { openCookiePreferences } from "@/lib/consent";
import { useLanguage } from "@/i18n/LanguageProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  const { language, t } = useLanguage();
  const titleKey =
    title === "Политика за поверителност"
      ? "legal.pagePrivacy"
      : title === "Политика за бисквитките"
        ? "legal.pageCookies"
        : title === "Общи условия за ползване"
          ? "legal.pageTerms"
          : "legal.pageDataRights";

  return (
    <div lang={language} className="min-h-dvh bg-background text-foreground">
      <a
        href="#legal-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:text-navy focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        {t("legal.skip")}
      </a>
      <header className="border-b border-border bg-navy-deep">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-white/85 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("nav.backHome")}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main id="legal-main" className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="font-display text-3xl font-medium text-navy sm:text-4xl">
          {t(titleKey, title)}
        </h1>
        {updated && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("legal.updated").replace("{date}", updated)}
          </p>
        )}
        <div
          role="note"
          className="mt-6 rounded-xl border border-border/80 bg-muted/70 p-4 text-sm leading-relaxed text-foreground"
        >
          {t("legal.questions")}
        </div>
        <div className="legal-prose mt-8 space-y-5 text-[15px] leading-7 text-foreground/85 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:leading-tight [&_h2]:text-navy [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_a]:text-navy [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-gold/70 [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:text-left">
          {children}
        </div>
        <nav
          aria-label={t("legal.navLabel")}
          className="mt-12 flex flex-wrap gap-x-5 gap-y-3 border-t border-border pt-6 text-sm"
        >
          <Link
            to="/privacy"
            className="inline-flex min-h-11 items-center underline-offset-4 hover:text-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {t("legal.privacy")}
          </Link>
          <Link
            to="/cookies"
            className="inline-flex min-h-11 items-center underline-offset-4 hover:text-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {t("legal.cookies")}
          </Link>
          <Link
            to="/terms"
            className="inline-flex min-h-11 items-center underline-offset-4 hover:text-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {t("legal.terms")}
          </Link>
          <Link
            to="/data-request"
            className="inline-flex min-h-11 items-center underline-offset-4 hover:text-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {t("legal.dataRights")}
          </Link>
          <button
            type="button"
            onClick={openCookiePreferences}
            className="min-h-11 cursor-pointer text-left underline-offset-4 hover:text-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {t("legal.cookieSettings")}
          </button>
        </nav>
      </main>
    </div>
  );
}
