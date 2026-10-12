# Advanced motion

Read this file when the core motion rules in `SKILL.md` aren't enough — building drag/gesture interactions, reaching for springs, debugging dropped frames, animating with `clip-path`, or working in a specific motion library.

## Contents

- [Springs](#springs)
- [`clip-path` for animation](#clip-path-for-animation)
- [Transform specifics](#transform-specifics)
- [Gestures and drag](#gestures-and-drag)
- [Performance under load](#performance-under-load)
- [Modern CSS entry animations](#modern-css-entry-animations)
- [Cohesion](#cohesion)
- [Framework notes](#framework-notes)

## Springs

Springs simulate physics, so they feel alive and remain interruptible mid-motion. CSS animations and keyframes restart from zero when interrupted; springs maintain velocity.

Use springs for drag interactions with momentum, elements that should feel alive (Apple-style Dynamic Island), gestures that can be reversed mid-animation, and decorative cursor- or scroll-tracking effects.

Apple-style config is easier to reason about than mass/stiffness/damping:

```js
{ type: "spring", duration: 0.5, bounce: 0.2 }
```

Keep `bounce` in `0.1–0.3`. For most professional UI, set `bounce: 0`. Reserve visible bounce for drag-to-dismiss and playful interactions. Icon swaps use `bounce: 0` always — bounce on icons reads as a glitch.

## `clip-path` for animation

`clip-path: inset(top right bottom left)` is hardware-accelerated and reveals content without DOM tricks.

Use it for hold-to-confirm progress fills (`inset(0 100% 0 0)` → `inset(0 0 0 0)` over 2s linear, snap back on release), scroll-triggered image reveals (`inset(0 0 100% 0)` → `inset(0 0 0 0)`), tabs with seamless color transitions (duplicate the active styling and clip the copy), and comparison sliders without extra DOM.

## Transform specifics

- `translateY(100%)` moves an element by its own height. Prefer percentages over pixels for off-screen positioning.
- `scale()` scales children too. A pressed button shrinks its content proportionally.
- 3D transforms with `transform-style: preserve-3d` and `rotateX/rotateY` enable depth effects without JavaScript.
- Every element has a `transform-origin`. Default is `center`. Set it to match where the trigger lives for origin-aware popovers.

## Gestures and drag

- **Momentum-based dismissal.** Compute velocity (`distance / elapsedTime`). If it exceeds ~`0.11`, dismiss regardless of distance.
- **Damping at boundaries.** Past natural limits, reduce movement instead of stopping cold.
- **Pointer capture.** Once a drag begins, capture pointer events on the element so dragging continues even when the pointer leaves the bounds.
- **Multi-touch protection.** Ignore additional touch points after the first.
- **Friction over hard stops.** When a drag direction is invalid, apply increasing friction.

## Performance under load

- Animate `transform`, `opacity`, and `filter` only. Anything else triggers layout or paint.
- **CSS animations beat JS under load.** Predetermined animations should be CSS; only dynamic, interruptible animations need JS.
- **WAAPI** (`element.animate(...)`) is the middle ground — JS control with CSS performance.
- **Avoid mutating CSS variables on parents to drive animation.** It recalculates styles for every child. Mutate `transform` directly on the moving element instead.

## Modern CSS entry animations

`@starting-style` lets the browser handle enter animations without a JS `mounted` flag.

```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 400ms ease, transform 400ms ease;

  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

Fall back to a `data-mounted` attribute set in `useEffect` only when browser support is insufficient.

## Cohesion

Motion has personality. Match the curve and timing to the aesthetic direction:

- Crisp, professional UI: `ease-out`, 150–200ms.
- Elegant, editorial: `ease`, slightly longer, no bounce.
- Playful: spring with subtle bounce, slightly longer.

If the animation style doesn't match the rest of the design language, it reads as a mistake even when each piece is technically correct.

## Framework notes

These apply only when using the named library.

**Framer Motion / Motion** — the shorthand props (`x`, `y`, `scale`) are *not* hardware-accelerated. They run on the main thread via `requestAnimationFrame` and drop frames under load. When smoothness matters under heavy main-thread work, use the full transform string:

```jsx
// Drops frames under load
<motion.div animate={{ x: 100 }} />

// Hardware-accelerated, smooth under load
<motion.div animate={{ transform: "translateX(100px)" }} />
```

For default-state elements that shouldn't animate on first render, use `<AnimatePresence initial={false}>`. Verify it doesn't suppress an intentional entrance animation.

For icon swaps with a motion library, use `{ type: "spring", duration: 0.3, bounce: 0 }`.
