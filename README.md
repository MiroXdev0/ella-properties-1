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

The admin-only Honeypot Monitor records requests to `/passwords.json` and the monitored decoy paths in `src/lib/honeypot/detection.server.ts`. After recording a request, `/passwords.json` returns a small fictional sample with explicitly unusable placeholder passwords; it contains no real accounts or credentials. Other monitored paths return a generic not-found response. Source identifiers are HMAC-pseudonymized from canonical IP addresses; a source record represents an IP, not a uniquely identified person, so shared/NAT addresses can combine unrelated users. Raw IP addresses and visitor records are accessible only through server functions that verify the Supabase `admin` role. Event, activity, notes, restriction, and audit tables have forced RLS and deny table access to `anon` and `authenticated`; the server-only Worker service-role client is the sole application data path. Latest visitor metadata replaces unavailable values rather than carrying stale values forward.

Events and notes are deleted after 90 days. Inactive visitor records are deleted after 90 days without activity. Visitors with a still-active restriction retain only a minimal linked record after 90 days: source metadata and the duplicate visitor IP are purged, while the enforcement record retains its IP until the restriction ends. Inactive restriction records and their IP addresses are removed after 365 days; administrative audit records are retained for 365 days. The Worker’s five-minute Cron Trigger runs this cleanup as well as temporary restriction expiry.

Before enabling it in a deployment:

1. Apply the pending honeypot migrations, including `supabase/migrations/20261101183112_honeypot_monitor.sql`, `supabase/migrations/20261101232900_honeypot_ip_restriction_index.sql`, and `supabase/migrations/20261102180100_honeypot_worker_only_restrictions.sql`, to the intended Supabase project. The IP index migration stops with an explicit error if duplicate live IP restrictions need manual reconciliation. Do not apply these to production without the normal database review/approval process.
   Run the Worker/API unit tests with `bun test tests/honeypot-restrictions.test.ts`. Before staging, apply migrations to a disposable local Supabase database and run `supabase/tests/honeypot_monitor.test.sql` with `supabase test db`; the test fixtures are wrapped in a transaction and rolled back.
2. Set the Worker runtime secrets `HONEYPOT_HASH_SECRET` (random, at least 32 characters) and the existing `SUPABASE_SERVICE_ROLE_KEY`. Keep both server-side. Set `HONEYPOT_ENFORCEMENT_MODE=worker_only` for a `workers.dev`-only deployment; `wrangler.jsonc` uses this mode. Worker-only restrictions are checked against Supabase on requests reaching this Worker and require no Cloudflare zone ID, hostname, or API token. If Supabase cannot verify restriction state, the Worker returns `503`.
3. `worker_only` restrictions do not block requests that bypass this Worker and do not create Cloudflare edge rules. For zone-level enforcement after adding a custom domain, use `HONEYPOT_ENFORCEMENT_MODE=cloudflare_zone`, set `CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_ZONE_HOSTNAME` to the actual zone ID and exact zone apex hostname (not a `workers.dev` hostname), and configure `CLOUDFLARE_API_TOKEN`. The token needs **Zone Read**, **Zone Firewall Services Read**, and **Zone Firewall Services Edit** for that zone. The integration verifies the zone and each rule before marking a restriction active. Keep optional `HONEYPOT_TRUSTED_IPS` (comma-separated exact staff/VPN egress IPs) current; the active administrator request IP is also protected. Do not switch an environment from worker-only to zone mode while worker-only restrictions are active; remove them first or migrate them to verified zone rules.
4. Deploy through the existing Worker release process to activate the configured five-minute Cron Trigger. Temporary restrictions expire automatically; worker-only expiry is applied by the scheduled job, while Cloudflare zone rules are removed and verified before their records expire. Expiry can be delayed by up to one cron interval; a Cloudflare API outage leaves zone-rule removal pending for retry. The same schedule runs the 90-day and 365-day retention cleanup.

Restrictions are never automatic. An administrator must choose a duration, provide a reason, and confirm the action; permanent restrictions require explicitly selecting **Permanent**. Worker-only restrictions block matching IPs only when their requests reach this Worker; they are not Cloudflare-wide bans. Zone-mode actions can create live Cloudflare block rules and should be treated as security changes. Do not deploy or apply the migration as part of local validation.

## Site Security Monitor

The admin-only Site Security Monitor observes application routes and server-function responses in the Cloudflare Worker. It omits ordinary static assets, uses Cloudflare's `cf-connecting-ip` only for short-lived in-memory aggregation, and stores a keyed pseudonymous source hash with normalized routes and weighted detection signals. It does not store raw IP addresses, request bodies, query strings, user agents, cookies, authorization headers, or credentials. Scores are heuristic risk assessments, not proof of malicious activity; the monitor never bans or restricts visitors.

