import { useLanguage } from "./LanguageProvider";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className={`inline-flex shrink-0 items-center rounded-full border border-border bg-background p-0.5 text-xs font-semibold ${className}`}
    >
      {(["bg", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={language === option}
          aria-label={option === "bg" ? t("language.bulgarian") : t("language.english")}
          onClick={() => setLanguage(option)}
          className={`min-w-9 rounded-full px-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            language === option ? "bg-navy text-white" : "text-foreground/70 hover:text-foreground"
          }`}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
