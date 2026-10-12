import type { Json } from "@/integrations/supabase/types";

export type PageLocaleContent = {
  title: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
};

export type PageContent = {
  bg: PageLocaleContent;
  en: PageLocaleContent;
};

const emptyLocale = (): PageLocaleContent => ({
  title: "",
  body: "",
  seoTitle: "",
  seoDescription: "",
});

export function readPageContent(value: Json, fallbackTitle = ""): PageContent {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      bg: {
        ...emptyLocale(),
        title: fallbackTitle,
        body: typeof value === "string" ? value : "",
      },
      en: emptyLocale(),
    };
  }

  const asLocale = (locale: Json | undefined): PageLocaleContent => {
    if (typeof locale !== "object" || locale === null || Array.isArray(locale)) return emptyLocale();
    const getString = (key: string) => {
      const field = locale[key];
      return typeof field === "string" ? field : "";
    };
    return {
      title: getString("title"),
      body: getString("body"),
      seoTitle: getString("seoTitle"),
      seoDescription: getString("seoDescription"),
    };
  };

  if (!("bg" in value) && !("en" in value)) {
    const body = typeof value.body === "string"
      ? value.body
      : Object.keys(value).length > 0
        ? JSON.stringify(value, null, 2)
        : "";
    return { bg: { ...emptyLocale(), title: fallbackTitle, body }, en: emptyLocale() };
  }

  const bg = asLocale(value.bg);
  if (!bg.title) bg.title = fallbackTitle;
  return { bg, en: asLocale(value.en) };
}

export function pageContentJson(content: PageContent): Json {
  return {
    bg: { ...content.bg },
    en: { ...content.en },
  };
}
