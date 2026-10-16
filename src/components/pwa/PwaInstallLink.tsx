import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageProvider";
import { usePwa } from "@/components/pwa/pwa-context";

type InstallMessage =
  | "pwa.alreadyInstalled"
  | "pwa.iosInstructions"
  | "pwa.manualInstructions"
  | "pwa.unavailable"
  | "pwa.installAccepted"
  | "pwa.installDismissed";

export function PwaInstallLink() {
  const { t } = useLanguage();
  const { isInstalled, canPromptInstall, requestInstall } = usePwa();
  const [message, setMessage] = useState<InstallMessage | null>(null);
  const [open, setOpen] = useState(false);

  const handleInstall = async () => {
    if (isInstalled) {
      setMessage("pwa.alreadyInstalled");
      setOpen(true);
      return;
    }

    const isAppleMobile =
      /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isAppleMobile) {
      setMessage("pwa.iosInstructions");
      setOpen(true);
      return;
    }

    if (canPromptInstall) {
      try {
        const result = await requestInstall();
        setMessage(
          result === "accepted"
            ? "pwa.installAccepted"
            : result === "dismissed"
              ? "pwa.installDismissed"
              : "pwa.unavailable",
        );
      } catch (error) {
        console.error("Unable to start PWA installation", error);
        setMessage("pwa.unavailable");
      }
      setOpen(true);
      return;
    }

    const isAndroid = /Android/i.test(navigator.userAgent);
    setMessage(isAndroid ? "pwa.manualInstructions" : "pwa.unavailable");
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleInstall()}
        className="min-h-11 max-w-full text-center text-white/70 underline decoration-white/30 underline-offset-4 transition-colors hover:text-gold hover:decoration-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        {t("footer.installApp")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pwa.installTitle")}</DialogTitle>
            <DialogDescription>{message ? t(message) : ""}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
