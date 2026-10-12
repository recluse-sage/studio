# Hero Scene System — Architecture

Six-stage hero scene for a marketing landing page. Split layout, copy one side, animated
scene the other. This document is the settled architecture. Nothing here is code — it is the
contract a builder implements against.

---

## 0. How to read this document

**Every number in this document is a DEFAULT, not a fixed value.** Each is given with a
tuning range. Nothing is locked except the things in §1. If a value looks wrong on the real
site, change it — the ranges are there so you can. What is fixed is the *structure*: the
variant interface, the state ownership rule, the accessibility shell. Values are not.

Palette values in particular are placeholders. The builder should replace them with whatever
fits the wider site. Only the *structure* of the palette (one accent, small area) is fixed.

---

## 1. What is actually fixed

Only these five things. Everything else is a default or a range.

1. **Six stages, in this order, with this copy** — the copy may be shortened to a single
   word per stage but the order and count are fixed.
2. **One owner of state.** The parent owns stage index, autoplay, viewport pause and
   accessibility. Scene components own none of it. (See §3.1 — this is the rule that keeps
   the variant system from becoming three separate bugs.)
3. **The scene renders into the first paint.** No canvas mount, no poster image, no
   client-only reveal.
4. **Reduced motion is honoured.** No autoplay; stepping still works, instantly.
5. **One accent colour, small area.** Roughly ≤10% of the scene. The specific colour is
   free; the discipline is not.

---

## 2. Core constraints (and why each exists)

| Constraint | Reason |
|---|---|
| Inline SVG, no WebGL | Realtime 3D heroes are rare in practice; most "3D" heroes are prerecorded video. Building real 3D means writing a custom renderer. For ~10 solid objects, SVG with gradients reads as volumetric at a fraction of the cost. |
| Fixed camera (3/4 view, slow drift) | The lighting is baked into gradients. Rotating objects would break the highlight. This is the single constraint the whole visual approach depends on. |
| ~10 shapes per scene | Above ~20 shapes, SVG paint cost on mid-range mobile becomes noticeable. Below ~15 it is free. |
| No 3D artist | Every shape is a hand-authored primitive: rounded rect, ellipse, polygon, path. Nothing is exported from a modelling tool. |
| GSAP timeline, labelled per stage | Autoplay and hover-stepping write to the same playhead. See §5.1 — this is why a timeline beats six animated components. |

**GSAP budget:** core ~27KB gzip. ScrollTrigger adds ~18KB (needed for the mobile scroll
driven variant). Expect 25–50KB total depending on which plugins land. GSAP is free for
commercial use; it is *not* MIT, it carries a standard no-charge licence with one
restriction (you may not build a no-code animation tool that competes with Webflow's
builder — irrelevant here).

**If GSAP is ever ruled out:** the load-bearing dependency is timeline *labels*. WAAPI plus a
small state machine can replace it at the cost of hand-writing interruption handling.

---

## 3. Variant system

Three scene concepts ship behind a comparison popup. They are peers, not alternatives.

### 3.1 The contract

```ts
type StageCopy = {
  index: number        // 0–5
  label: string        // "Problem"
  line: string         // "You bring a problem."  (optional — may be omitted)
}

type SceneProps = {
  stage: number               // 0–5 — the PARENT decides this
  reducedMotion: boolean      // parent-owned, passed down
  onSettled?: () => void      // called when a stage transition finishes
}

type SceneModule = {
  id: 'cairn' | 'solid-state' | 'grid'
  label: string               // human name for the picker
  Component: React.FC<SceneProps>
  // Internal contract: exposes a GSAP timeline with labels '0'…'5'
  // and a seekTo(stage, opts) function.
}
```

**Rules for every scene module:**

- It receives `stage`. It never decides what the current stage is.
- It owns no timer, no IntersectionObserver, no autoplay logic.
- It exposes a timeline with labels `0`–`5`. The parent seeks by label, so every variant is
  driven identically.
