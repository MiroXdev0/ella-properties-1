import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/seo";

interface SitemapEntry {
  path: string;
  lastmod?: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 1000;

async function publishedPropertyEntries(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("properties")
      .select("id,updated_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    for (const property of data ?? []) {
      if (!UUID_PATTERN.test(property.id)) continue;
      const date = property.updated_at ? new Date(property.updated_at) : null;
      entries.push({
        path: `/properties/${encodeURIComponent(property.id)}`,
        ...(date && !Number.isNaN(date.valueOf()) ? { lastmod: date.toISOString().slice(0, 10) } : {}),
      });
    }

    if (!data || data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  return entries;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const entries: SitemapEntry[] = [
            { path: "/" },
            ...(await publishedPropertyEntries()),
          ];
          const uniqueEntries = [...new Map(entries.map((entry) => [entry.path, entry])).values()];
          const urls = uniqueEntries.map((entry) =>
            [
              "  <url>",
              `    <loc>${escapeXml(`${SITE_URL}${entry.path}`)}</loc>`,
              entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
              "  </url>",
            ]
              .filter(Boolean)
              .join("\n"),
          );
          const xml = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ...urls,
            "</urlset>",
          ].join("\n");

          return new Response(xml, {
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=3600",
            },
          });
        } catch (error) {
          console.error("Unable to generate sitemap.xml", error);
          return new Response("Sitemap temporarily unavailable", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
