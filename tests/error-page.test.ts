import { describe, expect, it } from "bun:test";

import { getErrorExperienceKind } from "../src/lib/error-experience";
import { preferredErrorLanguage, renderErrorPage } from "../src/lib/error-page";

describe("branded error responses", () => {
  it("renders a localized 404 with the real logo and safe navigation", () => {
    const page = renderErrorPage({ kind: "notFound", language: "en" });

    expect(page).toContain('<html lang="en">');
    expect(page).toContain('src="/logo-in-site.png"');
    expect(page).toContain("We couldn&#39;t find this page");
    expect(page).toContain('href="/#catalog"');
    expect(page).toContain('<div class="code">404</div>');
  });

  it("renders restricted access without exposing internal details", () => {
    const page = renderErrorPage({
      kind: "access",
      language: "bg",
    });

    expect(page).toContain("Нямате достъп до тази страница");
    expect(page).toContain('href="/auth"');
    expect(page).not.toContain("stack");
    expect(page).not.toContain("supabase");
  });

  it("only includes a retry action when a safe path is supplied", () => {
    const safePage = renderErrorPage({
      kind: "server",
      language: "en",
      retryHref: "/listings?page=2",
    });
    const unsafePage = renderErrorPage({
      kind: "server",
      language: "en",
      retryHref: "//example.com",
    });

    expect(safePage).toContain('href="/listings?page=2"');
    expect(unsafePage).not.toContain('href="//example.com"');
    expect(unsafePage).toContain('href="/"');
  });

  it("uses the preferred supported language from the request headers", () => {
    expect(
      preferredErrorLanguage(
        new Request("https://ella.example", {
          headers: { "accept-language": "fr-CA, en-GB;q=0.9, bg;q=0.8" },
        }),
      ),
    ).toBe("en");
    expect(
      preferredErrorLanguage(
        new Request("https://ella.example", { headers: { "accept-language": "bg-BG" } }),
      ),
    ).toBe("bg");
  });

  it("distinguishes access, connection, and unexpected failures without reading messages", () => {
    expect(getErrorExperienceKind({ status: 403, message: "private details" })).toBe("access");
    expect(getErrorExperienceKind({ statusCode: 503 })).toBe("connection");
    expect(getErrorExperienceKind(new TypeError("fetch failed"))).toBe("connection");
    expect(getErrorExperienceKind(new TypeError("Cannot read property of undefined"))).toBe(
      "server",
    );
    expect(getErrorExperienceKind(new Error("database credentials"))).toBe("server");
  });
});
