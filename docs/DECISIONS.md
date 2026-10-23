# Decisions log

Settled decisions. Do not reopen without a strong reason; if you disagree, raise it in your task summary.
Format: ID, date, decision, why.

## D-001 (2026-10-23) Mario-style platformer with a gradual control ladder
For a 3-year-old who loves Mario and plays on a tablet/phone/desktop. One new control per level:
tap-anywhere jump -> big Jump button (auto-run) -> Left/Right -> Move+Jump together -> Power.
Why: he currently uses one hand and mashes buttons; two-thumb coordination must come late.

## D-002 (2026-10-23) No failure states, no text
No lives, timers or game-over. Falls bounce back. Icons, colour and sound only.
Why: age 3; mashing must be harmless and fun.

## D-003 (2026-10-23) World map for level selection, Grass world first
Map with path and level dots; locked levels behind clouds; stars unlock the world's last level.
Four worlds planned (Grass, Pipe/Underground, Sky, Castle); first version only needs Grass.
2-3 levels open at a time (config). Later upgrade: the child walks the character along the path.

## D-004 (2026-10-23) Character picker, 7-character Mario cast
Mario, Luigi, Peach, Toad, Bowser, Yoshi, Donkey Kong. Differences are cosmetic (power animation, sounds) only;
identical physics. 3 sounds each later: pick, jump, win. Progress is per universe, chosen character remembered.

## D-005 (2026-10-23) Real character art and voices are bundled in the repo
Private, non-commercial, parent accepts the (low) takedown risk of a public repo. Option 1 of the hosting options.
Mitigation if ever needed: move media out of the repo behind an import screen; code stays the same because
assets are referenced through manifests. Keep the repo name neutral.

## D-006 (2026-10-23) Phaser 3 + TypeScript + Vite
Handles physics, sprites, audio, gamepad and mobile well; parent already knows TS/Vite.

## D-007 (2026-10-23) Universe modules, lazy loaded; Mario is default
Each universe is a folder with its own manifest, levels, assets, scenes, loaded by dynamic import.
`config.defaultUniverse = 'mario'`. No launcher screen until a second universe exists.

## D-008 (2026-10-23) GitHub Pages with GitHub Actions, PWA offline + installable
Repo `ajayc07/games` (public), site at /games/. Service worker for offline; fullscreen landscape home-screen app.

## D-009 (2026-10-23) Placeholders first
Generated shapes and beeps until real PNGs/sounds are supplied. Asset files named after the character
(`mario.png`, `mario.mp3`, `donkeykong.png`, ...).

## D-010 (2026-10-23) Two-Claude workflow with the repo as memory
Claude Desktop is architect, Claude Code is developer. Tasks are medium-sized, one commit each,
and always end with the standard summary. Parent's tablet-test notes go in PROGRESS.md.

## D-011 (2026-10-23, proposed) Levels as custom JSON, not Tiled
Simple grid-based JSON for now. Code may propose Tiled if it is clearly better, flagged as a deviation.
