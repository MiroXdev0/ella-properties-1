import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Phone,
  MessageCircle,
  Home as HomeIcon,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { isVideoUrl, embedUrl } from "@/lib/media";
import { ConsentEmbed } from "@/components/consent/ConsentEmbed";
import { breadcrumbJsonLd, jsonLdScript, limitMetaText, SITE_URL } from "@/lib/seo";
import { citySlug } from "@/lib/cities";
import { useLanguage, useTranslateContent } from "@/i18n/LanguageProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { ShareProperty } from "@/components/property/ShareProperty";
import { Toaster } from "@/components/ui/sonner";
import heroImage from "@/assets/hero-1920.webp";

type Media = { url: string; kind: "image" | "video" };

type Detail = {
  id: string;
  title: string;
  type: string;
  listing: string;
  price: number;
  city: string;
  district: string;
  address?: string;
  area: number;
  yardArea: number | null;
  rooms?: number | null;
  layout?: string | null;
  floor?: string | null;
  description: string;
  media: Media[];
  videoEmbed?: string | null;
  mapLat?: number | null;
  mapLng?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

async function loadProperty(id: string): Promise<Detail> {
  if (!isUuid(id)) throw notFound();

  const { data, error } = await supabase
    .from("properties")
    .select(
      "id,title,type,status,price,city,district,address,area,yard_area,rooms,floor,layout,description,main_image,video_url,map_lat,map_lng,seo_title,seo_description,is_published",
    )
    .eq("id", id)
    .eq("is_published", true)
    .in("status", ["Продава", "Под наем"])
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound();

  const { data: imgs } = await supabase
    .from("property_images")
    .select("url,sort_order")
    .eq("property_id", id)
    .order("sort_order", { ascending: true });

  const urls: string[] = [];
  if (data.main_image) urls.push(data.main_image);
  for (const i of imgs ?? []) if (i.url && !urls.includes(i.url)) urls.push(i.url);

  return {
    id: data.id,
    title: data.title,
    type: String(data.type),
    listing: data.status === "Под наем" || data.status === "Отдаден" ? "Наем" : "Продажба",
    price: Number(data.price ?? 0),
    city: data.city ?? "",
    district: data.district ?? "",
    address: data.address ?? undefined,
    area: Number(data.area ?? 0),
    yardArea: data.yard_area == null ? null : Number(data.yard_area),
    rooms: data.rooms,
    layout: data.layout,
    floor: data.floor,
    description: data.description ?? "",
    media: urls.map((url) => ({ url, kind: isVideoUrl(url) ? "video" : "image" })),
    videoEmbed: data.video_url ? (embedUrl(data.video_url) ?? data.video_url) : null,
    mapLat: data.map_lat != null ? Number(data.map_lat) : null,
    mapLng: data.map_lng != null ? Number(data.map_lng) : null,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
  };
}

export const Route = createFileRoute("/properties/$id")({
  loader: ({ params }) => loadProperty(params.id),
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Имотът не е намерен | Елла Недвижими Имоти" },
          { name: "robots", content: "noindex,follow" },
        ],
      };
    }
    const url = `${SITE_URL}/properties/${encodeURIComponent(params.id)}`;
    const image = loaderData.media.find((item) => item.kind === "image")?.url ?? heroImage;
    const imageUrl = new URL(image, SITE_URL).href;
    const listingPhrase = loaderData.listing === "Наем" ? "под наем" : "за продажба";
    const location = [loaderData.city, loaderData.district].filter(Boolean).join(", ");
    const generatedTitle = `${loaderData.type} ${listingPhrase} в ${location} | Елла Имоти`;
    const title = limitMetaText(loaderData.seoTitle?.trim() || generatedTitle, 65);
    const priceText =
      loaderData.price > 0 && Number.isFinite(loaderData.price)
        ? new Intl.NumberFormat("bg-BG", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }).format(loaderData.price)
        : "";
    const facts = [
      `${loaderData.type} ${listingPhrase} в ${location}.`,
      priceText ? `Цена: ${priceText}${loaderData.listing === "Наем" ? " месечно" : ""}.` : "",
      loaderData.area > 0 && Number.isFinite(loaderData.area) ? `Площ: ${loaderData.area} м².` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const desc = limitMetaText(
      loaderData.seoDescription?.trim() ||
        [facts, loaderData.description.replace(/\s+/g, " ").trim()].filter(Boolean).join(" "),
      158,
    );
    const mainEntityType =
      loaderData.type === "Къща"
        ? "House"
        : loaderData.type === "Апартамент"
          ? "Apartment"
          : "Place";
    const mainEntity = {
      "@type": mainEntityType,
      name: loaderData.title,
      ...(location
        ? {
            address: {
              "@type": "PostalAddress",
              ...(loaderData.address ? { streetAddress: loaderData.address } : {}),
              addressLocality: loaderData.city,
              addressCountry: "BG",
            },
          }
        : {}),
      ...(["Къща", "Апартамент"].includes(loaderData.type) &&
      loaderData.area > 0 &&
      Number.isFinite(loaderData.area)
        ? {
            floorSize: {
              "@type": "QuantitativeValue",
              value: loaderData.area,
              unitCode: "MTK",
            },
          }
        : {}),
      ...(loaderData.rooms && loaderData.rooms > 0 ? { numberOfRooms: loaderData.rooms } : {}),
      ...(loaderData.yardArea && loaderData.yardArea > 0
        ? {
            additionalProperty: {
              "@type": "PropertyValue",
              name: "Площ на двора",
              value: loaderData.yardArea,
              unitText: "m²",
            },
          }
        : {}),
    };
    const offer =
      loaderData.price > 0 && Number.isFinite(loaderData.price)
        ? {
            "@type": "Offer",
            price: loaderData.price,
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            ...(loaderData.listing === "Наем"
              ? {
                  priceSpecification: {
                    "@type": "UnitPriceSpecification",
                    price: loaderData.price,
                    priceCurrency: "EUR",
                    unitText: "month",
                  },
                }
              : {}),
          }
        : null;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "Елла Недвижими Имоти" },
        { property: "og:locale", content: "bg_BG" },
        { property: "og:image", content: imageUrl },
        { property: "og:image:alt", content: title },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: imageUrl },
        { name: "twitter:image:alt", content: title },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "RealEstateListing",
          name: loaderData.title,
          description: desc,
          url,
          image: imageUrl,
          mainEntity,
          ...(offer ? { offers: offer } : {}),
        }),
        jsonLdScript(
          breadcrumbJsonLd([
            { name: "Начало", url: `${SITE_URL}/` },
            {
              name: `Имоти в ${loaderData.city}`,
              url: `${SITE_URL}/imoti-v/${encodeURIComponent(citySlug(loaderData.city))}`,
            },
            { name: loaderData.title, url },
          ]),
        ),
      ],
    };
  },
  pendingComponent: PropertyPending,
  notFoundComponent: PropertyNotFound,
  component: PropertyDetail,
});

