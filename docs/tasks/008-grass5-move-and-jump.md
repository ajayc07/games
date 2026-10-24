# Task 008: Grass 5 "Move and Jump" (walking over gaps)

Run after Task 007. Design context: D-001 (control ladder), D-019 (falling is never a failure), D-029 (walking feel), D-043 (order). This is the first level that combines two controls he already knows: walk with Left/Right and press Jump to cross gaps. Power is not in this level (it comes back in Grass 6 together with everything else).

## Goal
A fifth Grass level, "Move and Jump", with walking and gaps. He can walk to the edge, stop, and press Jump when ready, so there is no timing pressure; pressing Jump while still walking also works. Falling floats him back on the cloud. It appears on the map as the fifth dot.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-001, D-002, D-015, D-019, D-021, D-029, D-030, D-043), docs/ARCHITECTURE.md (Levels, Walking, "Watch me" demo, Map, falling/respawn)
- Existing: `universes/robo/levels/{grass-2,grass-3,grass-4}.json`, `core/levels/{grid,physics,Player,LevelScene,demo}.ts` (`findRespawn`), `core/map/mapLayout.ts`, `universes/robo/worlds.ts`.

## In scope

### 1. Check the physics before designing (report the numbers)
Before writing the level, compute from `physics.ts` and report in the Result: the horizontal distance of a jump at walk speed 220 (standing take-off and running take-off), the widest gap clearable with a comfortable margin (coyote 120 ms and buffer 150 ms included), and the player's body width vs a 1-tile gap (does a stationary player fall into a 1-tile gap? can he walk over one without jumping?). Use these numbers to choose gap widths. Design target: gaps of 1 and 2 tiles only; every gap clearable from a standing start at its edge with margin.

### 2. Level `grass-5.json` ("Move and Jump")
- `autoRun: false`, `enabled: ["left", "right", "jump"]`, `tapAnywhereJumps: false`, about 75 tiles wide, walk speed as Grass 3. Left, Right and Jump use the same button layout as Grass 3 (Jump big, bottom-right, usual `invite` pulses).
- Gap sequence from easy to harder with flat safe stretches between (at least 6 tiles of solid ground between gaps, so the landing area is generous and no gap needs a second jump immediately): 1, 1, 2, 1, 2, 2 tiles wide. A coin arc over each gap (the arc shows where to jump and rewards doing it) plus a few ground coins on the safe stretches, including 3-4 to the LEFT of the start so turning round is still rewarded. About 22-28 coins in all. Stars: 1 for finishing; thresholds so two stars need roughly half the coins and three need most (tune after the bot runs).
- No enemies, no bubbles, no Power. Falls follow D-019 unchanged (respawn at least 3 tiles behind on solid ground, preferring ground on both sides; check that `findRespawn` is sensible when the player falls in the walking level, including when he fell going left).
- Demo (script form, D-030): walk right to the first gap, jump over it, walk on, jump over the second gap; about 7-8 s. The finger icon and button animation work as in Grass 3. Plays once per session; `?demo=0|1` as before.
- Add `grass-5` to the Grass world in `worlds.ts` and the levels index. `openAtATime` 3 stays: with the rule `i < cleared + openAtATime`, Grass 5 (index 4) opens when two levels are cleared; check this on the map.

### 3. Walking-specific safety checks (fix only if broken, report either way)
- Holding Right at a gap edge: the player walks off and falls (expected, a soft float-back). Check that the float-back never drops him into the same gap again with held input in a way that loops without him getting a chance (the respawn holds input briefly or he lands on safe ground 3+ tiles back; confirm with the bot).
- Mashing Jump at the edge, mashing Left/Right alternately, and holding both: no stuck states, no errors.
- The one-handed child case: a thumb sliding from Right to Jump mid-air still works (`InputManager` multi-touch and slide tracking, D-015).

### 4. Map
- Five dots plus teasers; check `mapLayout` at 844x390, 1280x800, 1024x768 and 2400x1000 (dots, clouds and avatar fully visible; scrolling sensible; tap targets still at least 96 px, dots 150 px). Fresh state: dots 1-3 open, 4-5 under clouds.
- Next from Grass 4 goes to Grass 5 only when it is open (existing rule).

