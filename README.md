# Nazar — v2 design prototype

A clickable prototype of **Nazar**, a covert women's-safety app for India (HACK@BVP 8.0 · Social Impact & Women Safety · "Silent Surveillance").
It is built in **English and हिन्दी**, with accessibility in mind from the start.

## Run it

```bash
npm install
npm run dev            # local dev server
npm run build          # production build → dist/
npm run build:single   # one self-contained file → dist-single/index.html (share or host anywhere)
```

## Two views

- **Pitch layout** — the seven designed screens side by side with titles and captions, for the presentation.
  Every phone is interactive: tapping a tab, card or button continues in the live demo at that screen.
- **Try it live** — one phone that behaves like the app:
  - The calculator really calculates. Type **`1947 =`** (on screen or keyboard) to open Nazar.
  - **Quick exit** (top-right, or **Esc**) returns straight to a blank calculator.
  - Tabs, back arrows, cards and rows all navigate. A side panel lets presenters jump to any screen.

## Screens

| # | Screen | What works |
|---|--------|-----------|
| 01 | The Disguise | Stock-looking calculator (no Nazar styling), real maths, secret unlock |
| 02 | Safety Dashboard | No name shown, status ring, four cards, "Check my phone" runs a simulated scan |
| 03 | What can they see? | Summary strip + rows ordered by severity; rows expand with honest "check it yourself" guidance |
| 04 | Tracker following you | Map with generic stop labels, "Find it" signal meter, Play sound marked *May notice*, save report |
| 05 | Someone took the bait | Catch summary (photo, wrong PIN, time open) and bait list with on/off switches |
| 06 | Evidence Vault | Filters, timeline grouped by day, **real SHA-256 hash chain** fingerprints, export / share |
| 07 | Safe Order Action Plan | Tickable steps; stage status (Done / Next / When ready) updates as you go |

Every unlocked screen has Quick exit, the **181** Women Helpline and **112** Emergency (tap to call), and the tab bar *Home · Exposure · Vault · Plan*.

## Languages

All UI text lives in [`src/strings.ts`](src/strings.ts). The Hindi object is type-checked against English,
so the build fails if a string is missing. The toggle remembers the choice and sets `<html lang>`
so screen readers pronounce Hindi correctly. Devanagari text gets extra line height.

## Accessibility

- Semantic buttons, links, headings, lists and landmarks; skip link to content.
- Visible focus rings; focus moves to the new screen's heading after navigation.
- Status is never colour-only: every dot, chip and *Safe / May notice* pill has a text label.
- Text colours meet WCAG AA on the cream background; body text ≥ 15px, labels ≥ 13px; tap targets ≥ 44px.
- Live regions announce calculator results, scan progress, signal strength and confirmations.
- Bait toggles are real switches (`role="switch"`), plan steps are real checkboxes, filters use `aria-pressed`.
- Respects `prefers-reduced-motion` and Windows high-contrast (`forced-colors`).
- Full keyboard use, including typing on the calculator.

## Honesty notes

This is a **front-end prototype with sample data**. Detection, camera capture, encryption at rest and PDF export are
represented in the UI; the real implementations belong in the Android app described in the project brief.
Actions that would do something real in the app show a "Demo:" message here.

## Structure

```
src/
  strings.ts        all English + Hindi copy
  i18n.tsx          language context
  App.tsx           page chrome, pitch strip, live demo, toast
  components/       Phone frame, Shell (header, helplines, tabs), Pill
  screens/          Calculator, Dashboard, Exposure, Tracker, Bait, Vault, Plan
  styles.css        design tokens and all styles
```
