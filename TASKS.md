# Oasis.dev task backlog

Living task list so nothing is forgotten. Updated 2026-10-09.
States: todo, doing, done. Each item names its owner.

## Launch closeout

- [ ] todo (owner): Confirm the 90 day expire lifecycle rule on bucket `oasis-dev-backups`.
- [ ] todo (owner): Submit one live intake to test Turnstile end to end, then decide to unpause intake.
- [ ] todo (owner + agent): Connect Workers Builds for auto deploys when ready.
- [ ] todo (owner): Monthly restore drill into a throwaway database after the first export lands, date logged in admin notes.
- [ ] todo (agent): Screenshot pass at 360, 768, 1280 in both color schemes after the redesign deploys.

## Redesign brief (revised plan approved 2026-10-09, shipped live 2026-10-09 as 67065f1)

Copy, warm SME voice:

- [ ] todo (agent): Full copy pass through the copywriting skill. Humanised, friendly, no exaggeration.
- [ ] todo (agent): Delete the listed lines, the How often field, and the hero parenthetical.
- [ ] todo (agent): Positioning reads as a solo studio for SMEs, one business at a time.

Hero and motion:

- [ ] todo (agent): Animated clay 3D hero showing the true process flow below. Research libraries versus hand built CSS and SVG first.
- [ ] todo (agent): Purposeful clay 3D plus glassmorphism elsewhere only where useful.
- [ ] todo (agent): All motion inside budgets with reduced motion respected.

Structure and chrome:

- [ ] todo (agent): Remove divider lines behind section eyebrows. Selected work moves last.
- [ ] todo (agent): Research backed section order after the hero.
- [ ] todo (agent): Deborder pass, minimal theme control, header rebuilt to studio standards plus mobile.

Tools flow:

- [ ] todo (agent): Five tools become one guided staged flow with icons, opening on visitor need.
- [ ] todo (agent): AI suggestion brainstorm plus research. Default stays rule based unless research proves otherwise.

Forms and audit:

- [ ] todo (agent): Form audit including Turnstile patterns, obvious placeholders removed.
- [ ] todo (agent): Full thoughtful code audit.
- [ ] todo (agent): Every change logged with reason, cause and effect, and why it is better.

True process flow, locked 2026-10-09, replaces the old note scope build proof version:

1. You come to us with a problem.
2. We talk with you to understand it.
3. We find the solution.
4. We build it and ship it to you.
5. You use it.
6. You share it with people.

## Done (reference only)

- Hero scene system live 2026-10-12 with three variants plus visible comparison popup (choice plus removal still pending).

- D1 plus migrations, Access, Turnstile keys, live deploy, backup worker plus token, tokenless CI, design system doc, guided admin home, honest tools plus labeled proof carousel.

## Change notes 2026-10-09 (fixer lane)

- Added `src/shared/quiz.ts` pure model with five branched questions and `recommend` plus quiz to intake prefill helpers.
- Removed intake frequency from validation, contracts, and server queries. Repeat detail now lives in taskDescription with the quiz goal prefix.
- Added migration `0003_display_settings.sql` with proof hidden by default, plus admin and public display endpoints with audit.
- Turnstile handling unchanged and fail closed.
- README now notes hidden proof default, Settings content controls, and the unified quiz plus intake flow.
