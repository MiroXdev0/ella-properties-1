import type { Property } from "@/data/properties";

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sht",
  ъ: "a",
  ь: "y",
  ю: "yu",
  я: "ya",
};

export function citySlug(city: string): string {
  return Array.from(city.trim().toLocaleLowerCase("bg"))
    .map((character) => CYRILLIC_TO_LATIN[character] ?? character)
    .join("")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function listedCities(properties: Property[]): string[] {
  return [...new Set(properties.map((property) => property.city.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "bg"));
}

export function citySeoTitle(city: string): string {
  return `Имоти в ${city} | Продажба и наем — Елла Недвижими Имоти`;
}

export function citySeoDescription(city: string, count: number): string {
  const noun = count === 1 ? "актуална обява" : "актуални обяви";
  return `Разгледайте ${noun} за имоти в ${city}: цени, площи и подробности за всяка оферта. Свържете се с Елла Недвижими Имоти за съдействие.`;
}

export function broadenLegacyCoverageText(text: string, language: "bg" | "en"): string {
  const replacement =
    language === "en" ? "in cities with current listings" : "в градовете с актуални обяви";
  return text
    .replace(/в област Перник и София/giu, replacement)
    .replace(/в Перник и София/giu, replacement)
    .replace(/област Перник и София/giu, replacement)
    .replace(/Перник и София/giu, replacement)
    .replace(/Pernik Province and Sofia/giu, replacement)
    .replace(/Pernik and Sofia/giu, replacement);
}
