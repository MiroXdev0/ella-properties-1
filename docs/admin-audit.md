# Admin panel audit and settings work

## Scope and evidence

This audit covers the admin routes, CMS routes, Supabase access policies and migrations, public page rendering, and the Cloudflare deployment configuration. Production pages were inspected using an authenticated admin session. No production content was created, edited, published, unpublished, or deleted to avoid changing live business data without approval.

## Feature inventory

| Feature | Status | Evidence and remaining verification |
| --- | --- | --- |
| Admin dashboard and metrics | Implemented and verified (read-only) | `/admin` rendered for an authenticated administrator and displayed live counts: 4 properties, all published, 0 drafts, and 0 new inquiries. Metrics were not mutated to test recalculation. |
| Property list, filters, gallery, create/edit, publish state, delete | Implemented but unverified | The admin route and data operations are present. No create/edit/delete or publish toggle was performed against production. Admin media previews now use signed URLs for the private bucket. |
| Inquiry list and status management | Implemented but unverified | The admin route rendered. No inquiry was changed in production. Database policies restrict inquiry writes to authorized roles; public submission is handled by the existing server-side RPC path. |
| User and role management | Implemented but unverified | `/admin/users` rendered. Authorization must continue to be enforced by database policies, not just route guards; no user or role was changed. |
| Team management | Implemented but unverified | `/admin/team` rendered. Active public profiles and administrator editing are supported. No production profile was modified. |
| CMS page list and editor | Partially implemented | `/admin/pages` rendered, but the production page list was empty. Page routes and draft/published handling exist; create/edit/publish/unpublish persistence and sitemap refresh were not tested against production. |
| Public CMS pages and sitemap integration | Implemented but unverified | A published page route and dynamic sitemap integration exist. Production sitemap returned valid XML with 8 unique URLs during the earlier read-only check; the production CMS list was empty, so a CMS-created page could not be verified end to end. |
| Website-wide settings | Implemented; save persistence unverified | The singleton `site_settings` record already supports Bulgarian homepage content, brand, contacts/social links, navigation, footer, SEO, and feature settings. English content overrides, bilingual working hours, a configurable services image, and an editable social-sharing image are now included. New settings columns are applied in production. No setting was saved as a live mutation, so persistence-after-refresh remains unverified. |
| Featured properties | Implemented but unverified | Uses the existing `properties.is_featured` field rather than a second settings source. No production selection was changed. |
| Yard area for houses and apartments | Implemented and verified (schema/UI) | `properties.yard_area` is nullable numeric data. The admin create form shows it for houses and apartments, hides it for other types, and rejects negative values. Public cards/details omit it when null. The deployed listings currently contain no yard values, so no live display or save was tested. |
| Media privacy and previews | Implemented and verified (policy-level) | Production initially allowed anonymous reads of every `property_images` row and every object in `property-images`. The applied migration now scopes anonymous reads to media referenced by published properties, active team members, or public site settings; authenticated administrators/editors can read draft media for previews. Remote `pg_policies` output confirmed the old broad policies were removed and the scoped policies are installed. The deployed admin settings page loaded its private-media preview controls. |
| Authorization and RLS | Implemented and verified (read-only/policy-level) | Production policy inspection confirmed settings writes remain admin-gated. The `has_role` helper now returns true only when checking the caller's own user ID; a remote SQL check returned `self_role=true`, `other_role=false`. Admin-only route guards remain supplementary to RLS. |

## Production checks performed

- Authenticated read-only visits were made to `/admin`, `/admin/properties`, `/admin/inquiries`, `/admin/pages`, `/admin/team`, `/admin/users`, and `/admin/settings`.
- The CMS page list was empty.
- The settings, scoped-media, and role-check migrations (`20261012164928`, `20261012165950`, and `20261012170920`) were applied to production through the linked SQL interface and recorded in migration history. The CLI's normal `db push` dry-run identified the first two pending migrations; its normal database connection could not authenticate for a direct push. The later migration-history query confirmed all three versions are recorded.
- Production `pg_policies` output confirmed the old broad public image policies are gone and the scoped anonymous/authenticated policies are installed.
- The homepage, sitemap, robots file, supplied artwork, property detail route, city route, and admin settings route returned HTTP 200 after the current Cloudflare Worker deployment. Sitemap XML returned 8 unique URLs, all on the configured production Workers domain; `robots.txt` references that sitemap.
- The production homepage's title, canonical, Open Graph URL, Credit Navigator caption/link/image, and image alt text were checked in-browser. The artwork loaded and opens `https://www.creditnavigator.bg/` in a new tab with `noopener noreferrer`.
- On a 390px mobile viewport, the homepage and admin dashboard had no horizontal page overflow. The admin settings editor and property form rendered in an authenticated local production preview; the yard field appeared for house/apartment types and disappeared for a parcel. No production record was saved.
- The Worker deployment completed successfully as version `21450571-52d9-48ab-bbbe-3c8bb860f641` at `https://ella-properties-1.miroxdev2026.workers.dev`.
- The canonical production URL is `https://ella-properties-1.miroxdev2026.workers.dev/`. The deployed sitemap, robots file, and SEO canonicals use this Workers domain.
- A nonexistent CMS page returned 404 in the earlier route check.
- A transient hydration warning appeared during one initial `/auth` load and was not reproducible on reload; it remains an observation, not a confirmed defect.
- No production writes or destructive actions were performed.

## Changes in this phase

- Added additive columns to the existing singleton settings row for English content, working hours, the services artwork, and the social-sharing image.
- Added device-file-picker controls with type and size validation, previews, and clear actions; no image URL entry field was added.
- Added authenticated signed previews for private-bucket assets in admin settings, property galleries, and team profiles.
- Added a policy migration to scope anonymous property-image reads to published listings and referenced public media.
- Made configured homepage SEO metadata effective alongside dynamically derived city coverage, without changing the underlying property-location filters.
- Added the supplied Credit Navigator artwork beneath the services cards.
- Added an editable caption above that artwork, linked the artwork to Credit Navigator, and preserved file-picker-only image editing.
- Added nullable yard-area editing/display for houses and apartments, with null values omitted from public property cards and detail pages.
- Refined the admin shell, dashboard, property list, and settings cards. A mobile viewport check found and fixed horizontal overflow in the dashboard quick-access buttons.

## Not verified / follow-up

- Settings writes and persistence after refresh have not been tested against a deployed migration.
- Property, inquiry, user, team, and CMS mutations have not been run against production. Yard area was not saved on an existing or new production property.
- Settings save-and-refresh behavior still needs a controlled test record or staging environment; no production setting was changed for this audit.
- Property, inquiry, user, team, and CMS mutations still need non-production verification, including create/edit/publish/unpublish persistence and sitemap inclusion.
- Supabase security advisors reported leaked-password protection disabled in Auth and flagged the executable `SECURITY DEFINER` role helper. The helper's arbitrary-user lookup has been restricted and verified, but the advisor can still report the function as executable; leaked-password protection is a project-level Auth setting and was not changed here.
- The production build, TypeScript check, focused ESLint and Prettier checks, and `git diff --check` passed. The full-repository lint command did not complete within the available run; no test/spec files were found in the repository.