- On mount it renders stage 0 correctly with zero JavaScript having run.
- It respects `reducedMotion` by jumping to end-state with no tween.

### 3.2 State ownership

One `useReducer` in the parent, one effect that owns the autoplay timer. Not `useState` plus
several `useEffect` chains — that pattern double-fires timers and races interruption.

States: `idle → autoplay → resting` / `autoplay → user-controlled` (terminal, never
auto-resumes) / any → `paused` (off-screen) → back.

**On variant switch:** reset stage to 0, kill any in-flight tween, drop observers, re-seek to
label `0`. Leaked state between variants presents as "this concept is broken" rather than
"this is a switcher bug" — which is expensive to debug later.

### 3.3 Lazy loading

Load only the active variant. Do not inline three scenes into the DOM. If all three are
bundled, the page ships every concept's markup on every load for a demo affordance.

### 3.4 The comparison popup

A small control that swaps concept (and optionally material).

- **Concept swap** — component swap. Lazy-loaded.
- **Material swap** — CSS custom properties only. Instant, no reload, no component change.
  **Keep these two axes separate.** Fusing them means N×M components when N+M would do.
- **Accessibility:** the picker is a real control — a labelled `radiogroup` or a set of
  buttons with `aria-pressed`. Keyboard reachable, visible focus. It changes visible content,
  so it must be operable without a mouse.
- **URL state:** `?scene=cairn&material=glass`. Lets you send someone a link to a specific
  combination instead of describing it. For showing options this is the difference between
  useful and annoying.
- **Reduced motion:** the material swap is free; the concept swap should cut rather than
  animate if motion is reduced.
- **Responsive:** on narrow screens collapse to a compact trigger (e.g. a single button that
  opens a small sheet). Do not let a 3-option picker compete with the hero copy on mobile.

**Gating — resolved by directive.** This ships **visible on the frontend**. It is temporary
scaffolding for a design decision, not a debug tool, and its removal is specified in §13.3.
Build it now; plan its deletion from the start.

### 3.5 Mobile

Hover does not exist on touch. On narrow viewports the scene is **scroll-driven** via
ScrollTrigger, with no tapping and no picker. This is a different interaction path from
desktop — build it as a distinct branch rather than trying to make hover degrade.

Scroll back up: the scene should **stay where it is**, not replay. A hero that restarts every
time you scroll past it is a common reason people leave.

---

## 4. Shared scene anatomy

Applies to all three concepts. This is where the dimension comes from.

### 4.1 Three-tone shading — the core technique

A flat shape reads as a solid volume when it is built from three faces at three different
values. This is the entire trick, and it is what makes inline SVG look dimensional.

```
top face    — lightest   (parallelogram above the rect)
front face  — mid        (the rect itself)
side face   — darkest    (parallelogram to one side)
```

Consistent light direction across every object in the scene. Vary hue between objects; never
vary the light angle. Inconsistent angles read as clip-art immediately.

### 4.2 Radial gradients for rounded solids

- Highlight **off-centre**: `cx`/`cy` around 35%, `r` around 60%. A centred gradient reads as
  a flat sticker.
- **Three-stop ramp**: near-white at 0%, base colour at ~45%, darkened base at 100%.
- One shared light vector (`fx`/`fy`) across all shapes.

### 4.3 Contact shadows

The single highest-value detail. A darker offset ellipse under each object, opacity
0.2–0.35. **Fake them with a radial-gradient-filled ellipse — not `<filter>`.** Visually
identical for matte work, dramatically cheaper.

Shadows must **tighten on contact** and soften when an object lifts. If shadows don't respond
to the object, everything floats and the scene reads as clip-art.

### 4.4 Outline

No stroke, or a stroke matching a darker gradient stop at ≤1px. A contrasting outline is the
fastest way to flatten a shape.

### 4.5 Continuity ledger

