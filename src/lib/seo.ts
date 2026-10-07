export const SITE_URL = "https://ellaimoti.pages.dev";

export function legalHead(title: string, description: string, path: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}${path}` },
      { property: "og:site_name", content: "Елла Недвижими Имоти" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}${path}` }],
  };
}
