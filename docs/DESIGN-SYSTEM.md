# Oasis Design System

Shared visual language for the public landing page and the private admin.
Single source of truth for color: `src/styles/oasis-tokens.css`.
Global rules: `src/styles/oasis-base.css`. Component detail lives in CSS Modules
next to each component. No Tailwind. Mantine supplies admin primitives only.

## 1. Tokens (shipped values)

Light is the default (`:root` and `[data-mantine-color-scheme="light"]`).
Dark overrides use the same semantic names. Never add a second accent.

### Surfaces and text

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--oasis-bg` | `#fbfaf7` | `#0b0f0d` | Page background |
| `--oasis-surface` | `#f2efe7` | `#121815` | Section bands, tool tabs area |
| `--oasis-surface-2` | `#e7e2d4` | `#1b231f` | Reserved second surface |
| `--oasis-surface-raised` | `#ffffff` | `#151d19` | Cards, panels, form shells |
| `--oasis-border` | `#dfd9c9` | `#263029` | Card and section borders |
| `--oasis-border-strong` | `#c4bba4` | `#39473e` | Inputs, tabs, controls |
| `--oasis-text` | `#141814` | `#eaefea` | Headings, primary text |
| `--oasis-text-secondary` | `#3b443c` | `#bec9c0` | Body copy, list text |
| `--oasis-text-muted` | `#5c6860` | `#98a49c` | Hints, captions, empty states |

### Accent and signal

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--oasis-accent` | `#177245` | `#4cc38a` | Primary actions, links, active tabs |
| `--oasis-accent-strong` | `#0e5a35` | `#8adfae` | Hover on primary actions |
| `--oasis-accent-soft` | `#e3f1e7` | `#10241a` | Result boxes, selected options |
| `--oasis-accent-border` | `#b7d6c1` | `#254434` | Result box borders |
| `--oasis-accent-contrast` | `#ffffff` | `#06110c` | Text on accent fills |
| `--oasis-signal` | `#8a5a00` | `#e5b45a` | Warm secondary signal |
| `--oasis-signal-soft` | `#f7ecd4` | `#241b08` | Hero glow wash |
| `--oasis-signal-dot` | `rgba(20, 60, 40, 0.16)` | `rgba(140, 220, 175, 0.16)` | Decorative dot pattern |
| `--oasis-glow-green` | `#dcefe2` | `#10241a` | Hero glow |
| `--oasis-glow-amber` | `#f3e3ba` | `#241b08` | Hero glow wash |
| `--oasis-focus-ring` | `#177245` | `#8adfae` | Keyboard focus outline |
| `--oasis-header-bg` | `rgba(251, 250, 247, 0.9)` | `rgba(11, 15, 13, 0.88)` | Sticky header wash |
| `--oasis-hero-glow` | `#e9f3ea` | `#10241a` | Hero and intake backdrop |

### Status

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--oasis-success` / `--oasis-success-soft` | `#177245` / `#e3f1e7` | `#4cc38a` / `#10241a` | Success states |
| `--oasis-warning` / `--oasis-warning-soft` | `#8a5a00` / `#fbf0d3` | `#e8b93e` / `#2b220d` | Sample badges, caution |
| `--oasis-danger` / `--oasis-danger-soft` | `#b3261e` / `#fbe9e7` | `#f0807a` / `#2e1513` | Field errors, destructive alerts |

Sample badges reuse the warning pair. Approved proof badges reuse the accent
soft pair. No new badge colors may be introduced per client.

### Shape and layout

- `--oasis-radius-sm: 8px`, `--oasis-radius-md: 12px`, `--oasis-radius-lg: 16px`,
  `--oasis-radius-xl: 20px`. Cards use lg, panels and form shells use xl,
  pills use 999px.
- `--oasis-max-width: 1120px`. Content columns center under it. Tool panels cap
  at 760px like the intake form.
- `--oasis-touch-min: 44px`. Minimum height for buttons, tabs, nav controls,
  dots, links that act as buttons, inputs, selects, checkboxes rows, and radio
  options. Badges and captions are not targets and stay compact.
- `--oasis-card-shadow` (per scheme). One restrained shadow for raised cards.
- `color-scheme: light` / `dark` follows the active theme so native controls
  (selects, radios, checkboxes, number inputs) match both schemes.

## 2. Type scale

- Display: `--oasis-font-display` (Space Grotesk, then IBM Plex Sans, system
  fallback). Headings only. Weights 600. Tight tracking (-0.01em to -0.03em).
- Body: `--oasis-font-body` (IBM Plex Sans, system fallback). Base 16px,
  line height 1.6. Secondary copy 0.93 to 1.06rem. Hints 0.88 to 0.92rem.
- Mono: `--oasis-font-mono` (IBM Plex Mono, system mono fallback). Kickers,
  indices, badges, status readouts, carousel position. 12 to 12.5px with
  0.04 to 0.12em letter spacing, uppercase for eyebrows and badges.
