---
name: core-design
description: Generates and reviews frontend UI that avoids generic AI-default aesthetics. Use when building or critiquing components, pages, dashboards, marketing sites, design systems, or any HTML/CSS/React/Vue/Svelte interface, or when the user mentions hierarchy, typography, spacing, color, layout, motion, or polish.
license: MIT
---

# Core Design

Generate and review frontend UI that feels considered rather than generic. The default AI aesthetic — purple gradients, card soup, Inter everywhere, icons in colored circles, centered everything — is the failure mode this skill exists to prevent.

## Contents

- [How to use](#how-to-use)
- [Non-negotiables](#non-negotiables)
- [Aesthetic direction](#aesthetic-direction)
- [Visual hierarchy](#visual-hierarchy)
- [Spacing](#spacing)
- [Typography](#typography)
- [Color](#color)
- [Layout](#layout)
- [Components](#components)
- [Motion](#motion)
- [Polish details](#polish-details)
- [Output expectations](#output-expectations)
- [Review checklist](#review-checklist)

Detailed reference material lives in `references/`:
- `references/anti-patterns.md` — the catalog of AI-default tells to avoid. Read when reviewing UI for genericness or before shipping.
- `references/advanced-motion.md` — springs, `clip-path`, gestures, performance under load, framework-specific notes. Read when the core motion rules below are not enough.

## How to use

1. Read the [Non-negotiables](#non-negotiables) before writing code.
2. Pick a clear aesthetic direction (see [Aesthetic direction](#aesthetic-direction)).
3. Apply principles in priority order: **hierarchy → spacing → typography → color → components → motion → polish**.
4. Run the [Review checklist](#review-checklist) before finishing.
5. Verify nothing in `references/anti-patterns.md` is present in the output.

**Conflict resolution.** When rules conflict, prefer clarity, hierarchy, and accessibility over style.

**Existing design systems.** If the product already has a strong design system, follow it. Override only when it violates accessibility or clarity.

**Framework-neutral.** Applies regardless of CSS method — vanilla, Tailwind, CSS Modules, CSS-in-JS. Prefer design tokens or CSS variables over hardcoded values in every method. Framework-specific motion guidance lives in `references/advanced-motion.md`.

## Non-negotiables

The rules that prevent the most common AI-generated UI mistakes. Apply in priority order: **hierarchy → spacing → typography → color → components → motion**.

1. One primary action per screen. Secondary actions look secondary.
2. One accent color. Neutrals do everything else.
3. Two font families maximum; one is often enough.
4. Inner radius = outer radius − inset (padding, border, or gap).
5. Group with proximity, not borders. Use shadows or background tone for depth.
6. Animate `transform`, `opacity`, and `filter` only. Never `transition: all`.
7. UI motion uses `ease-out` or a custom curve; default duration ≤ 300ms.
8. Touch targets ≥ 44×44px. Every interactive element has a visible focus ring.
9. Body text contrast ≥ 4.5:1. Never communicate state with color alone.
10. Design tokens or CSS variables for color, spacing, radius, and type — no magic values.

## Aesthetic direction

Generic UI happens when nothing is chosen. Commit to a direction before styling.

Pick one and execute it with intent: brutally minimal, editorial, refined/luxury, retro-futuristic, organic, playful, brutalist, industrial, soft/pastel.

Then ask:

- **Tone** — how should this feel? Calm, urgent, playful, serious?
- **Personality** — what single thing should someone remember?
- **Restraint** — what can be removed without losing meaning?

**Match complexity to the vision.** Maximalist directions need rich motion and layered detail. Minimalist directions need restraint and precise spacing. Mismatched complexity (sparse code on a maximalist brief, fussy code on a minimalist one) is what reads as generic.

## Visual hierarchy

The most under-applied skill in AI-generated UI. Without it, every element competes and nothing stands out.

**Establish hierarchy through size, weight, color, position, contrast, and whitespace** — in that order of leverage.

- One element dominates each screen. If two compete, demote one.
- Style secondary information secondarily — smaller, lighter, or muted.
- Group by proximity. Distance implies separation.
- Repeat patterns intentionally. Same button style for the same action everywhere.
- Reserve the accent color for the single most important thing.

Lean on **weight** more than size. 16px medium next to 16px regular often reads better than 18px next to 14px.

## Spacing

Pick a base unit (4px or 8px) and stick to multiples: 4, 8, 12, 16, 24, 32, 48, 64, 96. The point is consistency, not the specific scale.

- Tighter spacing for related items, looser between groups.
- Section padding varies by importance, not identical top to bottom.
- Vary card sizes when content priority varies.
- Negative space is active design.

## Typography

### Choosing fonts

- Two families maximum. Often one is enough.
- **Avoid the AI defaults by default** — Inter, Roboto, Arial, system-ui, Space Grotesk. Pick them deliberately when the brand calls for neutral, systematic typography (developer tools, system UI, deliberately quiet products); otherwise pick something with personality.
- Display fonts for 24px+. Body fonts for everything else.

### Scale, weight, readability

- 3–4 sizes total. Hero, heading, body, caption.
- Body 14–16px (16px is the safe default). Line height 1.5–1.6 for body, 1.05–1.2 for display.
- Line length 65–75 characters. Left-align body. Avoid web justification.
- `-webkit-font-smoothing: antialiased` at the root for macOS.
- `font-variant-numeric: tabular-nums` on any updating numbers.

## Color

### Restraint

- One accent color plus neutrals for most products.
- Reserve the accent for the most important action or state.
- Same color = same meaning across the product.
- Semantic colors: green = success, red = error, yellow/amber = warning, blue = info.

### Backgrounds and depth

- Avoid pure black (`#0A0A0A`–`#111` reads as black without harshness) and pure white for large surfaces.
- Use shadows or background tone shifts for depth, not borders. Multiple low-opacity shadows beat a single hard one.
- Image outlines: `1px` at `rgba(0, 0, 0, 0.1)` light / `rgba(255, 255, 255, 0.1)` dark. Tinted neutrals read as dirt.

### Atmosphere

Solid backgrounds aren't always enough. Atmosphere — texture, depth, subtle motion — separates considered UI from flat templates. Used without intent it becomes anti-pattern.

Acceptable when reinforcing the aesthetic direction: subtle noise/grain (1–3% opacity), geometric patterns or dot/grid backdrops, layered transparencies, dramatic directional shadows.

*Progressive enhancements* — use only when they clearly fit the direction and you've considered cost: gradient meshes, custom cursors (desktop only), animated noise.

If you cannot explain what the atmosphere reinforces, remove it.

### Accessibility

- Body text contrast ≥ 4.5:1. Large text (18pt+ or 14pt bold) ≥ 3:1.
- Never communicate state with color alone. Pair with icons, text, or shape.

## Layout

### Composition

- Asymmetry is allowed and often more interesting than symmetry. Use it intentionally.
- Break the grid in one or two places per page.
- Z-pattern scanning for marketing pages. F-pattern for text-heavy pages.

### Avoid the cookie-cutter landing page

Hero → 3-column features → testimonials → pricing → CTA, every section the same height, everything centered. Vary structure, alignment, and rhythm.

### Avoid card soup

A card creates a container; a container implies a thing. If the content is just text or a list, do not put it in a card. Cards earn their borders by representing distinct entities.

### Dashboards

- Establish a primary focus.
- Plain numbers often communicate more than charts. Use charts when comparison or trend matters.
- Mobile is a redesign, not a resize. Tables especially.

## Components

### Buttons

- One primary button per view. Secondary uses ghost or outline.
- Press: `transform: scale(0.96)` on `:active`. Subtle, instant feedback.
- Implement hover, focus-visible, active, and disabled states.
- Hit area ≥ 44×44px. Extend with a pseudo-element if the visible target is smaller.

### Inputs

- Labels above inputs, not as placeholders.
- Input height matches button height for visual rhythm.
- Inline error messages near the field, with a fix.

### Cards

- Outer radius = inner radius + inset. See [Concentric border radius](#concentric-border-radius).
- Earn the card. Don't wrap arbitrary content in one.
- Vary cards in size or weight when content priority varies.

### Navigation

- 3–7 top-level items. Push the rest into secondary navigation.
- Active state must be obvious. Hover alone isn't enough.
- Keyboard navigation works end to end.

### States

Always implement: default, hover, focus-visible, active, disabled, loading, empty, error, success.

Never use `outline: none` without replacing the focus ring. Empty states aren't "No data." — they explain what would be here and how to get something here.

**Don't signal active/selected state with a colored left bar alone.** It's a cliche, and adjacent items each carrying their own left accent creates competing hierarchies. Use background tint, icon state changes, or a typography weight shift. Reserve top/bottom borders for section grouping, not per-item status.

## Motion

Animation has a budget. Spend it where it pays off. For springs, gestures, `clip-path` techniques, performance under load, and framework-specific notes (Framer Motion, etc.), read `references/advanced-motion.md`.

### Should this animate?

| Frequency | Decision |
| --- | --- |
| 100+ times/day (keyboard shortcuts, command palette) | Do not animate |
| Tens of times/day (hover, list nav) | Minimize or remove |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare (onboarding, success, celebrations) | Can add delight |

If the user will see it constantly, it should be invisible.

### Easing

- `ease-out` for entrances and most UI. Feels instant.
- `ease-in-out` for elements moving across the screen.
- `ease` for color and hover changes.
- `linear` only for constant motion (spinners, marquees, progress).
- **Avoid `ease-in` for UI by default.** It starts slow and feels sluggish. Reserve for elements *exiting* in the direction of their motion.
- Built-in CSS easings are weak. Prefer custom curves:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

### Duration

| Element | Duration |
| --- | --- |
| Button press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers | 200–500ms |
| Marketing or explanatory | Can be longer |

UI animations stay under 300ms by default. Longer durations are acceptable when duration is part of the meaning (drag-to-confirm, large drawer transitions).

### Core rules

- Never animate from `scale(0)`. Start from `scale(0.95)` with `opacity: 0`.
- Popovers scale from their trigger, not center. Set `transform-origin` to the trigger location. Modals stay centered.
- Use CSS transitions for interruptible UI (toasts, hovers, dynamic state). Use keyframes only for sequences that run once.
- Split enter animations into staged chunks with ~50–100ms stagger.
- Exits should be subtler and faster than entrances.
- Animate icon swaps with opacity, scale (`0.25` → `1`), and a small blur (`4px` → `0`). Cross-fade with both icons in the DOM rather than toggling visibility.
- Only animate `transform`, `opacity`, and `filter`.
- Never use `transition: all`. Specify exact properties.
- Use `will-change` only on `transform`, `opacity`, or `filter`, and only when you observe stutter.

### Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Reduced motion ≠ no motion. Keep opacity and color transitions. Remove translation and scale.

Gate hover effects behind `@media (hover: hover) and (pointer: fine)` so touch devices don't trigger hover on tap.

## Polish details

The aggregate of small correct details is the difference between forgettable UI and UI that feels right.

- **Concentric radii** — see below.
- **Optical alignment** — when geometric centering looks off, nudge it. Play triangles, asymmetric icons, and many letterforms need adjustment.
- **Tabular numbers** for any updating value, to prevent layout shift.
- **Text balance** on headings; **`text-wrap: pretty`** on long body *as progressive enhancement* (narrower support — don't depend on it for layout integrity).
- **Image outlines** at 10% pure black or pure white only.
- **Scale on press** — `scale(0.96)` on `:active`. Never below `0.95`.
- **Asymmetric press timing** — slow on press when deliberate (hold-to-delete), snappy on release.
- **Stagger** — when many items enter, delay each by 30–80ms.
- **Blur to mask transitions** — a brief `filter: blur(2px)` smooths crossfades that look like two objects swapping.

### Concentric border radius

When a child sits inside a parent with rounded corners, the child's curve should continue the parent's curve — not create a second mismatched arc.

**Rule.** Inner radius = outer radius − inset. Inset is whatever pushes the child away from the parent's edge: padding, border, or gap.

Never use the same `border-radius` on parent and inner child unless the inset is `0`.

| Outer radius | Inset | Inner radius |
| --- | --- | --- |
| 24px | 4px | 20px |
| 16px | 2px | 14px |
| 12px | 8px | 4px |
| 8px | 8px | 0 (square) |

If the math gives a value at or below `0`, the child should be square — a sliver of curve reads as a mistake.

**Apply to:** cards inside panels, inner highlights and gradient overlays, skeleton loaders, image masks, nested buttons or chips, toolbars or inputs nested inside rounded surfaces.

```css
.panel {
  --radius: 16px;
  --pad: 8px;
  border-radius: var(--radius);
  padding: var(--pad);
}

.panel > .card {
  border-radius: calc(var(--radius) - var(--pad));
}
```

## Output expectations

When generating UI:

- Match the request — framework, scope, and intent.
- Commit to one aesthetic direction.
- Use design tokens or CSS variables for color, spacing, radius, type. No magic values.
- Establish hierarchy. One primary action per screen.
- Implement all states: default, hover, focus-visible, active, disabled, loading, empty, error, success.
- Be accessible: semantic HTML, keyboard navigable, ≥ 4.5:1 contrast, respects `prefers-reduced-motion`.
- Be responsive — mobile redesigned, not just resized.
- Animate sparingly: `transform`/`opacity`/`filter` only, specific transition properties, `ease-out` by default.
- Verify nothing in `references/anti-patterns.md` is present.

When reviewing UI, present findings as a markdown table with `Before | After | Why` columns, grouped by principle. Cite the file and property when not obvious from the snippet.

**Highest-leverage fixes first.** Lead with the two or three changes that move the design forward most — usually a hierarchy or spacing problem before a polish detail. Apply the priority order: hierarchy → spacing → typography → color → components → motion. Label lower-priority polish items clearly when an exhaustive pass is requested.

## Review checklist

**Hierarchy**
- [ ] One element clearly dominates each screen
- [ ] Secondary content is styled secondarily
- [ ] Related items grouped by proximity

**Typography**
- [ ] Two font families or fewer; not Inter/Roboto/Arial chosen by default
- [ ] 3–4 sizes; weight does most of the hierarchy work
- [ ] Body 14–16px, line height 1.5–1.6, line length 65–75 chars
- [ ] `text-wrap: balance` on headings; `pretty` on long body as progressive enhancement
- [ ] `font-variant-numeric: tabular-nums` on updating numbers
- [ ] `-webkit-font-smoothing: antialiased` at the root

**Spacing**
- [ ] Spacing follows a system (4 or 8 base)
- [ ] Padding varies by density and importance
- [ ] Sections have varied rhythm, not identical heights

**Color**
- [ ] One accent color reserved for the most important action
- [ ] Neutrals do the heavy lifting
- [ ] Semantic colors used consistently
- [ ] Body contrast ≥ 4.5:1; not relying on color alone

**Components**
- [ ] Concentric radii (inner = outer − inset)
- [ ] All interactive states implemented
- [ ] Hit areas ≥ 44×44px
- [ ] Cards represent distinct entities, not generic containers
- [ ] Visible focus ring; `outline: none` is replaced if used

**Motion**
- [ ] No `transition: all`
- [ ] `ease-out` or custom curve, not `ease-in`, for UI
- [ ] Durations under 300ms by default
- [ ] Animates `transform` / `opacity` / `filter` only
- [ ] No `scale(0)` entrances; no `transform-origin: center` on popovers
- [ ] `prefers-reduced-motion` honored
- [ ] Hover gated behind `@media (hover: hover) and (pointer: fine)` where it would misfire on touch

**Polish**
- [ ] Optical alignment where geometric is off
- [ ] Image outlines at 10% pure black or pure white
- [ ] Scale on press (`0.96`) where it benefits the interaction
- [ ] Nothing from `references/anti-patterns.md` is present
