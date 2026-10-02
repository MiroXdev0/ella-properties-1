import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SettingsRow } from "@/lib/admin/queries";

export type NavLink = { href: string; label: string };
export type ServiceItem = { icon: string; title: string; items: string[] };
export type TestimonialItem = { name: string; role: string; text: string };

export const DEFAULT_SETTINGS = {
  brand_name: "Елла Недвижими Имоти",
  brand_tagline: "Недвижими имоти",
  primary_color: "#0B1E3B",
  accent_color: "#C6A15B",
  hero_eyebrow: "Агенция в област Перник и София",
  hero_title: "Имоти, избрани с внимание. Сделки, водени с доверие.",
  hero_subtitle:
    "Елла Недвижими Имоти е Вашият дългогодишен партньор при покупка, продажба и отдаване под наем на имоти в област Перник и София. Работим лично, дискретно и с ангажимент за резултат — от първия оглед до подписа при нотариус.",
  hero_cta_label: "Разгледайте имотите",
  hero_cta_link: "#catalog",
  hero_secondary_cta_label: "Свържете се с нас",
  hero_secondary_cta_link: "#contact",
  hero_image_url: "",
  about_eyebrow: "За нас",
  about_title: "Имоти, избрани с внимание към детайла",
  about_text:
    "Елла Недвижими Имоти предлага пълен спектър от професионални услуги в областта на недвижимите имоти. Помагаме на клиентите си да вземат уверени и информирани решения при покупка, продажба или отдаване под наем на имот в област Перник и София.",
  about_text_secondary:
    "С офис в сърцето на Перник и активно присъствие на столичния пазар, ние съчетаваме отлично познаване на региона със столичния опит. Работим прозрачно, дискретно и с грижа за дългосрочното доверие на всеки клиент.",
  stat1_value: "15+",
  stat1_label: "години опит",
  stat2_value: "500+",
  stat2_label: "успешни сделки",
  stat3_value: "100%",
  stat3_label: "коректност",
  about_stat4_value: "Пълно",
  about_stat4_label: "съдействие",
  allow_registration: false,
  logo_url: "",
  phone1: "+359 88 481 6232",
  phone2: "+359 88 438 8022",
  email: "office@ella-imoti.bg",
  address: "ул. „Райко Даскалов\" 4, 2300 Перник",
  facebook_url: "https://facebook.com",
  instagram_url: "https://instagram.com",
  whatsapp_number: "+359884816232",
  viber_number: "+359884816232",
  nav_links: [
    { href: "#about", label: "За нас" },
    { href: "#services", label: "Услуги" },
    { href: "#catalog", label: "Имоти" },
    { href: "#why", label: "Защо нас" },
    { href: "#testimonials", label: "Отзиви" },
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
    "Само реални и проверени оферти",
    "Прозрачност, коректност и дискретност",
    "Индивидуален подход към всеки клиент",
    "Пълно правно и нотариално съдействие",
  ] as string[],
  testimonials_eyebrow: "Отзиви от клиенти",
  testimonials_title: "Думите на хората, които ни се довериха",
  testimonials: [
    { name: "Мария Иванова", role: "Купувач, Перник", text: "Изключително професионално отношение от първия контакт до подписването на договора. Намериха ни апартамента, който мечтаехме." },
    { name: "Георги Петров", role: "Продавач", text: "Реализираха сделката бързо и на коректна цена. Спокойствието през целия процес е безценно." },
    { name: "Елена Костова", role: "Наемател", text: "Любезни, отзивчиви и с реални оферти. Препоръчвам Елла Недвижими Имоти на всеки!" },
  ] as TestimonialItem[],
  catalog_eyebrow: "Каталог с имоти",
  catalog_title: "Топ оферти",
  contact_eyebrow: "Контакти",
  contact_title: "Да поговорим за Вашия имот",
  contact_subtitle:
    "Свържете се с нас по удобен за Вас начин или ни изпратете запитване — ще Ви отговорим в рамките на същия работен ден.",
  contact_map_embed:
    "https://www.google.com/maps?q=%D1%83%D0%BB.+%D0%A0%D0%B0%D0%B9%D0%BA%D0%BE+%D0%94%D0%B0%D1%81%D0%BA%D0%B0%D0%BB%D0%BE%D0%B2+4,+%D0%9F%D0%B5%D1%80%D0%BD%D0%B8%D0%BA&output=embed",
  contact_map_url: "https://maps.app.goo.gl/gWxiPmH7sDt9MtwBA",
  footer_description:
    "Професионална агенция за недвижими имоти в област Перник и София. Сделки с доверие и лично отношение от 2009 г.",
  footer_copyright: "© {year} Елла Недвижими Имоти. Всички права запазени.",
  seo_home_title: "Елла Недвижими Имоти — Агенция за имоти в област Перник и София",
  seo_home_description:
    "Лицензирана агенция за недвижими имоти в област Перник и София. Професионално съдействие при покупка, продажба и отдаване под наем на апартаменти, къщи, парцели и бизнес имоти.",
  seo_home_keywords:
    "Недвижими имоти Перник, недвижими имоти София, апартаменти Перник, къщи Перник, имоти област Перник, агенция недвижими имоти Перник и София",
};

export type PublicSettings = typeof DEFAULT_SETTINGS;

export function useSiteSettings(): PublicSettings {
  const { data } = useQuery({
    queryKey: ["public-site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SettingsRow | null;
    },
    staleTime: 60_000,
  });
  const merged: PublicSettings = { ...DEFAULT_SETTINGS };
  if (data) {
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof PublicSettings)[]) {
      const v = (data as Record<string, unknown>)[key];
      if (v !== null && v !== undefined && v !== "") {
        (merged as Record<string, unknown>)[key] = v;
      }
    }
  }
  return merged;
}





