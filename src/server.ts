import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleHoneypotRequest, runHoneypotRetention } from "./lib/honeypot/detection.server";
import {
  enforceHoneypotRestriction,
  expireCloudflareRestrictions,
} from "./lib/honeypot/cloudflare.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Uploads go straight to storage, so app requests (server functions, forms) never need large bodies.
const MAX_BODY_BYTES = 1 * 1024 * 1024;

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-permitted-cross-domain-policies": "none",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
};

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const restrictionResponse = await enforceHoneypotRestriction(request);
      if (restrictionResponse) return withSecurityHeaders(restrictionResponse);

      const honeypotResponse = await handleHoneypotRequest(request);
      if (honeypotResponse) return withSecurityHeaders(honeypotResponse);

      const len = Number(request.headers.get("content-length") ?? 0);
      if (request.method !== "GET" && request.method !== "HEAD" && len > MAX_BODY_BYTES) {
        return withSecurityHeaders(new Response("Payload too large", { status: 413 }));
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
  async scheduled() {
    try {
      await expireCloudflareRestrictions();
    } catch (error) {
      console.error("[honeypot] Scheduled IP restriction expiry failed", error);
    }

    try {
      await runHoneypotRetention();
    } catch (error) {
      console.error("[honeypot] Scheduled retention cleanup failed", error);
    }
  },
};
