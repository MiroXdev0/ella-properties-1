# Елла Недвижими Имоти

Production website for the real-estate agency, built with React, TypeScript, TanStack Start, Vite, Cloudflare Workers, and Supabase. The public site is deployed at <https://ella-properties-1.miroxdev2026.workers.dev/>.

## Requirements

- Node.js 22 or newer
- Bun 1.4 or newer (dependency installation)
- A Supabase project with the database schema and migrations in `supabase/migrations/`

## Local development

Install dependencies and create a local environment file:

```sh
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Set the Supabase values in `.env` before using pages that query the database or perform authentication. `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are embedded in the client build and must contain only public values. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never use a `VITE_` prefix.

## Build and run

```sh
bun run build
bun run preview
```

TanStack Start renders pages on the server and exposes server functions and API routes. The official Cloudflare Vite plugin builds and previews the Worker and its static assets; this is not a static-only site. `bun run preview` runs the production build in Cloudflare's local Worker runtime.

## Installable app

The public site is installable as a PWA from its web app manifest. The root service worker caches only same-origin static assets and the offline fallback; pages, Supabase/API responses, authentication, and admin data are never cached. When offline, navigation shows the bilingual `public/offline.html` fallback. Service-worker updates wait for user confirmation before activation.

On Android and supported desktop browsers, use the footer's **Install the app** link to open the browser's native install prompt. On iPhone and iPad, open the site in Safari and use Share → Add to Home Screen. Installation and service workers require HTTPS in production; `localhost` is allowed for development.

## Independent Cloudflare deployment

The build uses the project's checked-in Vite, TanStack Start, and Cloudflare Vite plugin configuration in [`vite.config.ts`](./vite.config.ts) and [`wrangler.jsonc`](./wrangler.jsonc). Provide `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the build environment (for example, in the local `.env` file or CI variables), because Vite embeds them in the client assets. Separately set these runtime bindings in Cloudflare Worker settings:

- Runtime variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
- Runtime secret: `SUPABASE_SERVICE_ROLE_KEY`

Never place the service-role key in a client-exposed variable or commit it. After installing the project dependencies and configuring build-time variables:

In Supabase Authentication → URL Configuration, set the Site URL to `https://ella-properties-1.miroxdev2026.workers.dev` and allow the exact callback URLs `https://ella-properties-1.miroxdev2026.workers.dev/auth` and `https://ella-properties-1.miroxdev2026.workers.dev/reset-password`.

```sh
node ./node_modules/wrangler/bin/wrangler.js login
bun run deploy
```

The deploy script builds the app and deploys it using `wrangler.jsonc`, preserving runtime variables already configured in the Cloudflare dashboard. Add required runtime variables/secrets in Cloudflare before serving production traffic. The repository does not change any live deployment.

Supabase remains an external backend dependency for authentication, property/site data, storage, and privileged server operations. Apply database migrations from `supabase/migrations/` through your Supabase deployment process; this project does not modify production data during build or deployment.

## Honeypot Monitor

The admin-only Honeypot Monitor records requests to `/passwords.json` and the monitored decoy paths in `src/lib/honeypot/detection.server.ts`. The Worker returns a generic not-found response and never serves decoy credentials. Source identifiers are HMAC-pseudonymized from canonical IP addresses; a source record represents an IP, not a uniquely identified person, so shared/NAT addresses can combine unrelated users. Raw IP addresses and visitor records are accessible only through server functions that verify the Supabase `admin` role. Event, activity, notes, restriction, and audit tables have forced RLS and deny table access to `anon` and `authenticated`; the server-only Worker service-role client is the sole application data path. Latest visitor metadata replaces unavailable values rather than carrying stale values forward.

Events and notes are deleted after 90 days. Inactive visitor records are deleted after 90 days without activity. Visitors with a still-active restriction retain only a minimal linked record after 90 days: source metadata and the duplicate visitor IP are purged, while the enforcement record retains its IP until the restriction ends. Inactive restriction records and their IP addresses are removed after 365 days; administrative audit records are retained for 365 days. The Worker’s five-minute Cron Trigger runs this cleanup as well as temporary restriction expiry.

Before enabling it in a deployment:

1. Apply `supabase/migrations/20261101183112_honeypot_monitor.sql` to the intended Supabase project. Do not apply it to production without the normal database review/approval process.
   Before staging, run the migration and `supabase/tests/honeypot_monitor.test.sql` against a disposable local Supabase database with `supabase test db`; the test fixtures are wrapped in a transaction and rolled back.
2. Set the Worker runtime secrets `HONEYPOT_HASH_SECRET` (random, at least 32 characters), `CLOUDFLARE_API_TOKEN`, and the existing `SUPABASE_SERVICE_ROLE_KEY`. Keep all of these server-side.
3. Set `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_ZONE_HOSTNAME` (the exact zone hostname, such as `example.com`), and optionally `HONEYPOT_TRUSTED_IPS` (comma-separated exact staff/VPN egress IP addresses) as Worker runtime variables. The Worker verifies the hostname against the configured zone before applying a restriction. Keep trusted addresses current; the active administrator request IP is also protected when applying a restriction.
4. Create a Cloudflare API token scoped to the target zone with **Zone Read** and **Zone Firewall Services Edit** permissions. The integration uses zone-scoped IP Access Rules, verifies every created/deleted rule through Cloudflare's API, and refuses to mark an unverified rule active. These rules apply only to requests routed through that proxied zone; the site's default `workers.dev` hostname is not covered. Restriction actions are refused when a source has accessed any hostname outside the configured zone. Configure and serve the site through its proxied custom domain before relying on IP restrictions.
5. Deploy through the existing Worker release process to activate the configured five-minute Cron Trigger. Temporary restrictions are removed by this Worker job; their expiration can be delayed by up to one cron interval, and a Cloudflare API outage leaves the removal pending for retry. The same schedule runs the 90-day and 365-day retention cleanup.

Restrictions are never automatic. An administrator must choose a duration, provide a reason, and confirm the action; permanent restrictions require explicitly selecting **Permanent**. The first deployment should be treated as a security change review because a later administrator action can create live Cloudflare block rules. Do not deploy or apply the migration as part of local validation.

## Routes

- `/` — public home page and published-property catalogue.
- `/properties/:id` — published property details.
- `/privacy`, `/cookies`, `/terms`, `/data-request` — legal and data-rights information.
- `/auth`, `/reset-password`, and `/admin/*` — authentication and staff tools; these are not public indexable pages.
- `/admin/honeypot` — administrator-only honeypot overview and event monitor.
- `/admin/honeypot/:visitorId` — administrator-only visitor investigation, notes, and verified restriction controls.
- `/sitemap.xml` and `/robots.txt` — crawler discovery.

Property listings and site settings are loaded from Supabase. Keep public contact details and business claims in the site settings accurate, and review legal information with the responsible business owner before publication.
