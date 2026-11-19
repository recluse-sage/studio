# Phase 1 exit evidence bundle

Branch: impl/admin-registry-phase1. Date: 2026-11-19. No deploy in this task.

Commits in this chunk:

- 9037911 fix(admin-phase1): review fixes from chunk 2 verification
- 73fff96 test(admin-phase1): access negatives for registry route
- this commit docs(admin-phase1): phase 1 exit evidence bundle

Full suite: 18 files, 148 tests, all passing. Typecheck clean.

## Section 7 checklist

1. Both themes: RegistryShell toggle persists to localStorage key
   mantine-color-scheme-value, matching Mantine ColorSchemeScript default.
   Theme state starts dark (matching defaultColorScheme) and applies the
   stored value in an effect, so server and client render the same label.
   Live browser screenshots were not runnable on this machine (see limit
   note below). Deterministic paths for a human capture: /admin/registry
   in light and dark, toggle, reload, confirm the choice survives.
2. Empty states: docs/admin-registry-phase1-captures.json holds the
   seed view model. Apex shows No report yet with pending slot and grey
   unknown dot. Catalog shows Not entered yet. Forage shows Unconnected
   with reason. Missing home links render a dash with sr-only text.
   Zero-properties input renders the config error card, not an empty page.
3. Token-missing partial: on 401 or 403 the shell keeps all five rows
   rendering and suppresses only the apex numbers. The notice reads
   Apex numbers are unavailable, with the other rows still showing saved
   details, plus a Try again exit back to the registry. Captures file
   deniedPartial section shows row ids intact and apex headlines empty.
4. Console logs: npm run test:server shows zero failures and zero
   unhandled rejections across all 18 files. No browser console capture
   tooling exists in this repo (no Playwright, vitest is node only), so
   no browser log file is committed. Human pass: open /admin/registry,
   /admin/registry?story=seed, and /admin/registry?story=offline in both
   themes and confirm zero console errors.
5. Valid-zero: tests/server/registry-adapter.test.ts proves value 0 with
   lifetime window plus servedAt plus fetchedAt, health up, and no
   No report yet string. Captures file validZero section repeats the view.
6. Offline keep-last-known: the same test file proves one good payload
   then failed fetch keeps numbers, flips reporter source to down with
   stale freshness, and shows Reporter down, showing last known with both
   timestamps. Recovery refetch restores connected. Captures file
   offlineDown section repeats the view. Human pass:
   /admin/registry?story=offline, reload once, confirm last-known kept.
7. Access negatives: tests/server/admin-registry-access.test.ts, 7 tests,
   all passing. Handler GET /api/admin/registry re-verifies the Access
   JWT first via verifyAccessJwt, returns private no-store counts only,
   and leaks no private bytes or path details on denial.

## Mantine guard

Repo-wide guard on new views returns empty (grep exit 1, no matches):

grep -R "@mantine" app/routes/admin-registry.tsx
  src/features/admin/components/RegistryShell.tsx
  src/features/admin/components/RegistryRow.tsx
  src/features/admin/components/RegistryHeadlines.tsx
  src/features/admin/registry/

MantineProvider in app/root.tsx stays untouched so the old admin keeps
working. Mantine removal or isolation is a follow-up, not this task.

## App row

Shopify app seed note now reads Planned. Not built yet. Born reporting
when the app exists. The row renders dots with empty headlines and the
note below, before any evidence review.

## No-deploy record

No wrangler deploy ran. No pushes to main. Access team setup stays a
deploy blocker per the plan. Dirty public/robots.txt and deleted
public/sitemap.xml were pre-existing and left untouched. Untracked
docs/control-plane-plan.md was never opened for edits.

## Human notes (macOS-12 and no-workerd limit)

What this machine blocked: live headless browser captures and any workerd
run. vitest.config.ts is node only with no Cloudflare plugin, and this
repo has no browser capture tooling, so evidence 1 through 4 are
view-model captures plus deterministic story paths, not screenshots. The
live /api/admin/registry fetch also needs a Worker runtime with Access
vars, which this machine cannot serve. Suggested human pass on a machine
with wrangler and a browser: start wrangler dev, sign in via Access,
visit /admin/registry, /admin/registry?story=seed, and
/admin/registry?story=offline in both themes, screenshot each, and paste
the console log showing zero errors into this file.

## Browser pass 2026-11-19 (spike harness, local only)

Ran: npx vite --config vite.spike.config.ts --port 5174 --host 127.0.0.1
(vite 7.3.7, plain vite, no Cloudflare plugin, no workerd, no deploy).
Browser: headless system Chrome 150.0.7871.187 via puppeteer-core,
viewport 1280x900. URLs: /admin/registry, /admin/registry?story=seed,
/admin/registry?story=offline.

Procedure per URL: clear localStorage, load (expect dark default),
screenshot dark, click .registry-theme-toggle, screenshot light, reload,
confirm localStorage mantine-color-scheme-value still light and
data-mantine-color-scheme matches, screenshot light-reloaded. Registry
story adds toggle-back to dark plus reload. Full DOM state plus console
logs saved in docs/browser-pass-2026-11-19/console-summary.json.

What passed:

- registry dark plus light plus light-reloaded plus dark-reloaded:
  docs/browser-pass-2026-11-19/registry-dark.png,
  registry-light.png, registry-light-reloaded.png,
  registry-dark-reloaded.png. 5 rows render styled in both themes.
  Toggle flips data-mantine-color-scheme and localStorage between dark
  and light. Reload keeps the chosen value. No unstyled flash.
- seed dark plus light plus light-reloaded: seed-dark.png,
  seed-light.png, seed-light-reloaded.png. Zero console errors, zero
  pageerrors. Apex shows No report yet with pending slot. Persistence
  passes.
- offline dark plus light plus light-reloaded: offline-dark.png,
  offline-light.png, offline-light-reloaded.png. Zero console errors,
  zero pageerrors. Apex shows 16 blog posts and 0 inbound notes with
  stale freshness and both timestamps. Reload keeps numbers.
  Persistence passes.

Console verdict:

- seed: 0 console errors, 0 pageerrors. Pass.
- offline: 0 console errors, 0 pageerrors. Pass.
- registry (default apex story): 6 console errors, 0 pageerrors. Each
  load logs 2x Failed to load resource 404 for /api/admin/registry.
  Cause: spike has no Workers runtime so /api returns 404, and React
  dev StrictMode issues the fetch twice per mount. The client catches
  the failure and keeps all 5 rows with No report yet. No crash, no
  unstyled flash. This is the expected spike gap, not an app bug. No
  code change made because silencing the browser network log would hide
  the real fetch.

What remains worker-only:

- Real Access app login and session flow.
- Runtime 401 plus 403 partial denial with Try again (unit-covered in
  tests/server/admin-registry-access.test.ts, not browser-proven here).
- Real network poll with live reporter payload and fresh servedAt plus
  lastSuccessfulFetchAt.
- Offline down notice after second fetch (Reporter down, showing last
  known) needs the 15 minute poll. Unit-covered, not browser-waited in
  this pass. Offline captures here show the first-fetch fixture state.
