# Oasis.dev Project Scratchpad

Living requirements brief for the Oasis.dev business studio. Updated 2026-10-06.
Separate product: docs/oasis-product (Lodestar, an Upwork tool) is unrelated and untouched.
Old prototype: Personal/oasis-hub was an early scaffold and is NOT the architecture.

## 1. What Oasis.dev is

A solo studio that builds small websites, tools, and automations for local businesses,
one business at a time. Two goals: revenue, and public proof of every build.

## 2. Three separate surfaces (never mixed visually)

1. Public Oasis.dev landing page. Brand home, portfolio grid or carousel of finished
   builds, short intake quiz, contact path. This is the only public marketing face.
2. Private owner admin (MantiDash visual base only). Outreach pipeline, tool registry
   with availability toggles, intake inbox, usage totals, proof notes. Owner only.
3. Client builds. One deliverable per business, each with a unique look.

## 3. Approved visual references

- Oasis landing: https://shopiframe.com (dark, green accent, long product story).
  No parallax effect. Supabase is rejected as boring and too architectural.
- Technical credibility reference: https://betterstack.com (amazing, borrow proof led structure).
- Client site reference: https://relayfi.com (amazing, SMB tone and storytelling).
  Animations must stay restrained. No crazy motion.
- Backup references: https://mercury.com (client split hero pattern),
  https://wise.com/us/business (calculator before signup pattern),
  https://resend.com (restraint as distinction).

## 4. Motion rule

Use the find-animation-opportunities skill when crafting for a business. Motion only
where it gives feedback, shows state, or prevents a jarring change. Budgets:
press 100 to 160ms, popovers 125 to 200ms, modals 200 to 500ms, transform and opacity
only, honor reduced motion. Rejected by default: parallax, decorative loops,
mouse tracking on functional UI, animation on keyboard driven high frequency actions.

## 5. Five industry starters plus one tool starter

Industry starters (approved): Home Trades, Food and Hospitality, Health and Beauty
Appointments, Professional Services, Neighborhood Retail.
Each industry presets copy blocks, schema, and a theme seed.
Underneath, one functional core per build: lead capture, bookable service, catalog
plus quote builder, local hub plus proof, interactive tool.
Sixth archetype: Tool and Automation. A functional tool that does something for the
business or automates a recurring task (quote engine, booking helper, FAQ answerer,
calculator, tracker). Clients will ask for this directly.
Rule: one primary module plus at most two supporting modules per client.
Share engineering, diverge composition, palette, type, and imagery.

## 6. Central platform versus client delivery

- Central: one private repo plus one Worker project for Oasis.dev (landing, admin, API).
  The Worker is currently named `oasis-dev` and will use
  `https://oasis-dev.oasishub.workers.dev`. The `oasishub` workers.dev hostname
  is the no-purchase host, so no custom domain purchase is required for the
  initial deploy. A custom domain stays optional for later.
- Per client: one repo plus one Worker project forked from the client template,
  own database, own secrets. Client sites initially use distinct Worker names
  under the same `oasishub` account hostname. Never co-mingle client data.
- Clients 1 to 3 live under the Oasis Cloudflare account as separate projects.
  High traffic clients move to their own account at handoff. Moving a client
  to its own Cloudflare account changes its URL.
- Each client gets a separate Worker and D1. Their data stays separate but
  account quotas are shared.
- Central `PUBLIC_SITE_URL` is a public Build variable, not a secret.
  `VITE_PUBLIC_SITE_URL` is derived from it at build time for prerendered
  canonical tags, and the sitemap is generated from the same value on each
  build. Change the URL in Cloudflare Workers Builds, then rebuild/redeploy.
  Example: `https://oasis-dev.oasishub.workers.dev`. Repo defaults stay blank
  until Cloudflare is configured. `/` stays prerendered and asset-first.
- If a client cannot move DNS to Cloudflare nameservers, it still stays on the
  account workers.dev hostname. Custom domains stay optional and never block
  the initial deploy. `oasis.pages.dev` and Pages stay out of the production
  path. The old static prototype under `Personal/oasis.dev/legacy-prototype/`
  stays archival only.

