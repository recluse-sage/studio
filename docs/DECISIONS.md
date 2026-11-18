# Oasis decisions log

System-of-record log so future builds inherit constraints instead of re-litigating them. Append-only: add new entries at the bottom, never rewrite or delete a past entry. If a decision changes, add a new entry that supersedes it and name the old one.

Living detail lives in the specs. This log records the decision, the one-line rationale, and the source. Spec text wins on detail.

- apex docs/superpowers/specs/2026-11-18-admin-dashboard-design.md, revision 2.1: dashboard design, views, contracts, gates, phases.
- blog-cron spec 2026-11-17, revision 4: automation contract, parked per-article admin contract, model and spend policy.

Format per entry: date, decision, rationale (one line), source.

## Entries

### 1. Go-subscription-only inference, no PAYG

- Date: 2026-11-17
- Decision: inference runs inside the Go subscription only. No pay-as-you-go spend. User locked.
- Rationale: keeps inference spend predictable inside the subscription the owner already holds.
- Source: user lock Nov 17; blog-cron spec 2026-11-17.

### 2. Benchmark-then-pick model policy, Muse/MiMo/GLM slate

- Date: 2026-11-17
- Decision: the drafting model is picked by benchmark from the Muse/MiMo/GLM slate, then locked until the next review.
- Rationale: selection follows measured draft output, not vendor claims.
- Source: blog-cron spec 2026-11-17.

### 3. Spend cap $1.20, warning at $0.60, provider-reported figures

- Date: 2026-11-17
- Decision: monthly blog-ledger cap $1.20 with a warning at $0.60, computed from provider-reported figures with the standing caveat that coding spend lives in Console and the monthly review joins them.
- Rationale: caps overrun risk while the warning allows correction before the cutoff.
- Source: blog-cron spec 2026-11-17.

### 4. Unattended-cron ToS verdict: Go base off-limits for cron

- Date: 2026-11-17
- Decision: the Go subscription base stays off-limits for unattended cron drafting. The compliant route is report-then-act through a fresh chat.
- Rationale: keeps automation inside the subscription terms while preserving human review of every draft.
- Source: blog-cron spec 2026-11-17.

### 5. Admin stack: shadcn/Base UI plus React/TS plus TanStack plus Recharts

- Date: 2026-11-18
- Decision: admin views use shadcn/ui on Base UI plus React plus TypeScript, TanStack Table v9, and Recharts. No Mantine in new views. No UI SDK until it leaves beta.
- Rationale: one typed theme system for admin with headless tables and charts, and no beta dependency in the private path.
- Source: admin-dashboard spec D1 and section 4.

### 6. View order and layout answers

- Date: 2026-11-18
- Decision: registry thin first, then Forage dense in one scroll, then apex side by side with business row above SEO plus pipeline, then catalog tracked. Skill and planned app stay dots on the registry.
- Rationale: each property gets the layout its data shape needs while the registry stays one row per property.
- Source: admin-dashboard spec D2 and section 2.

### 7. GitHub PR path test-only, drafting paused until the dashboard receives

- Date: 2026-11-18
- Decision: drafting automation stays paused until the dashboard can receive articles. The GitHub PR path is test-only fallback until then.
- Rationale: avoids publishing drafts with no tracking surface to catch misses.
- Source: admin-dashboard spec D3, sections 1.2 and 3.2.

### 8. Thin-registry-first phasing

- Date: 2026-11-18
- Decision: Phase 1 ships the thin registry on the new stack, then Forage dense, then apex plus pipeline, then catalog manual stats. No phase starts before the prior exit is evidenced.
- Rationale: five-property status lands before any dense view is built, and each phase has something testable.
- Source: admin-dashboard spec section 6.

### 9. Canonical-URL structural rules

- Date: 2026-11-17
- Decision: slugs are append-only and new paths come from an allowlist. No rename that breaks a shipped link.
- Rationale: links never rot and new paths stay reviewable before they ship.
- Source: blog-cron spec 2026-11-17.

### 10. 50/50 buyer/traffic allocation, monthly-reviewed

- Date: 2026-11-17
- Decision: article topics split 50/50 between buyer intent and traffic reach, tagged at discovery and reviewed monthly against GSC.
- Rationale: the pipeline balances intent capture with reach instead of drifting to one side.
- Source: blog-cron spec Decision 1; admin-dashboard spec sections 2.3 and 3.2.
