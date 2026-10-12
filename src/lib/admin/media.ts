import { supabase } from "@/integrations/supabase/client";

function storagePathFromUrl(value: string): string | null {
  const marker = "/api/public/media/";
  const start = value.indexOf(marker);
  if (start < 0) return null;

  try {
    return value
      .slice(start + marker.length)
      .split("/")
      .map((part) => decodeURIComponent(part))
      .join("/");
  } catch {
    return null;
  }
}

export async function adminMediaPreviewUrl(value: string): Promise<string> {
  const path = storagePathFromUrl(value);
  if (!path) return value;

  const { data, error } = await supabase.storage
    .from("property-images")
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
