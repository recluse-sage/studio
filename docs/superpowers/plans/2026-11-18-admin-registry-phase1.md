# Phase 1 plan: thin registry view on the new stack

## Header

### Goal

Ship the thin registry view from spec section 2.1 on the D1 stack only, using the existing seed shape as identity, with correct per-field empty states, lifetime labels, and Access gating reuse. Five rows in fixed order, two headline numbers per row where D2 allows numbers, dots where D2 says dots. No Forage dense view, no Apex pipeline, no catalog cards, no manual store, no Cloudflare traffic work in this phase.

Fixed row order: apex, Forage, upwork-catalog, designtaste skill, shopify-app planned.

### Architecture

Parallel route approach, not in-place replacement.

New private route `admin/registry` renders the new stack. Existing Mantine admin at `admin/*` stays untouched in Phase 1. Existing spike harness `spike-properties` stays untouched until Phase 1 exit, then delete is scheduled.

Why parallel:

- Zero regression to the working owner admin during the rewrite.
- Satisfies spec section 4 coexistence rule with no Mantine in new views, without deleting working code mid-phase.
- Allows side by side verification: old panel vs new registry, same seed and same fixture.
- Rollback is route removal, not a revert of the main admin.
- Removal or isolation of Mantine happens after Phase 1 exit evidence, as a separate commit, not inside view tasks.

Data flow in Phase 1:

- Static identity from `seed.json` shape, normalized by pure functions that never throw.
- Apex pulse only, from the existing reporter adapter (`parseApexReport`, `applyApexReport`, `markReportDown`) plus fixture for tests and local proof.
- All other sources render explicit unconnected or not-entered states. No fetch is added for Cloudflare, metrics endpoint, or manual store in Phase 1.
- Browser talks only to the dashboard server path. Server re-verifies the Access JWT first on every private handler via the existing `requireAdmin` pattern.

### Tech Stack

D1 stack only for all new view code:

- React plus TypeScript, same language as existing admin code.
- Base UI primitives for accessible structure, styled with project CSS vars.
- Tailwind for layout utility in new files only. No global reset change. No Mantine import in new views.
- No TanStack Table in Phase 1. Registry is a list, not a table. TanStack arrives in Phase 3.
- No Recharts in Phase 1. No chart in registry. Recharts arrives in Phase 2.
- No UI SDK. Excluded per spec D1.

Pinned install set for this repo, no caret, exact versions recorded in `package.json` and `package-lock.json`:

- `tailwindcss@3.4.14`
- `postcss@8.4.49`
- `autoprefixer@10.4.20`
- `@base-ui-components/react@1.0.0-rc.0`
- `clsx@2.1.1`
- `tailwind-merge@2.5.4`
- `class-variance-authority@0.7.1`

Install command:

```bash
npm install -E tailwindcss@3.4.14 postcss@8.4.49 autoprefixer@10.4.20 @base-ui-components/react@1.0.0-rc.0 clsx@2.1.1 tailwind-merge@2.5.4 class-variance-authority@0.7.1
```

Pinned to `@base-ui-components/react@1.0.0-rc.0` because no stable 1.x exists on the registry (verified via `npm view`; latest stable predates 1.x). Matches the exact pin already in `package.json`.

Resolved: `@base-ui-components/react@1.0.0` has no stable 1.x release, so the plan pins `@base-ui-components/react@1.0.0-rc.0` with `-E`. Do not use a caret range.

Tailwind wiring for this repo, which today has no Tailwind:

