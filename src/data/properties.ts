export type PropertyType = "Апартамент" | "Къща" | "Парцел" | "Бизнес имот";
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
  layout?: ApartmentLayout;
  floor?: string;
  image: string | null;
  description: string;
}





