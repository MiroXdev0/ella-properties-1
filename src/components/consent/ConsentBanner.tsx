import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OPEN_PREFS_EVENT, saveConsent, useConsent } from "@/lib/consent";
import { useLanguage } from "@/i18n/LanguageProvider";

export function ConsentBanner() {
  const { consent, ready } = useConsent();
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState(false);
  const [storageError, setStorageError] = useState(false);

  function handleSaveConsent(allowMedia: boolean) {
    setStorageError(false);
    try {
      saveConsent(allowMedia);
      setOpen(false);
    } catch (error) {
      console.error(
        "[consent] Unable to save consent preferences",
        error instanceof Error ? error.message : "Unknown storage error",
      );
      setStorageError(true);
    }
  }

  useEffect(() => {
    const h = () => {
      setStorageError(false);
      setMedia(consent?.media ?? false);
      setOpen(true);
    };
    window.addEventListener(OPEN_PREFS_EVENT, h);
    return () => window.removeEventListener(OPEN_PREFS_EVENT, h);
  }, [consent]);

  const showBanner = ready && !consent && !open;

  return (
    <>
      {showBanner && (
        <section
          role="region"
          lang={language}
          aria-label={`${t("consent.title")}: ${t("consent.external")}`}
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl sm:inset-x-6 sm:p-6"
        >
          <h2 className="font-display text-lg text-foreground">{t("consent.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("consent.description")}{" "}
            <Link to="/cookies" className="underline underline-offset-2 hover:text-foreground">
              {t("consent.policy")}
            </Link>
            {" · "}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
              {t("consent.privacy")}
            </Link>
          </p>
          {storageError && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {t("consent.storageError")}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => handleSaveConsent(true)}>{t("consent.acceptAll")}</Button>
            <Button variant="outline" onClick={() => handleSaveConsent(false)}>
              {t("consent.necessaryOnly")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setStorageError(false);
                setMedia(false);
                setOpen(true);
              }}
            >
              {t("consent.settings")}
            </Button>
          </div>
        </section>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("consent.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("consent.dialogDescription")}</DialogDescription>
          </DialogHeader>
          {storageError && (
            <p className="text-sm text-destructive" role="alert">
              {t("consent.storageError")}
            </p>
          )}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <div className="font-medium text-foreground">{t("consent.necessary")}</div>
                <p className="text-sm text-muted-foreground">{t("consent.necessaryDescription")}</p>
              </div>
              <Switch checked disabled aria-label={t("consent.necessaryAria")} />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <label htmlFor="consent-media" className="font-medium text-foreground">
                  {t("consent.external")}
                </label>
                <p className="text-sm text-muted-foreground">{t("consent.externalDescription")}</p>
              </div>
              <Switch id="consent-media" checked={media} onCheckedChange={setMedia} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleSaveConsent(false)}>
              {t("consent.rejectAll")}
            </Button>
            <Button onClick={() => handleSaveConsent(media)}>{t("consent.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