- Tailwind 3 with PostCSS, not Tailwind 4, to avoid changing the Vite plugin chain while React Router 7 and the Cloudflare plugin own `vite.config.ts`.
- New `tailwind.config.js` with content limited to new code: `./app/routes/admin-registry.tsx`, `./src/features/admin/registry/**/*.{ts,tsx}`, `./src/features/admin/components/Registry*`.
- New `postcss.config.js` with `tailwindcss` plus `autoprefixer`.
- New CSS entry imported only by the new route, using `@tailwind base;` scoped carefully plus `@tailwind components;` plus `@tailwind utilities;`, then mapping to existing `oasis-tokens.css` vars for colors, radii, and fonts. Do not edit `oasis-tokens.css` or `oasis-base.css` values in Phase 1.
- Keep `MantineProvider` in `app/root.tsx` untouched in Phase 1 so the old admin keeps working. New registry components must not import `@mantine/core`.

Verified repo facts used:

- `package.json` has no Tailwind and no Base UI today. React 19.1.0, react-router 7.9.0, vitest 5.0.3.
- `vitest.config.ts` runs only `tests/server/**/*.test.ts` in node env. No jsdom. So React render assertions stay as headless capture checks plus typecheck, while unit logic gets vitest coverage.
- Routing is `app/routes.ts` with `route("admin/*", "routes/admin.tsx")` and temp `route("spike-properties", "routes/spike-properties.tsx")`.
- Styling enters via `app/root.tsx` plus `src/styles/oasis-tokens.css` and `src/styles/oasis-base.css`.
- Seed, normalize, adapter, and fixture already exist under `src/features/admin/registry/`: `seed.json`, `properties.ts`, `reporter.ts`, `apex-report.fixture.json`.
- Spike panel is `src/features/admin/components/PropertiesPanel.tsx` on Mantine. Reference only.
- Private handlers all start with `requireAdmin` in `src/server/handlers/admin.ts`, backed by `verifyAccessJwt` in `src/server/access.ts`.

### Spec

Read from `/Users/selim/Desktop/Personal/apex/docs/superpowers/specs/2026-11-18-admin-dashboard-design.md`: sections 0, 1, 2.1, 3.1, 3.8, 4, 5, 6 Phase 1, 7.

Section 0 locked decisions applied: D1 stack, D2 view order with registry first, D3 drafting stays paused, D4 blog-cron contract untouched.

Section 1 constraints applied: C1 Access plus MFA before deploy, C2 counts only no PII, C3 least privilege tokens server side only, C4 missing shown as missing never zero-filled, C5 no pushes to main, C6 lifetime totals never imply a window.

Section 2.1 registry contract applied verbatim:

- One row per property, fixed order, with name plus kind badge from static seed.
- Status dot per reporter health with 4-dimension detail per 3.8.
- Last report from reporter `servedAt` with 15 min poll, plus `lastSuccessfulFetchAt` plus freshness label.
- Two headline numbers: apex blog posts lifetime plus inbound notes lifetime sum with split tooltip; Forage requests plus tool runs labeled unconnected until gate passes; catalog profile views plus invites manual with explicit date; skill and app carry no numbers.
- Refresh: identity static, reporter poll 15 min plus refetch on mount, candidate Cloudflare daily only after gate, manual on save.
- Empty states pinned: unknown health grey dot plus `No report yet`; failed fetch keeps last-known plus `Reporter down, showing last known` plus `lastSuccessfulFetchAt`; manual empty `Not entered yet`; candidate feeds `Unconnected` with reason; missing home shows dash `-`; zero properties is a config error card, not an empty page.

Section 3.1 record shape applied:

```ts
type RegistryRecord = {
  id: string;
  name: string;
  kind: string;
  lifecycle: "planned" | "live" | "retired";
  status: "healthy" | "planned" | "unknown";
  health: "up" | "down" | "unknown";
  sources: Record<string, SourceState>;
  lastReportAt: string | null;
  lastSuccessfulFetchAt: string | null;
  measuredAt: string | null;
  headlines: [HeadlineNumber, HeadlineNumber] | [];
  homeUrl: string | null;
  notes: string;
};
```

Dots-only properties carry `headlines: []` by design. Parse never throws. Failed fetch keeps last-known and flips that source to down only when a prior success exists. Unconnected means never connected with null `lastSuccessfulFetchAt`.

