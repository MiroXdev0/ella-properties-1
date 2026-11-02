import { createStart, createMiddleware } from "@tanstack/react-start";

import { preferredErrorLanguage, renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    const retryHref =
      request.method === "GET" || request.method === "HEAD"
        ? new URL(request.url).pathname + new URL(request.url).search
        : undefined;
    return new Response(
      renderErrorPage({
        language: preferredErrorLanguage(request),
        retryHref,
      }),
      {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
