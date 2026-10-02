import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Maximize2,
  Layers,
  Phone,
  MessageCircle,
  Home as HomeIcon,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { properties as demoProperties } from "@/data/properties";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { isVideoUrl, embedUrl } from "@/lib/media";
import { ConsentEmbed } from "@/components/consent/ConsentEmbed";

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
  if (!isUuid(id)) {
    const demo = demoProperties.find((p) => p.id === id);
    if (!demo) throw notFound();
    return {
      id: demo.id,
      title: demo.title,
      type: demo.type,
      listing: demo.listing,
      price: demo.price,
      city: demo.city,
      district: demo.district,
      area: demo.area,
      layout: demo.layout ?? null,
      floor: demo.floor ?? null,
      description: demo.description,
      media: [{ url: demo.image, kind: "image" }],
    };
  }

  const { data, error } = await supabase
    .from("properties")
    .select(
      "id,title,type,status,price,city,district,address,area,rooms,floor,layout,description,main_image,video_url,map_lat,map_lng,seo_title,seo_description,is_published",
    )
    .eq("id", id)
    .eq("is_published", true)
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
    city: data.city ?? "Перник",
    district: data.district ?? "",
    address: data.address ?? undefined,
    area: Number(data.area ?? 0),
    rooms: data.rooms,
    layout: data.layout,
    floor: data.floor,
    description: data.description ?? "",
    media: urls.map((url) => ({ url, kind: isVideoUrl(url) ? "video" : "image" })),
    videoEmbed: data.video_url ? embedUrl(data.video_url) ?? data.video_url : null,
    mapLat: data.map_lat != null ? Number(data.map_lat) : null,
    mapLng: data.map_lng != null ? Number(data.map_lng) : null,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
  };
}

const SITE = "https://ellaimoti.lovable.app";

export const Route = createFileRoute("/properties/$id")({
  loader: ({ params }) => loadProperty(params.id),
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Имотът не е намерен | Елла Недвижими Имоти" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const url = `${SITE}/properties/${params.id}`;
    const title = (loaderData.seoTitle || `${loaderData.title} — ${loaderData.city}`).slice(0, 60);
    const desc = (
      loaderData.seoDescription ||
      loaderData.description ||
      `${loaderData.type} в ${loaderData.city}, ${loaderData.district}. ${loaderData.area} м².`
    ).slice(0, 158);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            name: loaderData.title,
            description: desc,
            url,
            floorSize: { "@type": "QuantitativeValue", value: loaderData.area, unitCode: "MTK" },
            offers: {
              "@type": "Offer",
              price: loaderData.price,
              priceCurrency: "EUR",
              availability: "https://schema.org/InStock",
            },
            address: {
              "@type": "PostalAddress",
              addressLocality: loaderData.city,
              addressRegion: loaderData.district,
              addressCountry: "BG",
            },
          }),
        },
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
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl text-navy">Имотът не е намерен</h1>
      <p className="mt-3 text-muted-foreground">
        Възможно е офертата вече да не е активна. Разгледайте останалите ни имоти.
      </p>
      <Button asChild className="mt-6 rounded-full bg-navy text-white hover:bg-navy-deep">
        <Link to="/" hash="catalog">
          Към имотите
        </Link>
      </Button>
    </main>
  );
}

function PropertyDetail() {
  const p = Route.useLoaderData();
  const settings = useSiteSettings();
  const [active, setActive] = useState(0);

  const priceText = new Intl.NumberFormat("bg-BG").format(p.price);
  const current = p.media[active];
  const phone = settings.phone1;
  const tel = `tel:${(phone ?? "").replace(/\s+/g, "")}`;
  const wa = `https://wa.me/${(phone ?? "").replace(/[^0-9]/g, "")}`;

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <Link
          to="/"
          hash="catalog"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" /> Обратно към имотите
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-navy px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white">
            {p.listing}
          </span>
          <span className="rounded-full bg-gold px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-navy-deep">
            {p.type}
          </span>
        </div>

        <h1 className="mt-3 font-display text-2xl font-medium text-navy sm:text-4xl">{p.title}</h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" /> {p.city}
          {p.district ? `, ${p.district}` : ""}
          {p.address ? ` — ${p.address}` : ""}
        </p>

        {/* Gallery */}
        {current && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="aspect-[16/10] w-full bg-navy-deep/5">
              {current.kind === "video" ? (
                <video src={current.url} controls playsInline className="h-full w-full object-contain" />
              ) : (
                <img
                  src={current.url}
                  alt={p.title}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            {p.media.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {p.media.map((m, i) => (
                  <button
                    key={m.url + i}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Медия ${i + 1}`}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      i === active ? "border-gold" : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                  >
                    {m.kind === "video" ? (
                      <video src={m.url} muted playsInline className="h-full w-full object-cover" />
                    ) : (
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Spec icon={Maximize2} label="Площ" value={`${p.area} м²`} />
              {p.floor && <Spec icon={Layers} label={p.type === "Къща" ? "Етажи" : "Етаж"} value={p.type === "Къща" ? `${p.floor} етажа` : p.floor} />}
              {p.layout && <Spec icon={HomeIcon} label="Разпределение" value={p.layout} />}
              {p.rooms ? <Spec icon={Building2} label="Стаи" value={String(p.rooms)} /> : null}
            </div>

            <h2 className="mt-8 font-display text-xl text-navy">Описание</h2>
            <p className="mt-3 whitespace-pre-line text-foreground/80">
              {p.description || "Свържете се с нас за пълна информация за този имот."}
            </p>

            {p.videoEmbed && (
              <>
                <h2 className="mt-8 font-display text-xl text-navy">Видео</h2>
                <div className="mt-3 aspect-video overflow-hidden rounded-2xl border border-border">
                  {isVideoUrl(p.videoEmbed) ? (
                    <video src={p.videoEmbed} controls className="h-full w-full" />
                  ) : (
                    <ConsentEmbed service="YouTube / Vimeo" fallbackHref={p.videoEmbed}>
                    <iframe
                      src={p.videoEmbed}
                      title="Видео на имота"
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
                <h2 className="mt-8 font-display text-xl text-navy">Местоположение</h2>
                <div className="mt-3 aspect-[16/9] overflow-hidden rounded-2xl border border-border">
                  <ConsentEmbed service="Google Maps" fallbackHref={`https://www.google.com/maps?q=${p.mapLat},${p.mapLng}`}>
                  <iframe
                    title="Карта на имота"
                    loading="lazy"
                    className="h-full w-full"
                    src={`https://www.google.com/maps?q=${p.mapLat},${p.mapLng}&z=15&output=embed`}
                  />
                  </ConsentEmbed>
                </div>
              </>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-6">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Цена</div>
            <div className="font-display text-3xl font-medium text-navy">
              € {priceText}
              {p.listing === "Наем" && <span className="text-base text-muted-foreground"> /мес.</span>}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Заявете оглед или попитайте за допълнителна информация — отговаряме бързо.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Button asChild className="rounded-full bg-navy text-white hover:bg-navy-deep">
                <a href={tel}>
                  <Phone className="mr-2 h-4 w-4" /> {phone}
                </a>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </a>
              </Button>
              <Button asChild variant="ghost" className="rounded-full">
                <Link to="/" hash="contact">
                  Изпрати запитване
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>
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