Section 3.8 status semantics applied: lifecycle plus connectivity plus health plus freshness, with `servedAt` vs `lastSuccessfulFetchAt` vs `measuredAt` kept distinct. Traffic never sets health.

Section 4 stack and coexistence applied: no Mantine in new views, spike panel is reference only, removal call happens after Phase 1 exit.

Section 5 Access plus privacy applied: private admin path only, server re-verifies Access JWT first, counts only, no new public route, partial rendering per 5.2, server-to-server credential boundary per 5.3 not needed in Phase 1 because no metrics endpoint fetch is added.

Section 6 Phase 1 entry and exit applied:

- Entry: this spec reviewed, plan approved with 3.3 table and 3.5 gates listed, D1 deps installed, coexistence call scheduled.
- Exit: all five rows render from seed shape, apex wired to live or fixture payload through parse plus apply with lifetime labels and valid-zero plus offline evidence, both themes render, no Mantine import in new views.

Phase 1 metric table per section 3.3, planning checkpoint:

| Displayed number | Source | Computation | Window shown | Zero vs unavailable |
|---|---|---|---|---|
| Apex blog posts | Apex reporter counts.blogPosts | direct total | lifetime | 0 only on valid zero payload per test 5, else `Not yet` |
| Apex inbound notes | Apex reporter contactNotes plus berryBlastTotal | lifetime sum with split tooltip | lifetime | same as above, no 30-day variant |
| Forage requests | Cloudflare candidate only | per-zone sums, not built in Phase 1 | unconnected | `Unconnected` with reason, never zero |
| Forage tool runs | metrics endpoint, not called in Phase 1 | not aggregated in Phase 1 | unconnected | `Unconnected` with reason, never UsageRow feed |
| Catalog profile views | manual store, not built until Phase 4 | direct entry when live | at entry date when live | `Not entered yet` in Phase 1 |
| Catalog invites | manual store, not built until Phase 4 | direct entry when live | at entry date when live | `Not entered yet` in Phase 1 |
| Skill and app numbers | none | none | none | dots only, empty headlines array |

Phase 1 readiness gates per section 3.5:

- Apex reporter parse plus apply path: connected for test purposes via committed fixture and live payload shape. Producer plus persistence plus aggregation plus date boundary plus last successful update are evidenced by the existing reporter contract plus the valid-zero and offline tests in this phase.
- Cloudflare requests plus error rate: unconnected. No token validation in Phase 1. No query built.
- Forage mcp calls plus items: unconnected in Phase 1. No server-to-server fetch built.
- Searches: unconnected. No window defined.
- Manual store: not built in Phase 1. All manual fields show `Not entered yet` with no fallback claimed.

Section 7 evidence required for Phase 1 exit: 1 headless both themes, 2 empty states, 3 token-missing partial, 4 zero console errors, 5 valid-zero reporter, 6 offline with last-known, 7 Access JWT negatives for every new route.

### Global Constraints

- No em dashes in any new code, copy, test name, or doc added by this plan.
- Access gate before deploy. Cloudflare Access plus MFA policy must pass and section 7 evidence 7 must pass before any deploy. No URL ships without the Access policy.
- Counts only, no PII. Reporter payloads carry totals only. Parse layer drops any PII-shaped field. Manual rows hold numbers plus short notes only.
- Branch from a clean base. Implementation branch is created from a clean tree only. Do not start view work on a dirty tree.
- No pushes to main. Work on the implementation branch, review before merge. Plan branch and implementation branch are separate.
- Phase 1 only. No Forage dense view, no Apex pipeline, no catalog write path, no manual_metrics table, no Cloudflare query, no metrics endpoint fetch.

### Review Focus

Reviewer checks, in order:

- Five rows in fixed order with correct kind badges and home dash handling, verified by task 5 capture and typecheck.
- Apex lifetime labels present with no windowed language, verified by task 3 tests `shows lifetime labels and split tooltip total` and `keeps lifetime semantics on zero payload`.
- Empty states match spec strings exactly, verified by task 5 tests and evidence 2 captures.
- Valid-zero vs offline behavior matches spec section 7 tests 5 and 6, verified by task 6 tests `renders 0 with lifetime plus servedAt on valid zero` and `keeps last known and shows down notice on fetch failure`.
- No Mantine import in new views, verified by task 1 grep check and task 8 exit scan.
- Access negatives for the new route return 401 or 403 with no private bytes and no path oracle, verified by task 7 tests.
- Zero console errors across both themes and empty states, verified by task 8 capture log.

## File Structure

New files in Phase 1. No edits to existing Mantine views. No edits to token CSS values.

```text
app/routes/admin-registry.tsx
  New parallel private route. Access gated by Worker, same as admin. Renders RegistryShell with seed plus apex pulse.

src/features/admin/registry/registry-record.ts
  Phase 1 extension of PropertyRecord thinking to RegistryRecord per spec 3.1 plus 3.8. Pure types plus guards plus normalize. Never throws.

src/features/admin/registry/registry-seed.ts
  Reuse wrapper around seed.json. Maps static seed rows into RegistryRecord identity rows in fixed order with headlines [] and sources unconnected by default.

src/features/admin/registry/registry-adapter.ts
  Phase 1 adapter. Reuses parseApexReport plus applyApexReport plus markReportDown. Adds source state transitions for connected vs down vs unconnected plus lastSuccessfulFetchAt handling and lifetime headline builders.

src/features/admin/components/RegistryShell.tsx
  New shell on Base UI. View nav with registry plus disabled placeholders for Forage, apex, catalog. Skip link, aria-current, light and dark theme toggle.

src/features/admin/components/RegistryRow.tsx
  One row per property. Status dot, kind badge, last report line, two headline numbers or dots, home link or dash, notes.

src/features/admin/components/RegistryHeadlines.tsx
  Headline number pair rendering with label plus value plus window plus updated time. Handles pending vs unconnected vs not-entered vs confirmed zero.

src/features/admin/registry/registry.css
  Route scoped styles mapped to oasis-tokens.css vars. No global reset. No Mantine selectors.

tests/server/registry-record.test.ts
  Pure unit tests for normalize and extension rules.

tests/server/registry-adapter.test.ts
  Pure unit tests for apex wiring, valid-zero, offline keep-last-known, unconnected defaults.

tests/server/admin-registry-access.test.ts
  Access negative tests for the new private route path pattern, reusing verifyAccessJwt plus handler gate thinking.

docs/superpowers/plans/2026-11-18-admin-registry-phase1.md
  This plan file.
```

Existing files reused read only, except the two wiring edits named in tasks:

- `src/features/admin/registry/seed.json`: reused as identity source, not reshaped in Phase 1.
- `src/features/admin/registry/properties.ts`: reused normalize thinking, not deleted.
- `src/features/admin/registry/reporter.ts`: reused adapter, not changed unless a bug blocks lifetime labels.
- `src/server/handlers/admin.ts` and `src/server/access.ts`: reuse `requireAdmin` and `verifyAccessJwt`, no new public handler in Phase 1.
- `app/routes.ts`: one route line added for `admin-registry`.
- `tailwind.config.js` and `postcss.config.js`: new files from task 1.

## TDD Tasks

Branch decisions:

- Plan branch: `plan/admin-phase1`.
- Implementation branch: `impl/admin-registry-phase1`, created from a clean `spike/hub-skeleton` tip so seed plus adapter plus fixture carry over. If the base is dirty, create no branch and do no implementation work until the tree is clean.

Test commands used everywhere:

