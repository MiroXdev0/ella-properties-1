import { useMemo, useState } from "react";
import { Eye, Images, Monitor, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyImageLightbox } from "@/components/property/PropertyImageLightbox";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { Property, PropertyType } from "@/data/properties";

type Props = {
  property: Property;
  galleryImages: string[];
};

export function PropertyPreviewDialog({ property, galleryImages }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const safeType = normalizePropertyType(property.type);
  const previewProperty = useMemo(
    () => ({ ...property, type: safeType, images: galleryImages }),
    [galleryImages, property, safeType],
  );
  const images = galleryImages.length ? galleryImages : property.image ? [property.image] : [];

  return (
    <>
      <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(true)}>
        <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
        {t("admin.property.preview")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-navy">
              {t("admin.property.preview")}
            </DialogTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("admin.property.previewDescription")}
            </p>
          </DialogHeader>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium text-slate-700">
              {t("admin.property.previewCard")}
            </div>
            <div className="inline-flex rounded-lg bg-slate-100 p-1" role="group">
              <Button
                type="button"
                variant={viewport === "desktop" ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={viewport === "desktop"}
                onClick={() => setViewport("desktop")}
                className="min-h-10"
              >
                <Monitor className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("admin.property.desktop")}
              </Button>
              <Button
                type="button"
                variant={viewport === "mobile" ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={viewport === "mobile"}
                onClick={() => setViewport("mobile")}
                className="min-h-10"
              >
                <Smartphone className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("admin.property.mobile")}
              </Button>
            </div>
          </div>

          <div
            className={`mx-auto w-full transition-[max-width] duration-200 ease-out ${
              viewport === "mobile" ? "max-w-[390px]" : "max-w-4xl"
            }`}
          >
            <PropertyCard property={previewProperty} preview />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <div>
              <h3 className="text-sm font-semibold text-navy">
                {t("admin.property.previewGallery")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("property.mediaCounter")
                  .replace("{current}", String(images.length > 0 ? 1 : 0))
                  .replace("{total}", String(images.length))}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={images.length === 0}
              onClick={() => setGalleryOpen(true)}
            >
              <Images className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("admin.property.previewGallery")}
            </Button>
          </div>
          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  aria-label={t("property.media").replace("{number}", String(index + 1))}
                  className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                    index === 0 ? "border-gold" : "border-slate-200"
                  }`}
                >
                  <img
                    src={image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <PropertyImageLightbox
        images={images}
        title={property.title}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
      />
    </>
  );
}

function normalizePropertyType(type: string): PropertyType {
  if (
    type === "Апартамент" ||
    type === "Къща" ||
    type === "Парцел" ||
    type === "Земеделска земя" ||
    type === "Офис" ||
    type === "Магазин"
  ) {
    return type;
  }
  return "Бизнес имот";
}
