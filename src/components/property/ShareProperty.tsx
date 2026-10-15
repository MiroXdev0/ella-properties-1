import { useEffect, useState } from "react";
import { Copy, Facebook, Mail, MessageCircle, Send, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageProvider";
import { SITE_URL } from "@/lib/seo";

type SharePropertyInfo = {
  id: string;
  title: string;
  description?: string | null;
};

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Use the legacy copy command as a browser-permission fallback.
    }
  }

  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Clipboard copy was rejected");
}

function shareDescription(description?: string | null) {
  const text = description?.replace(/\s+/g, " ").trim();
  if (text) return text.slice(0, 240);
  return "";
}

export function ShareProperty({
  property,
  compact = false,
}: {
  property: SharePropertyInfo;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [nativeShareAvailable, setNativeShareAvailable] = useState(false);
  const url = new URL(`/properties/${encodeURIComponent(property.id)}`, SITE_URL).href;
  const description = shareDescription(property.description) || t("share.defaultDescription");
  const message = [property.title, description, url].filter(Boolean).join("\n\n");
  const encodedUrl = encodeURIComponent(url);
  const encodedMessage = encodeURIComponent(message);
  const encodedTitle = encodeURIComponent(property.title);

  useEffect(() => {
    setNativeShareAvailable(typeof navigator.share === "function");
  }, []);

  async function share() {
    if (typeof navigator.share !== "function") {
      setOpen(true);
      return;
    }

    try {
      await navigator.share({
        title: property.title,
        ...(description ? { text: description } : {}),
        url,
      });
    } catch (error) {
      if (
        error !== null &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "AbortError"
      )
        return;
      setOpen(true);
    }
  }

  async function copyLink() {
    try {
      await copyText(url);
      toast.success(t("share.copied"));
      setOpen(false);
    } catch {
      toast.error(t("share.copyError"));
    }
  }

  const actions = [
    {
      label: t("share.whatsapp"),
      href: `https://wa.me/?text=${encodedMessage}`,
      icon: MessageCircle,
    },
    {
      label: t("share.facebook"),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: Facebook,
    },
    {
      label: t("share.telegram"),
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      icon: Send,
    },
    {
      label: t("share.email"),
      href: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(message)}`,
      icon: Mail,
    },
  ];

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={compact ? "icon" : "default"}
        aria-label={t("share.button")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void share();
        }}
        className={
          compact
            ? "pointer-events-auto relative z-10 h-11 w-11 shrink-0 rounded-full border-border bg-card text-navy hover:border-gold hover:bg-gold/10"
            : "rounded-full border-border text-navy hover:border-gold hover:bg-gold/10"
        }
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        {!compact && <span>{t("share.button")}</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl sm:p-7">
          <DialogHeader>
            <DialogTitle className="pr-8 font-display text-2xl text-navy">
              {t("share.dialogTitle")}
            </DialogTitle>
            <DialogDescription className="line-clamp-2 break-words">
              {property.title}
            </DialogDescription>
          </DialogHeader>

          <Button
            type="button"
            onClick={() => void copyLink()}
            className="h-12 w-full justify-start rounded-xl bg-navy text-white hover:bg-navy-deep"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            {t("share.copy")}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            {actions.map(({ label, href, icon: Icon }) => (
              <Button
                key={label}
                asChild
                variant="outline"
                className="min-w-0 justify-start rounded-xl px-3 text-xs sm:text-sm"
              >
                <a
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </a>
              </Button>
            ))}
          </div>

          {nativeShareAvailable && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => void share()}
              className="w-full justify-start rounded-xl text-navy"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {t("share.more")}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
