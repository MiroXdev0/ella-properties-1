import type { Property } from "@/data/properties";
import { limitMetaText } from "@/lib/seo";

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
  return [...new Set(properties.map((property) => property.city.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "bg"),
  );
}

export function citySeoTitle(city: string, properties: Property[]): string {
  const transactions = new Set(properties.map((property) => property.listing));
  const transactionLabel =
    transactions.size > 1
      ? "за продажба и под наем"
      : transactions.has("Наем")
        ? "под наем"
        : "за продажба";
  return limitMetaText(`Имоти ${transactionLabel} в ${city} | Елла Недвижими Имоти`, 65);
}

export function citySeoDescription(city: string, properties: Property[]): string {
  const count = properties.length;
  const noun = count === 1 ? "актуална обява" : "актуални обяви";
  const transactions = new Set(properties.map((property) => property.listing));
  const transactionLabel =
    transactions.size > 1
      ? "за продажба и под наем"
      : transactions.has("Наем")
        ? "под наем"
        : "за продажба";
  return limitMetaText(
    `Разгледайте ${count} ${noun} ${transactionLabel} в ${city}. Вижте цени, площи и подробности за актуалните оферти от Елла Недвижими Имоти.`,
    158,
  );
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
