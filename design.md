# Design — MealPlan

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

Theme is **Hum** (Hallmark catalog, playful genre) plus a **dark variant
constructed for this project**. Hum's published spec is light-only; the dark half
below is original work for MealPlan and is not canonical Hum. It is built as a
role inversion so both modes share the same two anchor colours.

## Genre

playful

## Macrostructure family

Every route in this app is an *app page*. There are no marketing pages and no
content pages. Function carries every screen.

- App pages: **Workbench** — the tool surface is the page. Variation knobs:
  the header treatment, the rail/list spine, and which accent owns the route.
- `/meals` additionally rides a **day-rail spine** (Hum's Narrative Workflow
  lever) because days are genuinely sequential. The rail is the page's structure,
  not decoration.
- Marketing pages: none. If one is ever added, it may use Marquee Hero or
  Bento Grid and Tier-A/Tier-B enrichment. Amend this file first.
- Content pages: none.

## Theme

Two modes. `:root` is light; `.dark` on `<html>` is the constructed dark variant.
The toggle is optional and user-facing (system / light / dark), owned by
`src/hooks/useTheme.ts`.

### Light (canonical Hum)

- `--color-paper`      oklch(97% 0.012 95)   — cream, pear-yellow pull
- `--color-paper-2`    oklch(94% 0.016 95)   — tinted band
- `--color-paper-3`    oklch(91% 0.020 95)   — deeper hover
- `--color-ink`        oklch(20% 0.012 250)  — near-black, cool tilt
- `--color-accent`        oklch(86% 0.18 95)    — pear (primary action)
- `--color-accent-deep`   oklch(76% 0.20 95)    — pear button edge
- `--color-accent-2`      oklch(66% 0.18 235)   — sky-cyan (tints, shopping)
- `--color-accent-2-deep` oklch(54% 0.16 235)
- `--color-accent-3`      oklch(68% 0.24 18)    — coral (one moment per page)
- `--color-accent-3-deep` oklch(55% 0.21 18)
- `--color-mint`          oklch(80% 0.16 150)   — success, todos
- `--color-mint-deep`     oklch(66% 0.15 150)
- `--color-lavender`      oklch(74% 0.16 305)   — occasional tag chips
- `--color-lavender-deep` oklch(61% 0.15 305)
- `--color-link`          oklch(50% 0.15 240)   — cyan darkened for text contrast
- `--color-focus`         oklch(50% 0.15 240)

### The colour-mix rule (learned the hard way)

**Never derive a dark partner with `color-mix(in oklch, <accent>, <ink>)`.** `oklch`
interpolates *hue* along the shorter arc: coral (H18) blended toward ink (H250)
swings backwards through **H340 — magenta**. The first build's today-marker edge
computed to `oklch(0.536 0.17 339.6)`, a bright pink, which is why it read as a
gradient blob.

Two rules follow, and both are load-bearing:

1. Every accent ships an explicit `-deep` partner at the **same hue**, hand-set
   above. Use those for button edges and markers.
2. Any remaining blend between two different hues uses **`color-mix(in oklab, …)`**.
   oklab is rectangular — it blends straight through without rotating hue. This is
   why `--color-ink-2` and `--color-rule` (ink H250 toward paper H95) are oklab.

Mixing with `transparent` is safe in either space, but this project uses oklab
throughout for consistency.

### Dark (constructed for MealPlan — not canonical Hum)

The inversion: Hum's cream becomes the ink, Hum's ink becomes the paper. The two
anchor colours keep their identity and swap roles. Accents keep their jobs; the
cool accents lift in lightness to hold contrast against the dark ground, and pear
barely moves because it is already the brightest thing in the palette.

- `--color-paper`      oklch(21% 0.014 250)  — the ink family, lifted. Never pure black.
- `--color-paper-2`    oklch(25% 0.016 250)
- `--color-paper-3`    oklch(30% 0.018 250)
- `--color-ink`        oklch(94% 0.012 95)   — the cream, as text. Never pure white.
- `--color-accent`     oklch(84% 0.17 95)    — pear, barely dialed back
- `--color-accent-deep`oklch(70% 0.19 95)
- `--color-accent-2`   oklch(74% 0.15 235)   — cyan lifted for dark ground
- `--color-accent-3`   oklch(70% 0.22 18)    — coral lifted
- `--color-mint`       oklch(78% 0.15 150)
- `--color-lavender`   oklch(76% 0.15 305)
- `--color-link`       oklch(78% 0.13 235)   — cyan lifted, not darkened
- `--color-focus`      oklch(78% 0.13 235)

