# VolumeWar

> A playful web audio battle against a cartoon speaker that refuses to be turned down.

| Project detail | Value |
| --- | --- |
| Version | `1.0.0` |
| Status | Production-gated source; not publicly deployed |
| Repository | Private |
| Runtime dependencies | None |
| Author | [Sudarshan Chaudhari](https://github.com/SUDARSHANCHAUDHARI) |
| Studio | SudarshanTechLabs |

## Overview

VolumeWar is a standalone web audio game about a stubborn speaker with one rule: louder is better. Every lowering attempt triggers one randomly ordered act of sabotage. After ten attempts, the speaker surrenders and zero volume becomes available.

The project runs entirely in the browser using HTML, CSS, SVG, vanilla JavaScript, and the Web Audio API. The source repository remains private until Sudarshan explicitly approves a public launch.

## Features

- Cartoon speaker drawn with inline SVG
- Animated music bars, live volume percentage, range slider, and mute control
- Explicit **Start sound** and **Stop sound** controls—audio never autoplays
- Ten hostile volume reactions:
  - pushes the slider back up
  - hides the mute button
  - inflates the displayed percentage
  - grabs the slider
  - reverses the slider direction
  - raises the minimum volume
  - creates a second slider
  - says “I can’t hear you”
  - uses the music bars to shove the control
  - fakes a mute, then returns louder
- Attempt tracking and guaranteed surrender after ten lowering attempts
- Pointer, touch, and keyboard support
- Responsive layouts for desktop, tablet, and mobile
- Reduced-motion support through `prefers-reduced-motion`
- Full battle reset with audio cleanup
- Centralized, independently tested state engine

## Technology

| Area | Implementation |
| --- | --- |
| Markup | Semantic HTML5 and native form controls |
| Styling | Responsive CSS with custom properties and reduced-motion support |
| Graphics | Inline SVG speaker artwork and SVG favicon |
| Interaction | Vanilla JavaScript with no framework or runtime packages |
| Audio | Web Audio API oscillators, filters, and gain control |
| State | Pure game-state transitions in `game-state.js` |
| Tests | Node.js built-in `node:test` runner |
| Tooling | Node.js 18+ and pnpm 10.28.2 |
| Production | Host-neutral static artifact generated in `dist/` |

## Architecture

VolumeWar separates game rules from browser effects:

- `game-state.js` owns attempts, volume, sabotage ordering, mute state, and the final unlock rule. It has no DOM or audio dependency.
- `script.js` converts state into DOM updates, handles pointer and keyboard input, and owns the Web Audio lifecycle.
- `styles.css` renders responsive visual states and disables nonessential movement when reduced motion is requested.
- `scripts/build.js` validates local assets, enforces the artifact budget, and copies only deployable files into `dist/`.

This separation keeps random game behavior testable while ensuring the generated audio cannot override the safety cap.

## Getting started

### Prerequisites

- Node.js 18 or newer
- pnpm 10.28.2 or a compatible pnpm 10 release
- Python 3 for the included local static-server command
- A current browser with Web Audio API support

### Clone and run

The repository is private, so cloning requires an authorized GitHub account.

```bash
git clone https://github.com/SUDARSHANCHAUDHARI/VolumeWar.git
cd VolumeWar
pnpm check
pnpm serve
```

Then open [http://localhost:4173](http://localhost:4173).

No dependency installation is required. To start the server again later:

```bash
pnpm serve
```

You can also use another static server of your choice. The scripts are classic browser scripts rather than bundled modules, so the app can also be opened directly from `index.html` in modern browsers; a local server is recommended for consistent browser behavior.

## Controls

- **Start sound** creates and resumes the Web Audio context. This only runs from an explicit button interaction.
- **Stop sound** fades out the generated synth, stops its oscillators, and closes the audio context.
- **Reset battle** stops any running sound, clears every sabotage effect, resets the attempt counter, and shuffles a new trick order.
- **Mute** requests zero volume. Before the speaker surrenders, that counts as a lowering attempt.
- The range controls support pointer and touch input plus:
  - Arrow Left / Arrow Down: decrease by 1
  - Arrow Right / Arrow Up: increase by 1
  - Page Down / Page Up: decrease or increase by 10
  - Home / End: jump to the currently available minimum or maximum

Keyboard intent remains consistent even when the speaker visually reverses the range direction.

## Accessibility

- Native range inputs and buttons remain keyboard-focusable.
- Visible focus indicators are provided for interactive elements.
- Status and attempt changes are announced through live regions and progress semantics.
- The primary slider supports Arrow keys, Page Up/Down, Home, and End.
- Focus returns to a usable control when a sabotage action hides the mute button.
- `prefers-reduced-motion` removes continuous and decorative animation.
- Audio never starts automatically and can always be stopped explicitly.

## Audio safety

VolumeWar synthesizes a soft three-voice chord with the Web Audio API; it does not load or play external media. The final `GainNode` is capped at `0.08`, and the visible percentage is mapped to that cap with a gentle nonlinear curve. The initial 72% display therefore starts at roughly `0.049` final gain, not at full device output.

Device volume, headphones, speakers, browser processing, and hearing sensitivity still vary. Start with your hardware volume low.

## Project structure

```text
VolumeWar/
├── index.html                Semantic UI and inline speaker SVG
├── styles.css               Responsive art direction and motion states
├── game-state.js            Pure game state and sabotage rules
├── script.js                DOM rendering, input handling, and Web Audio
├── favicon.svg              Project icon
├── tests/
│   ├── game-state.test.js   State and unlock tests using node:test
│   └── project-contract.test.js
├── scripts/
│   └── build.js             Validated production artifact generator
├── package.json             Local serve and verification scripts
├── AGENTS.md                Project invariants and verification guide
├── CHANGELOG.md             User-facing release history
├── .editorconfig
├── .gitignore
└── README.md
```

The state engine uses a small UMD-style wrapper so the same functions work in a classic browser script and in Node tests without a build step. The UI keeps one authoritative `state` object and re-renders controls after each action. Audio is a separate adapter: it receives approved volume state but cannot decide game outcomes.

## Verification

Run syntax checks and the complete state test suite:

```bash
pnpm check
```

Or run only the tests:

```bash
pnpm test
```

The release gate checks JavaScript syntax, every sabotage path, the surrender rule, explicit audio startup, the gain cap, required accessibility hooks, reduced-motion coverage, the static Content Security Policy, risky dynamic-execution APIs, local production assets, and the artifact size budget. It then generates `dist/`.

## Static deployment

VolumeWar needs no compilation or server-side runtime. Generate the verified artifact with:

```bash
pnpm build
```

Deploy the generated `dist/` directory to a static host with `index.html` as the entry point. The build fails if HTML loads a remote runtime asset, references a missing local file, omits a required file from the artifact, or exceeds the 128 KiB uncompressed size budget.

For production hosting, configure these response headers at the platform level in addition to the in-document policy:

- `Content-Security-Policy`: mirror the policy declared in `index.html`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cross-Origin-Opener-Policy: same-origin`

Platform configuration is intentionally not included because the deployment provider has not been selected.

## Browser support

The project targets current versions of Chrome, Edge, Firefox, and Safari with Web Audio API support. If Web Audio is unavailable, the interface remains usable and reports that sound could not start.

## Security and privacy

VolumeWar runs entirely in the browser. It uses no analytics, cookies, remote fonts, network APIs, or uploaded audio.

The app also includes:

- A restrictive in-document Content Security Policy
- A no-referrer policy
- No dynamic HTML rendering or string execution
- No authentication, storage, tracking, or user-data collection
- A build failure for remote runtime assets or missing local assets

## Project documentation

- [CHANGELOG.md](CHANGELOG.md) records release-visible changes.
- [AGENTS.md](AGENTS.md) defines project invariants and verification requirements for coding agents.

## Author

VolumeWar was designed and developed by **Sudarshan Chaudhari**, an independent developer working through **SudarshanTechLabs**.

| Contact | Details |
| --- | --- |
| GitHub | [@SUDARSHANCHAUDHARI](https://github.com/SUDARSHANCHAUDHARI) |
| Development email | [sunny.sudarshan@gmail.com](mailto:sunny.sudarshan@gmail.com) |
| Business and legal email | [sudarshantechlabs@gmail.com](mailto:sudarshantechlabs@gmail.com) |
| Location | Bangkok, Thailand |

## License and ownership

Copyright © 2026 Sudarshan Chaudhari / SudarshanTechLabs.

This private repository does not currently include an open-source license. No permission is granted to copy, modify, distribute, sublicense, or sell the source unless the author adds a license or provides written authorization.
