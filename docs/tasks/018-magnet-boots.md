# Task 018: Magnet and rocket boots, levels "Coin Magnet" and "Rocket Boots"

Design: D-062. Step 4 (last) of the variety plan in D-059.

## Goal
Two more optional 10-second pickups: a magnet that pulls nearby coins in, and rocket boots that give a higher jump. Fun, obvious, no way to lose, no new button.

## In scope
- Legend `M` (magnet pickup) and `J` (boots pickup), not solid; `extractEntities().pickups` now carries a `kind` (`car`, `magnet`, `boots`).
- `core/levels/powerups.ts` (pure, tested); orb textures; `Player.jumpScale`; `LevelScene` `startPower` / `endPowers` / `updatePowers` / `pullCoins`.
- `magnet-1.json` and `boots-1.json`, listed after Zoom Car in the Grass world.
- Tests: powerups unit tests, level checks (high coins reachable only with the boots, within their reach), world list and unlock order.

## Out of scope
Pulling bubbles or shots, a bonus for using a power-up, stacking effects, power-ups in the demo or in Practice, music.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- In the browser: magnet pulls coins in, the boots clear a normal jump's height and collect a high coin, both end after about 10 s, no console errors.

## Result
- What changed: see D-062 and levels.md "Magnet and rocket boots".
- Deviations from plan (and why): none. Defaults (10 s, 230 px, x1.3) chosen because the parent did not answer. One high coin was moved down a row after the reach test failed by 1 px.
- How verified: typecheck, 415 tests and build pass; Chromium at 1280x720 on `?level=magnet-1` and `?level=boots-1`: the power comes on at the orb and goes off after about 10 s, coins are pulled in, the boots rise 195 px against 139 px normally and collect the row-4 coin that a normal jump misses, no console errors. Not run at 844x390.
- Open issues / risks: not seen on a tablet; the magnet ring is faint; the boots peak is about 15% lower in practice than in theory, so the highest coins have a small margin.
- Suggested next: tablet check of the whole variety set; then the optional polish bundle (Task 019).