### Derived in both modes

Ink is modified with `color-mix`, never with new literal colours (Hum's
micro-craft rule — fewer colours, used consistently).

- `--color-ink-2`   color-mix(in oklch, ink 62%, paper)  — muted body / labels
- `--color-rule`    color-mix(in oklch, ink 14%, paper)  — hairlines, dashed seams
- `--color-accent-ink` oklch(20% 0.012 250) — text on pear. Pear is light in both
  modes, so its text colour does not invert.

### Accent-per-route

Each accent owns its own surface (Hum's three-rule). No accent-to-accent
gradients, anywhere, ever.

| Route | Accent | Meaning |
|---|---|---|
| `/meals` | pear | the primary product surface |
| `/shopping` | cyan | the gathering / list surface |
| `/todos` | mint | done-ness, success |
| `/settings` | neutral | no accent; quiet by design |

**Pear always owns the primary action**, on every route, regardless of which
accent tints that route's surfaces. The route accent is a *surface* tint; it does
not repaint the CTA. (Hum's three-rule: pear = primary action, cyan = link /
hover-tint, coral = the one high-energy moment.)

**Mint always means done-ness**, app-wide — not just on `/todos`. Every checkbox
in the app fills mint when checked, on both the shopping list and the todo list.
One accent, one meaning, everywhere.

**Coral is reserved.** It marks the single high-energy moment per page — today's
day marker on `/meals`, and the star-burst on primary action complete. It is
never a section background and never a third decorative colour. Text on coral
uses `--color-on-coral` (`oklch(99% 0.006 95)`) — tinted toward the anchor hue,
never a zero-chroma white, which reads flat.

## Typography

No serif anywhere. Hum has no serif — if one appears, the theme is misapplied.
This replaces the project's previous Playfair Display + DM Sans pairing.

- Display: Plus Jakarta Sans, weight 600, style normal
- Body:    Plus Jakarta Sans, weight 400 (500 for inline emphasis)
- Mono:    JetBrains Mono, weight 400/500 — uppercase labels, tabular numerals
- Display tracking: -0.025em
- Type scale anchor: `--text-display` = clamp(2rem, 6vw + 0.5rem, 3.25rem)
- Big counters: clamp(3rem, 5vw + 1rem, 5rem), tabular-nums
- All-caps is reserved for mono labels. Max 3 type levels per screen.
- Headings are always roman. Emphasis comes from weight, accent colour, or the
  clipped-background highlighter — never italic.

## Spacing

Two scales, both 4-point, and it is worth being precise about which is which:

- The **component layer** (`globals.css`) uses the named `--space-*` tokens from
  `tokens.css` — `var(--space-md)`, never raw values.
- **Component markup** uses Tailwind's spacing utilities (`p-3`, `gap-2`), which
  are the same 4-point scale. Tailwind's half-steps (`gap-1.5` = 6px, `mt-0.5` =
  2px) are used sparingly for optical fixes and are the one place the strict
  4-point rule bends.

Do not write raw pixel padding in either layer.

## Emphasis highlighter

`.hl` paints a clipped background gradient on the text itself with
`box-decoration-break: clone`, so it tracks across line breaks and scales with
font-size. Never an absolutely-positioned `::after` bar.

Geometry is `background-size: 100% 0.30em; background-position: 0 96%` — **not**
Hum's published `0.32em / 82%`, which assumes display-size type. At body sizes
the spec value lands the band across the baseline and reads as a *strikethrough*.
Verified visually at 14px before shipping.

## Motion

Motion is mandatory in Hum — every interactive element has some state response.

- Easings:
  - `--ease-press`  cubic-bezier(0.2, 0.7, 0.3, 1)   — button press
  - `--ease-spring` cubic-bezier(0.34, 1.56, 0.64, 1) — card lift
  - `--ease-snap`   cubic-bezier(0.22, 1, 0.36, 1)    — reveals, tick-ups
  - `--ease-out`    cubic-bezier(0.16, 1, 0.3, 1)
- Reveal pattern: fade + 12px rise on view-enter, 600ms, 80ms stagger. Sparingly.
- Reduced-motion fallback: opacity-only, ≤ 150 ms. Counters render final value
  instantly. Character mark stops pulsing. Star-burst disabled entirely. The app
  must remain delightful with reduced motion — restraint, not breakage.
- Animate `transform` and `opacity` only. Never layout properties.

## Microinteractions stance

- Silent success. No celebratory toasts.
- Optimistic update + Undo over confirmation dialogs.
- Hover tooltips delay 800 ms; focus tooltips 0 ms.
- Focus rings show instantly and are never animated.
- One character moment per page. One star-burst per completed primary action.

