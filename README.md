# Oasis.dev central app

Public landing plus private admin plus API on Cloudflare Workers with React Router Framework Mode and Workers Static Assets. No Tailwind. Mantine 8 for admin and shared primitives.

Root invariant: all Oasis.dev source, config, docs, tests, assets, templates, and scripts live under `oasis.dev/`. Do not add Oasis.dev files to sibling folders. Designer owns `src/features/**`, `src/styles/**`, `src/components/**`. Backend owns `src/server/**`, `src/shared/domain-types.ts`, `migrations/**`, `tests/server/**`. This lane touches only app routes, entry, and docs.

## Routes

- `/` public, prerendered HTML, crawlable. Uses `LandingPage` from `src/features/landing/LandingPage.tsx`. Loader returns null availability and empty lists. Client hydrates via `fetchPublicAvailability`. Null means show no status strip or badge. No fake portfolio. Passes public `VITE_TURNSTILE_SITE_KEY` only, never the secret. Self canonical from `VITE_PUBLIC_SITE_URL` only when set, otherwise omitted.
- `/work` honest placeholder only. No grid, no examples, no proof. Out of sitemap with `noindex` until permissioned content exists. Short copy with a link back to intake.
- `/admin/*` private owner only. Uses `AdminDashboard` from `src/features/admin/AdminDashboard.tsx`. All fetches run client side via `src/features/admin/api.ts`, never in SSR loaders. Never prerendered, never in sitemap, always `noindex`. Shows denied for 401 or 403, null availability when not configured, and no owner email on the client.
- `/api/*` served by the Worker via `handleApiRequest(request, env)` from `src/server/worker.ts`. Unknown `/api/*` returns JSON 404, never an asset fallback.

If the designer moves those files, update `app/routes/home.tsx`, `app/routes/work.tsx`, and `app/routes/admin.tsx`. Import paths are marked in comments.

## Local dev

1. `npm install`
2. Copy vars: `cp .dev.vars.example .dev.vars` and fill blanks locally. Never commit `.dev.vars`. For Vite public vars, copy `.env.example` to `.env` as needed.
3. `npm run dev` for Vite dev, or `npm run cf:dev` for Wrangler dev.
4. `npm run typecheck` before pushing. `npm run build` for the production client and server build.
5. `npm run test:server` for backend unit tests in Node without workerd.

`wrangler.jsonc` notes are owned by the parent lane. Do not change the Vite or Cloudflare build directory in this lane.

## Access caveat

Cloudflare Access must cover both `/admin` and `/admin/*`, plus the private API routes under `/api/admin/*`.

- The Worker also verifies Access before serving the `/admin` shell: it reads `Cf-Access-Jwt-Assertion`, checks issuer `ACCESS_TEAM_DOMAIN` and audience `ACCESS_AUD` against JWKS at `/cdn-cgi/access/certs` via `jose`. Missing or invalid returns a bland 403.
- Backend validates Access itself on every `/api/admin/*` call. Client state, robots, and obscurity are never auth.
- Admin HTML responses carry `X-Robots-Tag: noindex, nofollow`. Robots `Disallow` for `/admin` and `/api` is hygiene only.

## Vars and secrets to provision later

Vars in `wrangler.jsonc` (`PUBLIC_SITE_URL`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `OWNER_EMAIL`, `FROM_EMAIL`) are blank until set. Public Vite vars in `.env.example` (`VITE_PUBLIC_SITE_URL`, `VITE_TURNSTILE_SITE_KEY`) are blank until set. Secrets are never in repo:

- `TURNSTILE_SECRET_KEY` via `wrangler secret put`
- `RESEND_API_KEY` via `wrangler secret put`

Local blanks live in `.dev.vars.example` with no real values.

SEO: `PUBLIC_SITE_URL` and `VITE_PUBLIC_SITE_URL` stay empty until the owner sets the real canonical domain. Sitemap and canonical output stay disabled until then. Run `PUBLIC_SITE_URL="https://your-real-domain" npm run sitemap` only after the domain is confirmed. `/work` stays out of the sitemap with `noindex`. Never list admin or api in the sitemap. Never hardcode a domain you do not own.

## Form status

Do not claim the intake form sends successfully until Turnstile site key and secret, Resend key, owner and from email, D1, and Access are all configured. Without a site key the form shows a paused message. Without server secrets and D1 the submit fails safely with an error message.

## Do not deploy yet

No deploy before Domain, Access, and D1 setup are complete:

- Replace D1 `database_id` and `RATE_LIMITER` `namespace_id` placeholders.
- Set `PUBLIC_SITE_URL` to the real canonical URL.
- Confirm Access apps for `/admin`, `/admin/*`, and `/api/admin/*`.
- Provision Turnstile, Resend, and owner email vars.

Pricing note: Cloudflare, Resend, and related services have free tiers and paid limits that can change. Check current provider pricing before launch. This repo makes no no-cost claim.
