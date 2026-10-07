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
  if (t === "Апартамент" || t === "Къща" || t === "Парцел") return t;
  return "Бизнес имот";
}

function mapListing(status: string): Listing {
  return status === "Под наем" || status === "Отдаден" ? "Наем" : "Продажба";
}

export async function fetchPublicProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("id,title,type,layout,status,price,city,district,area,floor,description,main_image,is_featured,created_at")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    type: mapType(p.type),
    listing: mapListing(p.status),
    city: p.city ?? "",
    district: p.district ?? "",
    price: Number(p.price ?? 0),
    area: Number(p.area ?? 0),
    layout: (APARTMENT_LAYOUTS as readonly string[]).includes(p.layout ?? "")
      ? (p.layout as ApartmentLayout)
      : undefined,
    floor: p.floor ?? undefined,
    image: p.main_image || null,
    description: p.description ?? "",
  }));
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