- Unit: `npm run test:server -- tests/server/registry-record.test.ts`
- Unit: `npm run test:server -- tests/server/registry-adapter.test.ts`
- Unit: `npm run test:server -- tests/server/admin-registry-access.test.ts`
- Full server suite: `npm run test:server`
- Types: `npm run typecheck`
- New view grep guard: `grep -R "@mantine" app/routes/admin-registry.tsx src/features/admin/components/Registry* src/features/admin/registry/registry-* || true` must return empty.

Note on runner limits: `vitest.config.ts` includes only `tests/server/**/*.test.ts` in node env. All new vitest files live under that glob and test pure logic only. Visual and theme checks are headless captures plus console log review, recorded as evidence files, not as vitest React tests.

### Task 1: D1 toolchain install plus Tailwind wiring plus Mantine guard

Goal: install pinned D1 deps and wire Tailwind without touching existing admin or tokens.

Steps:

- [ ] Run the exact pinned install with `-E` and confirm `package.json` shows no caret on the seven new entries.
- [ ] Add `tailwind.config.js` with content limited to the new registry files listed above.
- [ ] Add `postcss.config.js` with tailwindcss plus autoprefixer.
- [ ] Add route scoped CSS import used only by `admin-registry.tsx`, mapped to `oasis-tokens.css` vars.
- [ ] Run typecheck and confirm the old admin still builds with no token value change.

Test:

- [ ] `npm run typecheck` passes.
- [ ] Grep guard passes: no `@mantine` string in any new registry file.
- [ ] `npm run test:server` still passes with no new failures.
- [ ] Record `package-lock.json` diff showing exact pinned versions.

Commit: `chore(admin-phase1): pin D1 deps and wire tailwind for registry only`

### Task 2: RegistryRecord types plus normalize that never throws

Goal: add spec 3.1 plus 3.8 types as pure code with no fetch and no UI.

Steps:

- [ ] Create `src/features/admin/registry/registry-record.ts` with `PropertyLifecycle`, `SourceConnectivity`, `PropertyHealth`, `SourceFreshness`, `SourceState`, `HeadlineNumber`, `RegistryRecord`.
- [ ] Implement `normalizeRegistryRecord` that accepts unknown JSON, defaults unknown entries to unknown rather than throwing, restricts metrics to finite numbers or strings, keeps dots-only `headlines: []` intact, and maps legacy `links.home` to `homeUrl`.
- [ ] Implement `isRegistryRecord` guard and `withSourceState` helper for connected vs down vs unconnected transitions.
- [ ] Reuse, do not duplicate, the status and health guard thinking from `properties.ts`.

Test:

- [ ] New file `tests/server/registry-record.test.ts` with cases: `accepts a full registry record with two lifetime headlines`, `defaults unknown status and health to unknown without throwing`, `drops non-finite metrics and keeps strings`, `maps missing home to null homeUrl`, `keeps empty headlines array for dots-only skill and app`, `rejects zero-properties input as config error input`.
- [ ] Command `npm run test:server -- tests/server/registry-record.test.ts` passes.
- [ ] Command `npm run typecheck` passes.

Commit: `test(admin-phase1): registry record types plus never-throw normalize`

### Task 3: Seed reuse plus lifetime headline builders

Goal: prove the five seed rows map to RegistryRecord identity rows with correct fixed order and lifetime labels.

Steps:

- [ ] Create `src/features/admin/registry/registry-seed.ts` that imports `seed.json`, maps each row through `normalizeRegistryRecord`, enforces fixed order apex, Forage, upwork-catalog, designtaste-by-oasis, shopify-app, and sets Phase 1 defaults: lifecycle live except shopify-app planned, all sources unconnected, headlines empty except apex after adapter step.
- [ ] Create lifetime headline builders in `registry-adapter.ts`: `apexBlogPostsHeadline` with window `lifetime` and source `reporter`, plus `apexInboundHeadline` as contactNotes plus berryBlastTotal sum with window `lifetime` and split tooltip data.
- [ ] Reuse `parseApexReport` and `applyApexReport` without changing their wire shape. If a change is needed, update fixture plus type plus guard together.
- [ ] Assert counts only: adapter drops any email, name, phone, or message-shaped field if ever present.

