# Task 034: Flash power-up and "one form at a time" rules

Design: D-077. Read D-061, D-062, D-064, D-071, D-072, D-073 and D-076 first (car, magnet, boots, hold to run, power bars, double power-ups, Mega Robo).

## Goal
Add a **Flash** speed power-up, and make the power-ups follow clear exclusion rules, above all: **Mega Robo never combines with anything** (no car, no flight, no magnet, no Flash while he is big).

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-002, D-061, D-062, D-064, D-071, D-072, D-073, D-076, D-077), and only `docs/architecture/levels.md` and `docs/architecture/shooting-bubbles.md`.
- Existing: `core/levels/powerups.ts` (`PICKUP_CHARS`, timers), `core/levels/runHold.ts` (hold to run, `maxTotal`), `core/levels/mega.ts`, `core/levels/zen.ts` (generator, orb bag, `DOUBLE_CHANCE`), `core/levels/format.ts` (`LEGEND`), `core/levels/LevelScene.ts` (`buildPickups`, `updatePickups`, `makeRoom`, `startMega`, `endMega`, power bars), `core/levels/PowerBars.ts`, `core/levels/placeholders.ts` (orb textures), `core/audio/` (new sounds are tone recipes like the others).

## In scope

### 1. Flash power-up
- A new pickup orb (new legend letter; suggest `L`, check `LEGEND` and the level validator so it is accepted and every existing level still validates). Same rules as the other orbs: optional, no new button, no lose state, ends by itself after about 10 s (or at once on a fall or at the goal), the same time bar and badge as the other timed powers, the same blink before the end and `transformBack`-style end sound.
- Effect: **automatic fast running** while Left or Right is held, no 350 ms hold needed: about x1.7 walking speed (tune; keep the existing total cap logic in `runHold.ts` coherent: Flash sets its own cap, about 1.8, and never stacks with the hold-to-run bonus on top). Jump, Power and everything else behave as normal. A fall into a gap is still harmless (float-back).
- Look: a yellow-white lightning-bolt orb (code-drawn, like the other orbs); while Flash is on, a short streak of 3 fading afterimages behind him and a few small sparks; a soft "zip" sound when he picks it up and a quiet whoosh every 0.4 s while running fast (reuse the `flyHum` pattern, cheap tone recipe). Works with both looks (robot and ball) and all eight colours.
- He pops **small** bubbles he runs into while Flash is on (reuse the Mega popping hit test with a smaller reach, about 70 px; big bubbles still block him and need shots; no hit box change).
- Level: a new level `flash-1` "Flash Run" (flat or nearly flat, 1-tile gaps only, long coin lines at ground level that suit speed, a few small bubbles in his path, one orb near the start; stars 20/28 style like the other power-up levels). Add it to the map exactly the way `car-1`, `magnet-1` and `boots-1` were added.
- Zen: add Flash to the orb bag (now four kinds, still shuffled) with a stretch that suits it (a long low coin line and small bubbles on the way). The double-orb chance stays.

### 2. Exclusion rules (the new core of the task)
Put the matrix in one pure, tested place (e.g. `core/levels/powerRules.ts`) and use it everywhere an orb is taken or Mega starts:
- **Mega Robo excludes everything.** While Mega is on, orbs cannot be taken: they stay in the world, dimmed with a small "not now" shimmer, and can be taken after Mega ends if still ahead. When the coin bar fills while other timed powers are running, those powers end at once (soft `transformBack`, no penalty) and Mega starts: Mega is the reward and wins. (This changes D-073, where magnet and rocket could combine with Mega, and the car and Mega merely replaced each other.)
- **Car and Flash exclude each other** (both are about moving fast): the later pickup replaces the earlier one.
- Everything else combines as in D-072: magnet and boots combine with each other and with the car or Flash; at most two timed powers at once (a third replaces the one with the least time left, `makeRoom`). Flash + boots is allowed (a fast flier).
- The time bars and badge stay correct after every replacement or cancellation (no stale bar, no stuck flames or ring, no stuck look scale). Test every pair and the Mega start while a power is running.

