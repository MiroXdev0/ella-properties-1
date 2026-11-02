import type { Property } from "@/data/properties";

const numberFormatter = (language: "bg" | "en") =>
  new Intl.NumberFormat(language === "en" ? "en-GB" : "bg-BG", {
    maximumFractionDigits: 2,
  });

export function cleanPropertyText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function formatPropertyPrice(
  price: number | null | undefined,
  language: "bg" | "en",
): string | null {
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  return new Intl.NumberFormat(language === "en" ? "en-GB" : "bg-BG", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatPropertyArea(
  area: number | null | undefined,
  language: "bg" | "en",
): string | null {
  if (area == null || !Number.isFinite(area) || area <= 0) return null;
  return `${numberFormatter(language).format(area)} m²`;
}

export type PropertyCardSpecification = {
  key: "area" | "rooms" | "yardArea" | "floor";
  value: string;
};

export function getPropertyCardSpecifications(
  property: Pick<Property, "type" | "area" | "rooms" | "yardArea" | "floor">,
  language: "bg" | "en",
): PropertyCardSpecification[] {
  const specifications: PropertyCardSpecification[] = [];
  const area = formatPropertyArea(property.area, language);
  if (area) specifications.push({ key: "area", value: area });

  if (
    property.type !== "Парцел" &&
    property.type !== "Земеделска земя" &&
    property.rooms != null &&
    Number.isFinite(property.rooms) &&
    property.rooms > 0
  ) {
    specifications.push({
      key: "rooms",
      value: new Intl.NumberFormat(language === "en" ? "en-GB" : "bg-BG", {
        maximumFractionDigits: 0,
      }).format(property.rooms),
    });
  }

  if (
    (property.type === "Къща" || property.type === "Апартамент") &&
    property.yardArea != null &&
    property.yardArea > 0
  ) {
    const yardArea = formatPropertyArea(property.yardArea, language);
    if (yardArea) specifications.push({ key: "yardArea", value: yardArea });
  }

  if (property.floor?.trim() && property.type !== "Парцел" && property.type !== "Земеделска земя") {
    specifications.push({ key: "floor", value: cleanPropertyText(property.floor) });
  }

  return specifications.slice(0, 3);
}
