import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useLanguage, useTranslateContent } from "@/i18n/LanguageProvider";
import { fetchPublicProperties } from "@/hooks/use-public-properties";
import { citySeoDescription, citySeoTitle, citySlug } from "@/lib/cities";
import { SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/imoti-v/$slug")({
  loader: async ({ params }) => {
    const properties = await fetchPublicProperties();
    const city = properties.find((property) => citySlug(property.city) === params.slug)?.city;
    if (!city) throw notFound();

    return {
      city,
      properties: properties.filter((property) => property.city === city),
    };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Градът не е намерен | Елла Недвижими Имоти" },
          { name: "robots", content: "noindex,follow" },
        ],
      };
    }

    const url = `${SITE_URL}/imoti-v/${encodeURIComponent(params.slug)}`;
    const title = citySeoTitle(loaderData.city);
    const description = citySeoDescription(loaderData.city, loaderData.properties.length);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "Елла Недвижими Имоти" },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl text-navy">Няма активни обяви за този град</h1>
      <Link to="/" hash="catalog" className="mt-5 text-navy underline underline-offset-4">
        Разгледайте всички имоти
      </Link>
    </main>
  ),
  component: CityPropertiesPage,
});

function CityPropertiesPage() {
  const { city, properties } = Route.useLoaderData();
  const { language } = useLanguage();
  const translate = useTranslateContent();
  const countLabel =
    language === "en"
      ? `${properties.length} ${properties.length === 1 ? "listing" : "listings"}`
      : `${properties.length} ${properties.length === 1 ? "обява" : "обяви"}`;

  return (
    <main lang={language} className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" hash="catalog" className="text-sm text-muted-foreground hover:text-navy">
            {language === "en" ? "All properties" : "Всички имоти"}
          </Link>
          <LanguageSwitcher />
        </div>
        <header className="mt-10 border-b border-border pb-6">
          <p className="text-sm font-medium uppercase tracking-wider text-gold">
            {language === "en" ? "Available properties" : "Актуални обяви"}
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium text-navy sm:text-5xl">
            {language === "en" ? `Properties in ${city}` : `Имоти в ${city}`}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {language === "en"
              ? `Browse current properties for sale and rent in ${city}.`
              : `Разгледайте актуалните обяви за продажба и наем на имоти в ${city}.`}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{countLabel}</p>
        </header>

        <section aria-label={language === "en" ? `Listings in ${city}` : `Обяви в ${city}`} className="py-8">
          <h2 className="sr-only">
            {language === "en" ? `Current properties in ${city}` : `Актуални имоти в ${city}`}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <article
                key={property.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <a href={`/properties/${encodeURIComponent(property.id)}`} className="group block">
                  {property.image ? (
                    <img
                      src={property.image}
                      alt={`${property.title} в ${city}`}
                      width={1024}
                      height={768}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="aspect-[4/3] w-full bg-muted" aria-hidden="true" />
                  )}
                  <div className="p-5">
                    <h3 className="font-display text-xl font-medium text-navy">{property.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {city}{property.district ? `, ${property.district}` : ""}
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm text-foreground/75">
                      {translate(property.description)}
                    </p>
                    <p className="mt-4 font-medium text-navy">
                      € {new Intl.NumberFormat(language === "en" ? "en-GB" : "bg-BG").format(property.price)}
                    </p>
                  </div>
                </a>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