function PropertyPending() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-9 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-6 aspect-[16/10] w-full animate-pulse rounded-2xl bg-muted" />
      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </main>
  );
}

function PropertyNotFound() {
  const { t } = useLanguage();
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <LanguageSwitcher className="mb-6" />
      <h1 className="font-display text-3xl text-navy">{t("property.notFound")}</h1>
      <p className="mt-3 text-muted-foreground">{t("property.notFoundDescription")}</p>
      <Button asChild className="mt-6 rounded-full bg-navy text-white hover:bg-navy-deep">
        <Link to="/" hash="catalog">
          {t("property.allProperties")}
        </Link>
      </Button>
    </main>
  );
}

function PropertyDetail() {
  const p = Route.useLoaderData();
  const { language, t } = useLanguage();
  const settings = useSiteSettings(undefined, language);
  const translate = useTranslateContent();
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const suppressPhotoClickUntil = useRef(0);

  const priceText = new Intl.NumberFormat(language === "en" ? "en-GB" : "bg-BG", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(p.price);
  const current = p.media[active];
  const hasMultipleMedia = p.media.length > 1;
  const showPrevious = () => setActive((index) => (index - 1 + p.media.length) % p.media.length);
  const showNext = () => setActive((index) => (index + 1) % p.media.length);
  const changeMedia = (direction: -1 | 1) => {
    setActive((index) => (index + direction + p.media.length) % p.media.length);
    setZoom(1);
  };
  const closeLightbox = (open: boolean) => {
    setLightboxOpen(open);
    if (!open) setZoom(1);
  };
  const phone = settings.phone1;
  const tel = `tel:${(phone ?? "").replace(/\s+/g, "")}`;
  const propertyUrl = new URL(`/properties/${encodeURIComponent(p.id)}`, SITE_URL).href;
  const waMessage = t("property.whatsappInterest")
    .replace("{title}", p.title)
    .replace("{url}", propertyUrl);
  const wa = `https://wa.me/${(phone ?? "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(waMessage)}`;

  return (
    <main lang={language} className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            hash="catalog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-navy"
          >
            <ArrowLeft className="h-4 w-4" /> {t("property.back")}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-navy px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white">
            {translate(p.listing)}
          </span>
          <span className="rounded-full bg-gold px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-navy-deep">
            {translate(p.type)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 flex-1 font-display text-3xl font-medium leading-tight text-navy sm:text-4xl lg:text-5xl">
            {p.title}
          </h1>
          <ShareProperty property={p} />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" /> {p.city}
          {p.district ? `, ${p.district}` : ""}
          {p.address ? ` — ${p.address}` : ""}
        </p>

        {/* Gallery */}
        {current && (
          <div className="mt-6 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
            <div
              role="group"
              aria-label={
                language === "en" ? "Property photo gallery" : "Галерия със снимки на имота"
              }
              tabIndex={hasMultipleMedia ? 0 : undefined}
              onKeyDown={(event) => {
                if (!hasMultipleMedia || current.kind !== "image") return;
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  showPrevious();
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  showNext();
                }
              }}
              onPointerDown={(event) => {
                if (!hasMultipleMedia || current.kind !== "image" || event.button !== 0) return;
                if (
                  event.target instanceof Element &&
                  event.target.closest(".gallery-desktop-control")
                )
                  return;
                pointerStart.current = { x: event.clientX, y: event.clientY };
              }}
              onPointerUp={(event) => {
                const start = pointerStart.current;
                pointerStart.current = null;
                if (!start || !hasMultipleMedia || current.kind !== "image") return;
                const deltaX = event.clientX - start.x;
                const deltaY = event.clientY - start.y;
                if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
                suppressPhotoClickUntil.current = Date.now() + 150;
                if (deltaX > 0) showPrevious();
                else showNext();
              }}
              onPointerCancel={() => {
                pointerStart.current = null;
              }}
              className={`relative aspect-[16/10] w-full bg-navy-deep/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold ${
                hasMultipleMedia && current.kind === "image"
                  ? "touch-pan-y cursor-grab active:cursor-grabbing"
                  : ""
              }`}
            >
              {current.kind === "video" ? (
                <video
                  src={current.url}
                  controls
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    if (event.detail > 0 && Date.now() < suppressPhotoClickUntil.current) return;
                    setLightboxOpen(true);
                  }}
                  aria-label={
                    language === "en" ? "Open photo in full screen" : "Отвори снимката на цял екран"
                  }
                  className="group absolute inset-0 h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
                >
                  <img
                    src={current.url}
                    alt={p.title}
                    draggable={false}
                    decoding="async"
                    fetchPriority={active === 0 ? "high" : "auto"}
                    className="h-full w-full select-none object-cover"
                  />
                  <span className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-navy/80 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <ZoomIn className="h-5 w-5" aria-hidden="true" />
                  </span>
                </button>
              )}
              {hasMultipleMedia && (
                <>
                  <button
                    type="button"
                    onClick={showPrevious}
                    aria-label={language === "en" ? "Previous image" : "Предишна снимка"}
                    className="gallery-desktop-control absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-navy/80 text-white shadow-md transition-[background-color,opacity] hover:bg-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={showNext}
                    aria-label={language === "en" ? "Next image" : "Следваща снимка"}
                    className="gallery-desktop-control absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-navy/80 text-white shadow-md transition-[background-color,opacity] hover:bg-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <span
                    aria-live="polite"
                    aria-atomic="true"
                    className="absolute bottom-3 right-3 rounded-full bg-navy/80 px-3 py-1 text-xs font-medium tabular-nums text-white"
                  >
                    {active + 1} / {p.media.length}
                  </span>
                </>
              )}
            </div>
            {p.media.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {p.media.map((m, i) => (
                  <button
                    key={m.url + i}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={t("property.media").replace("{number}", String(i + 1))}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      i === active
                        ? "border-gold"
                        : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                  >
                    {m.kind === "video" ? (
                      <video
                        src={m.url}
                        muted
                        playsInline
                        preload="none"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={m.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
            <Dialog open={lightboxOpen} onOpenChange={closeLightbox}>
              <DialogContent
                aria-label={
                  language === "en" ? "Property photo viewer" : "Преглед на снимка на имота"
                }
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft" && hasMultipleMedia) {
                    event.preventDefault();
                    changeMedia(-1);
                  } else if (event.key === "ArrowRight" && hasMultipleMedia) {
                    event.preventDefault();
                    changeMedia(1);
                  }
                }}
                className="h-[100dvh] w-screen max-w-none overflow-hidden rounded-none border-0 bg-navy-deep/95 p-0 text-white shadow-none [&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:z-20 [&>button:last-child]:grid [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:place-items-center [&>button:last-child]:rounded-full [&>button:last-child]:bg-white/10 [&>button:last-child]:text-white [&>button:last-child]:opacity-100 [&>button:last-child]:hover:bg-white/20 [&>button:last-child]:focus-visible:ring-2 [&>button:last-child]:focus-visible:ring-gold [&>button:last-child]:focus-visible:ring-offset-0"
              >
                <DialogTitle className="sr-only">
                  {language === "en" ? "Property photo viewer" : "Преглед на снимка на имота"}
                </DialogTitle>
                <div
                  className="absolute inset-0 overflow-auto px-3 pb-24 pt-16 sm:px-12"
                  onWheel={(event) => {
                    setZoom((value) =>
                      Math.min(3, Math.max(1, value + (event.deltaY < 0 ? 0.25 : -0.25))),
                    );
                  }}
                >
                  <div className="grid min-h-full min-w-full place-items-center">
                    {current?.kind === "image" ? (
                      <img
                        src={current.url}
                        alt={p.title}
                        draggable={false}
                        className="max-h-[calc(100dvh-10rem)] max-w-[calc(100vw-2rem)] select-none object-contain transition-transform duration-150 ease-out sm:max-w-[calc(100vw-6rem)]"
                        style={{ transform: `scale(${zoom})` }}
                      />
                    ) : current?.kind === "video" ? (
                      <video
                        src={current.url}
                        controls
                        playsInline
                        className="max-h-[calc(100dvh-10rem)] max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-6rem)]"
                      />
                    ) : null}
                  </div>
                </div>
                {hasMultipleMedia && (
                  <>
                    <button
                      type="button"
                      onClick={() => changeMedia(-1)}
                      aria-label={language === "en" ? "Previous image" : "Предишна снимка"}
                      className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:left-6"
                    >
                      <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => changeMedia(1)}
                      aria-label={language === "en" ? "Next image" : "Следваща снимка"}
                      className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:right-6"
                    >
                      <ChevronRight className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </>
                )}
                <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 p-2 shadow-lg">
                  <button
                    type="button"
                    onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
                    disabled={zoom <= 1 || current?.kind !== "image"}
                    aria-label={language === "en" ? "Zoom out" : "Намали"}
                    className="grid h-11 w-11 place-items-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40"
                  >
                    <ZoomOut className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <span className="min-w-14 text-center text-sm tabular-nums" aria-live="polite">
                    {current?.kind === "image" ? `${Math.round(zoom * 100)}%` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((value) => Math.min(3, value + 0.5))}
                    disabled={zoom >= 3 || current?.kind !== "image"}
                    aria-label={language === "en" ? "Zoom in" : "Увеличи"}
                    className="grid h-11 w-11 place-items-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40"
                  >
                    <ZoomIn className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    disabled={zoom === 1 || current?.kind !== "image"}
                    aria-label={language === "en" ? "Reset zoom" : "Върни оригиналния размер"}
                    className="grid h-11 w-11 place-items-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {hasMultipleMedia && (
                    <span className="ml-1 border-l border-white/20 pl-3 text-sm tabular-nums">
                      {active + 1} / {p.media.length}
                    </span>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div
              className={`grid grid-cols-2 gap-3 ${p.yardArea != null && p.yardArea > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}
            >
              {p.area > 0 && (
                <Spec icon={Maximize2} label={t("property.area")} value={`${p.area} m²`} />
              )}
              {p.yardArea != null && p.yardArea > 0 && (
                <Spec icon={Maximize2} label={t("property.yardArea")} value={`${p.yardArea} m²`} />
              )}
              {p.floor && (
                <Spec
                  icon={Layers}
                  label={p.type === "Къща" ? t("property.floors") : t("property.floor")}
                  value={
                    p.type === "Къща"
                      ? t("property.storiesHouse").replace("{count}", p.floor)
                      : p.floor
                  }
                />
              )}
              {p.layout && (
                <Spec icon={HomeIcon} label={t("property.layout")} value={translate(p.layout)} />
              )}
              {p.rooms ? (
                <Spec icon={Building2} label={t("property.rooms")} value={String(p.rooms)} />
              ) : null}
            </div>

            <h2 className="mt-8 font-display text-xl text-navy">{t("property.description")}</h2>
            <p className="mt-3 max-w-3xl whitespace-pre-line text-[15px] leading-7 text-foreground/80">
              {p.description || t("property.contactForInfo")}
            </p>

            {p.videoEmbed && (
              <>
                <h2 className="mt-8 font-display text-xl text-navy">{t("property.video")}</h2>
                <div className="mt-3 aspect-video overflow-hidden rounded-2xl border border-border">
                  {isVideoUrl(p.videoEmbed) ? (
                    <video src={p.videoEmbed} controls className="h-full w-full" />
                  ) : (
                    <ConsentEmbed service="YouTube / Vimeo" fallbackHref={p.videoEmbed}>
                      <iframe
                        src={p.videoEmbed}
                        title={t("property.videoTitle")}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </ConsentEmbed>
                  )}
                </div>
              </>
            )}

            {p.mapLat != null && p.mapLng != null && (
              <>
                <h2 className="mt-8 font-display text-xl text-navy">{t("property.location")}</h2>
                <div className="mt-3 aspect-[16/9] overflow-hidden rounded-2xl border border-border">
                  <ConsentEmbed
                    service="Google Maps"
                    fallbackHref={`https://www.google.com/maps?q=${p.mapLat},${p.mapLng}`}
                  >
                    <iframe
                      title={t("property.mapTitle")}
                      loading="lazy"
                      className="h-full w-full"
                      src={`https://www.google.com/maps?q=${p.mapLat},${p.mapLng}&z=15&output=embed`}
                    />
                  </ConsentEmbed>
                </div>
              </>
            )}
          </div>

          <aside className="h-fit rounded-xl border border-border/80 bg-card p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("property.price")}
            </div>
            <div className="font-display text-3xl font-medium text-navy">
              {p.price > 0 && Number.isFinite(p.price) ? priceText : t("property.priceOnRequest")}
              {p.price > 0 && p.listing === "Наем" && (
                <span className="text-base text-muted-foreground"> {t("property.month")}</span>
              )}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t("property.contactPrompt")}</p>
            <div className="mt-5 flex flex-col gap-3">
              {phone && (
                <Button asChild className="rounded-full bg-navy text-white hover:bg-navy-deep">
                  <a href={tel}>
                    <Phone className="mr-2 h-4 w-4" /> {phone}
                  </a>
                </Button>
              )}
              {phone && (
                <Button asChild variant="outline" className="rounded-full">
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              )}
              <Button asChild variant="ghost" className="rounded-full">
                <a href={`/?inquiry=${encodeURIComponent(p.title)}#contact`}>
                  {t("property.sendInquiry")}
                </a>
              </Button>
            </div>
          </aside>
        </div>
      </div>
      <Toaster position="top-center" />
    </main>
  );
}

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <Icon className="h-4 w-4 text-gold" />
      <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-navy">{value}</div>
    </div>
  );
}