### 5. Docs and tests
- Unit tests: `grass-5.json` loads and validates (existing levels test pattern), a test that every gap is 1 or 2 tiles and every safe stretch is at least 6 tiles, and a coin-count/star-threshold sanity test (stars reachable). Any new pure code gets tests.
- ARCHITECTURE.md (map with five levels; anything learned about walking over gaps), PROGRESS.md (Task 008 done, Next 009 "Grass 6 Everything" per D-043, open issues, tablet checklist: does he walk to the edge and stop, does he press Jump while walking, does he understand the coin arcs, are 2-tile gaps frustrating, does the cloud float-back confuse him). Update the roadmap table to the D-043 order. Fill in this file's Result.
- One commit: `task-008: grass 5 move and jump`. No attribution lines (D-016). Do not push. Include any uncommitted architect doc edits (DECISIONS.md, ARCHITECT_HANDOFF.md, this task file) in the commit.

## Out of scope
Power or bubbles in this level, enemies, moving platforms, steps or ledges at different heights, gaps wider than 2 tiles, double jump, changes to physics numbers or hit boxes (report if a number looks wrong instead), the parent view, new worlds, new runtime dependencies.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; the banned-names test still passes.
- `?level=grass-5` loads; Left, Right and Jump are the only buttons, laid out as in Grass 3; no overlaps at 844x390, 1280x800, 1024x768, 1366x512, 2400x1000 (screenshots in `_sources/review/008/`, not committed).
- Bot runs (headless, scripted and random): a bot that walks and jumps at each gap finishes with all coins collectable and 3 stars; a bot that mashes randomly (about 1.5 presses per second per button, as in the earlier timing tests) finishes in a sensible time (report the median and the longest; target a median under about 60 s) and never gets stuck; a bot that only holds Right falls at the first gap, floats back, and the level does not soft-lock.
- Every gap is crossable from a standing start at its edge (test in code or by bot, for both widths).
- The demo plays once, shows the Jump press with the finger and button animation, and ends cleanly; a tap after 1.5 s skips it.
- Map: five dots at all four sizes; Grass 5 under a cloud on a fresh start; opens after two levels are cleared with the normal unlock animation; Task 006 progress for Grass 1-4 untouched.
- 58+ fps where measurable (report the headless baseline; 007 measured 60.2 blank, 58.9 with mashing), no console errors.

## How to verify
Playwright with touch and keyboard plus `?debug=1`; unit tests; screenshots of Grass 5 at five sizes, a jump over each gap width (3-4 frames), a fall and float-back sequence, the demo, the map with five dots (fresh and cleared). List what could not be checked (a real tablet, his actual timing).

## Result (Code fills in at the end)
- What changed: Grass 5 "Move and Jump" (`grass-5.json`, 75 tiles, walking, Left/Right/Jump laid out as in Grass 3, no Power or bubbles) as
  the fifth Grass dot. Six gaps of 1, 1, 2, 1, 2, 2 tiles at columns 14, 23, 32-33, 42, 51-52, 61-62 with 8 or more tiles of ground
  between them (6 is the tested minimum) and 14 before the first; a coin arc over each gap; 4 coins to the LEFT of the start; 28
  coins, stars 14/22; demo script of about 8.2 s (walk to the first gap, stop, Jump over it, walk on, Jump over the second gap).
  `findRespawn` takes the direction he was heading: a fall while walking LEFT over a gap now floats him back to the right side of it
  (before, it carried him across the gap he fell into); LevelScene keeps his facing at the fall. Map: five dots, 2485 px wide.
  Tests: gap widths and safe stretches, crossing margins, coin arcs, stars, landing coins, respawn direction, the map with 3/4/5 levels.
- Physics numbers (measured in the browser, section 1 of the task): a jump lasts 0.844 s and carries 186 px at walk speed 220 (running
  take-off; measured 187) and 179 px from a standing start (measured 178-189). The body centre must travel `gap - 20 px` from the edge,
  so a 1-tile gap needs 44 px, 2 tiles 108 px (71 px margin, about 0.3 s of walking incl. coyote 120 ms and buffer 150 ms) and 3 tiles 172 px
  (7 px margin, too tight), so gaps are 1 or 2 tiles. The body is 40 px wide, a 1-tile gap is 64 px: a stationary player with the
  centre 16-44 px past the edge falls in, and walking over a 1-tile gap without jumping falls too; one centred on the edge or up to
  20 px past it is still supported. All six gaps were crossed from a standing start at the edge (centre 0 and 19 px past it), pressing
  Right and Jump together.
