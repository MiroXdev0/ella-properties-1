import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DECOY_ENDPOINTS = new Map<string, string>([
  ["/passwords.json", "Decoy credentials resource requested"],
  ["/.env", "Sensitive configuration decoy requested"],
  ["/backup.zip", "Backup archive decoy requested"],
  ["/database.sql", "Database dump decoy requested"],
  ["/wp-config.php", "CMS configuration decoy requested"],
  ["/adminer.php", "Database administration decoy requested"],
  ["/phpmyadmin", "Database administration decoy requested"],
]);

const PASSWORDS_DECOY = {
  accounts: [
    {
      username: "demo_admin",
      email: "demo_admin@example.com",
      password: "NOT-A-REAL-PASSWORD",
      note: "Fictional sample account; not a valid login",
    },
    {
      username: "backup_service",
      email: "backup_service@example.net",
      password: "EXAMPLE-ONLY-DO-NOT-USE",
      note: "Fictional sample account; not a valid login",
    },
  ],
};

const ipSchema = z.string().ip();

type CloudflareMetadata = {
  country?: unknown;
  city?: unknown;
  region?: unknown;
  asn?: unknown;
  asOrganization?: unknown;
};

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const clean = Array.from(value.slice(0, maxLength))
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 32 && codePoint !== 127;
    })
    .join("")
    .trim();
  return clean ? clean.slice(0, maxLength) : null;
}

function parseUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return {
      operatingSystem: null,
      browser: null,
      browserVersion: null,
      deviceType: null,
    };
  }

  const browserMatchers: Array<[string, RegExp]> = [
    ["Microsoft Edge", /(?:Edg|Edge)\/([\d.]+)/i],
    ["Opera", /(?:OPR|Opera)\/([\d.]+)/i],
    ["Samsung Internet", /SamsungBrowser\/([\d.]+)/i],
    ["Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/i],
    ["Chrome", /(?:Chrome|CriOS)\/([\d.]+)/i],
    ["Safari", /Version\/([\d.]+).*Safari/i],
  ];
  const browserMatch = browserMatchers
    .map(([name, expression]) => ({ name, match: userAgent.match(expression) }))
    .find(({ match }) => match);

  const operatingSystems: Array<[string, RegExp]> = [
    ["iOS", /iPhone|iPad|iPod/i],
    ["Android", /Android/i],
    ["Windows", /Windows NT/i],
    ["macOS", /Mac OS X|Macintosh/i],
    ["ChromeOS", /CrOS/i],
    ["Linux", /Linux/i],
  ];
  const operatingSystem =
    operatingSystems.find(([, expression]) => expression.test(userAgent))?.[0] ?? null;

  const deviceType = /bot|crawler|spider|headless|curl|wget/i.test(userAgent)
    ? "Automated client"
    : /iPad|tablet/i.test(userAgent)
      ? "Tablet"
      : /Mobi|iPhone|Android/i.test(userAgent)
        ? "Mobile"
        : "Desktop";

  return {
    operatingSystem,
    browser: browserMatch?.name ?? null,
    browserVersion: browserMatch?.match?.[1]?.slice(0, 40) ?? null,
    deviceType,
  };
}

async function hashSource(ipAddress: string | null): Promise<string> {
  const secret = process.env.HONEYPOT_HASH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("HONEYPOT_HASH_SECRET must contain at least 32 characters");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const source = ipAddress ?? `unavailable:${crypto.randomUUID()}`;
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(source));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function canonicalIp(ipAddress: string): string {
  if (ipAddress.includes(":")) {
    return new URL(`http://[${ipAddress}]/`).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  }
  return ipAddress
    .split(".")
    .map((part) => String(Number(part)))
    .join(".");
}

function getTrustedAddresses(): Set<string> {
  return new Set(
    (process.env.HONEYPOT_TRUSTED_IPS ?? "")
      .split(",")
      .map((address) => address.trim())
      .filter((address) => ipSchema.safeParse(address).success)
      .map(canonicalIp),
  );
}

function cleanReferrer(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.origin === "null"
    ) {
      return null;
    }
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return null;
  }
}

function asnValue(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) return null;
  return value;
}

export function isHoneypotEndpoint(pathname: string): boolean {
  return DECOY_ENDPOINTS.has(pathname.toLowerCase().replace(/\/+$/, "") || "/");
}

