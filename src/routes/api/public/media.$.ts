import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "property-images";
// Storage keys we generate: folders, uuid-ish names, dots and dashes only.
const SAFE_PATH = /^[A-Za-z0-9._/-]{1,300}$/;
const DOWNLOAD_TIMEOUT_MS = 15_000;

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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let result: { data: Blob | null; error: unknown };
        try {
          result = (await Promise.race([
            supabaseAdmin.storage.from(BUCKET).download(path),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), DOWNLOAD_TIMEOUT_MS),
            ),
          ])) as { data: Blob | null; error: unknown };
        } catch {
          return new Response("Unavailable", { status: 504 });
        }

        const { data, error } = result;
        if (error || !data) return new Response("Not found", { status: 404 });

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






