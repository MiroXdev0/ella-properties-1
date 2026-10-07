import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "property-images";
// Storage keys we generate: folders, uuid-ish names, dots and dashes only.
const SAFE_PATH = /^[A-Za-z0-9._/-]{1,300}$/;
const DOWNLOAD_TIMEOUT_MS = 15_000;
const IMAGE_PATH = /\.(jpe?g|png|webp|avif)$/i;

export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        let path = "";
        try {
          path = decodeURIComponent((params as { _splat?: string })._splat ?? "");
        } catch {
          return new Response("Not found", { status: 404 });
        }
        if (!SAFE_PATH.test(path) || path.includes("..") || path.startsWith("/")) {
          return new Response("Not found", { status: 404 });
        }

        const { supabase } = await import("@/integrations/supabase/client");
        const downloadOptions = IMAGE_PATH.test(path)
          ? { transform: { width: 1280, quality: 75 } }
          : undefined;

        let timeout: ReturnType<typeof setTimeout> | undefined;
        let result;
        try {
          result = await Promise.race([
            supabase.storage.from(BUCKET).download(path, downloadOptions),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(
                () => reject(new Error("Public media request timed out")),
                DOWNLOAD_TIMEOUT_MS,
              );
            }),
          ]);
        } catch (error) {
          if (error instanceof Error && error.message === "Public media request timed out") {
            return new Response("Media request timed out", { status: 504 });
          }
          console.error("Unable to download public property media", error);
          return new Response("Media unavailable", { status: 502 });
        } finally {
          if (timeout) clearTimeout(timeout);
        }

        const { data, error } = result;
        if (error) {
          if ("statusCode" in error && error.statusCode === "404") {
            return new Response("Not found", { status: 404 });
          }
          console.error("Unable to download public property media", error);
          return new Response("Media unavailable", { status: 502 });
        }
        if (!data) return new Response("Not found", { status: 404 });

        return new Response(await data.arrayBuffer(), {
          headers: {
            "content-type": data.type || "application/octet-stream",
            "cache-control": "public, max-age=31536000, immutable",
            "x-content-type-options": "nosniff",
            "content-disposition": "inline",
          },
        });
      },
    },
  },
});