export async function handleHoneypotRequest(request: Request): Promise<Response | null> {
  const pathname = new URL(request.url).pathname.toLowerCase().replace(/\/+$/, "") || "/";
  const detectionReason = DECOY_ENDPOINTS.get(pathname);
  if (!detectionReason) return null;

  try {
    const hostname = new URL(request.url).hostname.toLowerCase().replace(/\.$/, "");
    const ipHeader = request.headers.get("cf-connecting-ip");
    const validatedIp = ipHeader && ipSchema.safeParse(ipHeader).success ? ipHeader : null;
    const ipAddress = validatedIp ? canonicalIp(validatedIp) : null;
    const metadata = (request as Request & { cf?: CloudflareMetadata }).cf;
    const userAgent = boundedString(request.headers.get("user-agent"), 512);
    const parsedAgent = parseUserAgent(userAgent);
    const countryCode = boundedString(metadata?.country, 2)?.toUpperCase() ?? null;
    const asn = asnValue(metadata?.asn);
    const asOrganization = boundedString(metadata?.asOrganization, 120);
    const cfCountry = countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : null;
    const countryName = cfCountry
      ? (new Intl.DisplayNames(["en"], { type: "region" }).of(cfCountry) ?? cfCountry)
      : null;
    const hostingClassification =
      asOrganization &&
      /hosting|datacenter|data center|cloud|server|colocation/i.test(asOrganization)
        ? "Likely hosting provider (inferred from ASN organization)"
        : null;
    const trustedAddresses = getTrustedAddresses();
    const sourceHash = await hashSource(ipAddress);
    const city = boundedString(metadata?.city, 100);
    const region = boundedString(metadata?.region, 100);
    const metadataSources: Record<string, string> = {
      isp: "Unavailable; Cloudflare request metadata does not provide an ISP",
    };
    if (countryName) metadataSources.country = "Derived from Cloudflare country code";
    if (city) metadataSources.city = "Cloudflare request metadata";
    if (region) metadataSources.region = "Cloudflare request metadata";
    if (asn) metadataSources.asn = "Cloudflare request metadata";
    if (asOrganization) metadataSources.asOrganization = "Cloudflare request metadata";
    if (parsedAgent.operatingSystem) metadataSources.operatingSystem = "Inferred from User-Agent";
    if (parsedAgent.browser) metadataSources.browser = "Inferred from User-Agent";
    if (parsedAgent.browserVersion) metadataSources.browserVersion = "Inferred from User-Agent";
    if (parsedAgent.deviceType) metadataSources.deviceType = "Inferred from User-Agent";
    if (hostingClassification) {
      metadataSources.hostingClassification = "Inferred from ASN organization";
    }
    const { error } = await supabaseAdmin.rpc("record_honeypot_detection", {
      p_source_hash: sourceHash,
      p_ip_address: ipAddress,
      p_country: countryName,
      p_country_code: cfCountry,
      p_city: city,
      p_region: region,
      p_operating_system: parsedAgent.operatingSystem,
      p_browser: parsedAgent.browser,
      p_browser_version: parsedAgent.browserVersion,
      p_device_type: parsedAgent.deviceType,
      p_asn: asn,
      p_as_organization: asOrganization,
      p_hosting_classification: hostingClassification,
      p_user_agent: userAgent,
      p_metadata_sources: metadataSources,
      p_is_trusted: ipAddress ? trustedAddresses.has(ipAddress) : false,
      p_detection_reason: detectionReason,
      p_hostname: hostname,
      p_endpoint: pathname,
      p_request_method: request.method.toUpperCase().slice(0, 16),
      p_referrer: cleanReferrer(request.headers.get("referer")),
    });

    if (error) throw error;
  } catch {
    console.error("[honeypot] Event persistence failed");
    return new Response("Not found", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  if (pathname === "/passwords.json") {
    return new Response(
      request.method === "HEAD" ? null : JSON.stringify(PASSWORDS_DECOY, null, 2),
      {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
      },
    );
  }

  return new Response("Not found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function runHoneypotRetention(): Promise<void> {
  const { error } = await supabaseAdmin.rpc("purge_honeypot_data");
  if (error) {
    console.error("[honeypot] Scheduled retention cleanup failed");
    throw new Error("Honeypot retention cleanup failed");
  }
}
