import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useState } from "react";
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
  Facebook,
  Instagram,
  Music2,
  MessageCircle,
  Menu,
  X,
  Award,
  Shield,
  Users,
  TrendingUp,
  Handshake,
  Briefcase,
  Clock3,
  Search,
  SlidersHorizontal,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ShareProperty } from "@/components/property/ShareProperty";
import { cn } from "@/lib/utils";

import heroImage from "@/assets/hero-1920.webp";
import heroImageMobile from "@/assets/hero-960.webp";
import { type Property, type PropertyType, APARTMENT_LAYOUTS } from "@/data/properties";
import { fetchPublicProperties, usePublicProperties } from "@/hooks/use-public-properties";
import { useServerFn } from "@tanstack/react-start";
import { jsonLdScript, limitMetaText, SITE_URL } from "@/lib/seo";
import { broadenLegacyCoverageText, citySlug, listedCities } from "@/lib/cities";

import { submitInquiry } from "@/lib/inquiries.functions";
import { ConsentEmbed } from "@/components/consent/ConsentEmbed";
import { openCookiePreferences } from "@/lib/consent";
import { PwaInstallLink } from "@/components/pwa/PwaInstallLink";
import { useLanguage, useTranslateContent } from "@/i18n/LanguageProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { bg } from "@/i18n/bg";
import {
  fetchPublicSettings,
  useSiteSettings,
  DEFAULT_SETTINGS,
  getContactPhoneName,
  getHomeSectionVisibility,
  isHomeSectionLinkVisible,
  type PublicSettings,
  type HomeSectionVisibility,
} from "@/hooks/use-site-settings";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Home: HomeIcon,
  Key,
  Building2,
  FileText,
  Award,
  Shield,
  Users,
  TrendingUp,
  Star,
  Handshake,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Check,
};
const iconOf = (name: string) => ICONS[name] ?? HomeIcon;

const telHref = (n?: string) => `tel:${(n ?? "").replace(/\s+/g, "")}`;
const waHref = (n?: string) => `https://wa.me/${(n ?? "").replace(/[^0-9]/g, "")}`;
const viberHref = (n?: string) => `viber://chat?number=%2B${(n ?? "").replace(/[^0-9]/g, "")}`;
const LEGACY_DEFAULT_HOME_SEO_TITLE = "Елла Недвижими Имоти — актуални обяви за имоти";
const LEGACY_DEFAULT_HOME_SEO_DESCRIPTION =
  "Информация за имоти, услуги и контакти на Елла Недвижими Имоти. Съдействие при покупка, продажба и отдаване под наем.";
const displayBrandName = (name?: string | null) =>
  (name?.trim() || "Елла Недвижими Имоти").replace(/Елла(?=Недвижими)/u, "Елла ");
const displayCoverageText = (
  text: string,
  translate: (value: string) => string,
  language: "bg" | "en",
) => broadenLegacyCoverageText(translate(broadenLegacyCoverageText(text, "bg")), language);

function publicLogoUrl(value?: string | null): string | null {
  if (!value) return null;
  const absoluteUrl = /^https?:\/\/\S+$/i.test(value);
  const sitePath = value.startsWith("/") && !value.startsWith("//");
  const path = value.replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/, 1)[0] ?? "";
  if ((!absoluteUrl && !sitePath) || path.startsWith("/__l5e/")) return null;
  return value;
}

export const Route = createFileRoute("/")({
  loader: async () => {
    const [properties, settings] = await Promise.all([
      fetchPublicProperties(),
      fetchPublicSettings(),
    ]);
    return { properties, settings };
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings ?? DEFAULT_SETTINGS;
    const shareImage = new URL(publicLogoUrl(settings.og_image_url) ?? heroImage, SITE_URL).href;
    const cities = listedCities(loaderData?.properties ?? []);
    const priorityCities = ["Перник", "София"].filter((city) =>
      cities.some(
        (listedCity) =>
          listedCity
            .trim()
            .replace(/^гр\.?\s*/iu, "")
            .localeCompare(city, "bg", { sensitivity: "base" }) === 0,
      ),
    );
    const locationLabel = priorityCities.length > 0 ? priorityCities.join(" и ") : "";
    const configuredTitle = broadenLegacyCoverageText(
      settings.seo_home_title || DEFAULT_SETTINGS.seo_home_title,
      "bg",
    );
    const configuredDescription = broadenLegacyCoverageText(
      settings.seo_home_description || DEFAULT_SETTINGS.seo_home_description,
      "bg",
    );
    const isDefaultTitle = [
      DEFAULT_SETTINGS.seo_home_title,
      LEGACY_DEFAULT_HOME_SEO_TITLE,
    ].includes(settings.seo_home_title);
    const isDefaultDescription = [
      DEFAULT_SETTINGS.seo_home_description,
      LEGACY_DEFAULT_HOME_SEO_DESCRIPTION,
    ].includes(settings.seo_home_description);
    const title = limitMetaText(
      isDefaultTitle
        ? locationLabel
          ? `Недвижими имоти в ${locationLabel} | Елла Недвижими Имоти`
          : "Недвижими имоти | Елла Недвижими Имоти"
        : configuredTitle,
      65,
    );
    const description = limitMetaText(
      isDefaultDescription
        ? locationLabel
          ? `Актуални обяви за покупка, продажба и наем на имоти в ${locationLabel}. Разгледайте реални оферти и се свържете с Елла Недвижими Имоти.`
          : "Актуални обяви за покупка, продажба и наем на имоти в населените места с публикувани оферти. Свържете се с Елла Недвижими Имоти."
        : configuredDescription,
      158,
    );
    const shareImageAlt = "Елла Недвижими Имоти — недвижими имоти";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: description,
        },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE_URL}/` },
        { property: "og:site_name", content: "Елла Недвижими Имоти" },
        { property: "og:locale", content: "bg_BG" },
        { property: "og:image", content: shareImage },
        { property: "og:image:alt", content: shareImageAlt },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: shareImage },
        { name: "twitter:image:alt", content: shareImageAlt },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/` }],
      scripts: [
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          "@id": `${SITE_URL}/#agency`,
          name: settings.brand_name,
          url: `${SITE_URL}/`,
          image: new URL(heroImage, SITE_URL).href,
          ...(cities.length
            ? { areaServed: cities.map((city) => ({ "@type": "City", name: city })) }
            : {}),
          ...(settings.phone1 || settings.phone2
            ? { telephone: [settings.phone1, settings.phone2].filter(Boolean) }
            : {}),
          ...(settings.address
            ? {
                address: {
                  "@type": "PostalAddress",
                  streetAddress: settings.address,
                  addressCountry: "BG",
                },
              }
            : {}),
        }),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: settings.brand_name,
          url: `${SITE_URL}/`,
          inLanguage: "bg",
        }),
      ],
    };
  },
  component: HomePage,
});

