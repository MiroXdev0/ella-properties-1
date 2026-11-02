export type PropertyType =
  "Апартамент" | "Къща" | "Парцел" | "Земеделска земя" | "Офис" | "Магазин" | "Бизнес имот";
export type Listing = "Продажба" | "Наем";
export const APARTMENT_LAYOUTS = [
  "Едностаен",
  "Двустаен",
  "Тристаен",
  "Четиристаен",
  "Мезонет",
] as const;
export type ApartmentLayout = (typeof APARTMENT_LAYOUTS)[number];

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  listing: Listing;
  city: string;
  district: string;
  price: number;
  area: number;
  yardArea?: number | null;
  rooms?: number | null;
  floor?: string | null;
  layout?: ApartmentLayout;
  image: string | null;
  images?: string[];
  description: string;
}
