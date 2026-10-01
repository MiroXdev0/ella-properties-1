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

export function ConsentBanner() {
  const { consent, ready } = useConsent();
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState(false);

  useEffect(() => {
    const h = () => {
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
          aria-label="Бисквитки и външно съдържание"
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl sm:inset-x-6 sm:p-6"
        >
          <h2 className="font-display text-lg text-foreground">Вашата поверителност</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Използваме само необходимо локално съхранение, за да работи сайтът. Карти и видеа от
            външни услуги (Google Maps, YouTube, Vimeo) могат да поставят бисквитки и се зареждат
            само с Ваше съгласие. Не използваме аналитика или реклами.{" "}
            <Link to="/cookies" className="underline underline-offset-2 hover:text-foreground">
              Политика за бисквитките
            </Link>
            {" · "}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Поверителност
            </Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => saveConsent(true)}>Приемам всички</Button>
            <Button variant="outline" onClick={() => saveConsent(false)}>
              Само необходимите
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setMedia(false);
                setOpen(true);
              }}
            >
              Настройки
            </Button>
          </div>
        </section>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Настройки на бисквитките</DialogTitle>
            <DialogDescription>
              Можете да промените или оттеглите съгласието си по всяко време от връзката
              „Настройки на бисквитките“ в долната част на сайта.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <div className="font-medium text-foreground">Необходими</div>
                <p className="text-sm text-muted-foreground">
                  Вход в админ панела и запомняне на този избор. Винаги активни.
                </p>
              </div>
              <Switch checked disabled aria-label="Необходими — винаги активни" />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <label htmlFor="consent-media" className="font-medium text-foreground">
                  Външно съдържание
                </label>
                <p className="text-sm text-muted-foreground">
                  Карти (Google Maps) и видеа (YouTube, Vimeo). Тези услуги могат да поставят
                  свои бисквитки.
                </p>
              </div>
              <Switch id="consent-media" checked={media} onCheckedChange={setMedia} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { saveConsent(false); setOpen(false); }}>
              Отказвам всички
            </Button>
            <Button onClick={() => { saveConsent(media); setOpen(false); }}>Запази избора</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
