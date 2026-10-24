# robo/levels

One JSON file per level, loaded automatically by `index.ts` (format v1, D-018; see docs/ARCHITECTURE.md).
Legend: `#` ground, `.` empty, `c` coin, `S` player start, `F` flag, `o` small bubble, `O` big bubble (a 2x2 block).
A small bubble in the row on the ground rests on it; one row higher it floats 1 tile up (both in reach of a shot). Rows are top-first and equal length;
the bottom row sits on the bottom of the screen. Add the level id to its world in `../worlds.ts`.
Open any level for testing with `?level=<id>` (`&demo=0` skips, `&demo=1` forces the "watch me" demo).
`levels.test.ts` checks the level files (Grass 2 coins, gaps, demo; Grass 3 coins and demo script;
Grass 4 bubbles, reach, coins, stars and demo), the world
order and the avatar options.