## 7. Stack (central app)

Vite plus React Router plus Mantine on Workers Static Assets. No Tailwind.
Mantine is for the admin and shared primitives. Client site framework is still open:
Astro hybrid is recommended for content first client sites, React alternative to be
specced on request. MantiDash is a visual reference only: it has no license file,
so never copy its source commercially without owner permission, and it ships no
backend or real auth. Login screens and placeholder pages from it are not reused.

## 8. Auth, data, email, spam, analytics

- Admin: Cloudflare Access (free to 50 users, owner email only) over /admin and
  /api/admin, plus Worker side token validation on every admin API call.
- Data: D1 (serverless SQLite) for outreach, tools, intakes, usage counters.
- Email: Resend. Resend is a transactional email sending API. When a form is
  submitted, the backend stores the row in D1, then calls Resend to email the owner.
  It is not a mailbox, CRM, or newsletter builder. Free tier: 3,000 per month,
  max 100 per day, domain verification required. With no custom domain, the D1
  Admin inbox is the reliable fallback and submissions can be stored without
  email. Turnstile remains required before unpausing intake. The Resend test
  sender only works to its own account email and is optional, not general
  production email. Alternative later: native
  Cloudflare Email Service (needs Workers Paid).
- Spam: Turnstile plus honeypot plus 3 to 5 fields plus per IP rate limiting.
- Usage: server side aggregate counters per tool per day (views, offline views,
  contact clicks). No IPs, no cookies, no fingerprinting. Web Analytics in parallel.

## 9. Backup system

GitHub holds all code history. D1 has hourly backups (24h) plus 30 day time travel.
Scheduled job exports D1 to R2 weekly or daily with 30 to 90 day retention.
Monthly restore test into a throwaway database, date logged in admin notes.
Secrets live in Worker secrets plus one encrypted offline copy in a password manager.
Never commit .dev.vars or secret files.

## 10. SEO, robots, backlinks

Public pages are prerendered HTML, never a pure client side shell. Admin is client
rendered and never indexed. robots.txt allows public pages and points to one
sitemap.xml of canonical URLs. Robots is not security: admin and private APIs rely
on login, Access, 401/403 responses, no public links, no sitemap entries, backup
noindex header. One page per build only with distinct substance and client consent;
anonymize without consent and keep a permission log. Backlinks by permission only:
small built by Oasis credit on client pages, case study cross links, real profiles
and directories. Never buy links or blast footers. No ranking promises.

## 11. Intake quiz (heuristic, minimal)

Under 60 seconds, phone keyboard friendly. Section 1, the job: what repeating task
hurts most, how often. Section 2, the business: name, TikTok handle or contact,
best reply channel. Section 3: one tap send, plain success line. Admin can fill it
on a business behalf; answers land in the inbox tagged by source. Offline Contact
Admin popup is shorter: name, contact, one line, send.

## 12. Standing rules (locked)

Mobile first: base single column at 360px, breakpoints upward, tap targets about
44px, test 360/768/1280 plus keyboard only plus both color schemes. Light and dark
mode everywhere, one theme at a time. No em dashes in any content, ever. All public
copy passes the copywriting clarity pass (clarity, not legal clearance). No useless
content: public pages show status, title, one line, and the action. Working
parameters stay in admin. Per product colors are chosen at build time, never one
locked central accent. Inspiration sites are references only, never pixel copies.

## 13. First launch proof state

- No completed business examples are available to show at launch.
- Do not invent projects, screenshots, testimonials, client names, usage numbers,
  or case studies.
- Do not show empty or fake portfolio cards. Add the homepage work grid only when
  there is real work and permission to feature it. Until then, focus the page on
  the service and the intake call to action.

## 14. Single project root

- All Oasis.dev source, configuration, documentation, tests, assets, templates,
  and scripts must live under `Personal/oasis.dev/`.
- Do not add Oasis.dev project files to sibling folders or to the Lodestar docs.
- The old static prototype is preserved under
  `Personal/oasis.dev/legacy-prototype/`. It is archival only, not the production
  app, and must not be treated as the final architecture.
