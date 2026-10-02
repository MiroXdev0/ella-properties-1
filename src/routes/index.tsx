import { createFileRoute, Link } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import {
  Phone,
  MapPin,
  Mail,
  Home as HomeIcon,
  Key,
  Building2,
  FileText,
  Check,
  Star,
  ArrowRight,
  Maximize2,
  Layers,
  Facebook,
  Instagram,
  MessageCircle,
  Menu,
  X,
  Award,
  Shield,
  Users,
  TrendingUp,
  Handshake,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

import heroImage from "@/assets/hero.jpg";
import { properties, type PropertyType, APARTMENT_LAYOUTS } from "@/data/properties";
import { usePublicProperties } from "@/hooks/use-public-properties";
import { useServerFn } from "@tanstack/react-start";

import { submitInquiry } from "@/lib/inquiries.functions";
import { ConsentEmbed } from "@/components/consent/ConsentEmbed";
import { openCookiePreferences } from "@/lib/consent";
import { useSiteSettings, type PublicSettings } from "@/hooks/use-site-settings";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Home: HomeIcon, Key, Building2, FileText, Award, Shield, Users, TrendingUp,
  Star, Handshake, Briefcase, MapPin, Phone, Mail, Check,
};
const iconOf = (name: string) => ICONS[name] ?? HomeIcon;

const telHref = (n?: string) => `tel:${(n ?? "").replace(/\s+/g, "")}`;
const waHref = (n?: string) =>
  `https://wa.me/${(n ?? "").replace(/[^0-9]/g, "")}`;
const viberHref = (n?: string) =>
  `viber://chat?number=%2B${(n ?? "").replace(/[^0-9]/g, "")}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Елла Недвижими Имоти — Имоти в Перник и София" },
      {
        name: "description",
        content:
          "Агенция за недвижими имоти в област Перник и София — покупка, продажба и наем на апартаменти, къщи, парцели и бизнес имоти.",
      },
      { name: "keywords", content: "Недвижими имоти Перник, недвижими имоти София, апартаменти Перник, къщи Перник, имоти област Перник, агенция недвижими имоти Перник и София" },
      { property: "og:title", content: "Елла Недвижими Имоти — Имоти в Перник и София" },
      {
        property: "og:description",
        content:
          "Разгледайте актуални апартаменти, къщи и парцели в Перник и София — с реални снимки, цени и лично съдействие от брокерите на Елла.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          name: "Елла Недвижими Имоти",
          url: "https://ellaimoti.lovable.app/",
          telephone: ["+359884816232", "+359884388022"],
          email: "office@ella-imoti.bg",
          areaServed: ["Перник", "София"],
          address: {
            "@type": "PostalAddress",
            streetAddress: "ул. „Райко Даскалов“ 4",
            addressLocality: "Перник",
            postalCode: "2300",
            addressCountry: "BG",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Елла Недвижими Имоти",
          url: "https://ellaimoti.lovable.app/",
        }),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const settings = useSiteSettings();
  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased">
      <BrandStyle primary={settings.primary_color} accent={settings.accent_color} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
      >
        Към съдържанието
      </a>
      <Header settings={settings} />
      <main id="main">
        <Hero settings={settings} />
        <About settings={settings} />
        <Services settings={settings} />
        <Catalog settings={settings} />
        <WhyUs settings={settings} />
        <Testimonials settings={settings} />
        <Contact settings={settings} />
      </main>
      <Footer settings={settings} />
      <FloatingContacts settings={settings} />
      <Toaster position="top-center" />
    </div>
  );
}

function BrandStyle({ primary, accent }: { primary: string; accent: string }) {
  const safe = (c: string, d: string) => (/^#[0-9a-fA-F]{3,8}$|^(rgb|hsl|oklch)a?\([0-9.,%\s/a-z-]+\)$/.test(c?.trim() ?? "") ? c.trim() : d);
  primary = safe(primary, "#0B1E3B");
  accent = safe(accent, "#C9A961");
  const css = `:root{--navy:${primary};--navy-deep:${primary};--gold:${accent};--gold-soft:${accent};}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