## CTA voice

The `.btn` system is copied verbatim from Hum's reviewed spec. Do not
re-improvise button CSS per component.

- Primary CTA: `.btn` push — pear face, solid colour edge (`0 4px 0 0` edge, full
  width, **never a negative spread**) + a soft cast shadow. Lifts 2px on hover,
  **presses DOWN 3px on `:active`**. The press is the feedback. No scale, no
  spring overshoot on buttons.
- Secondary CTA: `.btn--soft` — flat lift, soft shadow, no colour edge.
- Tertiary: `.btn--outline` — hairline, accent fill sweeps up on hover.
- One push button per primary moment. Never stack three push buttons in a row.
- Copy: verbs, sentence case. "Add a meal", not "Add Meal Item".

## Per-page allowances

- App pages MUST NOT use hero enrichment — function carries the page.
- App pages MAY use one character moment (the empty state, the wordmark).
- Marketing pages: none exist. Amend this file before adding one.

## What pages MUST share

- The wordmark and its character mark.
- The `.btn` system and its press physics.
- The display + body fonts.
- The card radius and shadow physics.
- The route's accent, applied per the accent-per-route table.
- Coral's reservation as the single high-energy moment.
- The dashed-rule seam language.
- The bottom tab bar and compact top bar (mobile-first app chrome).

## What pages MAY differ on

- Which accent owns the route (per the table above).
- The list/rail spine — `/meals` uses the day rail; the others use flat lists.
- Density rhythm. Do not hold `--section-gap` constant across every screen.

## Deviations from Hallmark defaults, recorded

Two deliberate departures, both stated rather than silent:

1. **Nav archetype.** The playful genre's default is N7 Brutal slab, and it bans
   N5 Floating pill. Both are *marketing* navs. This is a mobile-first app with
   four destinations, so the chrome is a **bottom tab bar + compact top bar**.
   The N1a–N13 catalogue does not cover app chrome; forcing one would be worse
   design than deviating openly.
2. **Dark mode.** Hum ships no dark variant. The one above is original work for
   this project, built by inversion so it inherits Hum's disqualifiers rather
   than escaping them.
3. **Slop-test gate 13** (never more than one hover effect at a time). Hum's own
   motion table mandates lift + shadow on the button and lift + shadow + tint on
   cards. The theme spec is more specific than the general gate, so it wins.
4. **Slop-test gate 54** (no number or label beside a heading). The day rail puts
   the date numeral in a column left of the day name. Gate 54 targets the
   templated editorial "hanging header" tell (`01 · THE TOUR`); this is a
   timeline spine, and Hum explicitly endorses a numbered rail as a build's
   off-grid moment. Kept deliberately.
5. **Segmented control uses `aria-pressed` toggle buttons**, not
   `role="tablist"`/`role="tab"`. The full tab pattern owes the user
   roving-tabindex arrow-key navigation and a linked tabpanel; claiming the role
   without honouring them is worse for screen readers than not claiming it.

## Known gaps

- **Input helper-text slot does not reserve height.** Slop-test gate 39 asks for
  `min-height: 1lh` on the helper slot so an appearing error doesn't push the
  page down. Not implemented — the only field with an error slot today is the
  shared `Input`, and no current screen passes it an error. Worth doing before
  any real form validation lands.

## Mobile — the hard floor

This app is mobile-first and the brief named it explicitly. Every screen is
verified at 320 / 375 / 414 / 768 px.

- `overflow-x: clip` on both `html` and `body`. Never `hidden`.
- No two-line clickable text — tabs, buttons, links.
- Grid tracks that hold content use `minmax(0, 1fr)`, never bare `1fr`.
- Display headers wrap inside long words: `overflow-wrap: anywhere; min-width: 0`.
- 44px minimum tap targets (already a project convention — preserved).
- Safe-area insets preserved for notched devices, including the bottom tab bar.
- 16px minimum font-size on inputs to prevent iOS zoom (preserved).

## Exports

Drop-in formats for re-using this design system in other projects.
The live values are in `tokens.css` at the project root.

### tokens.css

See `tokens.css` — it is the source of truth for values. Both `:root` (light)
and `.dark` (constructed dark) blocks are defined there.

### Tailwind v4 `@theme`

The project is Tailwind v4. `src/styles/globals.css` maps these tokens into
`@theme` so utilities resolve against the Hum palette. The `@import "tailwindcss"`
directive and the `dark` custom variant are preserved — that file is append-only.
