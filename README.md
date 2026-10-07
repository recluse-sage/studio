# Oasis.dev central app

Public landing plus private admin plus API on Cloudflare Workers with React Router Framework Mode and Workers Static Assets. No Tailwind. Mantine 8 for admin and shared primitives.

Root invariant: all Oasis.dev source, config, docs, tests, assets, templates, and scripts live under `oasis.dev/`. Do not add Oasis.dev files to sibling folders. Designer owns `src/features/**`, `src/styles/**`, `src/components/**`. Backend owns `src/server/**`, `src/shared/domain-types.ts`, `migrations/**`, `tests/server/**`. This lane touches only app routes, entry, and docs.

## Routes

- `/` public, prerendered HTML, crawlable. Uses `LandingPage` from `src/features/landing/LandingPage.tsx`. Loader returns null availability and empty lists. Client hydrates via `fetchPublicAvailability`. Null means show no status strip or badge. No fake portfolio. Clearly labeled sample concepts are allowed, but never presented as real client proof. Passes public `VITE_TURNSTILE_SITE_KEY` only, never the secret. Self canonical comes from the derived `VITE_PUBLIC_SITE_URL` (single source: `PUBLIC_SITE_URL` Build variable) only when set, otherwise omitted.
- `/work` honest placeholder only. Work grid lists only approved real proof plus clearly labeled sample concepts. Each sample is labeled as a sample concept and never uses a real client name. Out of sitemap with `noindex` until at least one real approved proof exists. Sample concepts alone do not lift the noindex. Short copy with a link back to intake.
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

`PUBLIC_SITE_URL` is a public Build variable (Cloudflare Workers Builds dashboard for deploys, shell env for local builds), not a secret and not a runtime var. It is intentionally absent from `wrangler.jsonc` `vars` and `.dev.vars`. `VITE_PUBLIC_SITE_URL` is derived from it in `vite.config.ts`; do not set `VITE_` manually. Other vars in `wrangler.jsonc` (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `OWNER_EMAIL`, `FROM_EMAIL`) are blank until set. Public Vite vars in `.env.example` (`VITE_TURNSTILE_SITE_KEY`) are blank until set. Secrets are never in repo:

- `TURNSTILE_SECRET_KEY` via `wrangler secret put`
- `RESEND_API_KEY` via `wrangler secret put`

Local blanks live in `.dev.vars.example` with no real values.

SEO: `PUBLIC_SITE_URL` stays empty until the owner sets the canonical URL in Workers Builds. Sitemap and canonical output stay disabled while it is empty: `npm run build` runs `scripts/generate-sitemap.mjs` before prerendering, withholding `public/sitemap.xml` and the robots `Sitemap:` line, and `vite.config.ts` derives an empty `VITE_PUBLIC_SITE_URL` so `/` omits its self canonical. The selected host is `https://oasis-dev.oasishub.workers.dev` (Worker `oasis-dev` on the no-purchase account hostname `oasishub`). The build produces a matching canonical and sitemap from that one value. A custom domain is optional for later and never required for the initial deploy. To change the URL, update it in Workers Builds, then rebuild/redeploy. `/` stays prerendered and asset-first (see `run_worker_first` in `wrangler.jsonc`). `/work` stays out of the sitemap with `noindex`. Never list admin or api in the sitemap. Never hardcode a domain you do not own.

## Form status

Intake stores every submission in D1 first, so the Admin inbox works with no custom domain. Email stays optional until a domain is ready: without Resend and address vars the submit still stores safely and shows a stored message. Turnstile site key and secret stay required before unpausing intake; without a site key the form shows a paused message. The Resend no-domain test sender only reaches its own account email, so it is optional and not general production email.

## Backups

D1 Time Travel is always on: 7 day point in time recovery on Free, 30 day on Paid, for recent history only. Longer history comes from R2 exports run by an isolated backup Worker in `backup-worker/` (own project `oasis-dev-backup`, own config, no shared bindings or routes with the app Worker). It runs daily on cron, posts a D1 export to a private R2 bucket, polls the job to completion, and verifies the objects landed. No public routes (`workers_dev` off, fetch returns 404), fail closed without its `CLOUDFLARE_API_TOKEN` secret, observability on. The private bucket keeps 90 days of exports via a 90 day expire lifecycle rule. Monthly restore drill: import the latest export into a throwaway D1 database, verify row counts, delete the throwaway, log the date in admin notes. Full runbook: `backup-worker/README.md`.

## CI

Checks-only workflow in `.github/workflows/ci.yml`, runs on push and pull request with Node 22: `npm ci`, typecheck, backup worker verify, server tests, build, sitemap, and a tokenless `wrangler deploy --dry-run`. It never deploys and sets no Cloudflare token.

## Do not deploy yet

No deploy before Access and D1 setup are complete. No custom domain purchase is required: the initial host is the account `workers.dev` hostname.

- Replace D1 `database_id` and `RATE_LIMITER` `namespace_id` placeholders.
- Set `PUBLIC_SITE_URL` as a public Build variable in Workers Builds to `https://oasis-dev.oasishub.workers.dev` (Worker `oasis-dev` on account hostname `oasishub`), then rebuild/redeploy. Keep repo defaults blank until Cloudflare is configured. A custom domain stays optional for later and never blocks the initial deploy.
- Confirm Access apps for `/admin`, `/admin/*`, and `/api/admin/*`.
- Provision Turnstile before unpausing intake. Resend and owner email vars stay optional until a domain is ready because the D1 inbox is the fallback.

Account note: client sites initially use distinct Worker names under the same `oasishub` hostname. Each client gets a separate Worker and D1. Their data stays separate but account quotas are shared. Moving a client to its own Cloudflare account changes its URL. `oasis.pages.dev` and Pages stay out of the production path.

Pricing note: Cloudflare, Resend, and related services have free tiers and paid limits that can change. Check current provider pricing before launch. This repo makes no no-cost claim.
