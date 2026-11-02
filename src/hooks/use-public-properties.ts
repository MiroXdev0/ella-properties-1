import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type Property,
  type PropertyType,
  type Listing,
  type ApartmentLayout,
  APARTMENT_LAYOUTS,
} from "@/data/properties";

function mapType(t: string): PropertyType {
  if (
    t === "Апартамент" ||
    t === "Къща" ||
    t === "Парцел" ||
    t === "Земеделска земя" ||
    t === "Офис" ||
    t === "Магазин"
  ) {
    return t;
  }
  return "Бизнес имот";
}

function mapListing(status: string): Listing {
  return status === "Под наем" || status === "Отдаден" ? "Наем" : "Продажба";
}

export async function fetchPublicProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id,title,type,layout,status,price,city,district,area,yard_area,rooms,floor,description,main_image,is_featured,created_at",
    )
    .eq("is_published", true)
    .in("status", ["Продава", "Под наем"])
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const { data: imageRows, error: imagesError } = await supabase
    .from("property_images")
    .select("property_id,url,sort_order")
    .in(
      "property_id",
      rows.map((property) => property.id),
    )
    .order("sort_order", { ascending: true });
  if (imagesError) throw imagesError;

  const imagesByProperty = new Map<string, string[]>();
  for (const image of imageRows ?? []) {
    if (!image.url) continue;
    const propertyImages = imagesByProperty.get(image.property_id) ?? [];
    if (!propertyImages.includes(image.url)) propertyImages.push(image.url);
    imagesByProperty.set(image.property_id, propertyImages);
  }

  return rows.map((p) => {
    const galleryImages = imagesByProperty.get(p.id) ?? [];
    const images = [p.main_image, ...galleryImages].filter(
      (image, index, all): image is string => Boolean(image) && all.indexOf(image) === index,
    );
    return {
      id: p.id,
      title: p.title,
      type: mapType(p.type),
      listing: mapListing(p.status),
      city: p.city?.trim() ?? "",
      district: p.district ?? "",
      price: Number(p.price ?? 0),
      area: Number(p.area ?? 0),
      yardArea: p.yard_area == null ? null : Number(p.yard_area),
      rooms: p.rooms == null ? null : Number(p.rooms),
      floor: p.floor,
      layout: (APARTMENT_LAYOUTS as readonly string[]).includes(p.layout ?? "")
        ? (p.layout as ApartmentLayout)
        : undefined,
      image: images[0] ?? null,
      images,
      description: p.description ?? "",
    };
  });
}

export function usePublicProperties(initialProperties: Property[]) {
  const { data, isLoading } = useQuery({
    queryKey: ["public-properties"],
    staleTime: 30_000,
    queryFn: fetchPublicProperties,
    initialData: initialProperties,
  });

  return { properties: data, isLoading };
}