Per concept: nothing appears that didn't come from off-frame or split off an existing object.
Nothing disappears except by combining. This is what makes six stages read as one process
rather than six illustrations. Enforce it — the failure mode is adding a new prop per stage
to differentiate, which turns six stages into visual noise.

---

## 5. Material tokens

Material is a **token set, not a constant**, so the scene and the site's other components
share one language. If the rest of the site is glossy, a matte hero looks imported.

Four knobs:

| Token | Matte | Satin | Gloss / glass |
|---|---|---|---|
| Highlight | broad, soft (`r` ~60%) | mid | tight, small (`fr` 5–15%) |
| Fill | opaque | opaque | semi-transparent + edge light |
| Environment | none | faint | reflected horizon, or glass reads dead |
| Contact shadow | soft, wide | mid | tight, dark; sometimes a reflection |

**Cost gradient (honest):** matte is nearly free — an opaque gradient. Glass is meaningfully
more expensive because transparency means compositing against whatever is behind, and glass
usually wants a blur behind it.

**Practical resolution:** if the site wants gloss, keep the hero matte and let the gloss live
in the site's components where the paint cost is one-off. Do not put the heaviest rendering
on the most performance-sensitive element.

**Third-party references for the glossy end:** Raycast (frosted glass cards), Lithic
(glossy card plastic). For true chrome, Oura — but note it is rated hard in SVG (fine for one
object, punishing for fifteen). That is the ceiling.

### 5.1 Palette structure

Placeholders. Replace with what fits the site.

| Role | Suggested | Notes |
|---|---|---|
| Background | `#F4F0E8` / `#1C1B17` | light / dark |
| Object body | `#D9D1BF` | reads on both grounds |
| Secondary objects | `#B9AE99` | distinct but neutral |
| **Accent** | `#C96A2B` | one accent, ≤10% of scene |
| Tertiary (stage 6 only) | `#7D9B76` | |

Both modes as CSS custom properties, bound to the site's existing theme toggle rather than a
bare media query, so the scene changes with the switch.

**The one thing that should not flex:** one accent doing one small job. Any palette works if
it keeps that structure.

### 5.5 Styles system

Required by §13.4 and §13.5. This is the mechanism that makes theme and material switchable
without touching component code.

**Rule 1 — no literal colours in components.** Every colour resolves to a custom property.
A hex value inside a component is a defect, because it cannot be themed. This includes the
scene SVG: fills and strokes reference tokens, not literals.

**Rule 2 — three independent token layers.** They compose; none knows about the others.

```
:root            -> raw palette primitives (the actual colour values)
[data-theme]     -> semantic roles (surface, text, accent, object-body, ...)
[data-material]  -> material properties (highlight tightness, fill alpha, shadow treatment)
```

Theme swaps layer 2. Material swaps layer 3. Scene and site components both read from all
three, which is what makes them look like one system.

**Rule 3 — runtime switching, no rebuild.** Theme and material are data attributes on a
container. Toggling is an attribute write; nothing re-mounts, nothing rebuilds, no bundle
changes. Persist the choice (local storage) so it survives navigation.

**Rule 4 — the scene reads tokens, not a theme flag.** A scene must not branch on
"am I in dark mode." It reads semantic roles, so it is correct in both modes by
construction. This is what stops theme switching from becoming a maintenance problem.

**Rule 5 — the existing site migrates onto these tokens.** Scope this to what is needed for
coherence with the scene (§13.4). Do not restyle beyond that.

**Verification before shipping:** switch theme and material on the live build, on desktop and
mobile, and confirm no component shows a literal colour, no flash occurs on switch, and the
choice persists across navigation.

---

## 6. The three variants

All three satisfy §3.1 and §4. They differ in object world and material.

### Variant A — Cairn

Six river stones, a round plinth, a coiled cord. Matte. **Moderate** SVG effort.

**Why it works:** stacking is already a sequential progress language. Six stones, six stages,
nothing left over. A cairn is literally a waymarker left for others to follow — stage 6 is
"use it and share it," and this is the one object that already means it.

