/** Public URL for a file stored in the images bucket (bucket is private, served via a public route). */
export function mediaUrl(storagePath: string) {
  return `/api/public/media/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
}

export function mediaUrlAtWidth(value: string, width: 320 | 480 | 640 | 960 | 1280) {
  if (!value.startsWith("/api/public/media/")) return value;
  const [path, query] = value.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("w", String(width));
  return `${path}?${params.toString()}`;
}

export function storagePathFromMediaUrl(value: string): string | null {
  const marker = "/api/public/media/";
  const start = value.indexOf(marker);
  if (start < 0) return null;
  try {
    return value
      .slice(start + marker.length)
      .split(/[?#]/, 1)[0]
      .split("/")
      .map((part) => decodeURIComponent(part))
      .join("/");
  } catch {
    return null;
  }
}

/** Safe file extension derived from the file name or its MIME type. */
export function fileExt(file: File) {
  const fromName = file.name.includes(".") ? file.name.split(".").pop()! : "";
  const clean = fromName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  if (clean) return clean;
  const fromType = file.type
    .split("/")[1]
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return fromType || "bin";
}

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|avif|bmp|tiff?|svg|heic|heif|jfif|ico)$/i.test(file.name)
  );
}

export function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|webm|ogv|ogg|mov|m4v|avi|mkv)$/i.test(file.name);
}

/** True when a stored media URL points at a video file. */
export function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogv|ogg|mov|m4v|avi|mkv)(\?|$)/i.test(url);
}

/** Turns a YouTube/Vimeo link into an embeddable URL, or null when not supported. */
export function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
