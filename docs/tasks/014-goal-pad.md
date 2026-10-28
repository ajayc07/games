# Task 014: Robot charging pad instead of the flag (plus two small look fixes)

Design is fixed in D-055; read it first (and D-054 for the rainbow fix). People who watch him reach the flag ask "is it Mario?". The stage end becomes an original robot-themed marker: a charging pad. This is a visual and feel task; gameplay, physics, level data and star rules do not change.

## Goal
Every level and every Practice run ends on a glowing robot charging pad instead of a flag. When he reaches it the robot settles on the pad, the pad lights up and charges the robot, then the existing celebration and result screen follow. The pad must be easy for a 3-year-old to spot from a distance and look nothing like a flag.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-002, D-019, D-033, D-038, D-054, D-055), `docs/ARCHITECTURE.md` (index) and only these topic files: `docs/architecture/levels.md` (format, finish), `docs/architecture/avatar-and-motion.md` (win clip, options), `docs/architecture/shooting-bubbles.md` (rainbow bubble, bubble drawing).
- Existing: `core/levels/placeholders.ts` (`flag-pole`, `flag-cloth`, coin drawing), `core/levels/theme.ts` (`flag` colours), `core/levels/LevelScene.ts` (`buildFlag`, `reachFlag`, `flagX`, `flagTopY`, `flagCloth`, the arrival effects and confetti), `core/levels/grid.ts` (the `F` cell), `core/levels/BubbleField.ts` and `bubbles.ts` (rainbow bubble), `core/avatar/clips.ts` (`win`), `core/audio/chimes.ts`.

## In scope

### 1. The pad (code-drawn, theme colours)
- Replace `flag-pole` and `flag-cloth` and the theme's `flag` colours with a `goal` set (for example `base`, `ring`, `glow`, `beacon`, `post`) and new generated textures. No image files.
- Look: a wide low pad (about 2 tiles wide, about 0.3 tile tall, rounded, slightly lighter top face with a darker rim) sitting on the ground at the `F` column; a glowing ring on its top face; a short post at the back with a beacon ball and a small antenna. Not a pole with a triangle, no cloth, nothing that waves like a flag.
- Colours: bright, warm and clearly different from the green hills and the sky (for example gold or warm white pad rim, cyan glow, a yellow beacon); contrast at least 3:1 against both hill colours and the sky for the pad rim and the beacon (unit-test the colour numbers like the avatar contrast test). The pad must be readable from at least 5 tiles away at 844x390.
- Idle life (gentle, never frantic): the ring pulses softly, the beacon blinks about once a second, a few tiny sparkles rise slowly. All through tweens or the existing particle helpers; no per-frame allocation. Draw depth as the flag had.
- Keep the generic design in `core/` (no universe names); the theme supplies colours, so later worlds can recolour it.

### 2. Arrival and charging (replaces `reachFlag` visuals)
- Trigger rule stays the same (the existing x-position check, same level-end behaviour, `onResult` before the win screen, demo/coach logic, `findRespawn`, Practice and camera behave exactly as now).
- On reach: the robot stops (as now), eases to the pad centre over about 250 ms (its feet on the pad's top face), the pad "charges": the ring expands twice as a pulse, a soft vertical beam of light rises about 3 tiles for about 1 s, sparkles burst, the beacon turns solid bright; the robot plays its existing `win` clip (arms up) with a small charge effect on the body (a quick bright flash and a few tiny bolt or star glyphs around it, accent colour). Then the existing confetti and the usual chime (the option's win chime) and result screen, with the same timings as today or at most 300 ms longer.
- Works with both looks (robot and ball) and all eight colour options; the ball may bounce on the pad.
- Both `?level=` runs, Practice runs, the Input Lab (if it has a goal) and the demo ghost (which never triggers it) are unaffected.
- Rename internals where it is cheap and safe (`buildFlag` to `buildGoal`, `flagX` to `goalX`, and so on) and update comments; the level grid letter `F` and the `LEGEND` entry stay, with the legend text changed to "goal" in `format.ts` and the docs. Do not touch level JSON files. Existing tests that mention the flag keep working (rename in tests only where it reads wrong).

### 3. Rainbow bubble visibility (D-054)
- The rainbow bubble's sheen was too subtle at 844x390. Make it unmistakable among ordinary bubbles without changing its size, hit area, coin value or sound: a stronger rainbow rim (thicker, saturated bands) and a slow twinkle (a soft sparkle every about 1.5 s). Re-check at 844x390 and 1280x800 and save the screenshots.

