import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BedDouble,
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Maximize2,
  Ruler,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ShareProperty } from "@/components/property/ShareProperty";
import { PropertyImageLightbox } from "@/components/property/PropertyImageLightbox";
import { useLanguage, useTranslateContent } from "@/i18n/LanguageProvider";
import type { Property } from "@/data/properties";
import {
  cleanPropertyText,
  formatPropertyPrice,
  getPropertyCardSpecifications,
} from "@/lib/property-format";
import { mediaUrlAtWidth } from "@/lib/media";

type Props = {
  property: Property;
  preview?: boolean;
};

const specificationIcons = {
  area: Maximize2,
  rooms: BedDouble,
  yardArea: Ruler,
  floor: Building2,
} as const;

export function PropertyCard({ property, preview = false }: Props) {
  const { language, t } = useLanguage();
  const translate = useTranslateContent();
  const [activeImage, setActiveImage] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const images = useMemo(() => {
    const sources = property.images?.length ? property.images : [property.image];
    return sources.filter((source, index, list): source is string => {
      return Boolean(source) && list.indexOf(source) === index;
    });
  }, [property.image, property.images]);
  const safeIndex = images.length ? activeImage % images.length : 0;
  const currentImage = images[safeIndex];
  const responsiveImage = currentImage?.startsWith("/api/public/media/");
  const title = cleanPropertyText(property.title);
  const city = cleanPropertyText(property.city);
  const district = cleanPropertyText(property.district);
  const location = [city, district].filter(Boolean).join(", ");
  const description = cleanPropertyText(property.description);
  const price = formatPropertyPrice(property.price, language);
  const specifications = getPropertyCardSpecifications(property, language);

  const image = currentImage ? (
    <img
      key={currentImage}
      src={mediaUrlAtWidth(currentImage, 640)}
      {...(responsiveImage
        ? {
            srcSet: [
              `${mediaUrlAtWidth(currentImage, 480)} 480w`,
              `${mediaUrlAtWidth(currentImage, 640)} 640w`,
              `${mediaUrlAtWidth(currentImage, 960)} 960w`,
            ].join(", "),
            sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
          }
        : {})}
      alt={location ? `${title} — ${location}` : title}
      loading="lazy"
      decoding="async"
      width={1024}
      height={640}
      className={`property-card-image h-full w-full object-cover ${
        imageLoaded && !imageFailed ? "opacity-100" : "opacity-0"
      }`}
      onLoad={() => {
        setImageLoaded(true);
        setImageFailed(false);
      }}
      onError={() => {
        setImageFailed(true);
        setImageLoaded(true);
      }}
    />
  ) : null;

  return (
    <>
      <article className="property-card group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            {imageFailed || images.length === 0 ? (
              <span className="text-xs">{t("property.imageUnavailable")}</span>
            ) : null}
          </div>
          {image &&
            (preview ? (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label={t("property.openImagePreview")}
                className="absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
              >
                {image}
              </button>
            ) : (
              <Link
                to="/properties/$id"
                params={{ id: property.id }}
                aria-label={`${t("property.more")}: ${title}`}
                className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
              >
                {image}
              </Link>
            ))}

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-4">
            <span className="rounded-md bg-navy/95 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white sm:px-3 sm:text-[11px]">
              {translate(property.listing)}
            </span>
            <span className="max-w-[55%] truncate rounded-md bg-gold px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-navy-deep sm:px-3 sm:text-[11px]">
              {translate(property.type)}
            </span>
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label={t("property.previousImage")}
                onClick={() => {
                  setActiveImage((index) => (index - 1 + images.length) % images.length);
                  setImageLoaded(false);
                  setImageFailed(false);
                }}
                className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-navy/80 text-white shadow-md transition-colors hover:bg-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t("property.nextImage")}
                onClick={() => {
                  setActiveImage((index) => (index + 1) % images.length);
                  setImageLoaded(false);
                  setImageFailed(false);
                }}
                className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-navy/80 text-white shadow-md transition-colors hover:bg-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="absolute bottom-3 right-3 rounded-full bg-navy/85 px-2.5 py-1 text-xs font-medium tabular-nums text-white">
                {safeIndex + 1} / {images.length}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {preview ? (
            <h3 className="line-clamp-2 min-h-[3.25rem] break-words font-display text-xl font-medium leading-tight text-navy">
              {title || t("property.titleUnavailable")}
            </h3>
          ) : (
            <Link
              to="/properties/$id"
              params={{ id: property.id }}
              className="line-clamp-2 min-h-[3.25rem] break-words font-display text-xl font-medium leading-tight text-navy hover:text-gold focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {title || t("property.titleUnavailable")}
            </Link>
          )}

          {location && (
            <p className="mt-2 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </p>
          )}

          {specifications.length > 0 && (
            <div className="mt-4 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
              {specifications.map((specification) => {
                const Icon = specificationIcons[specification.key];
                return (
                  <span
                    key={specification.key}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                    {specification.key === "area" || specification.key === "yardArea"
                      ? specification.value
                      : `${specification.value} ${t(
                          specification.key === "rooms"
                            ? "property.rooms"
                            : specification.key === "floor"
                              ? "property.floor"
                              : "property.area",
                        )}`}
                  </span>
                );
              })}
            </div>
          )}

          {description && (
            <p className="mt-3 line-clamp-2 min-h-[2.75rem] break-words text-sm leading-relaxed text-foreground/75">
              {description}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("property.price")}
              </div>
              <div className="break-words font-display text-xl font-semibold tabular-nums text-navy sm:text-2xl">
                {price ?? t("property.priceOnRequest")}
                {price && property.listing === "Наем" && (
                  <span className="whitespace-nowrap text-sm font-normal text-muted-foreground">
                    {" "}
                    {t("property.month")}
                  </span>
                )}
              </div>
            </div>
            {!preview && (
              <div className="flex flex-wrap justify-end gap-2">
                <Button asChild variant="outline" size="sm" className="min-h-11 rounded-full">
                  <Link to="/properties/$id" params={{ id: property.id }}>
                    {t("property.more")}
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="min-h-11 rounded-full bg-navy text-white hover:bg-navy-deep"
                >
                  <a href={`/?inquiry=${encodeURIComponent(title)}#contact`}>
                    {t("property.viewing")}
                  </a>
                </Button>
                <ShareProperty property={property} compact />
              </div>
            )}
          </div>
        </div>
      </article>
      {preview && (
        <PropertyImageLightbox
          images={images}
          title={title}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          initialIndex={safeIndex}
        />
      )}
    </>
  );
}
