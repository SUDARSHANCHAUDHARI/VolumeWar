# VolumeWar

VolumeWar is a standalone, dependency-free web audio game about a cartoon speaker that refuses to be turned down. Every lowering attempt triggers one randomly ordered act of sabotage. After ten attempts, the speaker surrenders and zero volume becomes available.

The source repository remains private until Sudarshan explicitly approves a public launch.

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

## Run locally

No install or build step is required. Start any static file server from the project folder:

```bash
pnpm serve
```

Then open [http://localhost:4173](http://localhost:4173).

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

## Privacy

VolumeWar runs entirely in the browser. It uses no analytics, cookies, remote fonts, network APIs, or uploaded audio.