function HomePage() {
  const { properties, settings: initialSettings } = Route.useLoaderData();
  const { language, t } = useLanguage();
  const settings = useSiteSettings(initialSettings, language);
  const sectionVisibility = getHomeSectionVisibility(settings.content_en);
  return (
    <div
      lang={language}
      className="pwa-entry min-h-screen bg-background font-sans text-foreground antialiased"
    >
      <BrandStyle primary={settings.primary_color} accent={settings.accent_color} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
      >
        {t("nav.skip")}
      </a>
      <Header settings={settings} sectionVisibility={sectionVisibility} />
      <main id="main">
        <Hero settings={settings} sectionVisibility={sectionVisibility} />
        {sectionVisibility.about && <About settings={settings} />}
        {sectionVisibility.services && <Services settings={settings} />}
        {sectionVisibility.catalog && (
          <Catalog settings={settings} initialProperties={properties} />
        )}
        {sectionVisibility.why && <WhyUs settings={settings} />}
        {sectionVisibility.testimonials && <Testimonials settings={settings} />}
        {sectionVisibility.contact && <Contact settings={settings} />}
      </main>
      <Footer settings={settings} sectionVisibility={sectionVisibility} />
      <FloatingContacts settings={settings} />
      <Toaster position="top-center" />
    </div>
  );
}

