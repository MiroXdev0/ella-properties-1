/** Public URL for a file stored in the images bucket (bucket is private, served via a public route). */
export function mediaUrl(storagePath: string) {
  return `/api/public/media/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
}

/** Safe file extension derived from the file name or its MIME type. */
export function fileExt(file: File) {
  const fromName = file.name.includes(".") ? file.name.split(".").pop()! : "";
  const clean = fromName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  if (clean) return clean;
  const fromType = file.type.split("/")[1]?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return fromType || "bin";
}

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif|bmp|tiff?|svg|heic|heif|jfif|ico)$/i.test(file.name);
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