| Stage | What happens |
|---|---|
| 01 Problem | Six matte grey stones scattered at the plinth foot, cord a flat coil. Low, wide, messy. |
| 02 Talk | Two stones nudge together, leaning like listeners. Everything else untouched. |
| 03 Solution | Three stones lock into a tripod base on the plinth — first stability. Cord uncoils slightly (same cord, not a new one). |
| 04 Build | Stones 4 and 5 placed; tower rises; off-axis lean corrected on placement. Shadows tighten under each contact. |
| 05 Ship | Cord wraps once at the waist (same stroke length, straightened). Plinth seats fully. Reads as bound without a box. |
| 06 Use and share | Capstone placed with a small rock-and-settle. Tower stands, cord bound, plinth centred. |

**Ledger:** 6 stones + plinth + cord = 8 shapes throughout. Positions and rotations only,
plus one cord path morph. Nothing appears, nothing vanishes.

**Resting state:** centred balanced tower on a low plinth, cord bound once, generous negative
space, one soft ground shadow. Must look finished with zero motion.

**Known failure — floating.** If shadows don't tighten and the settle bounce is skipped, stones
hover and it reads as clip-art. Cure: 4px drop with ~120ms overshoot, shadow tightening on
contact. Cheap fix, but it must be done.

**Material:** matte, non-negotiable. Gloss turns stones into candy.

### Variant B — Solid State

Six solid pucks in a shallow chip tray. Satin. **Easy** SVG effort — the cheapest to build.

Six pucks for six stages, one-to-one. Reads as memory cells or Go stones: technical without
being sci-fi.

| Stage | What happens |
|---|---|
| 01 Problem | Six matte grey pucks lying low in the tray, scattered rotation, one tipped. |
| 02 Talk | Pucks 1 and 2 rise slightly and tilt toward each other. Still grey. |
| 03 Solution | Puck 3 flips upright, first glaze of colour, seats with a tightening shadow. |
| 04 Build | Pucks 4 and 5 stand in sequence; heights stagger into a bar rhythm. |
| 05 Ship | Tray walls seat up (inner rim slides; it was nested, not new). Pucks settle even, fully glazed. |
| 06 Use and share | All six upright, even, coloured, tops showing six simple etched glyphs. |

**Ledger:** 6 pucks + tray = 7 shapes. Transform, fill change, one nested rim reveal.

**Resting state:** low 3/4 tray, six upright satin pucks in a 3×2 block, even heights, one
soft shadow.

**Known failure:** drifting toward board-game counters. Hold the tech read with engineering
proportions (diameter:height ~3:1), tight registration, restrained palette, dry engraved
glyphs. Never icons, never glow.

**Material:** satin. Adapts to either end of the matte↔glass range, which is why it is the
right fallback if the site's material language turns out glossy.

### Variant C — Grid

The Rubik's cube, salvaged as a flat nine-cell grid. One sticker lights per beat until six
are lit, three remain neutral. Glossy.

**Read this before building it.** The cube metaphor genuinely breaks: from a fixed 3/4
camera only three faces are visible, so "six faces = six stages" hides half the story; and a
solve completes at stage 03, leaving Build, Ship and Use with nothing to do.

What survives is a **progress grid wearing a cube costume** — which may still be fine if the
cube is brand equity, and it is the cheapest of the three to build. But it is not a cube
mechanism and should not be described as one.

**Ledger:** 9 cells throughout. Fill and flip only.

**Known failure:** a 3×3 in perspective is the *worst* SVG case — a slice turn needs
hand-authored intermediate sticker polygons with correct occlusion. Built as a flat face-on
grid this is easy. Built as a rotating cube it is not.

**Material:** must be glossy to read as a Rubik's. Matte or satin kills the recognition. That
also makes it the most gradient work of the three.

---

## 7. Behaviour

### 7.1 Autoplay

