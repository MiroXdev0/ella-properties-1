import prop1 from "@/assets/prop-1.jpg";
import prop2 from "@/assets/prop-2.jpg";
import prop3 from "@/assets/prop-3.jpg";
import prop4 from "@/assets/prop-4.jpg";
import prop5 from "@/assets/prop-5.jpg";
import prop6 from "@/assets/prop-6.jpg";

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
  image: string;
  description: string;
}

export const properties: Property[] = [
  {
    id: "p1",
    title: "Двустаен апартамент, ново строителство",
    type: "Апартамент",
    listing: "Продажба",
    city: "Перник",
    district: "Център",
    price: 78500,
    area: 72,
    floor: "4 / 6",
    image: prop1,
    description:
      "Светъл двустаен апартамент в центъра на Перник. Завършен до ключ, отлично разпределение и южно изложение.",
  },
  {
    id: "p2",
    title: "Самостоятелна къща с двор",
    type: "Къща",
    listing: "Продажба",
    city: "Перник",
    district: "Изток",
    price: 195000,
    area: 180,
    image: prop2,
    description:
      "Модерна двуетажна къща със зелен двор, гараж и панорама. Идеална за семейство.",
  },
  {
    id: "p3",
    title: "Пентхаус с панорамна тераса",
    type: "Апартамент",
    listing: "Продажба",
    city: "Перник",
    district: "Тева",
    price: 142000,
    area: 110,
    floor: "8 / 8",
    image: prop3,
    description:
      "Луксозен пентхаус с просторна тераса и впечатляваща гледка към Витоша. Висок клас довършителни работи.",
  },
  {
    id: "p4",
    title: "Едностаен апартамент под наем",
    type: "Апартамент",
    listing: "Наем",
    city: "Перник",
    district: "Мошино",
    price: 380,
    area: 45,
    floor: "3 / 5",
    image: prop4,
    description:
      "Обзаведен едностаен апартамент, готов за нанасяне. Близо до спирки, магазини и училища.",
  },
  {
    id: "p5",
    title: "Парцел с панорама",
    type: "Парцел",
    listing: "Продажба",
    city: "Перник",
    district: "Рударци",
    price: 64000,
    area: 1100,
    image: prop5,
    description:
      "Регулиран парцел в спокоен район с прекрасна гледка. Подходящ за еднофамилна къща или вила.",
  },
  {
    id: "p6",
    title: "Офис в бизнес сграда",
    type: "Бизнес имот",
    listing: "Наем",
    city: "Перник",
    district: "Център",
    price: 950,
    area: 95,
    floor: "2 / 4",
    image: prop6,
    description:
      "Представително офис пространство в центъра. Климатик, асансьор, паркомясто.",
  },
];






