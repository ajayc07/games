# Progress

_Last updated: 2026-10-23 (Task 002 done)_

## Status
Skeleton plus shared services: InputManager (touch/keyboard/gamepad -> actions, control-ladder config), TouchControls, AudioManager (file or synth, voice cap), edge-to-edge height-locked scaling (D-013). The only screen is the Input Lab (modes 1-4 emulate the control ladder). Next: Task 003 (level engine + Grass 1).

## Roadmap (draft, architect may reorder)
| # | Task | Status |
|---|------|--------|
| 001 | Project setup: Vite + TS + Phaser, universe loader, PWA, Pages deploy | Done |
| 002 | Core input layer (touch/keyboard/gamepad -> actions) + audio manager | Done |
| 003 | Level engine + player physics + Grass 1 "Tap to hop" (auto-run, tap anywhere) | Next |
| 004 | Grass 2 "Big Jump button" + "watch me" demo system | Planned |
| 005 | Grass 3 "Left and Right" (no auto-run) | Planned |
| 006 | World map + stars + unlocking + per-universe progress storage | Planned |
| 007 | Character picker + 7-character cast with placeholders + asset import of real files | Planned |
| 008 | Minimal parent view (sound, button size, unlock-all) | Planned |
| 009+ | Level 4+ (move+jump), Power button, Pipe/Sky/Castle worlds, boss question, polish | Later |

## Done
- 2026-10-23: Planning, decisions D-001..D-011, starter pack, local repo created.
- 2026-10-23: Task 001 project setup (skeleton, universe registry, placeholder scene, PWA, deploy workflow).
- 2026-10-23: Character images moved to `src/universes/mario/assets/<id>.avif` and referenced from the manifest via `asset()` (commit b794b3e, outside the task flow).
- 2026-10-23: Task 002 input, audio, edge-to-edge scaling, Input Lab.

## In progress
_(nothing)_

## Open questions
- Screens wider than 2.33:1 (e.g. 1366x512) get thin sky-coloured side bars because D-013 caps width at 1680; Task 002 acceptance asked for no bars there. Raising `MAX_WIDTH` in `src/core/ui/layoutMath.ts` (e.g. to 1920) would remove them. Architect to decide.
- Phaser logs "Ignored attempt to cancel a touchcancel event" in the console when a touch is cancelled (Phaser calls preventDefault on it). Harmless.
- Canvas renders at logical resolution (e.g. 1558x720 on a phone), so it is slightly soft on high-DPI screens. Revisit if art looks blurry.
- Service worker uses a hand-written `src/sw.ts` (injectManifest) because workbox's generated SW breaks when the local path contains an apostrophe ("Athi's Game"). Fine on CI. Keep in mind if the PWA setup changes.
- Not yet tested on a real phone/tablet (iOS Safari especially: fullscreen display, audio unlock, double-tap zoom).
- Bowser as player vs castle boss: settle later (friendly race, or swap boss when Bowser is chosen).
- Unlock rule: 2-3 levels open at a time is the default; confirm after device testing.
- Real PNGs/voices for the 7 characters: parent will supply (transparent PNG ~512px tall, 3 short sounds each). Not blocking.

## Asset notes (architect, 2026-10-23)
- Parent added 7 character images (originally `public/images/character-<name>.avif`). Code already moved them to `src/universes/mario/assets/<id>.avif` (mario, luigi, peach, toad, bowser, yoshi, donkeykong) and the manifest references them with `asset('<id>.avif')`. All are 600x844, transparent, one hero pose each (Mario/Luigi jump pose, Yoshi mid-run, Peach/Toad floating, Bowser/DK standing, front-ish view).
- Characters occupy different amounts of their canvas, so normalise by display height per character in the manifest (e.g. `displayHeight`), do not edit the files.
- Plan for Task 007: optionally move them into an `assets/characters/` subfolder, and convert AVIF to WebP (alpha, quality about 90) for wider browser support, unless the parent says all his devices handle AVIF.
- No side-view run poses yet; use bob/stretch/flip tricks (ARCHITECTURE.md). Side-view images may be added later as `run` poses.

## Parent action items
- Enable GitHub Pages: repo Settings -> Pages -> Source: "GitHub Actions" (needed before first deploy works).
- After pushing Task 002, try on the tablet (https://ajayc07.github.io/games/):
  - Open the site, add to home screen, run in landscape.
  - Modes 1 to 4 (small icons top right): are the buttons comfortably big for small hands? Try `?buttonScale=1.3` and `?buttonScale=0.8` (add to the URL in the browser).
  - Does a thumb slide from Left to Right feel natural? Any stuck buttons? Any audio problem on first tap (the small light next to the action lights turns green when sound is on)?
- Push the local repo to `origin` (https://github.com/ajayc07/games.git) after each task.

## Device test notes (parent fills in after trying on the tablet)
Format: date, device, what he did, what confused him, what bored him, what he loved.
_(none yet)_