Auto-walks all six once, then rests. **Aborts permanently on first hover or focus and never
resumes.** Per WCAG 2.2.2 the established pattern is that automatic movement stops when
anything receives focus or hover and does not restart without explicit user request.

Duration: default ~1.5s per stage (~9s total). Range 800ms–2500ms. Faster than ~800ms reads
as a flicker; slower than 2.5s becomes a wall the visitor waits out.

Rest on **stage 6**, never stage 1. A conversion hero resting on "broken" undermines what it
is selling, and a cracked or tilted first frame reads as a loading error.

**Known accessibility note (accepted risk, recorded deliberately):** there is no pause
control. This is a one-shot explanatory sequence that then rests — not looping motion — and
`prefers-reduced-motion` is honoured. If this ever faces a formal accessibility audit or
enterprise/public-sector procurement review, a stop control becomes mandatory. Add it then,
not before.

### 7.2 Hover / focus stepping

One timeline, seek by label. Autoplay and hover write to the same playhead — this is why a
timeline beats six animated components.

Fast scrub: latest wins, cancel in-flight. Do not debounce the visual seek (it feels laggy);
debounce only any ARIA state commit, ~80–120ms trailing.

Do not use `AnimatePresence mode="wait"` — it queues exits and makes scrubbing feel stuck.

### 7.3 Transitions

Default 750ms, `cubic-bezier(0.22, 1, 0.36, 1)` — fast attack, long soft landing. Range
400ms–1200ms.

**One hero move per transition.** Everything else a ~150ms delayed settle. If two things move
fast simultaneously it reads as a loading animation rather than a story. Separation fastest,
restack slowest, because weight matters.

Hover-step: direct, ~450ms, no replay of intermediate stages.

### 7.4 Idle

Only stage 6 has idle motion (~2–3px, ~4s loop). Every other stage is dead still when held.
Stillness reads as confidence and saves battery.

### 7.5 Off-screen pause

Pause on intersection at ~0.3, resume on return. **Never `threshold: 1`** — a hero taller than
the viewport never reaches ratio 1 and the callback never fires.

Pause means: clear the timer *and* pause the tween. If the hero is pinned/sticky, IntersectionObserver
stays `isIntersecting` while pinned; drive pause from the scroll trigger's toggle in that case.

### 7.6 Reduced motion

`prefers-reduced-motion: reduce` → no autoplay, stage 6 shown, stepping still works but
**instantly, with no tween**.

This is deliberately *not* "freeze at stage 1" — that would lock keyboard and screen-reader
users out of five of six stages, which is a worse outcome than the motion being avoided.
WCAG 2.3.3 only bans non-essential motion; stepping because someone chose a stage is essential.

The media query does not stop JavaScript timers or rAF loops. It must be checked in JS, not
just assumed from CSS.

---

## 8. Accessibility shell

Applies to the stage labels, which are a tablist because each reveals its own copy.

- Container `role="tablist"` with `aria-label`. Each `role="tab"` with `aria-selected`,
  `aria-controls`, roving `tabindex` (only the active tab in the tab order).
- Each panel `role="tabpanel"` with `aria-labelledby`. Inactive panels `hidden` — **never
  positioned off-screen**, which is disorienting for screen readers.
- Arrow keys move between stages, auto-activate. `Home`/`End` optional but expected.
- `aria-live="off"` while auto-walking, `polite` only at rest. Otherwise a screen-reader user
  hears stage 2 while still reading stage 1.
- Do not resume autoplay on blur or mouseleave.

**If the stage labels turn out NOT to reveal their own copy** (single fixed paragraph
elsewhere), then it is not a tablist — use a `role="group"` of buttons. A `radiogroup` is
wrong either way; that pattern is for form input, not display switching. This is a genuine
semantic fork, not a detail.

---

## 9. First paint

The scene is inline SVG in the server HTML. It **is** the first paint — no poster image, no
canvas mount, no hydration cost, no reveal animation.