- Scale in use: hero title `clamp(2.1rem, 1.4rem + 4.4vw, 3.4rem)`;
  section card titles 1.3rem; process titles 1.15rem; tool and slide titles
  1.05 to 1.25rem; success titles 1.6rem. Body never drops below readable
  sizes on small screens. Long headings use balance or pretty wrapping.

## 3. Components

Landing (`src/features/landing/components/`):

- LandingHeader: sticky bar over `--oasis-header-bg`, skip aware nav, 44px
  targets, availability badge when configured.
- HeroSection: glow backdrop, staggered rise on load (see motion), primary
  intake CTA plus secondary services link, three plain reassurance checks.
- ServicesSection: three link cards (websites, tools, automations). Whole card
  is one link. Hover lifts 3px with shadow. Fallback copy ships when no props.
- ToolsSection (`ToolsSection.tsx`): five tabbed helpers. Tabs are a real
  `tablist` with arrow, Home, and End keys. Each tool has an empty state
  (helper text, nothing computed) and a result state (`role="status"`,
  `aria-live="polite"`) with a plain next step plus an intake anchor.
  The five tools: price shape estimator (shape words, never a price), booking
  readiness checker, quote follow up calculator (math from typed numbers only,
  currency agnostic), hours and contact completeness checker (score out of
  five with named gaps), automation fit quiz (four yes or no questions,
  honest low fit outcome included).
- ProofCarousel (`ProofCarousel.tsx`): one honest carousel fed only by
  `GET /api/public/work-items`. Approved `proof` rows render with an
  Approved proof badge. `sample-concept` rows plus three built in layout
  concepts render with a visible Sample badge on every slide and a
  Concept only caption. With zero approved rows, an honest empty state shows
  and the labeled samples follow. No client names are invented, no
  testimonials, no placeholder person presented as real. There is
  intentionally no social or testimonial carousel until real approved words
  exist. Arrows, dots, Home, End, and arrow keys all work. Position readout
  is a live region.
- ProcessSection: open divider rows with mono indices, staggered reveal once.
- AvailabilityStrip: honest capacity from props only. Missing config renders
  nothing. No invented windows.
- IntakeForm: short intake with inline errors, honeypot, Turnstile gate, plain
  success state. Paused state when no site key.
- LandingFooter: minimal close with intake link.

Shared (`src/components/`): SectionHeading (eyebrow plus H2 plus one calm
line, used by every section), StatusBadge (capacity tones).

## 4. Motion budgets

Global rule from `oasis-base.css`: transform and opacity only. Focus is always
visible. `prefers-reduced-motion: reduce` collapses all animation and
transition to near zero and disables smooth scrolling.

| Moment | Budget | Notes |
| --- | --- | --- |
| Press feedback | 100 to 160ms | Buttons, tabs, dots settle with translateY 1px |
| Hover lifts | 120 to 140ms | Cards rise 3px, arrows nudge 4px |
| Tab and panel entry | 160ms, once | Opacity plus 6px rise, no loop |
| Hero load stagger | 320ms with 60ms steps | Opacity plus 10px rise, runs once |
| Carousel track | 160ms ease | `translateX` only, keyboard driven |
| Popovers | 125 to 200ms | Upper bound, rarely needed on landing |
| Modals | 200 to 500ms | Upper bound, none on current landing |

Rejected by default: parallax, decorative loops, mouse tracking on functional
UI, animation on keyboard driven high frequency actions.

## 5. Layout and responsiveness

Mobile first. Base single column at 360px. Content breakpoints at 720px
(tool rows split to two columns), 768px (section padding grows, services grid
goes three up, process list goes two up), 1024px (hero splits to two
columns), 1280px (spacing and card padding grow). Tested widths: 360, 768,
1280. Both color schemes everywhere, one theme at a time. `overflow-x: clip`
on the page. Tab rows and control rows scroll or wrap instead of overflowing.

## 6. Honesty rules (locked, from the project brief)

- No invented projects, screenshots, testimonials, client names, usage
  numbers, or case studies. Ever.
- Sample concepts are always labeled as samples, never as client proof. Every
  sample slide carries a visible Sample badge plus a Concept only caption.
- The work area lists only approved real proof plus clearly labeled samples.
- Until real work with permission exists, the page leads with service, tools,
  process, and the intake call to action. The empty state says so in plain
  words.
- Tool outputs are starting shapes and illustrative math from the visitor's
  own typed numbers. They are labeled as such, never as quotes, averages, or
  promises from other businesses.
- Copy rules: no em dashes in any content, ever. Short sentences. One line per
  idea. Status, title, one line, and the action. No jargon.
- Client builds define their own palettes and never reuse the `oasis-`
  token names.
