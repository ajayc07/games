# Progress

_Last updated: 2026-10-24 (Task 003 done)_

## Status
First playable level. Data-driven level engine in `core/levels/` (JSON grid format, validation, shared physics, generic LevelScene with themes), Grass 1 "Tap to hop" (auto-run, tap anywhere to hop, 26 coins, two 1-tile gaps, cloud respawn, flag, stars, Replay/Home). Canvas renders at device resolution (up to 2x). Opening the app starts Grass 1; the Input Lab is behind `?lab=1`. Next: Task 004 (Grass 2 "Big Jump button" + demo system).

## Roadmap (draft, architect may reorder)
| # | Task | Status |
|---|------|--------|
| 001 | Project setup: Vite + TS + Phaser, universe loader, PWA, Pages deploy | Done |
| 002 | Core input layer (touch/keyboard/gamepad -> actions) + audio manager | Done |
| 003 | Level engine + player physics + Grass 1 "Tap to hop" (auto-run, tap anywhere) | Done |
| 004 | Grass 2 "Big Jump button" + "watch me" demo system | Next |
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
- 2026-10-24: Task 003 level engine and Grass 1 (plus MAX_WIDTH 1920 and high-DPI rendering).

## In progress
_(nothing)_

## Open questions
- Phaser logs "Ignored attempt to cancel a touchcancel event" in the console when a touch is cancelled (Phaser calls preventDefault on it). Harmless.
- High-DPI rendering (Task 003) zooms each scene's camera with origin (0, 0). Phaser's camera bounds and `startFollow` assume a centred origin, so scenes scroll by hand; children of screen-fixed containers need `setScrollFactor(0, 0, true)` or taps miss them. See ARCHITECTURE "Screen layout".
- Six voice clips (`mario-ha-ha.mp3`, `mario-yeah-ho.mp3`, `mario-yipee.mp3`, `luigi-haha.mp3`, `luigi-oh-yeah.mp3`, `luigi-yeah-ha-ha.mp3`) appeared in `src/universes/mario/assets/` during Task 003. Left uncommitted and unwired (real sounds are out of scope). They need mapping to pick/jump/win in the manifest (`sounds`), probably in Task 007. LevelScene already plays `character.sounds.jump` when set.
- Grass 1 tuning to confirm on the tablet: run speed 200, jump peak 2.5 tiles, gaps 1 tile. All in `grass-1.json` / `core/levels/physics.ts`.
- Character `displayHeight` values (manifest) were tuned by eye from screenshots: Toad 96, Mario/Yoshi 104, Luigi/Peach 108, DK 110, Bowser 112.
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
- After pushing Task 003, try Grass 1 on the tablet with Athi (https://ajayc07.github.io/games/, landscape):
  - Does he hop? Does he understand that tapping does something (the pulsing finger icon disappears after the first hop)?
  - Is the speed right, too slow or too fast? (About 45 s to the flag.)
  - Any frustration at the two small gaps (a fall floats him back on a cloud)? Does he enjoy the cloud or find it confusing?
  - Does he notice the coins and the stars at the end? Does he find Replay without help? (Home goes to the Input Lab for now.)
  - Is the picture sharp on the tablet? Any sound missing on the first tap?
  - Optional: try `?char=toad`, `?char=bowser` etc. to see the other characters.
- Input Lab (now at `?lab=1`): button size check with `?lab=1&buttonScale=1.3` or `0.8`; thumb slide Left to Right.
- Commit or wire the six new voice clips in `src/universes/mario/assets/` (see Open questions).
- Push the local repo to `origin` (https://github.com/ajayc07/games.git) after each task.

## Device test notes (parent fills in after trying on the tablet)
Format: date, device, what he did, what confused him, what bored him, what he loved.
_(none yet)_