Test:

- [ ] Extend `tests/server/registry-adapter.test.ts` with: `maps seed to five rows in fixed order`, `shows lifetime labels and split tooltip total`, `keeps lifetime semantics on zero payload`, `drops PII-shaped fields and keeps counts only`.
- [ ] The zero payload case uses the committed fixture shape with all counts 0 and a current `servedAt`, and asserts value 0 renders with `lifetime` plus `servedAt` plus `lastSuccessfulFetchAt`, health up, and no `Not yet` or `Unconnected` string in the built view model.
- [ ] Commands `npm run test:server -- tests/server/registry-adapter.test.ts` and `npm run typecheck` pass.

Commit: `feat(admin-phase1): seed reuse plus lifetime headlines`

### Task 4: Parallel private route plus new shell with themes and nav

Goal: add `admin/registry` as a parallel Access gated route on the new stack, with no change to `admin/*` behavior.

Steps:

- [ ] Create `app/routes/admin-registry.tsx` with `meta` robots `noindex, nofollow`, client only data load, denied state reuse via `SecureAccessState` thinking without importing Mantine into new components.
- [ ] Create `RegistryShell.tsx` on Base UI with view nav for registry, Forage, apex, catalog, where only registry is enabled in Phase 1 and others render disabled with `Unconnected` or planned hint. Include skip link, `aria-current="page"` on registry, and light plus dark theme toggle bound to the existing token attribute.
- [ ] Add one line to `app/routes.ts` for `admin-registry`. Do not edit the existing `admin/*` line. Do not delete `spike-properties` in this task.
- [ ] Confirm Worker Access gating covers the new path by the same `/admin/*` rule. No new public route. No new data file.

Test:

- [ ] `npm run typecheck` passes.
- [ ] Headless capture of `/admin/registry` in light and dark shows shell with nav, skip link present, `aria-current` on registry, no unstyled flash, theme toggle persists.
- [ ] `npm run test:server` passes with no regressions.
- [ ] Grep guard still returns empty for Mantine in new files.

Commit: `feat(admin-phase1): parallel registry route plus shell`

### Task 5: Five rows with per-field empty states

Goal: render all five rows from the seed shape with exact spec copy and fixed order.

Steps:

- [ ] Create `RegistryRow.tsx` plus `RegistryHeadlines.tsx` plus `registry.css`, all Base UI plus Tailwind plus token vars, no Mantine.
- [ ] Implement per-field copy exactly: `No report yet` for unknown health with grey dot, `Not entered yet` for empty manual fields, `Unconnected` with one-line reason for candidate feeds, `-` for missing home link, `Reporter down, showing last known` reserved for task 6 but component supports it here.
- [ ] Implement fixed order rendering plus kind badges: apex marketing site, Forage product, upwork-catalog catalog, designtaste skill, shopify-app app. Skill and app render dots with empty headlines, plus `no live surface` and `not built` hints respectively.
- [ ] Implement zero-properties config error card: when the registry input is empty, render an error card stating the seed must ship five, not an empty page and not a skeleton.
- [ ] Keep poll and fetch logic out of this task. Props in, rows out, with story fixtures for seed only and seed plus apex.

Test:

- [ ] Unit view model test in `tests/server/registry-adapter.test.ts` or a new pure helper test: `renders seed-only rows with No report yet and no zero values`, `shows dash for missing home link`, `shows error card input for zero properties`, `keeps skill and app dots-only with empty headlines`.
- [ ] Headless captures for seed-only state in both themes, reviewed for copy exactness and no `0` where `Not entered yet` or `Unconnected` belongs.
- [ ] Commands `npm run test:server -- tests/server/registry-adapter.test.ts` and `npm run typecheck` pass.

