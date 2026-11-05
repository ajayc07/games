# Task 039: Cave levels 4 and 5

Design: D-085. Depends on 038.

## Goal
Finish the Cave ladder before the boss: `cave-4` and `cave-5` mix enemies with what he already knows (gaps, blocks, pads, power-ups), each adding at most one new idea.

## In scope
- `cave-4` "Crystal Bridges": gaps and blocks, a beetle and a bat on separate stretches, one car or magnet orb, about 95 tiles.
- `cave-5` "Cave Run": the longest, all enemies, a Flash or boots orb, a rainbow-coin spot, about 100 tiles. It ends at the charging pad in front of a closed rock gate that Task 040 opens; until then the gate is only decoration and the pad ends the level.
- Map order: cave-1 to cave-5, then (040) `cave-boss`, which needs a number of Cave stars (`finalLevelStarsRequired`, start at 10).
- Enemy coins count in the star thresholds; check totals with a script and set 1/2/3 star numbers like the Grass levels.
- `variety: false` unless the shuffle rules are taught to keep enemies clear.
- Docs, tests (validator, bot finishes each way), screenshots at both sizes (`_sources/review/039/`), Result.
- Commit: `task-039: cave levels 4 and 5`.

## Out of scope
The boss, zen changes, new enemy kinds, new buttons.

## Acceptance criteria
As Task 038, plus: write the bot's median time per level in the Result (aim for about the same as Grass 5-6), and no enemy patrol sits next to a gap.

## Result
- What changed: two Cave levels added to the Cave world after cave-3. `cave-4` "Crystal Bridges" (95 tiles: magnet orb, a bat and a beetle apart, three gaps, a hurdle, a two-step stair and another hurdle with coins on top, 8 bubbles, stars 28/40 of 63 coins). `cave-5` "Cave Run" (101 tiles: Flash orb, a five-bubble run right after it for rainbow coins, a bug, two bats and a beetle, three gaps, 10 bubbles, stars 36/50 of 84 coins). Both end at the normal charging pad. Cave world order is now cave-1 to cave-5.
- Files touched: `src/universes/robo/levels/cave-4.json`, `cave-5.json`, `levels.test.ts` (Task 039 block, world order test), `src/universes/robo/worlds.ts`, `docs/PROGRESS.md`, `docs/architecture/levels.md`, this file, `_sources/review/039/` (start-of-level shots at 844x390 and 1280x800 for both levels).
- Deviations from plan (and why): the "closed rock gate" behind the pad is not drawn (the task says it is Task 040's; the pad ends the level). `finalLevelStarsRequired` is not set yet (Task 040 adds the boss level it gates). The "rainbow-coin spot" is a run of five small bubbles under Flash (the rainbow bubble itself is added by the engine on every play, D-058).
- How verified: `npm run build` passes, all 595 tests pass. New tests cover structure, gap reach, no enemy within 6 columns of a gap, block rules, star ratios and a bot that finishes both levels as written and on 200 rainbow grids. Bot median (purposeful bot, ignores enemies and blocks): 25.4 s on cave-4, 27.1 s on cave-5; a mashing bot was not run. Screenshots are only the start of each level (headless Edge, no way to drive the robot along); the mid-level layout, the blocks and enemies on screen, and Flash/magnet feel were not looked at in the browser.
- Open issues / risks: no look at the blocks and the enemies in the browser; no mashing-bot pacing figure for the Cave levels; whether 100 tiles is too long is a tablet question. cave-4's blocks and cave-5's Flash timing (10 s covers about 58 tiles when he holds Right) are unplayed.
- Suggested next: Task 040
