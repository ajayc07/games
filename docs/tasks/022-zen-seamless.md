# Task 022: Zen without empty stretches, with blocks and gaps

Design: D-065.

## Goal
The zen world never shows an empty screen, and has stairs of blocks and small gaps like the other levels.

## In scope
`core/levels/zen.ts` (carried windows, `steps` and `gap` motifs, new constants), `LevelScene.rebaseZen` (ground rebuild, carry grid), `Player.shiftX`, `manifest.ts`, tests.

## Out of scope
Gaps wider than 2 tiles, blocks in power-up stretches, more motifs.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- Verified in the browser as described below.

## Result
- What changed: see D-065.
- Deviations from plan (and why): none.
- How verified: Tests (16 zen tests) pass; Chromium: before and after a swap the player's screen x, background scroll, y and the visible grid are identical both ways, a 45 s walk gave no falls out of place and no errors.
- Open issues / risks: not on a real device yet.
- Suggested next: Tablet check of difficulty (falls, stairs).