Commit: `feat(admin-phase1): five registry rows with empty states`

### Task 6: Apex live wiring with poll plus valid-zero plus offline keep-last-known

Goal: wire the apex row to reporter data with 15 min poll plus refetch on mount, proving lifetime labels and offline behavior.

Steps:

- [ ] Implement fetch plus poll in the new route only: refetch on mount, 15 min interval while open, `lastSuccessfulFetchAt` set only on successful parse, `servedAt` taken from payload claim.
- [ ] Implement down transition with `markReportDown` thinking extended to source state: prior success required for down, else unconnected. Keep last-known numbers and show `Reporter down, showing last known` with both timestamps.
- [ ] Implement mismatch handling: fresh fetch of an old `servedAt` renders stale with both times shown, per 3.8.
- [ ] Keep Forage, catalog, skill, and app on their Phase 1 unconnected or dots states. No new fetch for them.

Test:

- [ ] New tests in `tests/server/registry-adapter.test.ts`: `renders 0 with lifetime plus servedAt on valid zero` asserts value 0, window `lifetime`, served plus fetched timestamps present, health up, and no `Not yet` string; `keeps last known and shows down notice on fetch failure` serves one good payload then fails all later fetches and asserts numbers kept, connectivity down, notice `Reporter down, showing last known` with served plus fetched dates, never zero or blank; `recovery refetch restores connected without rebuild` asserts second success flips back to connected with updated `lastSuccessfulFetchAt`.
- [ ] Headless offline capture shows last-known numbers with warning label, verified sections keep rendering per partial rendering rule.
- [ ] Zero console error bar checked during this task run.
- [ ] Commands `npm run test:server -- tests/server/registry-adapter.test.ts` and `npm run typecheck` pass.

Commit: `feat(admin-phase1): apex poll with valid-zero and offline keep-last-known`

### Task 7: Access gating reuse plus negative tests for the new route

Goal: prove the new route adds no auth bypass and leaks no private bytes.

Steps:

- [ ] Reuse `verifyAccessJwt` plus `requireAdmin` for any new dashboard API used by the registry route. No page-level check substitutes for the server check. No browser exception. No new credential in the browser.
- [ ] Add `tests/server/admin-registry-access.test.ts` covering the private registry path pattern: unauthenticated with no token, invalid signature, expired token, wrong audience, direct origin request bypassing Access, private-file access without valid JWT.
- [ ] Each negative case asserts unauthorized with no private bytes and no path oracle detail, while a valid token via injected verifier succeeds. Failures suppress only dependent data per 5.2.

Test:

- [ ] Test names: `denies registry API with no token`, `denies invalid signature`, `denies expired token`, `denies wrong audience`, `denies direct origin bypass`, `denies private file without JWT`, `allows valid token`.
- [ ] Command `npm run test:server -- tests/server/admin-registry-access.test.ts` passes.
- [ ] Full `npm run test:server` passes.

Commit: `test(admin-phase1): access negatives for registry route`

### Task 8: Phase 1 exit evidence bundle plus Mantine-free scan

Goal: collect the section 7 evidence set and prove exit criteria before any merge or deploy.

Steps:

- [ ] Capture headless render in both themes for the registry view.
- [ ] Capture empty states with sources disconnected: registry with no reports, including `No report yet`, `Not entered yet`, and `Unconnected` labels in one pass.
- [ ] Run with Cloudflare token and reporter secrets absent and capture the plain-language missing-data messages with exit path back to registry, plus proof that verified seed sections keep rendering.
- [ ] Run headless console capture across both themes and empty states, list warnings with one-line justifications or fix them to reach zero errors and zero unhandled rejections.
- [ ] Run repo-wide Mantine guard on new views and record empty output. Schedule Mantine removal or isolation as a follow-up, not in this task.

Test:

- [ ] Evidence checklist stored with captures: 1 both themes, 2 empty states, 3 token-missing partial, 4 zero console errors, 5 valid-zero from task 6, 6 offline from task 6, 7 Access negatives from task 7.
- [ ] Commands `npm run test:server` and `npm run typecheck` pass on the final tree.
- [ ] No deploy happens in this task. Access team setup from open item 4 stays a deploy blocker.

Commit: `docs(admin-phase1): phase 1 exit evidence bundle`

## Self-Review

Spec coverage:

- 0 D1 stack honored with Base UI plus React plus TypeScript and no Mantine in new views. D2 order honored with registry first and dots for skill and app. D3 and D4 untouched.
- 1.1 goal met with five properties and counts only. 1.2 non-goals honored: no auto-publish, no drafting, no Mantine, no UI SDK, no public surface change, no new analytics collection.
- 1.3 C1 to C6 carried in Global Constraints and tasks 4, 7, and 8.
- 2.1 fully planned: fixed order, row fields, data sources, refresh cadence, and all six empty-state strings with exact copy.
- 3.1 record shape reproduced with lifecycle plus sources plus headlines plus timestamp trio. 3.3 table reproduced for Phase 1 metrics only. 3.5 gates listed with only the apex parse path connected via fixture. 3.8 four dimensions preserved with served vs fetched vs measured kept distinct.
- 4 coexistence solved as parallel route with removal scheduled after exit.
- 5 Access reuse plus partial rendering plus no browser credential in Phase 1.
- 6 Phase 1 entry and exit used as task exit checks. Later phases explicitly excluded.
- 7 evidence 1 to 7 mapped to tasks 4 through 8, with 5 and 6 pinned to exact assertions and copy.

Step scan:

- Each task ends testable with named tests plus exact commands plus a commit.
- Task order is dependency safe: toolchain, then types, then seed, then shell, then rows, then live wiring, then Access, then evidence.
- No task adds Phase 2 to 4 scope. No task creates the manual store, the metrics fetch, or the Cloudflare query.
- No task edits token values, public routes, or existing Mantine views.

Type consistency:

- `RegistryRecord` extends the existing `PropertyRecord` thinking without breaking `PROPERTIES`, `parseApexReport`, `applyApexReport`, or `markReportDown`.
- `headlines: [HeadlineNumber, HeadlineNumber] | []` preserves dots-only by design.
- `homeUrl: string | null` preserves the dash rule for missing home.
- `SourceState` keeps `lastSuccessfulFetchAt` null for never-connected, which is the exact down vs unconnected discriminator.
- `window: string | null` forces every number to carry `lifetime` or an explicit period or null for unconnected.

Review focus with tests pinned:

- Fixed order plus badges plus dash handling: task 5 tests plus captures.
- Lifetime labels with no windowed language: task 3 tests `shows lifetime labels and split tooltip total` and `keeps lifetime semantics on zero payload`.
- Exact empty copy: task 5 tests plus evidence 2 captures.
- Valid-zero: task 6 test `renders 0 with lifetime plus servedAt on valid zero`.
- Offline keep-last-known: task 6 test `keeps last known and shows down notice on fetch failure` plus recovery test.
- No Mantine in new views: tasks 1, 4, 5, and 8 grep guards.
- Access negatives: task 7 seven named tests.
- Zero console errors: task 8 capture log.

Proportion:

- Eight tasks. Three for foundation and types, three for view and wiring, one for Access, one for exit evidence. No single task mixes toolchain plus UI plus server auth. Each commit is reviewable alone. No filler task. No mega task that ships the whole view at once.

Spec gap found:

- The spec assumes a private `admin/registry` path pattern under the existing Worker `/admin/*` Access rule, but the reviewed tree shows only route-level comments about that rule, not the Worker route matcher itself. Task 4 confirms the matcher covers the new path before claiming Access reuse, and task 7 proves it with negative tests. If the matcher does not cover the new path, task 4 must stop and record the Worker config gap instead of adding a client-side gate.
