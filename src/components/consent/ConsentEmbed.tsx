import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { openCookiePreferences, saveConsent, useConsent } from "@/lib/consent";
import { useLanguage } from "@/i18n/LanguageProvider";

/** Renders third-party embeds only after "media" consent. */
export function ConsentEmbed({
  children,
  service,
  fallbackHref,
  className = "",
}: {
  children: ReactNode;
  service: string;
  fallbackHref?: string;
  className?: string;
}) {
  const { consent, ready } = useConsent();
  const { t } = useLanguage();
  const [storageError, setStorageError] = useState(false);
  if (ready && consent?.media) return <>{children}</>;

  function handleAllowMedia() {
    setStorageError(false);
    try {
      saveConsent(true);
    } catch (error) {
      console.error(
        "[consent] Unable to save media consent",
        error instanceof Error ? error.message : "Unknown storage error",
      );
      setStorageError(true);
    }
  }
  return (
    <div
      className={`grid h-full min-h-[200px] place-items-center bg-muted p-6 text-center ${className}`}
    >
      <div className="max-w-sm">
        <p className="text-sm text-muted-foreground">
          {t("consent.embedNotice").replace("{service}", service)}
        </p>
        {storageError && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {t("consent.storageError")}
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={handleAllowMedia}>
            {t("consent.loadExternal")}
          </Button>
          <Button size="sm" variant="outline" onClick={openCookiePreferences}>
            {t("consent.settings")}
          </Button>
        </div>
        {fallbackHref && (
          <a
            href={fallbackHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm underline underline-offset-2 text-foreground"
          >
            {t("consent.openExternal").replace("{service}", service)}
          </a>
        )}
      </div>
    </div>
  );
}
