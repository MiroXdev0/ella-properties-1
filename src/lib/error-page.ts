import { bg } from "@/i18n/bg";
import { en } from "@/i18n/en";
import type { Language } from "@/i18n/LanguageProvider";

type ServerErrorKind = "notFound" | "access" | "server" | "connection" | "maintenance";

type RenderErrorPageOptions = {
  kind?: ServerErrorKind;
  language?: Language;
  retryHref?: string;
};

const errorCopy = {
  notFound: {
    status: 404,
    title: "error.404.title",
    description: "error.404.description",
    primary: "error.home",
    secondary: "error.browse",
    illustration:
      '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="20"/><path d="m38 25-4 11-11 4 4-11 11-4Z"/><path d="M32 8v4m0 40v4M8 32h4m40 0h4"/></svg>',
  },
  access: {
    status: 403,
    title: "error.403.title",
    description: "error.403.description",
    primary: "error.home",
    secondary: "error.login",
    illustration:
      '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="23" cy="25" r="12"/><path d="m31 33 21 21m-8-8 6-6m-13-2 6-6"/></svg>',
  },
  server: {
    status: 500,
    title: "error.500.title",
    description: "error.500.description",
    primary: "error.retry",
    secondary: "error.home",
    illustration:
      '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 54V24L32 10l20 14v30H12Z"/><path d="M25 54V39h14v15m-20-23h2m19 0h2M31 27l-4 7 6 3-4 7"/></svg>',
  },
  connection: {
    status: 503,
    title: "error.connection.title",
    description: "error.connection.description",
    primary: "error.retry",
    secondary: "error.home",
    illustration:
      '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 24a33 33 0 0 1 44 0M18 33a21 21 0 0 1 28 0m-20 9a9 9 0 0 1 12 0"/><path d="m12 12 40 40"/><circle cx="32" cy="50" r="2" fill="currentColor" stroke="none"/></svg>',
  },
  maintenance: {
    status: 503,
    title: "error.maintenance.title",
    description: "error.maintenance.description",
    primary: "error.home",
    secondary: null,
    illustration:
      '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 30 24-20 24 20"/><path d="M15 27v27h34V27M26 54V38h12v16"/></svg>',
  },
} as const;

export function preferredErrorLanguage(request: Request): Language {
  const preferences = request.headers
    .get("accept-language")
    ?.split(",")
    .map((part, index) => {
      const [tag, quality] = part.trim().split(";q=");
      return {
        tag: tag.toLowerCase(),
        quality: quality ? Number(quality) : 1,
        index,
      };
    })
    .filter((preference) => preference.quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index);
  const supported = preferences?.find(
    (preference) => preference.tag.startsWith("en") || preference.tag.startsWith("bg"),
  );
  return supported?.tag.startsWith("en") ? "en" : "bg";
}

