# Task 015: Step blocks, bounce pads and Grass 7 "Blocks and Bounce"

Design: D-059. First of four variety steps (blocks and pads, night/cave world, ball-mode pickup, magnet and rocket boots).

## Goal
A new level with two gentle obstacle ideas that add variety without disturbing the play: toy step blocks he jumps up onto, and springy pads that launch him up to coins by themselves. No new button, no lose state, nothing required for stars 1 and 2.

## In scope
- Legend `B` (step block, solid, at most 2 stacked) and `^` (bounce pad, not solid); `extractEntities` returns `blocks` and `pads`.
- `core/levels/pads.ts` (pure, tested): `PAD`, `BLOCK_MAX_TILES`, `padPeak`, `padAirMs`, `PadTrigger`.
- `LevelScene`: `buildObstacles` (generated toy block, plate and spring textures), `updatePads` (launch, `boing` sound, sparkles, squash), blocks not drawn as ground; `Player.launch`.
- `grass-7.json` (70 tiles, flat, Left/Right/Jump, no demo, `variety: false`), listed in the grass world.
- Tests: pads unit tests, Grass 7 level checks, level-list, unlock and variety tests updated for 7 levels.

## Out of scope
Night/cave theme, power-ups and transformations (later steps), a demo for Grass 7, bubbles or Power in Grass 7, moving platforms, replay variety for Grass 7, Practice use of blocks and pads.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; banned-names test passes.
- In the browser: a block can be climbed, a pad launches him about 4 tiles up and the coins above it are collected, standing on a pad does not trap him, no console errors.

## Result
- What changed: new legend chars `B` and `^`, `pads.ts`, `Player.launch`, `LevelScene.buildObstacles/updatePads`, obstacle textures and `boing` sound, `grass-7.json`, world list, docs (levels.md, D-059, IDEAS, PROGRESS).
- Files touched: see the commit (core/levels: pads.ts and pads.test.ts new, grid, format, Player, LevelScene, placeholders; core/audio/recipes; universes/robo: worlds, levels/grass-7.json, levels.test; variety.test; docs).
- Deviations from plan (and why): none. Grass 7 opts out of replay variety because its coin arcs over pads and blocks must stay where they are; the rainbow bubble does not apply (no bubbles).
- How verified: typecheck, 396 tests and build pass; Chromium (headless, slow frame rate) on `?level=grass-7&debug=1`: the robot climbs onto a block and collects its coin, a pad launches him about 270 px (peak feet 268 px up in the sampled frames) and he collects the coins above it, standing on a pad bounces him, no console errors. Screenshots were looked at during the run, not saved.
- Open issues / risks: not seen on a tablet; the 2-high stair at columns 20-21 needs a 2-tile climb (jump peak 2.5 tiles); no demo and the test bot knows nothing of blocks and pads; blocks and pads are not used in Practice.
- Suggested next: tablet check, then step 2: the night/cave world.
