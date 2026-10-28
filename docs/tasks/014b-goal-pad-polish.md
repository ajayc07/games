# Task 014b: Charging pad polish (bigger, unmistakable) and rainbow-bubble proof

Fix-up for Task 014 (D-055, D-056). Read D-054, D-055 and D-056 first. Visual only; no gameplay, level data, physics or sound changes.

## Goal
The goal pad must be easy to spot and clearly not a flag. Right now (844x390) it is a thin flat slab with a thin post and a ball on top, so it still reads like a flagpole without the cloth, it is small, and in Grass 6 it can sit partly behind the Power button. Also prove the rainbow bubble is easy to tell from ordinary bubbles.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-054, D-055, D-056), and only `docs/architecture/levels.md` and `docs/architecture/shooting-bubbles.md`.
- Existing: `core/levels/goal.ts`, `core/levels/placeholders.ts` (pad textures), `core/levels/theme.ts` (`goal` colours), `core/levels/LevelScene.ts` (`buildGoal`, arrival), `core/levels/BubbleField.ts`, `core/levels/variety.ts`, review sheets in `_sources/review/014/`.

## In scope

### 1. A chunkier, clearer pad
- Pad slab: about 3 tiles wide and about 0.45 tile tall (was about 2 and 0.3), with a lighter top face, a glowing ring on it, and a visible dark rim; keep the contrast numbers (rim and beacon at least 3:1 against both hills and the pale sky; keep the unit test).
- Replace the thin post with a short thick **charger column**: a rounded column about 0.5 tile wide and about 1.4 tiles tall with a lighter stripe, topped by a big round **beacon bulb** about 0.9 tile across (outlined, bright yellow, clearly larger than a coin or a bubble). The column must not look like a pole: no thin line, no ball-on-a-stick silhouette, nothing triangular. It may carry a small bolt or hex-nut emblem matching the coin and the robot's chest hexagon.
- Idle life stays gentle (pulsing ring, blinking bulb about once a second, slow sparkles) plus one new thing: a **faint tall light column** rising from the bulb about 4 tiles (soft translucent, slowly breathing) so the goal can be found above the Left/Right/Jump/Power buttons from far away.
- Placement: the pad is centred on the `F` column as before (the trigger x, the settle position and all level behaviour stay exactly the same; the arrival sequence and its timing stay the same, scaled to the new sizes: the robot settles on the pad's top face, the beam and rings centre on the pad).
- Check visibility at 844x390 in Grass 6 (the worst case, buttons on both sides): from 5 tiles away at least the light column and the bulb must be visible above the Power button's top edge. If the column cannot clear the button at some distance, that is acceptable only for the last tile or two; report the measured distances.
- The pad must not overlap or hide the last small bubbles or coins before it (the generator and levels keep 3 columns clear; check the pad's wider footprint against `variety.ts` and the level JSONs and widen the clearance by one column if needed, still without changing the written grids; if a fixed level has a coin within the new footprint, report it instead of editing the JSON).

### 2. Rainbow-bubble proof
- The previous screenshots do not show a rainbow bubble that stands out. Add a testing hook `?rainbow=1` (only effective on a varied run or together with `?variety=1`, never on a first canonical play unless `?variety=1` is set) that forces one rainbow bubble in a level that has small bubbles (Grass 4, 6, Practice walk-shoot). Document it with the other test hooks.
- Take screenshots at 844x390 and 1280x800 with the rainbow bubble next to at least two ordinary bubbles, at two moments (twinkle on and off). If it does not stand out clearly at 844x390 from about 3 tiles away, strengthen it further (thicker saturated bands, a slightly larger sheen, a stronger twinkle) without changing its size, hit area, coin value or sound, and take the screenshots again. Report honestly if you needed to change it.

### 3. Docs and tests
- Unit tests: the new pad dimensions and colour contrast; the settle position equals the old one; the trigger x is unchanged for every level (reuse the Task 014 test); `?rainbow=1` parsing and its rules (never changes canonical first plays without `?variety=1`).
- Update `docs/architecture/levels.md` (pad, column, light column, sizes), `docs/architecture/shooting-bubbles.md` (rainbow hook), the test-hook list in `docs/PROGRESS.md`, and this file's Result.
- One commit: `task-014b: bigger charging pad`. No attribution lines (D-016). Do not push (the parent says "push it" when ready). Do not start a dev server; if you must, use a preview build on another port and stop it before finishing and say so. Leave `.claude/launch.json` and `.claude/settings.local.json` uncommitted.

## Out of scope
Other end-marker styles, level JSON edits, changes to physics, hit boxes, star rules, the result screen, sounds, the Input Lab, new runtime dependencies, the Task 015 polish items.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; the banned-names test still passes; no image files added.
- Screenshots in `_sources/review/014b/` (not committed) at 844x390 and 1280x800: the pad idle in Grass 1 from about 5 tiles away; the pad in Grass 6 from 5 tiles and from 3 tiles away (the light column and bulb visible above the Power button); the arrival (reach, charge/beam, win) in one level; the ball look and one other colour option on the pad; the rainbow bubble beside ordinary bubbles at two twinkle moments.
- The pad no longer reads as a flagpole: judge your own screenshots honestly and say so in the summary if it still does.
- Every level and Practice mode still reaches the pad and the result screen; a bot finishes; the saved record behaves as before; no console errors.
- 58+ fps where measurable (report the baseline; the headless machine measured about 10 fps in Task 014, so say plainly if it cannot be measured).

## How to verify
Playwright (Chromium) with `?level=<id>`, `?rainbow=1&variety=1`, a scripted bot, unit tests and the screenshots above. List what could not be checked (a real tablet, how he reacts, whether visitors still say "Mario").

## Result
- What changed: pad slab 3 x 0.45 tiles (gold top face, rivets, dark rim, wider cyan ring); the thin post is now a stubby charger column (0.5 x 1.4 tiles, light stripe, cyan band, hex-nut emblem) under an outlined yellow bulb 0.9 tile across; a faint 4-tile light column (`fx-lightcol`) breathes above the bulb; the halo is softer and the blink dips to 0.55 so the bulb stays readable. Trigger x, settle position, timings, level data unchanged (beam and rings scaled). `?rainbow=1` hook (varied runs and Practice only). Rainbow bubble: twinkle larger, notch in the bands closed.
- Files touched: `core/levels/goal.ts`, `placeholders.ts`, `LevelScene.ts`, `variety.ts`, `BubbleField.ts`, `universes/robo/manifest.ts`, tests (`levels.test.ts`, `variety.test.ts`), `docs/architecture/levels.md`, `shooting-bubbles.md`, `docs/PROGRESS.md`, this file.
- Deviations from plan (and why): texture keys `goal-post` / `goal-beacon` kept (now the column and bulb) so theme image slots stay valid. No clearance widening needed. Practice counts as a varied run for `?rainbow=1`.
- How verified: typecheck, 391 tests, build; Playwright (Chromium, headless, dev server already on 5173) at 844x390 and 1280x800; screenshots in `_sources/review/014b/` (not committed).
- Open issues / risks: see the summary.
- Suggested next: tablet check, then Task 015 if wanted.
