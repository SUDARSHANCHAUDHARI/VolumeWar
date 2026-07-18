# VolumeWar Agent Guide

## Project shape

- Dependency-free static HTML, CSS, SVG, and classic JavaScript.
- `game-state.js` owns game rules and must remain independently testable in Node.
- `script.js` owns DOM rendering, keyboard/pointer input, and Web Audio lifecycle.
- There is no build output to commit.

## Invariants

- Never create or resume an `AudioContext` before an explicit user interaction.
- Keep `SafeSynth.MAX_GAIN` at or below `0.08` unless the user explicitly approves a reviewed safety change.
- Preserve native controls, keyboard behavior, focus visibility, live status announcements, and reduced-motion support.
- Keep the app offline-capable: no remote fonts, trackers, samples, or runtime network calls.
- Do not introduce dynamic HTML rendering when `textContent` or DOM APIs are sufficient.

## Verification

Run the complete release gate before handoff:

```bash
pnpm check
```

For visible changes, also perform manual keyboard, responsive-layout, reduced-motion, and audio start/stop checks in current browsers. Do not commit secrets, `.env*`, hosting state, caches, coverage, or generated output.