/* ---------------- Header ---------------- */

function Header({ settings }: { settings: PublicSettings }) {
  const [open, setOpen] = useState(false);
  const nav = settings.nav_links ?? [];
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-5 lg:px-8">
        <a
          href="#top"
          aria-label="Начало"
          className="flex min-w-0 shrink items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Logo settings={settings} />
        </a>
        <nav className="hidden shrink-0 items-center gap-5 lg:flex xl:gap-8">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-md text-sm font-medium text-foreground/75 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden shrink-0 xl:flex">
          <Button asChild variant="default" className="whitespace-nowrap bg-navy text-white hover:bg-navy-deep">
            <a href={telHref(settings.phone1)}>
              <Phone className="mr-2 h-4 w-4" />
              {settings.phone1}
            </a>
          </Button>
        </div>
        <a
          href={telHref(settings.phone1)}
          aria-label={settings.phone1}
          className="hidden shrink-0 rounded-full bg-navy p-2.5 text-white transition-colors hover:bg-navy-deep lg:inline-flex xl:hidden"
        >
          <Phone className="h-4 w-4" />
        </a>
        <button
          aria-label="Меню"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-md border border-border p-2 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-background lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-5">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-sm font-medium text-foreground/80 hover:bg-muted"
              >
                {n.label}
              </a>
            ))}
            <a
              href={telHref(settings.phone1)}
              className="mt-2 inline-flex items-center justify-center rounded-md bg-navy px-4 py-3 text-sm font-medium text-white"
            >
              <Phone className="mr-2 h-4 w-4" />
              {settings.phone1}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

function Logo({ settings }: { settings: PublicSettings }) {
  const name = settings.brand_name || "Елла Недвижими Имоти";
  const first = name.split(" ")[0];
  const rest = name.split(" ").slice(1).join(" ");
  const NameText = (
    <span className="min-w-0 truncate font-display text-xl font-semibold leading-none tracking-tight text-navy sm:text-2xl lg:text-[1.45rem] xl:text-[1.65rem]">
      <span className="text-blue-600">{first}</span>
      {rest && <span className="ml-1.5">{rest}</span>}
    </span>
  );
  if (settings.logo_url) {
    return (
      <span className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 overflow-hidden rounded-lg">
          <img
            src={settings.logo_url}
            alt={name}
            className="h-14 w-auto scale-110 object-cover lg:h-16"
          />
        </span>
        {NameText}
      </span>
    );
  }
  const letter = name.trim().charAt(0);
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-navy text-gold ring-2 ring-gold/40 shadow-sm lg:h-16 lg:w-16">
        <span className="font-display text-2xl font-semibold leading-none lg:text-3xl">{letter}</span>
      </span>
      {NameText}
    </span>
  );
}

/* ---------------- Hero ---------------- */

