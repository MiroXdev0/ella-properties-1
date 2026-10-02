import { useEffect, useState } from "react";

/**
 * Consent storage. Only one optional category exists today: "media" —
 * third-party embeds (Google Maps, YouTube, Vimeo) that can set cookies.
 * The site uses no analytics or advertising scripts.
 */
export const CONSENT_KEY = "ella-consent-v1";
export const OPEN_PREFS_EVENT = "ella:open-cookie-preferences";
const CHANGE_EVENT = "ella:consent-changed";

export type Consent = { media: boolean; decidedAt: string };

export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return typeof v?.media === "boolean" ? (v as Consent) : null;
  } catch {
    return null;
  }
}

export function saveConsent(media: boolean) {
  const c: Consent = { media, decidedAt: new Date().toISOString() };
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(c));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent(OPEN_PREFS_EVENT));
}

/** Returns null until hydrated / undecided. */
export function useConsent() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setConsent(readConsent());
    sync();
    setReady(true);
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { consent, ready };
}






