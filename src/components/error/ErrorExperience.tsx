import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Building2, Compass, Home, KeyRound, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { bg } from "@/i18n/bg";
import { en } from "@/i18n/en";
import type { Language } from "@/i18n/LanguageProvider";
import type { ErrorExperienceKind } from "@/lib/error-experience";

type Props = {
  kind: ErrorExperienceKind;
  onRetry?: () => Promise<void> | void;
};

const languageStorageKey = "ella-language";

const copyByKind = {
  notFound: {
    code: "404",
    title: "error.404.title",
    description: "error.404.description",
    primary: "error.home",
    secondary: "error.browse",
    illustration: Compass,
  },
  access: {
    code: "403",
    title: "error.403.title",
    description: "error.403.description",
    primary: "error.home",
    secondary: "error.login",
    illustration: KeyRound,
  },
  server: {
    code: "500",
    title: "error.500.title",
    description: "error.500.description",
    primary: "error.retry",
    secondary: "error.home",
    illustration: Building2,
  },
  connection: {
    code: "",
    title: "error.connection.title",
    description: "error.connection.description",
    primary: "error.retry",
    secondary: "error.home",
    illustration: WifiOff,
  },
  maintenance: {
    code: "",
    title: "error.maintenance.title",
    description: "error.maintenance.description",
    primary: "error.home",
    secondary: null,
    illustration: Home,
  },
} as const;

