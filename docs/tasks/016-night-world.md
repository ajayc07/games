# Task 016: Night world with a headlamp, and the level "Night Walk"

Design: D-060. Step 2 of the variety plan in D-059.

## Goal
A dark stage that feels different but plays exactly like the levels he knows: a night sky with stars, fireflies and a soft headlamp glow that follows the robot. Cosmetic only.

## In scope
- `LevelTheme.night` (optional) and `nightTheme`; `themeForWorld('night')`.
- Stars in `ParallaxBackground`; headlamp glow and fireflies in `LevelScene.buildNight`; `fx-glow` texture.
- `night-1.json` ("Night Walk": 75 tiles, walking, four buttons, gaps 1/2/1, 12 small bubbles, 12 coins, no demo), listed after Grass 7 in the Grass world.
- Tests: level checks, theme contrast (robot joints, pad rim, coins), a scripted bot on 200 varied grids, world list and unlock order.

## Out of scope
Rock-wall cave art, a Cave world of its own on the map, new mechanics, night music, a demo, changing any existing level.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; the robot options stay readable on the night hills (3:1 tested).
- In the browser: stars, fireflies and the glow show, the level plays, no console errors.

## Result
- What changed: night theme, stars, headlamp, fireflies, `fx-glow`, `night-1.json`, world list, tests, docs (levels.md, D-060, IDEAS, PROGRESS).
- Deviations from plan (and why): the hills are pale periwinkle, not dark, so the robot's dark joints keep 3:1 contrast on every option; the pad rim is only tested against the hills (against a dark sky no colour can also pass 3:1).
- How verified: typecheck, 402 tests and build pass; Chromium on `?level=night-1&debug=1` at 1280x720 and 844x390 with blue, red and purple robots: stars, glow and level render, a shot fires, no console errors.
- Open issues / risks: not seen on a tablet; the glow washes the near hills almost white around the robot and bubbles are fairly faint on the pale hills; Grass 7 and night-1 share the Grass world on the map.
- Suggested next: tablet check, then step 3: the ball-mode pickup.
