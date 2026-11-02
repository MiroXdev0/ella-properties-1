import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageProvider";

type Props = {
  images: string[];
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIndex?: number;
};

export function PropertyImageLightbox({
  images,
  title,
  open,
  onOpenChange,
  initialIndex = 0,
}: Props) {
  const { t } = useLanguage();
  const [active, setActive] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const pointerStart = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setActive(Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
      setZoom(1);
    }
  }, [images.length, initialIndex, open]);

  if (images.length === 0) return null;

  const current = images[active];
  const changeImage = (direction: -1 | 1) => {
    setActive((index) => (index + direction + images.length) % images.length);
    setZoom(1);
  };
  const imageLabel = (index: number) => t("property.media").replace("{number}", String(index + 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-label={t("property.previewTitle")}
        onKeyDown={(event) => {
          if (images.length < 2) return;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            changeImage(-1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            changeImage(1);
          }
        }}
        className="h-[100dvh] w-screen max-w-none overflow-hidden rounded-none border-0 bg-navy-deep/95 p-0 text-white shadow-none [&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:z-20 [&>button:last-child]:grid [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:place-items-center [&>button:last-child]:rounded-full [&>button:last-child]:bg-white/10 [&>button:last-child]:text-white [&>button:last-child]:opacity-100 [&>button:last-child]:hover:bg-white/20 [&>button:last-child]:focus-visible:ring-2 [&>button:last-child]:focus-visible:ring-gold [&>button:last-child]:focus-visible:ring-offset-0"
      >
        <DialogTitle className="sr-only">{t("property.previewTitle")}</DialogTitle>
        <div
          className="absolute inset-0 grid place-items-center overflow-auto px-4 pb-32 pt-16 sm:px-16"
          onPointerDown={(event) => {
            if (event.button === 0) pointerStart.current = event.clientX;
          }}
          onPointerUp={(event) => {
            const start = pointerStart.current;
            pointerStart.current = null;
            if (start === null || images.length < 2) return;
            const distance = event.clientX - start;
            if (Math.abs(distance) < 48) return;
            changeImage(distance > 0 ? -1 : 1);
          }}
          onWheel={(event) =>
            setZoom((value) => Math.min(3, Math.max(1, value + (event.deltaY < 0 ? 0.25 : -0.25))))
          }
          onPointerCancel={() => {
            pointerStart.current = null;
          }}
        >
          {failedImages.has(current) ? (
            <div className="px-6 text-center text-sm text-white/75" role="status">
              {t("property.imageUnavailable")}
            </div>
          ) : (
            <img
              key={current}
              src={current}
              alt={`${cleanTitle(title)} — ${imageLabel(active)}`}
              draggable={false}
              decoding="async"
              className="max-h-[calc(100dvh-10rem)] max-w-full select-none object-contain transition-transform duration-150 ease-out"
              style={{ transform: `scale(${zoom})` }}
              onError={() => setFailedImages((previous) => new Set(previous).add(current))}
            />
          )}
        </div>

        {images.length > 1 && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("property.previousImage")}
              onClick={() => changeImage(-1)}
              className="absolute left-3 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("property.nextImage")}
              onClick={() => changeImage(1)}
              className="absolute right-3 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </Button>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/60 to-transparent px-4 pb-5 pt-10">
          <div className="text-sm font-medium tabular-nums text-white" aria-live="polite">
            {t("property.mediaCounter")
              .replace("{current}", String(active + 1))
              .replace("{total}", String(images.length))}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-black/50 p-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={zoom <= 1 || failedImages.has(current)}
              aria-label={t("property.zoomOut")}
              onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
              className="h-10 w-10 rounded-full text-white hover:bg-white/15 disabled:opacity-40"
            >
              <ZoomOut className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={zoom >= 3 || failedImages.has(current)}
              aria-label={t("property.zoomIn")}
              onClick={() => setZoom((value) => Math.min(3, value + 0.5))}
              className="h-10 w-10 rounded-full text-white hover:bg-white/15 disabled:opacity-40"
            >
              <ZoomIn className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={zoom === 1}
              aria-label={t("property.resetZoom")}
              onClick={() => setZoom(1)}
              className="h-10 w-10 rounded-full text-white hover:bg-white/15 disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          {images.length > 1 && (
            <div className="flex max-w-full gap-2 overflow-x-auto px-1 pb-1">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  aria-label={imageLabel(index)}
                  aria-current={index === active ? "true" : undefined}
                  onClick={() => {
                    setActive(index);
                    setZoom(1);
                  }}
                  className={`h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep ${
                    index === active ? "border-gold" : "border-white/30 opacity-75"
                  }`}
                >
                  {failedImages.has(image) ? (
                    <span className="grid h-full place-items-center bg-white/10 text-[10px]">
                      {t("property.imageUnavailable")}
                    </span>
                  ) : (
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                      onError={() => setFailedImages((previous) => new Set(previous).add(image))}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function cleanTitle(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