function BrandStyle({ primary, accent }: { primary: string; accent: string }) {
  const safe = (c: string, d: string) =>
    /^#[0-9a-fA-F]{3,8}$|^(rgb|hsl|oklch)a?\([0-9.,%\s/a-z-]+\)$/.test(c?.trim() ?? "")
      ? c.trim()
      : d;
  primary = safe(primary, "#0B1E3B");
  accent = safe(accent, "#C9A961");
  const css = `:root{--navy:${primary};--navy-deep:${primary};--gold:${accent};--gold-soft:${accent};}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

/* ---------------- Header ---------------- */

function Header({
  settings,
  sectionVisibility,
}: {
  settings: PublicSettings;
  sectionVisibility: HomeSectionVisibility;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const translate = useTranslateContent();
  const nav = (settings.nav_links ?? []).filter((link) =>
    isHomeSectionLinkVisible(link.href, sectionVisibility),
  );
  const navTranslation: Record<string, keyof typeof bg> = {
    "#about": "nav.about",
    "#services": "nav.services",
    "#catalog": "nav.properties",
    "#why": "nav.why",
    "#contact": "nav.contacts",
  };
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-5 lg:px-8">
        <a
          href="#top"
          aria-label={t("nav.home")}
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
              {navTranslation[n.href] ? t(navTranslation[n.href], n.label) : translate(n.label)}
            </a>
          ))}
          <Button
            asChild
            size="sm"
            className="whitespace-nowrap bg-navy text-white hover:bg-navy-deep"
          >
            <Link to="/admin">{t("nav.admin")}</Link>
          </Button>
        </nav>
        <LanguageSwitcher className="ml-auto lg:ml-0" />
        <div className="hidden shrink-0 xl:flex">
          <Button
            asChild
            variant="default"
            className="whitespace-nowrap bg-navy text-white hover:bg-navy-deep"
          >
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
          type="button"
          aria-label={t("nav.menu")}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-card transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-background lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-5">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-sm font-medium text-foreground/80 hover:bg-muted"
              >
                {navTranslation[n.href] ? t(navTranslation[n.href], n.label) : translate(n.label)}
              </a>
            ))}
            <a
              href={telHref(settings.phone1)}
              className="mt-2 inline-flex items-center justify-center rounded-md bg-navy px-4 py-3 text-sm font-medium text-white"
            >
              <Phone className="mr-2 h-4 w-4" />
              {settings.phone1}
            </a>
            <Button
              asChild
              variant="outline"
              className="mt-2 w-full border-navy text-navy hover:bg-navy hover:text-white"
            >
              <Link to="/admin">{t("nav.admin")}</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}

function Logo({ settings }: { settings: PublicSettings }) {
  const name = displayBrandName(settings.brand_name);
  const logoUrl = publicLogoUrl(settings.logo_url) ?? "/logo-in-site.png";
  return (
    <span className="flex min-w-0 items-center">
      <img
        src={logoUrl}
        alt={name}
        width={588}
        height={280}
        fetchPriority="high"
        className="h-14 w-auto max-w-[min(46vw,14rem)] object-contain sm:h-16 sm:max-w-[17rem]"
      />
    </span>
  );
}

/* ---------------- Hero ---------------- */

function Hero({
  settings,
  sectionVisibility,
}: {
  settings: PublicSettings;
  sectionVisibility: HomeSectionVisibility;
}) {
  const translate = useTranslateContent();
  const { language } = useLanguage();
  const stats = [
    { k: settings.stat1_value, v: settings.stat1_label },
    { k: settings.stat2_value, v: settings.stat2_label },
    { k: settings.stat3_value, v: settings.stat3_label },
  ].filter((stat) => stat.k && stat.v);
  const showPrimaryCta = isHomeSectionLinkVisible(
    settings.hero_cta_link || "#catalog",
    sectionVisibility,
  );
  const showSecondaryCta = isHomeSectionLinkVisible(
    settings.hero_secondary_cta_link || "#contact",
    sectionVisibility,
  );
  return (
    <section id="top" className="relative isolate overflow-hidden">
      <div className="relative">
        <img
          src={settings.hero_image_url || heroImage}
          srcSet={
            settings.hero_image_url ? undefined : `${heroImageMobile} 960w, ${heroImage} 1920w`
          }
          sizes="100vw"
          alt={
            settings.hero_image_url
              ? translate("Изображение на недвижим имот")
              : translate("Светъл модерен интериор с панорамни прозорци")
          }
          width={1920}
          height={1280}
          fetchPriority="high"
          decoding="async"
          className="h-[min(88svh,860px)] min-h-[520px] w-full object-cover object-[58%_center] sm:h-[min(82vh,900px)] sm:min-h-[600px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/60 via-navy-deep/30 to-navy-deep/85" />
        <div className="absolute inset-0 flex items-end pb-14 sm:items-center sm:pb-0">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-5 lg:px-8">
            <div className="max-w-2xl border-l border-gold/75 pl-5 sm:border-l-2 sm:pl-8">
              <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold sm:text-xs">
                {displayCoverageText(settings.hero_eyebrow, translate, language)}
              </span>
              <h1 className="mt-4 max-w-[15ch] font-display text-[2.25rem] font-medium leading-[1.03] text-white sm:mt-5 sm:text-5xl lg:text-6xl">
                {translate(settings.hero_title)}
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-white/90 sm:mt-6 sm:text-lg sm:leading-8">
                {displayCoverageText(settings.hero_subtitle, translate, language)}
              </p>
              {(showPrimaryCta || showSecondaryCta) && (
                <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
                  {showPrimaryCta && (
                    <Button
                      asChild
                      size="lg"
                      className="h-12 w-full rounded-full bg-gold px-7 text-navy-deep hover:bg-gold-soft sm:w-auto"
                    >
                      <a href={settings.hero_cta_link || "#catalog"}>
                        {translate(settings.hero_cta_label)} <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {showSecondaryCta && (
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="h-12 w-full rounded-full border-white/40 bg-white/5 px-7 text-white backdrop-blur hover:bg-white/10 hover:text-white sm:w-auto"
                    >
                      <a href={settings.hero_secondary_cta_link || "#contact"}>
                        {translate(settings.hero_secondary_cta_label)}
                      </a>
                    </Button>
                  )}
                </div>
              )}
              {stats.length > 0 && (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- About ---------------- */

function About({ settings }: { settings: PublicSettings }) {
  const { language, t } = useLanguage();
  const translate = useTranslateContent();
  const stats = [
    { k: settings.stat1_value, v: settings.stat1_label },
    { k: settings.stat2_value, v: settings.stat2_label },
    { k: settings.stat3_value, v: settings.stat3_label },
    { k: settings.about_stat4_value, v: settings.about_stat4_label },
  ].filter((stat) => stat.k && stat.v);

  return (
    <section id="about" className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-5 lg:px-8">
        <div
          className={cn(
            "grid gap-10 lg:gap-14",
            stats.length > 0 &&
              "lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-center",
          )}
        >
          <div>
            <SectionEyebrow>{translate(settings.about_eyebrow)}</SectionEyebrow>
            <h2 className="mt-4 font-display text-3xl font-medium text-navy sm:text-4xl md:text-5xl">
              {translate(settings.about_title)}
            </h2>
            <p className="mt-6 max-w-[68ch] whitespace-pre-line text-lg leading-relaxed text-foreground/75">
              {displayCoverageText(settings.about_text, translate, language)}
            </p>
            {settings.about_text_secondary && (
              <p className="mt-4 max-w-[68ch] whitespace-pre-line text-base leading-relaxed text-muted-foreground">
                {displayCoverageText(settings.about_text_secondary, translate, language)}
              </p>
            )}
          </div>
        </div>
        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {stats.map((c) => (
              <div
                key={`${c.k}-${c.v}`}
                className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6"
              >
                <div className="font-display text-3xl tabular-nums text-navy sm:text-4xl">
                  {c.k}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground sm:text-sm sm:tracking-[0.15em]">
                  {translate(c.v)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Services ---------------- */

function Services({ settings }: { settings: PublicSettings }) {
  const translate = useTranslateContent();
  const services = (settings.services ?? []).filter((service) => service.title.trim());
  return (
    <section
      id="services"
      className={cn(
        "bg-muted/50 pt-16 sm:pt-20",
        services.length === 0 && settings.services_image_url ? "pb-0" : "pb-12 sm:pb-14",
      )}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-5 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <SectionEyebrow>{translate(settings.services_eyebrow)}</SectionEyebrow>
            <h2 className="mt-4 font-display text-3xl font-medium text-navy sm:text-4xl md:text-5xl">
              {translate(settings.services_title)}
            </h2>
          </div>
          <p className="max-w-md text-muted-foreground">{translate(settings.services_subtitle)}</p>
        </div>
        {services.length > 0 && (
          <div className="mt-8 grid gap-5 sm:mt-12 sm:grid-cols-2">
            {services.map((s) => {
              const Icon = iconOf(s.icon);
              return (
                <div
                  key={s.title}
                  className="service-card group flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-7"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-navy text-gold ring-1 ring-gold/30">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 font-display text-2xl text-navy">{translate(s.title)}</h3>
                  <ul className="mt-4 space-y-2 text-sm text-foreground/75">
                    {s.items.map((i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                        <span>{translate(i)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
        {settings.services_image_url && (
          <div className="mt-6 overflow-hidden rounded-2xl bg-white p-3 shadow-sm sm:mt-8 sm:p-6">
            {settings.services_image_heading.trim() && (
              <h3 className="mb-4 text-center font-display text-xl font-medium text-navy sm:text-2xl">
                {translate(settings.services_image_heading)}
              </h3>
            )}
            <a
              href="https://www.creditnavigator.bg/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${translate(settings.services_image_heading) || "Credit Navigator"} — кредитnavigator.bg`}
              className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4"
            >
              <img
                src={settings.services_image_url}
                alt={translate("Кредитен навигатор — съдействие при финансиране на имот")}
                width={2000}
                height={650}
                loading="lazy"
                decoding="async"
                className="mx-auto h-auto max-h-72 w-full max-w-4xl object-contain transition-opacity duration-200 group-hover:opacity-90"
              />
            </a>
          </div>
        )}
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
  "Земеделска земя",
  "Бизнес имот",
];

