import { useCallback, useEffect, useState, type ReactNode } from "react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { PwaContext, type PwaContextValue } from "@/components/pwa/pwa-context";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaManager({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const { t } = useLanguage();

  const requestInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "unavailable"
  > => {
    if (!installPrompt) return "unavailable";

    setInstallPrompt(null);
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setIsInstalled(true);
    return choice.outcome;
  }, [installPrompt]);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone =
      "standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone || iosStandalone);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    let active = true;
    let hasControlledPage = Boolean(navigator.serviceWorker.controller);
    let removeUpdateListeners = () => {};
    const handleControllerChange = () => {
      if (hasControlledPage) {
        window.location.reload();
        return;
      }
      hasControlledPage = true;
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (!active) return;

        const setWaitingWorker = (worker: ServiceWorker | null) => {
          if (!worker || !navigator.serviceWorker.controller) return;
          setUpdateWorker(worker);
          setUpdateAvailable(true);
        };

        setWaitingWorker(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") {
              setWaitingWorker(registration.waiting ?? installing);
            }
          });
        });

        const checkForUpdates = () => {
          if (document.visibilityState !== "visible") return;
          void registration.update().catch((error: unknown) => {
            console.error("Unable to check for PWA updates", error);
          });
        };
        window.addEventListener("focus", checkForUpdates);
        document.addEventListener("visibilitychange", checkForUpdates);
        removeUpdateListeners = () => {
          window.removeEventListener("focus", checkForUpdates);
          document.removeEventListener("visibilitychange", checkForUpdates);
        };
      })
      .catch((error: unknown) => {
        if (active) console.error("Unable to register the PWA service worker", error);
      });

    return () => {
      active = false;
      removeUpdateListeners();
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const contextValue: PwaContextValue = {
    isInstalled,
    canPromptInstall: installPrompt !== null,
    requestInstall,
  };

  return (
    <PwaContext.Provider value={contextValue}>
      {children}
      {updateAvailable && (
        <aside
          role="status"
          className="fixed inset-x-4 bottom-4 z-[70] mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 rounded-lg bg-navy px-4 py-3 text-sm text-white shadow-xl"
        >
          <span>{t("pwa.updateAvailable")}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="min-h-11 rounded px-2 font-medium text-gold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              onClick={() => updateWorker?.postMessage({ type: "SKIP_WAITING" })}
            >
              {t("pwa.updateNow")}
            </button>
            <button
              type="button"
              aria-label={t("pwa.dismissUpdate")}
              className="min-h-11 px-2 text-white/75 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              onClick={() => setUpdateAvailable(false)}
            >
              ×
            </button>
          </div>
        </aside>
      )}
    </PwaContext.Provider>
  );
}
