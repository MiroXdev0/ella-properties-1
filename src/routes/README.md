# Routes

TanStack Start uses file-based routing. Public page and endpoint routes in this project are:

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `properties.$id.tsx` | `/properties/:id` |
| `privacy.tsx` | `/privacy` |
| `cookies.tsx` | `/cookies` |
| `terms.tsx` | `/terms` |
| `data-request.tsx` | `/data-request` |
| `auth.tsx` | `/auth` |
| `reset-password.tsx` | `/reset-password` |
| `sitemap[.]xml.ts` | `/sitemap.xml` |
| `api/public/media.$.ts` | `/api/public/media/*` |

Staff pages are nested under `_authenticated/` and resolve beneath `/admin`. The route tree is generated; do not edit `src/routeTree.gen.ts` by hand.
