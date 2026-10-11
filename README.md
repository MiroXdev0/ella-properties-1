# Елла Недвижими Имоти

Production website for the real-estate agency, built with React, TypeScript, TanStack Start, Vite, Cloudflare Workers, and Supabase. The public site is deployed at <https://ellaimoti.pages.dev/>.

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

## Independent Cloudflare deployment

The build uses the project's checked-in Vite, TanStack Start, and Cloudflare Vite plugin configuration in [`vite.config.ts`](./vite.config.ts) and [`wrangler.jsonc`](./wrangler.jsonc). Provide `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the build environment (for example, in the local `.env` file or CI variables), because Vite embeds them in the client assets. Separately set these runtime bindings in Cloudflare Worker settings:

- Runtime variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
- Runtime secret: `SUPABASE_SERVICE_ROLE_KEY`

Never place the service-role key in a client-exposed variable or commit it. After installing the project dependencies and configuring build-time variables:

```sh
node ./node_modules/wrangler/bin/wrangler.js login
bun run deploy
```

The deploy script builds the app and deploys it using `wrangler.jsonc`, preserving runtime variables already configured in the Cloudflare dashboard. Add required runtime variables/secrets in Cloudflare before serving production traffic. The repository does not change any live deployment.

Supabase remains an external backend dependency for authentication, property/site data, storage, and privileged server operations. Apply database migrations from `supabase/migrations/` through your Supabase deployment process; this project does not modify production data during build or deployment.

## Routes

- `/` — public home page and published-property catalogue.
- `/properties/:id` — published property details.
- `/privacy`, `/cookies`, `/terms`, `/data-request` — legal and data-rights information.
- `/auth`, `/reset-password`, and `/admin/*` — authentication and staff tools; these are not public indexable pages.
- `/sitemap.xml` and `/robots.txt` — crawler discovery.

Property listings and site settings are loaded from Supabase. Keep public contact details and business claims in the site settings accurate, and review legal information with the responsible business owner before publication.
