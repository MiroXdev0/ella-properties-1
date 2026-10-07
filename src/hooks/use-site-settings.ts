import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SettingsRow } from "@/lib/admin/queries";

export type NavLink = { href: string; label: string };
export type ServiceItem = { icon: string; title: string; items: string[] };
export type TestimonialItem = { name: string; role: string; text: string };

const LEGACY_METRICS = [
  ["15+", "години опит"],
  ["500+", "успешни сделки"],
  ["100%", "коректност"],
] as const;

export const DEFAULT_SETTINGS = {
  brand_name: "Елла Недвижими Имоти",
  brand_tagline: "Недвижими имоти",
  primary_color: "#0B1E3B",
  accent_color: "#C6A15B",
  hero_eyebrow: "Агенция в област Перник и София",
  hero_title: "Имоти, избрани с внимание. Сделки, водени с доверие.",
  hero_subtitle:
    "Елла Недвижими Имоти съдейства при покупка, продажба и отдаване под наем на имоти в област Перник и София.",
  hero_cta_label: "Разгледайте имотите",
  hero_cta_link: "#catalog",
  hero_secondary_cta_label: "Свържете се с нас",
  hero_secondary_cta_link: "#contact",
  hero_image_url: "",
  about_eyebrow: "За нас",
  about_title: "Имоти, избрани с внимание към детайла",
  about_text:
    "Елла Недвижими Имоти предлага пълен спектър от професионални услуги в областта на недвижимите имоти. Помагаме на клиентите си да вземат уверени и информирани решения при покупка, продажба или отдаване под наем на имот в област Перник и София.",
  about_text_secondary: "",
  stat1_value: "",
  stat1_label: "",
  stat2_value: "",
  stat2_label: "",
  stat3_value: "",
  stat3_label: "",
  about_stat4_value: "",
  about_stat4_label: "",
  allow_registration: false,
  logo_url: "/ella-imoti-logo.png",
  phone1: "+359 88 481 6232",
  phone2: "+359 88 438 8022",
  email: "",
  address: "Център, ул. „Райко Даскалов“ 4, 2300 Перник",
  facebook_url: "",
  instagram_url: "",
  whatsapp_number: "+359884816232",
  viber_number: "+359884816232",
  nav_links: [
    { href: "#about", label: "За нас" },
    { href: "#services", label: "Услуги" },
    { href: "#catalog", label: "Имоти" },
    { href: "#why", label: "Защо нас" },
    { href: "#contact", label: "Контакти" },
  ] as NavLink[],
  services_eyebrow: "Нашите услуги",
  services_title: "Пълно съдействие на всяка стъпка",
  services_subtitle:
    "От първоначална консултация до подписа при нотариус — оставаме до Вас на всяка стъпка от сделката.",
  services: [
    { icon: "Home", title: "Продажба на имоти", items: ["Апартаменти", "Къщи", "Парцели", "Бизнес имоти"] },
    { icon: "Key", title: "Покупка на имот", items: ["Лична консултация", "Подбор на подходящи оферти", "Организирани огледи"] },
    { icon: "Building2", title: "Наеми", items: ["Жилищни имоти", "Търговски площи", "Дългосрочно отдаване"] },
    { icon: "FileText", title: "Консултации", items: ["Документи и нотариус", "Оценка на сделка", "Финансиране и кредити"] },
  ] as ServiceItem[],
  why_eyebrow: "Защо да изберете нас",
  why_title: "Доверие, изградено върху резултати",
  why_reasons: [
    "Професионално и лично отношение",
    "Задълбочено познаване на пазара в област Перник и София",
    "Прозрачност, коректност и дискретност",
    "Индивидуален подход към всеки клиент",
    "Съдействие през етапите на сделката",
  ] as string[],
  testimonials_eyebrow: "Отзиви от клиенти",
  testimonials_title: "Думите на хората, които ни се довериха",
  testimonials: [] as TestimonialItem[],
  catalog_eyebrow: "Каталог с имоти",
  catalog_title: "Топ оферти",
  contact_eyebrow: "Контакти",
  contact_title: "Да поговорим за Вашия имот",
  contact_subtitle:
    "Свържете се с нас по удобен за Вас начин или ни изпратете запитване.",
  contact_map_embed:
    "https://www.google.com/maps?q=%D1%83%D0%BB.+%D0%A0%D0%B0%D0%B9%D0%BA%D0%BE+%D0%94%D0%B0%D1%81%D0%BA%D0%B0%D0%BB%D0%BE%D0%B2+4,+%D0%9F%D0%B5%D1%80%D0%BD%D0%B8%D0%BA&output=embed",
  contact_map_url: "https://maps.app.goo.gl/gWxiPmH7sDt9MtwBA",
  footer_description:
    "Информация за имоти и услуги на Елла Недвижими Имоти в област Перник и София.",
  footer_copyright: "© {year} Елла Недвижими Имоти. Всички права запазени.",
  seo_home_title: "Елла Недвижими Имоти — Имоти в Перник и София",
  seo_home_description:
    "Информация за имоти, услуги и контакти на Елла Недвижими Имоти. Съдействие при покупка, продажба и отдаване под наем.",
};

export type PublicSettings = typeof DEFAULT_SETTINGS;

function mergeSettings(data: SettingsRow | null): PublicSettings {
  const merged: PublicSettings = { ...DEFAULT_SETTINGS };
  if (data) {
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof PublicSettings)[]) {
      const value = (data as Record<string, unknown>)[key];
      if (value !== null && value !== undefined && value !== "") {
        (merged as Record<string, unknown>)[key] = value;
      }
    }

    const brandName = merged.brand_name.trim().toLocaleLowerCase("bg");
    const seoTitle = merged.seo_home_title.trim().toLocaleLowerCase("bg");
    const seoDescription = merged.seo_home_description.trim().toLocaleLowerCase("bg");
    if (seoTitle === brandName && seoDescription === brandName) {
      merged.seo_home_title = DEFAULT_SETTINGS.seo_home_title;
      merged.seo_home_description = DEFAULT_SETTINGS.seo_home_description;
    }

    const legacyMetricsAreUnverified = LEGACY_METRICS.every(
      ([value, label], index) =>
        data[`stat${index + 1}_value` as keyof SettingsRow] === value &&
        data[`stat${index + 1}_label` as keyof SettingsRow] === label,
    );
    if (legacyMetricsAreUnverified) {
      merged.stat1_value = "";
      merged.stat1_label = "";
      merged.stat2_value = "";
      merged.stat2_label = "";
      merged.stat3_value = "";
      merged.stat3_label = "";
    }
  }
  return merged;
}

export async function fetchPublicSettings(): Promise<PublicSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return mergeSettings(data as unknown as SettingsRow | null);
}

export function useSiteSettings(initialSettings?: PublicSettings): PublicSettings {
  const { data } = useQuery({
    queryKey: ["public-site-settings"],
    queryFn: fetchPublicSettings,
    initialData: initialSettings,
    staleTime: 60_000,
  });
  return data ?? initialSettings ?? DEFAULT_SETTINGS;
}