export function renderErrorPage({
  kind = "server",
  language = "bg",
  retryHref,
}: RenderErrorPageOptions = {}): string {
  const strings = language === "en" ? en : bg;
  const copy = errorCopy[kind];
  const title = escapeHtml(strings[copy.title]);
  const description = escapeHtml(strings[copy.description]);
  const primary = escapeHtml(strings[copy.primary]);
  const secondary = copy.secondary ? escapeHtml(strings[copy.secondary]) : "";
  const pageTitle = `${copy.status} · ${title}`;
  const retryAction =
    retryHref?.startsWith("/") && !retryHref.startsWith("//")
      ? `<a class="button button-primary" href="${escapeHtml(retryHref)}">${primary}</a>`
      : "";
  const homeAction =
    copy.primary === "error.home"
      ? `<a class="button button-primary" href="/">${primary}</a>`
      : retryAction;
  const secondaryAction =
    copy.secondary === "error.browse"
      ? `<a class="button button-secondary" href="/#catalog">${secondary}</a>`
      : copy.secondary === "error.login"
        ? `<a class="button button-secondary" href="/auth">${secondary}</a>`
        : copy.secondary === "error.home"
          ? `<a class="button button-secondary" href="/">${secondary}</a>`
          : "";

  return `<!doctype html>
<html lang="${language}">
  <head>
    <meta charset="utf-8" />
    <title>${pageTitle}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0B1E3B" />
    <style>
      :root { color-scheme: light; font-family: "Jost", "Segoe UI", sans-serif; color: #172a42; background: #f7f5ef; }
      * { box-sizing: border-box; }
      body { min-height: 100vh; margin: 0; padding: 24px clamp(20px, 5vw, 64px); display: flex; flex-direction: column; background: radial-gradient(circle at 85% 8%, rgba(198,161,91,.12), transparent 28rem), #f7f5ef; }
      header, main, footer { width: min(100%, 1120px); margin-inline: auto; }
      header { display: flex; align-items: center; min-height: 64px; }
      header a { display: inline-flex; min-height: 48px; align-items: center; border-radius: 4px; }
      header img { display: block; width: 176px; height: auto; }
      main { flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) minmax(240px, .8fr); align-items: center; gap: clamp(32px, 8vw, 100px); padding-block: clamp(56px, 10vh, 108px); }
      .eyebrow { color: #927039; font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; }
      .code { margin: 18px 0 0; color: #0b1e3b; font-family: Georgia, serif; font-size: clamp(88px, 16vw, 160px); font-weight: 500; letter-spacing: -.06em; line-height: .82; }
      h1 { max-width: 620px; margin: 24px 0 0; color: #0b1e3b; font-family: Georgia, serif; font-size: clamp(32px, 4vw, 50px); font-weight: 500; line-height: 1.12; }
      p { max-width: 580px; margin: 16px 0 0; color: #475569; font-size: 17px; line-height: 1.65; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
      .button { display: inline-flex; min-height: 48px; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: 999px; padding: 0 22px; font-size: 14px; font-weight: 600; text-decoration: none; }
      .button:focus-visible, header a:focus-visible { outline: 3px solid #c6a15b; outline-offset: 3px; }
      .button-primary { background: #0b1e3b; color: #fff; }
      .button-secondary { border-color: rgba(11,30,59,.18); background: rgba(255,255,255,.75); color: #0b1e3b; }
      .illustration { position: relative; display: grid; width: min(100%, 360px); aspect-ratio: 1; place-items: center; justify-self: center; border: 1px solid rgba(198,161,91,.35); border-radius: 42%; background: #eee8d9; }
      .symbol { display: grid; width: 52%; aspect-ratio: 1; place-items: center; border-radius: 2rem; background: #0b1e3b; color: #e3c782; box-shadow: 0 24px 70px rgba(11,30,59,.16); }
      .symbol svg { width: 46%; }
      footer { border-top: 1px solid rgba(11,30,59,.12); padding-top: 16px; color: #64748b; font-size: 12px; }
      @media (max-width: 700px) { body { padding-inline: 20px; } header img { width: 148px; } main { grid-template-columns: 1fr; gap: 12px; padding-block: 52px 32px; } .illustration { width: min(76vw, 260px); grid-row: 1; } p { font-size: 16px; } }
    </style>
  </head>
  <body>
    <header><a href="/" aria-label="${escapeHtml(strings["error.home"])}"><img src="/logo-in-site.png" width="588" height="280" alt="Елла Недвижими Имоти" /></a></header>
    <main>
      <section>
        <div class="eyebrow">${escapeHtml(strings["error.eyebrow"])}</div>
        <div class="code">${copy.status}</div>
        <h1>${title}</h1>
        <p>${description}</p>
        <nav class="actions" aria-label="${escapeHtml(strings["error.status"])}">
          ${homeAction}${secondaryAction}
        </nav>
      </section>
      <div class="illustration" aria-hidden="true"><div class="symbol">${copy.illustration}</div></div>
    </main>
    <footer>${escapeHtml(strings["error.footer"])}</footer>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}