Consequences:
- LCP is the hero's text or the SVG, not a script.
- The static, the resting state, the reduced-motion state and the no-JS state are the same
  artifact. One thing, four jobs.
- Reduced motion costs nothing because nothing needs to load.

**SSR + GSAP gotcha:** animate with `gsap.to()` out of a CSS-parked start state. Using
`gsap.from()` makes the server render the shape visible, then JS hides and re-animates it —
producing a flash.

**SVG transform gotcha:** `transform-origin` defaults to `0 0` (the viewBox origin), not the
element centre, so shapes fly in from the corner. GSAP computes SVG origins correctly — let it
own transforms rather than hand-writing CSS.

**will-change:** never blanket-apply it across all shapes; excessive use causes exactly the
memory problem this architecture exists to avoid. Toggle on only the 2–4 elements actually
moving, and reset on completion.

---

## 10. Performance budget

Targets, not fixed:

| Item | Target |
|---|---|
| GSAP core + ScrollTrigger | ~45KB gzip, code-split off the critical path |
| Scene markup | ~5–15KB per variant, only the active one in the DOM |
| Shapes per scene | ≤15 |
| Idle CPU when resting | ~0 (tween paused, not looping) |
| Fonts | no display font in the scene |

Discipline that matters more than any number: pause when off-screen, no `will-change`
everywhere, no `<filter>` on animated elements, fake shadows with gradients.

---

## 11. Failure modes

| Failure | Cure |
|---|---|
| Illustrating the verb — speech bubbles, lightbulbs, rockets | Keep everything as blocks, stones, pebbles, wedges. The copy names the stage, never the model. |
| Objects floating | Tighten contact shadows; add the settle bounce. |
| Reads as a diagram — six plinths in a row, connectors, arrows | One plinth, one block. Never a timeline made physical. |
| Reads as clip-art / childish | Pastel clay reads as a kids' app. Keep the palette desaturated and architectural. |
| Glow used to signal "the click" | Glow kills the matte illusion and blows out on mobile. Make it physical — an overshoot on a seating object. |
| New prop added per stage | Enforce the ledger. Change light temperature or position, not inventory. |
| Two things moving fast at once | One hero move per transition. |
| Variant switch leaks state | Reset stage, kill tweens, drop observers on swap. |

---

## 12. References

**Technique**
- **Snaptrude** — three-tone extrusion shading (rect + top parallelogram + shaded side). The
  construction for assembly scenes.
- **QuEra** — dark glass spheres, volumetric core-to-rim gradients. Best "solid, occupies
  volume" material reference, and easy in SVG.
- **Playdate** — the only confirmed realtime 3D hero found. Proves the point: when a brand
  genuinely needs real 3D, they write a custom renderer. Do not do this.
- **PorscheLab** — the autoplay-once-then-stepped-states architecture, worth reading.

**Material**
- **Raycast** — frosted glass cards.
- **Lithic** — glossy card plastic.
- **Oura** — true chrome. Hard in SVG; the ceiling.

**Feel**
- **Daylight Computer** — tell progress by re-lighting one object, not by adding decoration.
- **Teenage Engineering** — trust the object, let the page get out of the way.

**Interaction**
- **Buildkite** — blocks cycling states. Note: it is flat DOM+CSS and its numbers are
  client-side simulation. Take the *feel*, not the dimensionality.

---

## 13. BUILD DIRECTIVES

These are instructions. Execute in this order.

### 13.1 Build all three variants

Build A, B and C. All three ship, all three are complete, all three satisfy §3.1 and §4.

Do not stub one to ship sooner. The point of building all three is comparing them honestly —
a stubbed variant is not comparable and produces a decision made on incomplete evidence.

### 13.2 Build the comparison popup and ship it on the frontend

A visible, user-facing control that switches the live scene between the three variants. It is
part of the deliverable, not a debug tool. See §3.4 for behaviour, §3.5 for responsive and
§8.4 for the stage-copy fork (already resolved — see below).