The default five-minute window emits an event only after at least three observed requests and a risk score of four. Signals include high request rate (30 requests), repeated normalized endpoints (8 requests in one minute), sensitive-route frequency (5 requests in one minute), many distinct paths (20 requests and 12 paths in one minute), property enumeration (30 requests and 20 distinct property paths), repeated client errors, malformed API responses, unexpected methods, denied admin access, and explicit server-side form/authentication outcomes. Identical event episodes are suppressed for 60 seconds and aggregated in the database. `SECURITY_MONITOR_WINDOW_SECONDS` (60–900) and `SECURITY_MONITOR_MIN_SCORE` (3–10) are optional Worker variables; defaults are 300 seconds and 4 points.

The Worker uses a bounded isolate-local tracker (up to 2,000 sources and 120 samples per source). Cloudflare may route one source across multiple isolates, so counts are best-effort per isolate, not a globally consistent rate limit. Event rows are restricted to the service role by forced RLS and are purged after 90 days by the existing five-minute Worker Cron Trigger. Direct browser-to-Supabase sign-in, password-reset, and public property-data API requests bypass this Worker and cannot be observed by it; only page requests routed through the Worker and server-mediated signup/protected server-function outcomes are monitored. Property data remains in its existing direct-Supabase architecture, so the monitor does not claim per-query scraping coverage. Monitoring writes are asynchronous and do not control authentication or restriction enforcement.

### Security operations administration

The admin security dashboard provides 1-hour, 24-hour, 7-day, 30-day, and custom analytics based on persisted security events, including time series, category/severity counts, routes, signals, risk bands, and high-risk pseudonymous sources. Time-range analytics and event filters use each episode's latest activity timestamp, so a recurring episode is counted in the period when it was last observed. Event review states (`new`, `reviewed`, `investigating`, `resolved`, `false_positive`) and visitor triage states (`new`, `investigating`, `cleared`) are separate from automated risk assessments and IP enforcement. State changes are administrator-authorized server operations and write append-only audit entries. CSV export applies the current event filters, is server-authorized, caps output at 500 rows, neutralizes spreadsheet formulas, and excludes raw IP addresses.

The IP restriction page reads the existing restriction records and exposes manual verification/removal actions; it does not create automatic bans. Each restriction records its enforcement mode. Worker-only status checks confirm the active database record used by the Worker guard; they do not represent a Cloudflare edge rule. Zone-mode verification checks the Cloudflare rule. A dedicated verification timestamp is populated after an administrator checks enforcement. Existing active restrictions retain their prior status, but have no historical timestamp until an administrator verifies them again.

The health view probes Supabase connectivity and reports the latest persisted security event and server-side configuration presence without returning secret values. Cloudflare Worker health, ingestion failures, recent database errors, and retention-run timestamps remain explicitly **unknown** because the application does not currently persist independent measurements for those signals. Do not treat a recent event as proof of continuous monitoring availability.

The security operations migration is `supabase/migrations/20261102173000_security_operations_workflows.sql`. It adds review states, a restricted append-only audit log, verified restriction timestamps, administrator-only RPCs, range analytics, and 365-day audit retention. The worker-only restriction migration is `supabase/migrations/20261102180100_honeypot_worker_only_restrictions.sql`. The existing Worker Cron invokes the new audit purge function along with security-event retention. Apply migrations only after staging review and run the database tests; do not apply them to production without approval.

For staging, link the CLI to a disposable staging project, inspect pending migrations, apply them, and run the SQL tests against that linked project:

```sh
supabase link --project-ref <STAGING_PROJECT_REF>
supabase migration list --linked
supabase db push --linked
supabase test db --linked
```

Replace the placeholder with the staging project reference and verify the linked project before `db push`; it applies all pending local migrations, not only the site-monitoring migration. Do not apply the migration to production without the usual database review. Configure the existing server-only `SUPABASE_SERVICE_ROLE_KEY` and `HONEYPOT_HASH_SECRET`; no additional secret is introduced for worker-only enforcement. Configure Cloudflare zone credentials only when using `cloudflare_zone` mode. Set the optional threshold variables only when a non-default window or score is intended. Build and deploy the Worker only after the staging migration and tests succeed; the new monitor does not alter Cloudflare rules.

## Routes

- `/` — public home page and published-property catalogue.
- `/properties/:id` — published property details.
- `/privacy`, `/cookies`, `/terms`, `/data-request` — legal and data-rights information.
- `/auth`, `/reset-password`, and `/admin/*` — authentication and staff tools; these are not public indexable pages.
- `/admin/honeypot` — administrator-only honeypot overview and event monitor.
- `/admin/honeypot/:visitorId` — administrator-only visitor investigation, notes, and verified restriction controls.
- `/admin/security` — administrator-only site-wide request security signals and investigation filters.
- `/sitemap.xml` and `/robots.txt` — crawler discovery.

Property listings and site settings are loaded from Supabase. Keep public contact details and business claims in the site settings accurate, and review legal information with the responsible business owner before publication.
