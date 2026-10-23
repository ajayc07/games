# Progress

_Last updated: 2026-10-23 (Task 001 done)_

## Status
Runnable skeleton exists: Vite + TS + Phaser 3 boots the lazy-loaded Mario universe into a placeholder scene (tap/key -> bouncing circle + beep). Installable offline PWA; Pages deploy workflow ready. Next: Task 002 (input layer + audio manager).

## Roadmap (draft, architect may reorder)
| # | Task | Status |
|---|------|--------|
| 001 | Project setup: Vite + TS + Phaser, universe loader, PWA, Pages deploy | Done |
| 002 | Core input layer (touch/keyboard/gamepad -> actions) + audio manager | Next |
| 003 | Level engine + player physics + Grass 1 "Tap to hop" (auto-run, tap anywhere) | Planned |
| 004 | Grass 2 "Big Jump button" + "watch me" demo system | Planned |
| 005 | Grass 3 "Left and Right" (no auto-run) | Planned |
| 006 | World map + stars + unlocking + per-universe progress storage | Planned |
| 007 | Character picker + 7-character cast with placeholders + asset import of real files | Planned |
| 008 | Minimal parent view (sound, button size, unlock-all) | Planned |
| 009+ | Level 4+ (move+jump), Power button, Pipe/Sky/Castle worlds, boss question, polish | Later |

## Done
- 2026-10-23: Planning, decisions D-001..D-011, starter pack, local repo created.
- 2026-10-23: Task 001 project setup (skeleton, universe registry, placeholder scene, PWA, deploy workflow).

## In progress
_(nothing)_

## Open questions
- Letterboxing: `Scale.FIT` leaves sky-coloured bars on non-16:9 screens (ground strip does not reach the edges). Consider `Scale.EXPAND` or drawing the world wider in Task 003.
- Service worker uses a hand-written `src/sw.ts` (injectManifest) because workbox's generated SW breaks when the local path contains an apostrophe ("Athi's Game"). Fine on CI. Keep in mind if the PWA setup changes.
- Not yet tested on a real phone/tablet (iOS Safari especially: fullscreen display, audio unlock, double-tap zoom).
- Bowser as player vs castle boss: settle later (friendly race, or swap boss when Bowser is chosen).
- Unlock rule: 2-3 levels open at a time is the default; confirm after device testing.
- Real PNGs/voices for the 7 characters: parent will supply (transparent PNG ~512px tall, 3 short sounds each). Not blocking.

## Parent action items
- Enable GitHub Pages: repo Settings -> Pages -> Source: "GitHub Actions" (needed before first deploy works).
- After pushing Task 001: open https://ajayc07.github.io/games/ on the tablet, tap the ball, check the beep, try "Add to Home Screen", then try it in airplane mode.
- Push the local repo to `origin` (https://github.com/ajayc07/games.git) after each task.

## Device test notes (parent fills in after trying on the tablet)
Format: date, device, what he did, what confused him, what bored him, what he loved.
_(none yet)_
