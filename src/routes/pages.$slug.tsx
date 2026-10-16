import { createFileRoute, notFound } from "@tanstack/react-router";

import { ContentPageView } from "@/components/cms/ContentPageView";
import { supabase } from "@/integrations/supabase/client";
import { readPageContent } from "@/lib/site-pages";
import { breadcrumbJsonLd, jsonLdScript, limitMetaText, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/pages/$slug")({
  loader: async ({ params }) => {
    const slug = params.slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw notFound();

    const { data, error } = await supabase
      .from("site_pages")
      .select("slug,title,content,seo_title,seo_description,is_published")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();

    return {
      ...data,
      content: readPageContent(data.content, data.title),
    };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Страницата не е намерена | Елла Недвижими Имоти" },
          { name: "robots", content: "noindex,follow" },
        ],
      };
    }

    const localized = loaderData.content.bg;
    const rawTitle = localized.seoTitle || loaderData.seo_title || localized.title;
    const title = limitMetaText(
      rawTitle.includes("Елла Недвижими Имоти") ? rawTitle : `${rawTitle} | Елла Недвижими Имоти`,
      65,
    );
    const description = limitMetaText(
      localized.seoDescription || loaderData.seo_description || localized.body || localized.title,
      158,
    );
    const canonical = `${SITE_URL}/pages/${encodeURIComponent(params.slug)}`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: canonical },
        { property: "og:site_name", content: "Елла Недвижими Имоти" },
        { property: "og:locale", content: "bg_BG" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        jsonLdScript(
          breadcrumbJsonLd([
            { name: "Начало", url: `${SITE_URL}/` },
            { name: localized.title, url: canonical },
          ]),
        ),
      ],
    };
  },
  component: PageRoute,
});

function PageRoute() {
  const { content } = Route.useLoaderData();
  return <ContentPageView content={content} />;
}
