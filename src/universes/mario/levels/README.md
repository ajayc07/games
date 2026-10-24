# mario/levels

One JSON file per level, loaded automatically by `index.ts` (format v1, D-018; see docs/ARCHITECTURE.md).
Legend: `#` ground, `.` empty, `c` coin, `S` player start, `F` flag. Rows are top-first and equal length;
the bottom row sits on the bottom of the screen. Add the level id to its world in `../manifest.ts`.
Open any level for testing with `?level=<id>`.
