# Anti-patterns to avoid

Read this file when reviewing UI for "AI-default" tells, when a generated design feels generic, or when you need a checklist of things to avoid before shipping.

## Contents

- [Color and mood](#color-and-mood)
- [Layout](#layout)
- [Typography](#typography)
- [Components](#components)
- [Decoration](#decoration)
- [Content](#content)
- [Hierarchy](#hierarchy)
- [Spacing and rhythm](#spacing-and-rhythm)
- [Product UI](#product-ui)
- [Code](#code)
- [Short rule of thumb](#short-rule-of-thumb)

Each item below marks UI as AI-generated. Each one breaks at least one principle in the main skill.

## Color and mood

- Purple, indigo, or blue-to-purple gradients as the default brand look
- Gradient text in hero headings
- Gradient buttons that look like startup template UI
- Neon glow, blurred blobs, glowing orbs as default decoration
- Pure black backgrounds with electric accent colors
- Random bright colors with no semantic meaning

## Layout

- Card soup — everything wrapped in a card
- 3-column feature grids with the same card repeated three or six times
- Centered hero, centered features, centered everything
- Identical section spacing top to bottom
- Cookie-cutter structure: hero → features → testimonials → pricing → CTA
- Bento grids used regardless of content fit
- Dashboards as stacked widgets with no focal point

## Typography

- Inter (or Roboto, Arial, system-ui, Space Grotesk) used by default without thought
- Too many sizes and weights on one screen
- Body text too small to read
- Oversized headlines that say nothing specific
- All-caps labels everywhere for fake polish
- Muted gray used so often it loses meaning

## Components

- Icons in colored circles for every feature
- Generic pill badges everywhere
- Same border radius on every element
- Heavy shadows used as fake depth
- Gray borders on every component
- Multiple CTAs of equal weight
- Fake chat or command-bar UI added because "AI products have those"
- Left-edge colored bars or glow as the only signal for active, selected, or "suggested" state on nav items, sidebar rows, tabs, cards, pills, or tips. Creates ambiguous hierarchy when adjacent items each carry a competing accent. Use background tint, icon state, or typography weight shift instead; reserve top or bottom borders for section grouping, not per-item status.

## Decoration

- Decorative blobs and shapes added with no purpose
- Floating dots, sparkles, waves, abstract SVG shapes used as default polish
- Emoji as a design system
- Glassmorphism and translucent layers stacked everywhere
- Gradient borders around cards and buttons
- Noise textures used everywhere instead of as deliberate atmosphere

## Content

- "Build smarter," "Unlock the power of AI," "Transform your workflow"
- Value propositions that could belong to any startup
- Every feature described in the same sentence structure
- Labels like "AI-powered" or "next-gen" instead of actual explanation

## Hierarchy

- Everything has equal visual weight
- No obvious primary action
- Accent color used on so many things that nothing stands out
- Cards, charts, filters, and tables all competing at once

## Spacing and rhythm

- Same padding on every component regardless of density
- Same margin between every section regardless of importance
- Random values that look "about right" but follow no system

## Product UI

- Designing every product like a marketing site
- Charts everywhere when a number would do
- Long forms dumped on one screen
- Empty states that just say "No data"
- Missing hover, focus, active, or disabled states
- Mobile layouts that are just narrower desktops

## Code

- Hardcoded color, spacing, and radius values
- No tokens or design system variables
- Inconsistent component styles across screens
- Broken or missing dark mode
- No accessible focus states

## Short rule of thumb

If the UI has a purple gradient hero, card soup, Inter everywhere, icons in colored circles, centered everything, generic startup copy, the same radius on everything, and looks polished but forgettable after five seconds — it needs correction.