### 4. Coin face (robot theme, optional; the parent may drop this item before the task starts)
- The coin currently has a vertical slot on the face, which also reads as Mario. Change only the face emblem to something robot-like (for example a small bolt or a hex-nut/gear emblem matching the robot's chest hexagon), keep size, colour, collision, sound and the HUD coin icon consistent (the HUD icon uses the same drawing). Keep it readable at 844x390.

### 5. Docs and tests
- Unit tests: goal colour contrast; the trigger position is unchanged (compare with the old flag trigger for every level JSON, or a test that the goal x equals the old flag x); the arrival sequence's pure timing values (ease, beam, total) are within the bounds above; `LEGEND` text and the parser still accept `F`; coin and rainbow drawing helpers still produce textures (if there is a test pattern for textures).
- Update `docs/architecture/levels.md` (goal pad, arrival), `docs/architecture/shooting-bubbles.md` (rainbow look), `docs/PROGRESS.md` (Task 014 done; roadmap; the polish bundle becomes Task 015; tablet checklist: does it still get "is it Mario?", does he understand the pad is the end, does he enjoy the charge effect), and fill in this file's Result. Update the architecture index only if needed.
- One commit: `task-014: charging pad goal`. No attribution lines (D-016). Do not push. If you start a dev or preview server, stop it before you finish and say so in the summary (do not leave one running). Include any uncommitted architect doc edits in the commit. Leave `.claude/launch.json` and `.claude/settings.local.json` uncommitted.

## Out of scope
New end-marker styles (rocket, rainbow gate, chest), random or per-world markers, changing the `F` grid letter or any level JSON, changes to physics, hit boxes, star rules, the result screen layout, music, new sounds beyond a subtle charge sound if you want one (optional: reuse an existing recipe), footsteps and the other polish items (Task 015), new runtime dependencies.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; the banned-names test still passes; no image files added.
- Grass 1-6 and one Practice run of each mode end on the pad: the robot settles on it, the sequence plays, the result screen follows; a bot still finishes every level; the saved record behaves as before.
- Screenshots in `_sources/review/014/` (not committed) at 844x390 and 1280x800: the pad idle from about 5 tiles away in Grass 1 and Grass 6, four frames of the arrival (reach, settle, charge/beam, win), the ball look on the pad, two different colour options on the pad, the coin with its new face (in the world and in the HUD), the rainbow bubble beside ordinary bubbles.
- The pad rim and beacon contrast numbers pass; nothing in the scene looks like a flag; no console errors.
- 58+ fps where measurable (report the headless baseline), including through the arrival effects.

## How to verify
Playwright (Chromium) with `?level=<id>` for each level, a scripted bot to the goal, `?debug=1` hooks if needed, unit tests, the screenshots above. List what could not be checked (a real tablet, how he reacts, whether visitors still say "Mario").

## Result (Code fills in at the end)
- What changed: the flag is now a robot charging pad (`core/levels/goal.ts`, `buildGoal`, `settleOnPad`, `chargePad`); theme `flag` became `goal`; `grid.flag` renamed `goal`; rainbow bubble has six thick bands and a 1.5 s twinkle; coin face is a hex nut (HUD uses the same texture); `LEGEND.F` = "goal".
- Files touched: see the commit (core/levels: goal.ts new, LevelScene, placeholders, theme, BubbleField, Player, grid, format, variety, testBot; universes/robo themes, README, levels.test; docs).
- Deviations from plan (and why): pad rim is dark raspberry (0x8e1b4b), not gold or warm white: 3:1 against both hills and the sky is only possible with a dark colour (light ones fail against the pale hills and sky bottom); the gold is the top face. The beacon is yellow with a dark outline and the outline carries the contrast test. Result screen comes 250 ms later than before (within the 300 ms bound). No new charge sound (existing win chime).
- How verified: typecheck, 386 tests and build pass; Playwright (Chromium, SwiftShader) on Grass 1-6 and two Practice runs: teleport next to the goal, the robot settles, charges, result mode reached, no console errors. Screenshots in `_sources/review/014/` at 844x390 and 1280x800 (idle Grass 1 and 6, four arrival frames, ball, purple and orange, rainbow, coin in world and HUD). fps: the headless machine measures about 10 fps in both the old and new build (software rendering), so 58+ fps could not be verified.
- Open issues / risks: not seen on a tablet; in Grass 6 the pad can sit partly behind the Power button when it is 5 tiles away (camera anchor, same as the flag); the pad is small on 844x390 (the whole scene is about 0.54 scale), consider a bigger pad if the tablet says so; the Input Lab has no goal.
- Suggested next: tablet check (see PROGRESS checklist), then optional Task 015 polish.