export function ErrorExperience({ kind, onRetry }: Props) {
  const [language, setLanguage] = useState<Language>("bg");
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const copy = copyByKind[kind];
  const strings = language === "en" ? en : bg;
  const Icon = copy.illustration;

  useEffect(() => {
    const stored = window.localStorage.getItem(languageStorageKey);
    if (stored === "en" || stored === "bg") setLanguage(stored);
  }, []);

  function chooseLanguage(next: Language) {
    window.localStorage.setItem(languageStorageKey, next);
    setLanguage(next);
  }

  async function retry() {
    if (!onRetry || retrying) return;
    setRetrying(true);
    setRetryFailed(false);
    try {
      await onRetry();
    } catch {
      console.error("[error-page] Recovery action failed");
      setRetryFailed(true);
    } finally {
      setRetrying(false);
    }
  }

  const primaryIsRetry = copy.primary === "error.retry";
  const secondary = copy.secondary;

  return (
    <main
      lang={language}
      className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#f7f5ef] px-5 py-5 text-[#172a42] sm:px-8 sm:py-7"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-36 -top-40 -z-10 h-[28rem] w-[28rem] rounded-full border border-[#c6a15b]/20 sm:-right-20 sm:-top-48"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 -z-10 h-[21rem] w-[21rem] rounded-full border border-[#c6a15b]/15 sm:-right-4 sm:-top-32"
      />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <Link
          to="/"
          aria-label={strings["error.home"]}
          className="inline-flex min-h-11 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15b] focus-visible:ring-offset-4"
        >
          <img
            src="/logo-in-site.png"
            alt="Елла Недвижими Имоти"
            width={588}
            height={280}
            className="h-auto w-36 object-contain sm:w-44"
          />
        </Link>
        <div className="inline-flex items-center gap-1 rounded-full border border-[#0b1e3b]/10 bg-white/70 p-1">
          {(["bg", "en"] as const).map((option) => (
            <button
              key={option}
              type="button"
              lang={option}
              aria-pressed={language === option}
              aria-label={
                option === "bg" ? strings["language.bulgarian"] : strings["language.english"]
              }
              onClick={() => chooseLanguage(option)}
              className={`min-h-11 min-w-11 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15b] focus-visible:ring-offset-2 ${
                language === option
                  ? "bg-[#0b1e3b] text-white"
                  : "text-[#0b1e3b]/70 hover:bg-[#0b1e3b]/5 hover:text-[#0b1e3b]"
              }`}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 py-14 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:py-20">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#927039]">
            <span className="h-px w-8 bg-[#c6a15b]" aria-hidden="true" />
            {strings["error.eyebrow"]}
          </p>
          {copy.code && (
            <p
              aria-label={`${strings["error.status"]} ${copy.code}`}
              className="mt-5 font-display text-[clamp(5.5rem,17vw,10rem)] font-medium leading-[0.82] tracking-[-0.06em] text-[#0b1e3b]"
            >
              {copy.code}
            </p>
          )}
          <h1 className="mt-6 max-w-xl text-balance font-display text-3xl font-medium leading-tight text-[#0b1e3b] sm:text-4xl md:text-5xl">
            {strings[copy.title]}
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-[#475569] sm:text-lg">
            {strings[copy.description]}
          </p>

          {retryFailed && (
            <p role="alert" className="mt-4 text-sm font-medium text-[#7b4d25]">
              {strings["error.retryFailed"]}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {primaryIsRetry ? (
              onRetry ? (
                <Button
                  type="button"
                  onClick={() => void retry()}
                  disabled={retrying}
                  className="min-h-12 min-w-36 rounded-full bg-[#0b1e3b] px-6 text-white hover:bg-[#142d50] focus-visible:ring-2 focus-visible:ring-[#c6a15b] focus-visible:ring-offset-2"
                >
                  {retrying ? strings["error.retrying"] : strings[copy.primary]}
                </Button>
              ) : (
                <a
                  href="/"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#0b1e3b] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#142d50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15b] focus-visible:ring-offset-2"
                >
                  {strings["error.home"]}
                </a>
              )
            ) : (
              <Link
                to="/"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0b1e3b] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#142d50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15b] focus-visible:ring-offset-2"
              >
                {strings[copy.primary]}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}

            {secondary === "error.browse" && (
              <Link
                to="/"
                hash="catalog"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#0b1e3b]/15 bg-white/75 px-6 text-sm font-semibold text-[#0b1e3b] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15b] focus-visible:ring-offset-2"
              >
                {strings[secondary]}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
            {secondary === "error.login" && (
              <Link
                to="/auth"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#0b1e3b]/15 bg-white/75 px-6 text-sm font-semibold text-[#0b1e3b] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15b] focus-visible:ring-offset-2"
              >
                {strings[secondary]}
              </Link>
            )}
            {secondary === "error.home" && primaryIsRetry && (
              <Link
                to="/"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#0b1e3b]/15 bg-white/75 px-6 text-sm font-semibold text-[#0b1e3b] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15b] focus-visible:ring-offset-2"
              >
                {strings[secondary]}
              </Link>
            )}
          </div>
        </div>

        <div
          aria-hidden="true"
          className="relative mx-auto flex aspect-[1.08] w-full max-w-md items-center justify-center"
        >
          <div className="absolute inset-[8%] rounded-[42%] bg-[#eee8d9]" />
          <div className="absolute inset-[16%] rounded-[40%] border border-[#c6a15b]/40" />
          <div className="relative grid h-44 w-44 place-items-center rounded-[2.5rem] bg-[#0b1e3b] text-[#e3c782] shadow-[0_24px_70px_rgba(11,30,59,0.16)] sm:h-52 sm:w-52">
            <Icon className="h-20 w-20 stroke-[1.2]" />
          </div>
          <div className="absolute bottom-[18%] left-[12%] grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#0b1e3b] shadow-md sm:h-16 sm:w-16">
            {kind === "notFound" ? <ArrowLeft className="h-7 w-7" /> : <Home className="h-7 w-7" />}
          </div>
          <div className="absolute right-[12%] top-[17%] h-3 w-3 rounded-full bg-[#c6a15b]" />
          <div className="absolute right-[17%] top-[25%] h-2 w-2 rounded-full bg-[#c6a15b]/60" />
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl border-t border-[#0b1e3b]/10 pt-4 text-xs text-[#64748b]">
        {strings["error.footer"]}
      </footer>
    </main>
  );
}
