import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { bg } from "./bg";
import { en } from "./en";

export type Language = "bg" | "en";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof typeof bg, fallback?: string) => string;
};

const STORAGE_KEY = "ella-language";
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("bg");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "bg") setLanguageState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setLanguageState(next);
  }, []);

  const t = useCallback(
    (key: keyof typeof bg, fallback?: string) =>
      language === "en" ? en[key] ?? fallback ?? bg[key] : fallback ?? bg[key],
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}

export function translateContent(text: string) {
  const entry = Object.entries(bg).find(([, value]) => value === text);
  if (!entry) return text;
  return en[entry[0] as keyof typeof bg] ?? text;
}

export function useTranslateContent() {
  const { language } = useLanguage();
  return useCallback(
    (text: string) => (language === "en" ? translateContent(text) : text),
    [language],
  );
}
