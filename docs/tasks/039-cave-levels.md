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
- What changed:
- Files touched:
- Deviations from plan (and why):
- How verified:
- Open issues / risks:
- Suggested next: Task 040