It is also **gated by a directive that has not yet been issued.** Build it visible now.

### 13.3 Popup lifecycle — this is a temporary scaffold with a known end state

The popup exists to support a decision. When a single variant is chosen, it comes out. Plan
for that removal now, because retrofitting it is how sites end up shipping three dead scenes
forever.

**Build so that removal is a deletion, not a refactor:**

- Each variant lives in its own file/module. No variant imports from another variant.
- Variants are lazily loaded via dynamic import. They are never in the main bundle.
- The variant registry is a single list. Adding or removing an entry is the only change.
- The scene contract component (§3.1) and the parent state owner (§3.2) must not import or
  reference any specific variant. They address variants only through the registry, keyed by
  id from the URL param or popup selection.
- Therefore removal = delete two variant files, delete the popup component, delete one
  registry entry. No edits to the contract, the state owner, or any other variant.

**Acceptance test for removal (must pass before shipping):** after deleting a variant, the
remaining variant works identically, and the production bundle contains no trace of the
deleted one. Verify by inspecting the built output, not by reading the source.

**Archive before deleting.** Move the removed variant files and the popup to an archive
location outside the build path (e.g. `archive/hero-variants/`) so the work is recoverable
but cannot be imported accidentally. Keep them in version control with a short README
explaining how to restore. Do not leave them in a commented-out import — that rots.

**After removal, also update this document** to mark which variant shipped and record the
popup's removal date.

### 13.4 Site-wide visual consistency is part of this task

**After the scene is built, go back through the rest of the site and bring it into line with
it.** This is explicitly in scope, not a follow-up. Specifically:

- Establish a **styles system** (§5.5) and migrate the existing site onto it.
- The hero scene and the site's other components must share one material language. A matte
  hero next to glossy components reads as imported from another brand.
- If the existing site already has a palette, the scene adapts to it — not the reverse.
- Do not restyle the whole site beyond what is needed for coherence with the scene. Scope
  creep here makes the change unreviewable.

### 13.5 Theme switching must work at runtime

The light↔dark switch is a hard requirement and must work on the built scene without a
rebuild or a reload. See §5.5.

### 13.6 Stage copy — decided

**Each stage reveals its own copy panel.** This is settled: the stage labels are a
`role="tablist"` per §8. The `role="group"` fallback in §8.4 does not apply.

### 13.7 Material selection lives in the popup too

The popup selects **concept and material independently** — a concept picker and a material
picker, two separate controls (§3.4). Material is a CSS custom-property swap and must not
cause a component re-mount or a bundle change. Available range: matte, satin, glass — with
the honest cost gradient in §5, which the builder should apply: prefer the heaviest material
on components rather than on the hero if performance suffers.

### 13.8 Deploy publicly

Build and deploy to a public URL so the variants, the popup, the material options and the
light/dark switch can all be reviewed on a live link. Report the URL.

Review on a real mobile device as well as desktop — §3.5 and §7.5 are where mobile breaks
first, and a desktop-only review will miss it.

---

## 14. Open decisions

**Resolved by directive** — recorded here so the reasoning is not lost:

- Stage copy fork → **each stage reveals its own copy** (§8 tablist path; §13.6)
- Popup → **ships visible on the frontend**, removed later by explicit directive (§13.2)
- Build order → **all three variants**, not one first (§13.1)
- Materials → **selectable in the popup** alongside concept (§13.7)
- Deployment → **public live URL** for review (§13.8)

**Still open:**

- Which variant is the production default — decided after reviewing the live build. Not a
  pre-build question; it is the reason the popup exists.
- Final material for the site, and therefore whether Variant A's matte is compatible with the
  existing components. Resolve during §13.4, not before.
- Whether the stage labels' copy is shortened to the single word per stage, or kept as the
  full line. Both are supported; the full line gives each panel more to say.

**When the choice is made**, execute the removal protocol in §13.3, then update this section
to record the decision and the date.
