# Changelog

All notable changes to VolumeWar are documented here.

## [1.0.0] - 2026-07-19

### Added

- Standalone responsive VolumeWar interface with a custom cartoon speaker and music bars.
- Ten randomized volume sabotage behaviors with attempt tracking and surrender after ten attempts.
- Explicit Web Audio start/stop controls and a gain-capped generated synth.
- Pointer, touch, keyboard, reset, accessible status, and reduced-motion support.
- Pure state tests and static production-contract checks.
- Host-neutral production artifact generation with local-asset validation and a 128 KiB size budget.

### Security

- Added a restrictive static-site Content Security Policy and no-referrer policy.
- Removed dynamic HTML updates from runtime status rendering.
- Documented and ignored environment, key, signing, cache, coverage, build, and hosting state.
