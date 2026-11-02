import { Upload } from "tus-js-client";

import { supabase } from "@/integrations/supabase/client";
import { fileExt, isImageFile, isVideoFile, MAX_UPLOAD_BYTES } from "@/lib/media";

export type PropertyMediaValidation =
  { valid: true } | { valid: false; reason: "unsupported" | "too_large" };

export function validatePropertyMediaFile(file: File): PropertyMediaValidation {
  if (!isImageFile(file) && !isVideoFile(file)) return { valid: false, reason: "unsupported" };
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return { valid: false, reason: "too_large" };
  }
  return { valid: true };
}

export function createPropertyMediaPath(file: File): string {
  return `${crypto.randomUUID()}.${fileExt(file)}`;
}

export function isManagedPropertyMediaPath(path: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$/i.test(
    path,
  );
}

export async function uploadPropertyMedia(
  file: File,
  path: string,
  onProgress: (percentage: number) => void,
  onUploadCreated: (upload: Upload) => void,
  onStorageSuccess: () => void,
): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.access_token) {
    throw new Error("Your session has expired. Sign in again before uploading.");
  }

  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const apiKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !apiKey) throw new Error("Supabase upload configuration is unavailable.");

  const projectUrl = new URL(url);
  const storageHost = projectUrl.hostname.endsWith(".supabase.co")
    ? `${projectUrl.hostname.slice(0, -".supabase.co".length)}.storage.supabase.co`
    : projectUrl.host;
  const endpoint = `${projectUrl.protocol}//${storageHost}/storage/v1/upload/resumable`;

  let resolveUpload!: () => void;
  let rejectUpload!: (error: Error) => void;
  const completed = new Promise<void>((resolve, reject) => {
    resolveUpload = resolve;
    rejectUpload = reject;
  });
  const upload = new Upload(file, {
    endpoint,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    fingerprint: async () => `property-images/${path}`,
    headers: {
      authorization: `Bearer ${data.session.access_token}`,
      apikey: apiKey,
    },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    chunkSize: 6 * 1024 * 1024,
    metadata: {
      bucketName: "property-images",
      objectName: path,
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
      metadata: JSON.stringify({}),
    },
    onError: (uploadError) => {
      rejectUpload(uploadError);
    },
    onSuccess: () => {
      onStorageSuccess();
      resolveUpload();
    },
    onProgress: (bytesUploaded, bytesTotal) => {
      onProgress(bytesTotal > 0 ? Math.min(100, (bytesUploaded / bytesTotal) * 100) : 0);
    },
  });
  onUploadCreated(upload);

  const previousUploads = await upload.findPreviousUploads();
  if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]);
  upload.start();
  return completed;
}

export function areDuplicateMediaFiles(left: File, right: File): boolean {
  return (
    left.name === right.name &&
    left.size === right.size &&
    left.lastModified === right.lastModified &&
    left.type === right.type
  );
}
