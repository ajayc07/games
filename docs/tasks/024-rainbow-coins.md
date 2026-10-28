# Task 024: Rainbow coins

Design: D-067.

## Goal
Coins from a rainbow bubble look and sound special.

## In scope
`bubbles.ts` (`FlyingCoin.rainbow`), `BubbleField` (texture, size, spin, ring), `recipes.ts` (`rainbowCoin`), `LevelScene.addCoins` bump, tests.

## Out of scope
Worth 2 per coin (would move star thresholds).

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- Verified in the browser as described below.

## Result
- What changed: see D-067.
- Deviations from plan (and why): none.
- How verified: Tests pass; Chromium screenshot mid-flight shows the rainbow coin, counter reaches 8.
- Open issues / risks: not on a real device yet.
- Suggested next: Decide later if they should be worth more.