### 3. Docs, tests, hooks
- Unit tests: the exclusion matrix (all pairs, Mega both ways, third-power replacement), Flash timing and speed numbers (including the cap), `flash-1` validation (supports, gap widths, coin reach), the new legend letter accepted in `validateLevel`, zen bag contains the four kinds and stays spaced (orb spacing test as before).
- Test hook `?power=flash` (start a level with Flash already on, like testing aids elsewhere; document it with the other hooks in PROGRESS.md, and make it usable together with `?zen=1`).
- Update `docs/architecture/levels.md` (a "Power-up rules" paragraph with the matrix), `docs/PROGRESS.md` (roadmap row, hooks, a real-device checklist for Task 034), `docs/DECISIONS.md` (append D-078 with what you decided and any deviations; D-077 is already written), and this file's Result.
- One commit: `task-034: flash power-up and power-up rules`. No attribution lines (D-016). Do not push. Do not start a dev server (use a preview build on another port and stop it before finishing if you must, and say so). Leave `.claude/launch.json` and `.claude/settings.local.json` uncommitted.

## Out of scope
The villain (Task 035), the polish bundle, changing Mega Robo's size, speed, 12 s length or coin-bar sizes, new buttons, changing the first play of Grass 1-7, changing the car, magnet or boots effects themselves, new runtime dependencies.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; banned-names test passes; no image files added.
- In Chromium (844x390 and 1280x800, screenshots in `_sources/review/034/`, not committed): Flash running with the afterimages; the orb; the time bar with Flash; Mega on with an orb in front of him (dimmed, not taken); the moment Mega starts while a power was running (the power ended, only Mega's bar shows).
- A bot or scripted run reaches the goal in `flash-1`; zen runs 5 minutes of simulated play with Flash, car, magnet, boots and Mega appearing and no console errors, no stuck effects after any swap.
- Honest report of what could not be checked (real tablet, how fast feels right for him, the sounds by ear, fps).

## How to verify
Playwright (Chromium) with `?level=flash-1`, `?power=flash`, `?zen=1`, scripted input, unit tests, the screenshots above.

## Result
- What changed: Flash power-up (orb `L`, x1.7 speed while an arrow is held, own cap, 3 afterimages, sparks, zip and whoosh sounds, pops small bubbles he runs into), new level `flash-1` "Flash Run" at the end of the Grass list, Flash in the zen bag (44-tile stretch with small bubbles). `levels/powerRules.ts` holds the exclusion matrix: Mega Robo combines with nothing (orbs dimmed and not takeable while big; a full bar ends every running power, flight included, with one soft `transformBack`), car and Flash exclude each other, at most two timed powers. `?power=car|magnet|boots|flash` test hook. D-078 written; D-073's combine rules for Mega are superseded.
- Files touched: `core/levels/{powerRules(+test),powerups(+test),runHold(+test),format,grid,zen(+test),LevelScene,Player,BubbleField,placeholders}.ts`, `core/audio/recipes.ts`, `universes/robo/{worlds.ts,levels/flash-1.json,levels/levels.test.ts}`, `docs/{PROGRESS,DECISIONS}.md`, `docs/architecture/levels.md`, this file.
- Deviations from plan (and why): afterimages are tinted robot-shaped silhouettes in normal blend (the code-drawn avatar cannot be cloned cheaply; additive vanished on the green hills); the zen Flash stretch is 44 tiles, not the full 58 tiles of 10 s, so orbs keep coming often enough (the existing zen test wants 3 per segment); flash-1's coin line is every 2 tiles with 14 coins within Flash's reach and stars 20/32 (24 coins + 5 bubbles); `tryHit` got a `smallOnly` flag; `startCar` no longer ends Mega itself (orbs cannot be taken in Mega any more).
- How verified: `npm run typecheck`, `npm test` (496 pass, incl. the full matrix, third-power replacement, cap, flash-1 and zen checks on 120 seeds), `npm run build`; Chromium on a preview build at 844x390 and 1280x800 (screenshots in `_sources/review/034/`, not committed): the orb, Flash running at 374 px/s with afterimages and the bar, Mega started while the magnet ran (only Mega's bar shows), orb dimmed and not taken while Mega walked past it; a scripted run reached the goal of flash-1 in 13 s with 37 coins and no falls; a 5-minute zen run with 64 forced powers (all four kinds, pairs, Mega on top of running powers), 5 segment swaps, checks every 250 ms for stuck effects, speed, bars, badge and orb dimming: 0 problems, 0 console errors. The preview server on port 4173 is stopped.
- Open issues / risks: not tried by him or on a real tablet: whether x1.7 is too fast or fun, the sounds by ear, the afterimage look on a real screen; fps not measurable headless; Flash plus flying makes a very fast flier (425 px/s), unseen on a device; Flash does not pop big or high bubbles by design.
- Suggested next: Task 035 (Bolt Bug), then 019.