- Files touched: src/universes/robo/levels/{grass-5.json (new), levels.test.ts, README.md}, src/universes/robo/worlds.ts,
  src/core/levels/{grid.ts, LevelScene.ts, levels.test.ts}, src/core/map/map.test.ts, docs/{ARCHITECTURE,PROGRESS}.md, this file.
  (`.claude/launch.json`, a dev-server config that is not part of this task, is left uncommitted.)
- Deviations from plan (and why):
  1. The respawn direction fix (`findRespawn` `dir`) is a small change to shared code. The task asked to "check that `findRespawn` is
     sensible ... including when he fell going left"; it was not (it carried him across the gap), so it was fixed and tested.
  2. The coins right after a 1-tile gap were moved from 1 column after the gap to 3 columns after (where a jump from the edge
     lands). The first bot run collected only 25 of 28 coins: a head-height coin 1-2 columns behind a 1-tile gap is flown over at the
     apex. Now both scripted bots collect 28 of 28; a test keeps head-height coins out of those two columns.
  3. Random-mashing timing misses the target (see below), reported rather than tuned: the plan fixes the gap sequence and a 75-tile length.
  4. The demo is about 8.2 s (7.6 s of script plus the 0.6 s tail), a little over "7-8 s".
- How verified: `npm run typecheck && npm test && npm run build` pass (236 tests, banned-names test included). Playwright (headless Chrome,
  touch via CDP, keyboard, `?debug=1`): buttons Left/Right/Jump identical to Grass 3 and not overlapping at 844x390, 1280x800,
  1024x768, 1366x512, 2400x1000; a walk-and-jump bot and a stop-at-the-edge bot both finish with 0 falls, 28/28 coins and 3 stars;
  hold-Right bot: falls at the first gap 7 times in 24 s, never gets past it, floats back about 2.5 tiles behind the edge, and a
  Jump at the edge still crosses afterwards (no soft lock); a fall while walking left over the 1- and 2-tile gaps floats him back to
  the right side, 3+ tiles from the gap, facing left; Jump mashed at the edge, Left/Right alternated 20 times a second and both held:
  no stuck state, no console errors; a thumb sliding from Right to Jump without lifting jumps, and back to Right walks again; the demo
  jumps twice, ends 140 px past the second gap's far edge and the run starts with 0 coins, a tap after 1.5 s skips it and it does not
  repeat in the same session; map at 844x390, 1280x800, 1024x768 and 2400x1000: five dots, Grass 4 and 5 under clouds on a fresh start,
  after two clears Grass 5 opens with its cloud lifting, teasers reachable at the scroll end; Next from Grass 4 is hidden with only
  Grass 4 cleared and goes to Grass 5 when Grass 1 and 4 are cleared; earlier progress is never lowered.
  Random bots (real time, headless): right-leaning masher (Right 2.5/s, Jump 1.5/s, Left 0.5/s, each press held 150-500 ms), 5 runs, all
  finished, median 131 s, longest 173 s, 10-23 falls (14 median), never stuck, no errors. Unbiased masher (all three 1.5/s): a random
  walk, 806 of 4700 px after 120 s. fps (844x390): blank 53.2, map 58.5, Grass 5 mashing Jump about 20/s while walking: average 57.4,
  lowest 54.1. Screenshots in `_sources/review/008/` (five sizes, a jump over each gap width, a fall and float-back, the demo, the
  map fresh, at the end, mid-unlock and cleared).
- Open issues / risks: the random-mashing time is well over the 60 s target (median 131 s); a child who walks on purpose needs about
  21 s of walking plus the jumps, so it is mostly a mashing problem. Levers if the tablet shows it: 6 instead of 8 tiles between gaps
  (saves about 12 tiles) or fewer gaps. Holding Right only loops fall, float-back, fall until he lets go or presses Jump (7 falls in
  24 s); never a soft lock. The blank-page frame rate was 53 fps today (60 in Task 007), so 58+ fps could not be shown; the Grass 5
  average was 57.4. Not checked on a real tablet or with his real timing.
- Suggested next: Task 009 (Grass 6 "Everything", D-043) after a tablet session with Grass 4 and 5.
