import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { openCookiePreferences } from "@/lib/consent";

export function LegalLayout({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a href="#legal-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
        Към съдържанието
      </a>
      <header className="border-b border-border bg-navy-deep">
        <div className="mx-auto flex max-w-3xl items-center px-5 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/85 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Към началната страница
          </Link>
        </div>
      </header>
      <main id="legal-main" className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <h1 className="font-display text-3xl font-medium text-navy sm:text-4xl">{title}</h1>
        {updated && <p className="mt-2 text-sm text-muted-foreground">Последна актуализация: {updated}</p>}
        <div
          role="note"
          className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm text-foreground"
        >
          <strong>Шаблон.</strong> Този документ е изготвен според текущата функционалност на сайта и
          трябва да бъде прегледан от квалифициран юрист преди да се разчита на него. Полетата в
          [КВАДРАТНИ СКОБИ] трябва да се попълнят от собственика на сайта.
        </div>
        <div className="legal-prose mt-8 space-y-4 text-[15px] leading-relaxed [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-navy [&_h3]:mt-5 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_a]:underline [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:text-left">
          {children}
        </div>
        <nav aria-label="Правна информация" className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm">
          <Link to="/privacy" className="hover:text-navy underline-offset-2 hover:underline">Поверителност</Link>
          <Link to="/cookies" className="hover:text-navy underline-offset-2 hover:underline">Бисквитки</Link>
          <Link to="/terms" className="hover:text-navy underline-offset-2 hover:underline">Общи условия</Link>
          <Link to="/data-request" className="hover:text-navy underline-offset-2 hover:underline">Права върху личните данни</Link>
          <button type="button" onClick={openCookiePreferences} className="hover:text-navy underline-offset-2 hover:underline">
            Настройки на бисквитките
          </button>
        </nav>
      </main>
    </div>
  );
}

export function legalHead(title: string, description: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}