function Catalog({
  settings,
  initialProperties,
}: {
  settings: PublicSettings;
  initialProperties: Property[];
}) {
  const { language, t } = useLanguage();
  const translate = useTranslateContent();
  const [type, setType] = useState<string>("Всички");
  const [listing, setListing] = useState<string>("Всички");
  const [city, setCity] = useState<string>("Всички");
  const [district, setDistrict] = useState<string>("Всички");
  const [layout, setLayout] = useState<string>("Всички");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [maxArea, setMaxArea] = useState<string>("");
  const [minArea, setMinArea] = useState<string>("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recommended");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileAdvancedOpen, setMobileAdvancedOpen] = useState(false);
  const { properties: list, isLoading } = usePublicProperties(initialProperties);

  const districts = useMemo(
    () => [
      "Всички",
      ...Array.from(
        new Set(
          list
            .filter((property) => city === "Всички" || property.city === city)
            .map((property) => property.district)
            .filter(Boolean),
        ),
      ),
    ],
    [city, list],
  );
  const cities = useMemo(() => listedCities(list), [list]);
  const minPriceValue = minPrice === "" ? null : Number(minPrice);
  const maxPriceValue = maxPrice === "" ? null : Number(maxPrice);
  const maxAreaValue = maxArea === "" ? null : Number(maxArea);
  const minAreaValue = minArea === "" ? null : Number(minArea);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(language === "en" ? "en" : "bg");
    const matching = list.filter((p) => {
      if (type !== "Всички" && p.type !== type) return false;
      if (listing !== "Всички" && p.listing !== listing) return false;
      if (city !== "Всички" && p.city !== city) return false;
      if (district !== "Всички" && p.district !== district) return false;
      if (layout !== "Всички" && p.layout !== layout) return false;
      if (
        minPriceValue !== null &&
        (p.price <= 0 || !Number.isFinite(p.price) || p.price < minPriceValue)
      )
        return false;
      if (
        maxPriceValue !== null &&
        (p.price <= 0 || !Number.isFinite(p.price) || p.price > maxPriceValue)
      )
        return false;
      if (
        maxAreaValue !== null &&
        (p.area <= 0 || !Number.isFinite(p.area) || p.area > maxAreaValue)
      )
        return false;
      if (
        minAreaValue !== null &&
        (p.area <= 0 || !Number.isFinite(p.area) || p.area < minAreaValue)
      )
        return false;
      if (normalizedQuery) {
        const searchableValues = [
          p.title,
          p.city,
          p.district,
          translate(p.type),
          p.layout ? translate(p.layout) : "",
          translate(p.listing),
          p.description,
        ].filter(Boolean);
        if (
          !searchableValues.some((value) =>
            value?.toLocaleLowerCase(language === "en" ? "en" : "bg").includes(normalizedQuery),
          )
        )
          return false;
      }
      return true;
    });
    const sorted = [...matching];
    if (sort === "price-asc" || sort === "price-desc") {
      return sorted.sort((a, b) => {
        if (a.price <= 0 || !Number.isFinite(a.price)) return 1;
        if (b.price <= 0 || !Number.isFinite(b.price)) return -1;
        return sort === "price-asc" ? a.price - b.price : b.price - a.price;
      });
    }
    if (sort === "area-desc") {
      return sorted.sort((a, b) => {
        if (a.area <= 0 || !Number.isFinite(a.area)) return 1;
        if (b.area <= 0 || !Number.isFinite(b.area)) return -1;
        return b.area - a.area;
      });
    }
    return matching;
  }, [
    list,
    type,
    listing,
    city,
    district,
    layout,
    minPriceValue,
    maxPriceValue,
    maxAreaValue,
    minAreaValue,
    query,
    sort,
    language,
    translate,
  ]);

  const hasActiveFilters =
    type !== "Всички" ||
    listing !== "Всички" ||
    city !== "Всички" ||
    district !== "Всички" ||
    layout !== "Всички" ||
    minPrice !== "" ||
    maxPrice !== "" ||
    maxArea !== "" ||
    minArea !== "" ||
    query !== "" ||
    sort !== "recommended";
  const clearFilters = () => {
    setType("Всички");
    setListing("Всички");
    setCity("Всички");
    setDistrict("Всички");
    setLayout("Всички");
    setMinPrice("");
    setMaxPrice("");
    setMaxArea("");
    setMinArea("");
    setQuery("");
    setSort("recommended");
  };
  const clearFilter = (key: string) => {
    if (key === "type") setType("Всички");
    if (key === "listing") setListing("Всички");
    if (key === "city") {
      setCity("Всички");
      setDistrict("Всички");
    }
    if (key === "district") setDistrict("Всички");
    if (key === "layout") setLayout("Всички");
    if (key === "minPrice") setMinPrice("");
    if (key === "maxPrice") setMaxPrice("");
    if (key === "minArea") setMinArea("");
    if (key === "maxArea") setMaxArea("");
    if (key === "query") setQuery("");
  };
  const activeFilters = [
    ...(listing !== "Всички" ? [{ key: "listing", label: translate(listing) }] : []),
    ...(type !== "Всички" ? [{ key: "type", label: translate(type) }] : []),
    ...(city !== "Всички" ? [{ key: "city", label: city }] : []),
    ...(district !== "Всички" ? [{ key: "district", label: district }] : []),
    ...(layout !== "Всички" ? [{ key: "layout", label: translate(layout) }] : []),
    ...(minPrice
      ? [{ key: "minPrice", label: `${t("home.filter.minPriceShort")} ${minPrice} €` }]
      : []),
    ...(maxPrice
      ? [{ key: "maxPrice", label: `${t("home.filter.maxPriceShort")} ${maxPrice} €` }]
      : []),
    ...(minArea
      ? [{ key: "minArea", label: `${t("home.filter.minAreaShort")} ${minArea} м²` }]
      : []),
    ...(maxArea
      ? [{ key: "maxArea", label: `${t("home.filter.maxAreaShort")} ${maxArea} м²` }]
      : []),
    ...(query.trim()
      ? [{ key: "query", label: `${t("home.filter.search")}: ${query.trim()}` }]
      : []),
  ];
  const sharedFilterProps = {
    listing,
    setListing,
    type,
    setType,
    city,
    setCity: (value: string) => {
      setCity(value);
      setDistrict("Всички");
    },
    cities,
    district,
    setDistrict,
    districts,
    layout,
    setLayout,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    minArea,
    setMinArea,
    maxArea,
    setMaxArea,
    sort,
    setSort,
    idPrefix: "mobile",
  };

  return (
    <section id="catalog" className="bg-background py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-5 lg:px-8">
        <SectionEyebrow>{settings.catalog_eyebrow}</SectionEyebrow>
        <h2 className="mt-2 font-display text-2xl font-medium text-navy sm:text-3xl md:text-4xl">
          {settings.catalog_title}
        </h2>

        <div className="mt-4 rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:mt-5 sm:p-4">
          <form
            className="hidden items-end gap-3 lg:grid lg:grid-cols-[minmax(8rem,1.2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(8rem,1.1fr)_minmax(10rem,1.4fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              document.getElementById("property-results")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="filter-search-desktop" className="text-[11px] text-muted-foreground">
                {t("home.filter.search")}
              </Label>
              <SearchInput
                id="filter-search-desktop"
                value={query}
                onChange={setQuery}
                placeholder={t("home.filter.searchExample")}
              />
            </div>
            <PropertyFilterFields
              listing={listing}
              setListing={setListing}
              type={type}
              setType={setType}
              city={city}
              setCity={(value) => {
                setCity(value);
                setDistrict("Всички");
              }}
              cities={cities}
              district={district}
              setDistrict={setDistrict}
              districts={districts}
              layout={layout}
              setLayout={setLayout}
              minPrice={minPrice}
              setMinPrice={setMinPrice}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
              minArea={minArea}
              setMinArea={setMinArea}
              maxArea={maxArea}
              setMaxArea={setMaxArea}
              sort={sort}
              setSort={setSort}
              showAdvanced={advancedOpen}
              showAll={false}
              primaryOnly
              idPrefix="desktop"
            />
            <Button
              type="submit"
              className="h-10 whitespace-nowrap rounded-lg bg-navy px-4 text-white hover:bg-navy-deep"
            >
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("home.filter.apply")}
            </Button>
          </form>
          <div className="lg:hidden">
            <div className="flex gap-2">
              <SearchInput
                id="filter-search-mobile"
                value={query}
                onChange={setQuery}
                placeholder={t("home.filter.searchExample")}
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 gap-2 rounded-lg border-navy/20 px-3 text-navy"
                onClick={() => {
                  setMobileAdvancedOpen(false);
                  setMobileFiltersOpen(true);
                }}
                aria-label={t("home.filter.open")}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                <span>{t("home.filter.filters")}</span>
              </Button>
            </div>
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetContent
                side="bottom"
                className="flex max-h-[88svh] w-full flex-col gap-0 overflow-hidden rounded-t-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5"
              >
                <SheetHeader className="shrink-0 pr-10 text-left">
                  <SheetTitle className="font-display text-xl text-navy">
                    {t("home.filter.title")}
                  </SheetTitle>
                  <SheetDescription>{t("home.filter.mobileDescription")}</SheetDescription>
                </SheetHeader>
                <div className="mt-5 min-h-0 flex-1 overflow-y-auto pb-5">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <PropertyFilterFields {...sharedFilterProps} showAdvanced={false} showAll />
                    </div>
                    <button
                      type="button"
                      aria-expanded={mobileAdvancedOpen}
                      onClick={() => setMobileAdvancedOpen((open) => !open)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                      {t("home.filter.advanced")}
                    </button>
                    {mobileAdvancedOpen && (
                      <div className="grid grid-cols-2 gap-3 border-t border-border/70 pt-3">
                        <PropertyFilterFields {...sharedFilterProps} showAdvanced showAll={false} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-3 border-t border-border bg-background pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 flex-1 rounded-lg"
                    onClick={clearFilters}
                  >
                    {t("home.filter.clear")}
                  </Button>
                  <Button
                    type="button"
                    className="min-h-11 flex-1 rounded-lg bg-navy text-white hover:bg-navy-deep"
                    onClick={() => setMobileFiltersOpen(false)}
                  >
                    {t("home.filter.applyCount").replace("{count}", String(filtered.length))}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="mt-3 hidden lg:block">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((open) => !open)}
                className="inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                {t("home.filter.advanced")}
                <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">
                  {[
                    district !== "Всички",
                    layout !== "Всички",
                    minArea !== "",
                    maxArea !== "",
                    sort !== "recommended",
                  ].filter(Boolean).length || ""}
                </span>
              </button>
              <p
                id="property-results"
                className="scroll-mt-24 text-sm text-muted-foreground"
                aria-live="polite"
              >
                {isLoading
                  ? t("home.filter.loading")
                  : filtered.length === 1
                    ? t("home.filter.foundOne")
                    : t("home.filter.foundMany").replace("{count}", String(filtered.length))}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="min-h-9 rounded-md px-2 text-sm text-muted-foreground underline-offset-4 hover:text-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  onClick={clearFilters}
                >
                  {t("home.filter.clear")}
                </button>
              )}
            </div>
            {advancedOpen && (
              <div className="mt-3 grid grid-cols-4 gap-3 border-t border-border/70 pt-3">
                <PropertyFilterFields
                  listing={listing}
                  setListing={setListing}
                  type={type}
                  setType={setType}
                  city={city}
                  setCity={(value) => {
                    setCity(value);
                    setDistrict("Всички");
                  }}
                  cities={cities}
                  district={district}
                  setDistrict={setDistrict}
                  districts={districts}
                  layout={layout}
                  setLayout={setLayout}
                  minPrice={minPrice}
                  setMinPrice={setMinPrice}
                  maxPrice={maxPrice}
                  setMaxPrice={setMaxPrice}
                  minArea={minArea}
                  setMinArea={setMinArea}
                  maxArea={maxArea}
                  setMaxArea={setMaxArea}
                  sort={sort}
                  setSort={setSort}
                  showAdvanced
                  showAll={false}
                  idPrefix="advanced"
                />
              </div>
            )}
          </div>
          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2" aria-label={t("home.filter.activeFilters")}>
              {activeFilters.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => clearFilter(key)}
                  aria-label={`${t("home.filter.remove")} ${label}`}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-navy/5 px-3 py-1 text-xs font-medium text-navy transition-colors hover:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  {label}
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
          <p
            id="property-results-mobile"
            className="mt-3 text-sm text-muted-foreground lg:hidden"
            aria-live="polite"
          >
            {isLoading
              ? t("home.filter.loading")
              : filtered.length === 1
                ? t("home.filter.foundOne")
                : t("home.filter.foundMany").replace("{count}", String(filtered.length))}
          </p>
        </div>

        {isLoading ? (
          <div className="mt-5 grid gap-5 sm:gap-6 lg:grid-cols-2 xl:gap-7">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
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
          <div className="mt-4 grid gap-5 sm:gap-7 md:grid-cols-2">
            {filtered.map((p) => (
              <PropertyCard key={p.id} p={p} />
            ))}
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="mt-8 rounded-xl border border-border bg-muted/35 px-5 py-10 text-center sm:px-8 sm:py-14">
            <Search className="mx-auto h-6 w-6 text-navy/70" aria-hidden="true" />
            <h3 className="mt-4 font-display text-2xl font-medium text-navy">
              {t("home.filter.emptyTitle")}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {t("home.filter.empty")}
            </p>
            <Button variant="outline" className="mt-4 min-h-11 rounded-full" onClick={clearFilters}>
              {t("home.filter.clear")}
            </Button>
          </div>
        )}
        {cities.length > 0 && (
          <nav
            aria-label={language === "en" ? "Properties by city" : "Имоти по населено място"}
            className="mt-10 border-t border-border pt-5"
          >
            <h3 className="text-sm font-medium text-muted-foreground">
              {language === "en"
                ? "Browse properties by city"
                : "Разгледайте имотите по населено място"}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {cities.map((listedCity) => (
                <li key={listedCity}>
                  <a
                    href={`/imoti-v/${citySlug(listedCity)}`}
                    className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm text-navy transition-colors hover:border-gold hover:bg-gold/10"
                  >
                    {language === "en" ? `Properties in ${listedCity}` : `Имоти в ${listedCity}`}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}

function SearchInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-0">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 min-w-0 pl-9"
      />
    </div>
  );
}

type PropertyFilterFieldsProps = {
  listing: string;
  setListing: (value: string) => void;
  type: string;
  setType: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  cities: string[];
  district: string;
  setDistrict: (value: string) => void;
  districts: string[];
  layout: string;
  setLayout: (value: string) => void;
  minPrice: string;
  setMinPrice: (value: string) => void;
  maxPrice: string;
  setMaxPrice: (value: string) => void;
  minArea: string;
  setMinArea: (value: string) => void;
  maxArea: string;
  setMaxArea: (value: string) => void;
  sort: string;
  setSort: (value: string) => void;
  showAdvanced: boolean;
  showAll: boolean;
  primaryOnly?: boolean;
  idPrefix: string;
};

function PropertyFilterFields(props: PropertyFilterFieldsProps) {
  const { t } = useLanguage();
  const setType = (value: string) => {
    props.setType(value);
    if (value !== "Апартамент") props.setLayout("Всички");
  };
  return (
    <>
      {(props.showAll || props.primaryOnly) && (
        <FilterSelect
          label={t("home.filter.listing")}
          value={props.listing}
          onChange={props.setListing}
          options={["Всички", "Продажба", "Наем"]}
        />
      )}
      {(props.showAll || props.primaryOnly) && (
        <div className="flex min-w-0 flex-col gap-3">
          <FilterSelect
            label={t("home.filter.type")}
            value={props.type}
            onChange={setType}
            options={PROPERTY_TYPES as string[]}
          />
          {props.type === "Апартамент" && (
            <FilterSelect
              label={t("home.filter.layout")}
              value={props.layout}
              onChange={props.setLayout}
              options={["Всички", ...APARTMENT_LAYOUTS]}
            />
          )}
        </div>
      )}
      {(props.showAll || props.primaryOnly) && (
        <FilterSelect
          label={t("home.filter.city")}
          value={props.city}
          onChange={props.setCity}
          options={["Всички", ...props.cities]}
        />
      )}
      {!props.primaryOnly && props.showAdvanced && (
        <>
          <FilterSelect
            label={t("home.filter.district")}
            value={props.district}
            onChange={props.setDistrict}
            options={props.districts}
          />
          <NumberField
            id={`${props.idPrefix}-min-area`}
            label={t("home.filter.minArea")}
            value={props.minArea}
            onChange={props.setMinArea}
            step="0.1"
          />
          <NumberField
            id={`${props.idPrefix}-max-area`}
            label={t("home.filter.maxArea")}
            value={props.maxArea}
            onChange={props.setMaxArea}
            step="0.1"
          />
          <FilterSelect
            label={t("home.filter.sort")}
            value={props.sort}
            onChange={props.setSort}
            options={["recommended", "price-asc", "price-desc", "area-desc"]}
            optionLabels={{
              recommended: t("home.filter.sortRecommended"),
              "price-asc": t("home.filter.sortPriceAsc"),
              "price-desc": t("home.filter.sortPriceDesc"),
              "area-desc": t("home.filter.sortAreaDesc"),
            }}
          />
        </>
      )}
      {(props.showAll || props.primaryOnly) && (
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <NumberField
            id={`${props.idPrefix}-min-price`}
            label={t("home.filter.minPrice")}
            value={props.minPrice}
            onChange={props.setMinPrice}
          />
          <NumberField
            id={`${props.idPrefix}-max-price`}
            label={t("home.filter.maxPrice")}
            value={props.maxPrice}
            onChange={props.setMaxPrice}
          />
        </div>
      )}
    </>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  step = "1",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label htmlFor={id} className="truncate text-[11px] text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "" || (Number.isFinite(Number(next)) && Number(next) >= 0)) onChange(next);
        }}
        className="h-10 min-w-0"
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  optionLabels,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  optionLabels?: Record<string, string>;
}) {
  const id = useId();
  const translate = useTranslateContent();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="truncate text-[11px] text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-label={label} className="h-10 px-2 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {optionLabels?.[o] ?? translate(o)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PropertyCard({ p }: { p: Property }) {
  const { language, t } = useLanguage();
  const translate = useTranslateContent();
  const priceText = new Intl.NumberFormat(language === "en" ? "en-GB" : "bg-BG", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(p.price);
  return (
    <article className="property-card group relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <Link
        to="/properties/$id"
        params={{ id: p.id }}
        aria-label={`${t("property.more")}: ${p.title}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
      >
        <span className="sr-only">
          {t("property.more")}: {p.title}
        </span>
      </Link>
      <div className="pointer-events-none relative z-10 aspect-[16/10] overflow-hidden bg-muted">
        {p.image ? (
          <img
            src={p.image}
            alt={p.city ? `${p.title} в ${p.city}` : p.title}
            loading="lazy"
            decoding="async"
            width={1024}
            height={768}
            className="property-card-image h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-muted" aria-hidden="true" />
        )}
        <span className="absolute left-4 top-4 rounded-md bg-navy/95 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-white">
          {translate(p.listing)}
        </span>
        <span className="absolute right-4 top-4 rounded-md bg-gold px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-navy-deep">
          {translate(p.type)}
        </span>
      </div>
      <div className="pointer-events-none relative z-10 flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="line-clamp-2 font-display text-xl font-medium leading-tight text-navy">
            {p.title}
          </h3>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {p.city}
          {p.district ? `, ${p.district}` : ""}
        </p>
        {p.description && (
          <p className="mt-3 line-clamp-2 whitespace-pre-line text-sm leading-relaxed text-foreground/75">
            {p.description.replace(/\s+/g, " ").trim().slice(0, 180)}
          </p>
        )}
        {p.area > 0 && Number.isFinite(p.area) && (
          <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Maximize2 className="h-3.5 w-3.5 text-gold" /> {p.area} м²
            </span>
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("property.price")}
            </div>
            <div className="font-display text-2xl font-semibold tabular-nums text-navy">
              {p.price > 0 && Number.isFinite(p.price) ? priceText : t("property.priceOnRequest")}
              {p.price > 0 && p.listing === "Наем" && (
                <span className="text-sm text-muted-foreground"> {t("property.month")}</span>
              )}
            </div>
          </div>
          <div className="pointer-events-auto relative z-10 flex flex-wrap justify-end gap-2">
            <Button asChild variant="outline" size="sm" className="min-h-11 rounded-full">
              <Link to="/properties/$id" params={{ id: p.id }}>
                {t("property.more")}
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="min-h-11 rounded-full bg-navy text-white hover:bg-navy-deep"
            >
              <a href={`/?inquiry=${encodeURIComponent(p.title)}#contact`}>
                {t("property.viewing")}
              </a>
            </Button>
            <ShareProperty property={p} compact />
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---------------- Why us ---------------- */

function WhyUs({ settings }: { settings: PublicSettings }) {
  const translate = useTranslateContent();
  const { language } = useLanguage();
  const reasons = settings.why_reasons ?? [];
  return (
    <section id="why" className="relative overflow-hidden bg-navy-deep py-16 text-white sm:py-20">
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-5 lg:px-8">
        <SectionEyebrow tone="gold">{translate(settings.why_eyebrow)}</SectionEyebrow>
        <h2 className="mt-4 max-w-3xl font-display text-3xl font-medium sm:text-4xl md:text-5xl">
          {translate(settings.why_title)}
        </h2>
        <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2">
          {reasons.map((r, i) => (
            <div
              key={r}
              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-colors hover:border-gold/50"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold font-display text-navy-deep">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="pt-1.5 text-base font-medium">
                {displayCoverageText(r, translate, language)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Testimonials ---------------- */

function Testimonials({ settings }: { settings: PublicSettings }) {
  const translate = useTranslateContent();
  const items = (settings.testimonials ?? []).filter(
    (testimonial) => testimonial.name.trim() && testimonial.text.trim(),
  );
  if (items.length === 0) return null;

  return (
    <section id="testimonials" className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-5 lg:px-8">
        <div className="max-w-2xl">
          <SectionEyebrow>{translate(settings.testimonials_eyebrow)}</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-medium text-navy sm:text-4xl md:text-5xl">
            {translate(settings.testimonials_title)}
          </h2>
        </div>
        <div className="mt-8 grid gap-5 sm:mt-12 sm:gap-6 md:grid-cols-2">
          {items.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
            >
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
  const { language, t } = useLanguage();
  const translate = useTranslateContent();
  const workingHours = settings.working_hours[language].trim();
  const [inquiry, setInquiry] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "", website: "" });
  const [sending, setSending] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const sendInquiry = useServerFn(submitInquiry);

  useEffect(() => {
    setInquiry(
      new URLSearchParams(window.location.search).get("inquiry")?.trim().slice(0, 200) ?? "",
    );
  }, []);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      toast.error(t("contact.required"));
      return;
    }
    if (!/^[0-9+()\s\-./]{5,40}$/.test(form.phone.trim())) {
      toast.error(t("contact.invalidPhone"));
      return;
    }
    setSending(true);
    try {
      const res = await sendInquiry({
        data: {
          name: form.name.trim().slice(0, 100),
          phone: form.phone.trim().slice(0, 40),
          email: form.email.trim().slice(0, 255),
          message: [
            inquiry ? t("contact.propertyInterest").replace("{title}", inquiry) : "",
            form.message.trim(),
          ]
            .filter(Boolean)
            .join("\n\n")
            .slice(0, 2000),
          website: form.website,
          started_at: startedAt,
        },
      });
      if (!res.ok) {
        toast.error(
          res.reason === "rate_limited" ? t("contact.rateLimited") : t("contact.sendError"),
        );
        return;
      }
      toast.success(t("contact.success"));
      setForm({ name: "", phone: "", email: "", message: "", website: "" });
    } catch {
      toast.error(t("contact.sendError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="contact" className="bg-muted/50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-5 lg:px-8">
        <div className="max-w-2xl">
          <SectionEyebrow>{translate(settings.contact_eyebrow)}</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-medium text-navy sm:text-4xl md:text-5xl">
            {translate(settings.contact_title)}
          </h2>
          <p className="mt-4 text-muted-foreground">{translate(settings.contact_subtitle)}</p>
        </div>

        <div className="mt-8 grid gap-6 sm:mt-12 sm:gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
          <div className="space-y-5">
            <ContactRow
              icon={Phone}
              title={t("contact.phones")}
              lines={[
                ...(settings.phone1
                  ? [
                      {
                        text: settings.phone1,
                        href: telHref(settings.phone1),
                        label: getContactPhoneName(settings.content_en, "phone1"),
                      },
                    ]
                  : []),
                ...(settings.phone2
                  ? [
                      {
                        text: settings.phone2,
                        href: telHref(settings.phone2),
                        label: getContactPhoneName(settings.content_en, "phone2"),
                      },
                    ]
                  : []),
              ]}
            />
            <ContactRow
              icon={MapPin}
              title={t("contact.address")}
              lines={[{ text: settings.address, href: settings.contact_map_url || undefined }]}
            />
            {settings.email && (
              <ContactRow
                icon={Mail}
                title={t("contact.email")}
                lines={[{ text: settings.email, href: `mailto:${settings.email}` }]}
              />
            )}
            {workingHours && (
              <ContactRow
                icon={Clock3}
                title={language === "en" ? "Working hours" : "Работно време"}
                lines={workingHours
                  .split("\n")
                  .filter(Boolean)
                  .map((text) => ({ text }))}
              />
            )}
            {settings.contact_map_embed?.startsWith("https://") && (
              <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                <ConsentEmbed
                  service="Google Maps"
                  fallbackHref={settings.contact_map_url || undefined}
                >
                  <iframe
                    title={translate("Карта — Елла Недвижими Имоти")}
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
            className="relative rounded-xl border border-border/80 bg-card p-5 shadow-sm sm:p-8"
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
            {inquiry && (
              <p className="mb-5 rounded-lg bg-muted px-4 py-3 text-sm text-navy" role="status">
                {t("contact.propertyInterest").replace("{title}", inquiry)}
              </p>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={t("contact.name")}
                value={form.name}
                onChange={(v) => update("name", v)}
                required
                autoComplete="name"
              />
              <Field
                label={t("contact.phone")}
                value={form.phone}
                onChange={(v) => update("phone", v)}
                type="tel"
                required
                autoComplete="tel"
              />
              <div className="sm:col-span-2">
                <Field
                  label={t("contact.email")}
                  value={form.email}
                  onChange={(v) => update("email", v)}
                  type="email"
                  autoComplete="email"
                />
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <Label
                  htmlFor="contact-message"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  {t("contact.message")}
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
                  required
                  placeholder={t("contact.tellUs")}
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
              {sending ? t("contact.sending") : t("contact.send")}
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("contact.privacyPrefix")}{" "}
              <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
                {t("contact.privacy")}
              </Link>
              .
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
  const translate = useTranslateContent();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-wider text-muted-foreground">
        {translate(label)}
      </Label>
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
  lines: { text: string; href?: string; label?: string }[];
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
                {l.label && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">{l.label}</span>
                )}
              </a>
            ) : (
              <div key={i} className="text-sm text-foreground/70">
                {l.text}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Footer ---------------- */

function Footer({
  settings,
  sectionVisibility,
}: {
  settings: PublicSettings;
  sectionVisibility: HomeSectionVisibility;
}) {
  const { language, t } = useLanguage();
  const translate = useTranslateContent();
  const phone1Name = getContactPhoneName(settings.content_en, "phone1");
  const phone2Name = getContactPhoneName(settings.content_en, "phone2");
  const nav = (settings.nav_links ?? []).filter((link) =>
    isHomeSectionLinkVisible(link.href, sectionVisibility),
  );
  const logoUrl = publicLogoUrl(settings.logo_url) ?? "/logo-in-site.png";
  const brandName = displayBrandName(settings.brand_name);
  return (
    <footer className="border-t border-border bg-navy-deep text-white/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-5 sm:py-14 lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt=""
              width={588}
              height={280}
              loading="lazy"
              className="h-16 w-auto max-w-full object-contain lg:h-20"
            />
            <span className="border-l-2 border-blue-400 pl-3">
              <span className="block font-sans text-base font-semibold leading-none tracking-tight text-blue-300 sm:text-lg">
                {brandName.split(" ")[0]}
              </span>
              <span className="mt-1 block font-sans text-[9px] font-medium uppercase leading-none tracking-[0.12em] text-white sm:text-[10px]">
                {brandName.split(" ").slice(1).join(" ")}
              </span>
            </span>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-white/65">
            {displayCoverageText(settings.footer_description, translate, language)}
          </p>
        </div>
        <div>
          <h2 className="font-display text-base text-gold">{t("footer.navigation")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {nav.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="hover:text-gold">
                  {translate(n.label)}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-base text-gold">{t("footer.contact")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {settings.phone1 && (
              <li>
                <a href={telHref(settings.phone1)} className="hover:text-gold">
                  {settings.phone1}
                  {phone1Name && <span className="ml-2 text-white/60">{phone1Name}</span>}
                </a>
              </li>
            )}
            {settings.phone2 && (
              <li>
                <a href={telHref(settings.phone2)} className="hover:text-gold">
                  {settings.phone2}
                  {phone2Name && <span className="ml-2 text-white/60">{phone2Name}</span>}
                </a>
              </li>
            )}
            {settings.address && (
              <li>
                <a
                  href={settings.contact_map_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-gold"
                >
                  {settings.address}
                </a>
              </li>
            )}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-base text-gold">{t("footer.social")}</h2>
          <div className="mt-4 flex gap-3">
            {settings.facebook_url && (
              <SocialLink href={settings.facebook_url} label="Facebook">
                <Facebook className="h-4 w-4" />
              </SocialLink>
            )}
            {settings.instagram_url && (
              <SocialLink href={settings.instagram_url} label="Instagram">
                <Instagram className="h-4 w-4" />
              </SocialLink>
            )}
            {settings.tiktok_url && (
              <SocialLink href={settings.tiktok_url} label="TikTok">
                <Music2 className="h-4 w-4" />
              </SocialLink>
            )}
            {settings.whatsapp_number && (
              <SocialLink href={waHref(settings.whatsapp_number)} label="WhatsApp">
                <MessageCircle className="h-4 w-4" />
              </SocialLink>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 pb-24 pt-6 sm:px-6 sm:pb-6">
        <nav
          aria-label={t("legal.navLabel")}
          className="mx-auto mb-3 flex max-w-3xl flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-white/75"
        >
          <Link to="/privacy" className="hover:text-gold">
            {t("footer.privacy")}
          </Link>
          <Link to="/cookies" className="hover:text-gold">
            {t("footer.cookies")}
          </Link>
          <Link to="/terms" className="hover:text-gold">
            {t("footer.terms")}
          </Link>
          <Link to="/data-request" className="hover:text-gold">
            {t("footer.dataRights")}
          </Link>
          <button type="button" onClick={openCookiePreferences} className="hover:text-gold">
            {t("footer.cookieSettings")}
          </button>
        </nav>
        <div className="mx-auto flex max-w-full flex-col items-center gap-1 text-center text-xs leading-relaxed">
          <p className="max-w-full text-white/75">
            © 2026 Ella Недвижими Имоти. Всички права запазени.
          </p>
          <p className="flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 text-gold/75">
            <span>Built by MiroX</span>
            <span aria-hidden="true" className="text-white/35">
              ·
            </span>
            <PwaInstallLink />
          </p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
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
        <FloatBtn
          href={waHref(settings.whatsapp_number)}
          label="WhatsApp"
          className="bg-[#25D366] hover:brightness-110"
        >
          <MessageCircle className="h-6 w-6" />
        </FloatBtn>
      )}
      {settings.viber_number && (
        <FloatBtn
          href={viberHref(settings.viber_number)}
          label="Viber"
          className="bg-[#7360F2] hover:brightness-110"
        >
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