function Hero({ settings }: { settings: PublicSettings }) {
  const stats = [
    { k: settings.stat1_value, v: settings.stat1_label },
    { k: settings.stat2_value, v: settings.stat2_label },
    { k: settings.stat3_value, v: settings.stat3_label },
  ];
  return (
    <section id="top" className="relative isolate overflow-hidden">
      <div className="relative">
        <img
          src={settings.hero_image_url || heroImage}
          alt=""
          width={1920}
          height={1280}
          fetchPriority="high"
          decoding="async"
          className="h-[88svh] max-h-[860px] min-h-[520px] w-full object-cover sm:h-[78vh] sm:min-h-[560px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/85 via-navy-deep/55 to-navy-deep/85" />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-5 lg:px-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-gold backdrop-blur sm:px-4 sm:text-xs sm:tracking-[0.2em]">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                {settings.hero_eyebrow}
              </span>
              <h1 className="mt-5 font-display text-[2rem] font-medium leading-[1.08] text-white sm:mt-6 sm:text-5xl lg:text-6xl">
                {settings.hero_title}
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/80 sm:mt-6 sm:text-lg">
                {settings.hero_subtitle}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
                <Button
                  asChild
                  size="lg"
                  className="h-12 w-full rounded-full bg-gold px-7 text-navy-deep hover:bg-gold-soft sm:w-auto"
                >
                  <a href={settings.hero_cta_link || "#catalog"}>
                    {settings.hero_cta_label} <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 w-full rounded-full border-white/40 bg-white/5 px-7 text-white backdrop-blur hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  <a href={settings.hero_secondary_cta_link || "#contact"}>
                    {settings.hero_secondary_cta_label}
                  </a>
                </Button>
              </div>
              <dl className="mt-8 grid max-w-lg grid-cols-3 gap-4 border-t border-white/15 pt-6 text-white sm:mt-12 sm:gap-6 sm:pt-8">
                {stats.map((s) => (
                  <div key={s.v}>
                    <dt className="font-display text-2xl text-gold sm:text-3xl">{s.k}</dt>
                    <dd className="mt-1 text-[10px] uppercase leading-tight tracking-[0.12em] text-white/65 sm:text-xs sm:tracking-[0.15em]">
                      {s.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- About ---------------- */

function About({ settings }: { settings: PublicSettings }) {
  return (
    <section id="about" className="bg-background py-16 sm:py-20 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:gap-14 sm:px-5 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <div>
          <SectionEyebrow>За нас</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-medium text-navy sm:text-4xl md:text-5xl">
            {settings.about_title}
          </h2>
          <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-foreground/75">
            {settings.about_text}
          </p>
          {settings.about_text_secondary && (
            <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
              {settings.about_text_secondary}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          {[
            { k: settings.stat1_value, v: settings.stat1_label },
            { k: settings.stat2_value, v: settings.stat2_label },
            { k: settings.stat3_value, v: settings.stat3_label },
            { k: "Пълно", v: "съдействие" },
          ].map((c) => (
            <div
              key={c.k}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="font-display text-3xl text-navy">{c.k}</div>
              <div className="mt-1 text-sm uppercase tracking-[0.15em] text-muted-foreground">
                {c.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Services ---------------- */

function Services({ settings }: { settings: PublicSettings }) {
  const services = settings.services ?? [];
  return (
    <section id="services" className="bg-muted/50 py-16 sm:py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <SectionEyebrow>{settings.services_eyebrow}</SectionEyebrow>
            <h2 className="mt-4 font-display text-3xl font-medium text-navy sm:text-4xl md:text-5xl">
              {settings.services_title}
            </h2>
          </div>
          <p className="max-w-md text-muted-foreground">
            {settings.services_subtitle}
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => {
            const Icon = iconOf(s.icon);
            return (
            <div
              key={s.title}
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-all sm:p-7 hover:-translate-y-1 hover:border-gold hover:shadow-xl"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-navy text-gold ring-1 ring-gold/30">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 font-display text-2xl text-navy">{s.title}</h3>
              <ul className="mt-4 space-y-2 text-sm text-foreground/75">
                {s.items.map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Catalog ---------------- */

const PROPERTY_TYPES: (PropertyType | "Всички")[] = [
  "Всички",
  "Апартамент",
  "Къща",
  "Парцел",
  "Бизнес имот",
];

function Catalog({ settings }: { settings: PublicSettings }) {
  const [type, setType] = useState<string>("Всички");
  const [listing, setListing] = useState<string>("Всички");
  const [district, setDistrict] = useState<string>("Всички");
  const [layout, setLayout] = useState<string>("Всички");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minArea, setMinArea] = useState<string>("");
  const { properties: list, isLoading } = usePublicProperties();

  const districts = useMemo(
    () => ["Всички", ...Array.from(new Set(list.map((p) => p.district).filter(Boolean)))],
    [list],
  );

  const filtered = useMemo(() => {
    return list.filter((p) => {
      if (type !== "Всички" && p.type !== type) return false;
      if (listing !== "Всички" && p.listing !== listing) return false;
      if (district !== "Всички" && p.district !== district) return false;
      if (layout !== "Всички" && p.layout !== layout) return false;
      if (maxPrice && p.price > Number(maxPrice)) return false;
      if (minArea && p.area < Number(minArea)) return false;
      return true;
    });
  }, [list, type, listing, district, layout, maxPrice, minArea]);

  return (
    <section id="catalog" className="bg-background py-16 sm:py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
        <SectionEyebrow>{settings.catalog_eyebrow}</SectionEyebrow>
        <h2 className="mt-4 font-display text-3xl font-medium text-navy sm:text-4xl md:text-5xl">
          {settings.catalog_title}
        </h2>

        <div className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-4 sm:mt-10 sm:p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
          <FilterSelect
            label="Вид имот"
            value={type}
            onChange={(v) => {
              setType(v);
              if (v !== "Апартамент") setLayout("Всички");
            }}
            options={PROPERTY_TYPES as string[]}
          />
          <FilterSelect label="Тип сделка" value={listing} onChange={setListing} options={["Всички", "Продажба", "Наем"]} />
          {type === "Апартамент" && (
            <FilterSelect label="Вид апартамент" value={layout} onChange={setLayout} options={["Всички", ...APARTMENT_LAYOUTS]} />
          )}
          <FilterSelect label="Квартал" value={district} onChange={setDistrict} options={districts} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-max-price" className="text-xs uppercase tracking-wider text-muted-foreground">Цена до (€)</Label>
            <Input
              id="filter-max-price"
              type="number"
              inputMode="numeric"
              placeholder="напр. 100000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-min-area" className="text-xs uppercase tracking-wider text-muted-foreground">Квадратура от (м²)</Label>
            <Input
              id="filter-min-area"
              type="number"
              inputMode="numeric"
              placeholder="напр. 60"
              value={minArea}
              onChange={(e) => setMinArea(e.target.value)}
            />
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
          {isLoading
            ? "Зареждане на имотите…"
            : `Намерени ${filtered.length} ${filtered.length === 1 ? "имот" : "имота"}`}
        </p>

        {isLoading ? (
          <div className="mt-4 grid gap-5 sm:gap-7 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
                <div className="space-y-3 p-6">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:gap-7 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PropertyCard key={p.id} p={p} />
            ))}
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center sm:p-12">
            <p className="text-muted-foreground">Няма намерени имоти по зададените критерии.</p>
            <Button
              variant="outline"
              className="mt-4 rounded-full"
              onClick={() => {
                setType("Всички");
                setListing("Всички");
                setDistrict("Всички");
                setLayout("Всички");
                setMaxPrice("");
                setMinArea("");
              }}
            >
              Изчисти филтрите
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PropertyCard({ p }: { p: (typeof properties)[number] }) {
  const priceText = new Intl.NumberFormat("bg-BG").format(p.price);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={p.image}
          alt={p.title}
          loading="lazy"
          width={1024}
          height={768}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full bg-navy/95 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white backdrop-blur">
          {p.listing}
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-gold px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-navy-deep">
          {p.type}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-xl text-navy">{p.title}</h3>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {p.city}, {p.district}
        </p>
        <p className="mt-3 line-clamp-2 text-sm text-foreground/75">{p.description}</p>
        <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Maximize2 className="h-3.5 w-3.5 text-gold" /> {p.area} м²
          </span>
          {p.floor && (
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-gold" /> {p.type === "Къща" ? `${p.floor} етажа` : `Етаж ${p.floor}`}
            </span>
          )}
          {p.layout && (
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-gold" /> {p.layout}
            </span>
          )}
        </div>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Цена</div>
            <div className="font-display text-2xl font-medium text-navy">
              € {priceText}
              {p.listing === "Наем" && (
                <span className="text-sm text-muted-foreground"> /мес.</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Link to="/properties/$id" params={{ id: p.id }}>
                Виж още
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="rounded-full bg-navy text-white hover:bg-navy-deep"
            >
              <a href="#contact">Заяви оглед</a>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---------------- Why us ---------------- */

function WhyUs({ settings }: { settings: PublicSettings }) {
  const reasons = settings.why_reasons ?? [];
  return (
    <section id="why" className="relative overflow-hidden bg-navy-deep py-16 text-white sm:py-20 lg:py-32">
      <div className="absolute inset-0 opacity-[0.08]" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
        backgroundSize: "32px 32px",
      }} />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
        <SectionEyebrow tone="gold">{settings.why_eyebrow}</SectionEyebrow>
        <h2 className="mt-4 max-w-3xl font-display text-3xl font-medium sm:text-4xl md:text-5xl">
          {settings.why_title}
        </h2>
        <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r, i) => (
            <div
              key={r}
              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-colors hover:border-gold/50"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold font-display text-navy-deep">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="pt-1.5 text-base font-medium">{r}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Testimonials ---------------- */

function Testimonials({ settings }: { settings: PublicSettings }) {
  const items = settings.testimonials ?? [];
  return (
    <section id="testimonials" className="bg-background py-16 sm:py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
        <div className="max-w-2xl">
          <SectionEyebrow>{settings.testimonials_eyebrow}</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-medium text-navy sm:text-4xl md:text-5xl">
            {settings.testimonials_title}
          </h2>
        </div>
        <div className="mt-8 grid gap-5 sm:mt-12 sm:gap-6 md:grid-cols-3">
          {items.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
            >
              <div className="flex gap-1 text-gold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-5 flex-1 text-base leading-relaxed text-foreground/80">
                „{t.text}"
              </blockquote>
              <figcaption className="mt-6 border-t border-border pt-4">
                <div className="font-display text-lg text-navy">{t.name}</div>
                <div className="text-sm text-muted-foreground">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Contact ---------------- */

function Contact({ settings }: { settings: PublicSettings }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "", website: "" });
  const [sending, setSending] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const sendInquiry = useServerFn(submitInquiry);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      toast.error("Моля, попълнете задължителните полета.");
      return;
    }
    if (!/^[0-9+()\s\-./]{5,40}$/.test(form.phone.trim())) {
      toast.error("Моля, въведете валиден телефонен номер.");
      return;
    }
    setSending(true);
    try {
      const res = await sendInquiry({
        data: {
          name: form.name.trim().slice(0, 100),
          phone: form.phone.trim().slice(0, 40),
          email: form.email.trim().slice(0, 255),
          message: form.message.trim().slice(0, 2000),
          website: form.website,
          started_at: startedAt,
        },
      });
      if (!res.ok) {
        toast.error(
          res.reason === "rate_limited"
            ? "Изпратихте твърде много запитвания. Моля, опитайте отново по-късно."
            : "Възникна грешка при изпращането. Моля, опитайте по-късно.",
        );
        return;
      }
      toast.success("Благодарим Ви! Ще се свържем с Вас възможно най-скоро.");
      setForm({ name: "", phone: "", email: "", message: "", website: "" });
    } catch {
      toast.error("Възникна грешка при изпращането. Моля, опитайте по-късно.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="contact" className="bg-muted/50 py-16 sm:py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
        <div className="max-w-2xl">
          <SectionEyebrow>{settings.contact_eyebrow}</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-medium text-navy sm:text-4xl md:text-5xl">{settings.contact_title}</h2>
          <p className="mt-4 text-muted-foreground">{settings.contact_subtitle}</p>
        </div>

        <div className="mt-8 grid gap-6 sm:mt-12 sm:gap-8 lg:grid-cols-6">
          <div className="space-y-5 lg:col-span-2">
            <ContactRow
              icon={Phone}
              title="Телефони"
              lines={[
                ...(settings.phone1 ? [{ text: settings.phone1, href: telHref(settings.phone1) }] : []),
                ...(settings.phone2 ? [{ text: settings.phone2, href: telHref(settings.phone2) }] : []),
              ]}
            />
            <ContactRow
              icon={MapPin}
              title="Адрес"
              lines={[
                { text: settings.address, href: settings.contact_map_url || undefined },
              ]}
            />
            <ContactRow
              icon={Mail}
              title="Имейл"
              lines={[{ text: settings.email, href: `mailto:${settings.email}` }]}
            />
            {settings.contact_map_embed?.startsWith("https://") && (
            <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
              <ConsentEmbed service="Google Maps" fallbackHref={settings.contact_map_url || undefined}>
              <iframe
                title="Карта — Елла Недвижими Имоти"
                src={settings.contact_map_embed}
                width="100%"
                height="280"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              </ConsentEmbed>
            </div>
            )}
          </div>

          <form
            onSubmit={onSubmit}
            className="relative rounded-2xl border border-border bg-card p-7 shadow-sm lg:col-span-3 lg:p-10"
          >
            {/* Honeypot: hidden from real users, bots tend to fill it in */}
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="contact-website">Website</label>
              <input
                id="contact-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Име *" value={form.name} onChange={(v) => update("name", v)} required autoComplete="name" />
              <Field label="Телефон *" value={form.phone} onChange={(v) => update("phone", v)} type="tel" required autoComplete="tel" />
              <div className="sm:col-span-2">
                <Field label="Имейл" value={form.email} onChange={(v) => update("email", v)} type="email" autoComplete="email" />
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="contact-message" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Съобщение *
                </Label>
                <Textarea
                  id="contact-message"
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${Math.max(el.scrollHeight, 140)}px`;
                  }}
                  rows={5}
                  maxLength={1000}
                  placeholder="Разкажете ни какво търсите..."
                  className="min-h-[140px] resize-none overflow-hidden"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={sending}
              size="lg"
              className="mt-7 h-12 w-full rounded-full bg-navy text-white hover:bg-navy-deep sm:w-auto sm:px-10"
            >
              {sending ? "Изпращане..." : "Изпрати запитване"}
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              Използваме данните Ви само за да отговорим на запитването. Повече в{" "}
              <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Политиката за поверителност</Link>.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        maxLength={200}
      />
    </div>
  );
}

function ContactRow({
  icon: Icon,
  title,
  lines,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  lines: { text: string; href?: string }[];
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy text-gold">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
        <div className="mt-1.5 space-y-0.5">
          {lines.map((l, i) =>
            l.href ? (
              <a
                key={i}
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="block text-base font-medium text-navy hover:text-gold"
              >
                {l.text}
              </a>
            ) : (
              <div key={i} className="text-sm text-foreground/70">{l.text}</div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Footer ---------------- */

function Footer({ settings }: { settings: PublicSettings }) {
  const nav = settings.nav_links ?? [];
  const copyright = (settings.footer_copyright || "").replace("{year}", String(new Date().getFullYear()));
  return (
    <footer className="border-t border-border bg-navy-deep text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-5 sm:py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            {settings.logo_url ? (
              <span className="shrink-0 overflow-hidden rounded-lg">
                <img
                  src={settings.logo_url}
                  alt={settings.brand_name || "Елла Недвижими Имоти"}
                  className="h-16 w-auto scale-110 object-cover lg:h-20"
                />
              </span>
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full bg-gold text-navy-deep ring-2 ring-gold/40 shadow-sm lg:h-20 lg:w-20">
                <span className="font-display text-2xl font-semibold">{(settings.brand_name || "Е").charAt(0)}</span>
              </span>
            )}
            <div>
              <div className="font-display text-[1.35rem] font-semibold leading-[1.05] tracking-tight text-white">
                <span className="text-blue-400">{(settings.brand_name || "Елла").split(" ")[0]}</span>
                <span className="ml-1.5">{(settings.brand_name || "Елла Недвижими Имоти").split(" ").slice(1).join(" ")}</span>
              </div>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-white/65">
            {settings.footer_description}
          </p>
        </div>
        <div>
          <h2 className="font-display text-base text-gold">Навигация</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {nav.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="hover:text-gold">{n.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-base text-gold">Контакт</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {settings.phone1 && <li><a href={telHref(settings.phone1)} className="hover:text-gold">{settings.phone1}</a></li>}
            {settings.phone2 && <li><a href={telHref(settings.phone2)} className="hover:text-gold">{settings.phone2}</a></li>}
            {settings.address && <li><a href={settings.contact_map_url || "#"} target="_blank" rel="noreferrer" className="hover:text-gold">{settings.address}</a></li>}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-base text-gold">Социални мрежи</h2>
          <div className="mt-4 flex gap-3">
            {settings.facebook_url && <SocialLink href={settings.facebook_url} label="Facebook"><Facebook className="h-4 w-4" /></SocialLink>}
            {settings.instagram_url && <SocialLink href={settings.instagram_url} label="Instagram"><Instagram className="h-4 w-4" /></SocialLink>}
            {settings.whatsapp_number && <SocialLink href={waHref(settings.whatsapp_number)} label="WhatsApp"><MessageCircle className="h-4 w-4" /></SocialLink>}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 pb-24 pt-6 sm:px-6 sm:pb-6">
        <nav aria-label="Правна информация" className="mx-auto mb-3 flex max-w-3xl flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-white/75">
          <Link to="/privacy" className="hover:text-gold">Поверителност</Link>
          <Link to="/cookies" className="hover:text-gold">Бисквитки</Link>
          <Link to="/terms" className="hover:text-gold">Общи условия</Link>
          <Link to="/data-request" className="hover:text-gold">Права върху личните данни</Link>
          <button type="button" onClick={openCookiePreferences} className="hover:text-gold">Настройки на бисквитките</button>
        </nav>
        <p className="mx-auto max-w-[15rem] text-center text-xs leading-relaxed text-white/70 sm:max-w-md">{copyright}</p>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-gold hover:bg-gold hover:text-navy-deep"
    >
      {children}
    </a>
  );
}

/* ---------------- Floating contacts ---------------- */

function FloatingContacts({ settings }: { settings: PublicSettings }) {
  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5 flex flex-col gap-3">
      {settings.whatsapp_number && (
      <FloatBtn href={waHref(settings.whatsapp_number)} label="WhatsApp" className="bg-[#25D366] hover:brightness-110">
        <MessageCircle className="h-6 w-6" />
      </FloatBtn>
      )}
      {settings.viber_number && (
      <FloatBtn href={viberHref(settings.viber_number)} label="Viber" className="bg-[#7360F2] hover:brightness-110">
        <Phone className="h-5 w-5" />
      </FloatBtn>
      )}
    </div>
  );
}

function FloatBtn({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className={cn(
        "grid h-12 w-12 place-items-center rounded-full text-white shadow-lg ring-2 ring-white/40 transition-transform hover:scale-110",
        className,
      )}
    >
      {children}
    </a>
  );
}

/* ---------------- Shared ---------------- */

function SectionEyebrow({
  children,
  tone = "navy",
}: {
  children: React.ReactNode;
  tone?: "navy" | "gold";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em]",
        tone === "navy" ? "text-navy" : "text-gold",
      )}
    >
      <span className={cn("h-px w-8", tone === "navy" ? "bg-gold" : "bg-gold")} />
      {children}
    </span>
  );
}






