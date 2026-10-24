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

## D-012 (2026-10-23) Hand-written service worker; workbox-* as pinned devDependencies
`src/sw.ts` (vite-plugin-pwa injectManifest). The generated worker broke on the apostrophe in the local folder
name "Athi's Game". workbox-* packages are devDependencies only (they end up inside sw.js). Approved.
Also: TypeScript 5.9.x and Phaser 3.90.x stay pinned (Phaser 4 / TS 7 deliberately not adopted).

## D-013 (2026-10-23) Height-locked scaling with flexible width, no letterbox bars
Logical height is always 720. Logical width flexes with the screen between 960 (4:3 tablets) and 1680 (very wide phones);
beyond that, small bars are acceptable. Gameplay-critical content must fit the central 960x720 "safe area";
extra width is bonus scenery. UI is anchored to screen edges/corners and respects device safe-area insets (notches).
Supersedes the FIT scaling from Task 001.

## D-014 (2026-10-23) Test-only dev dependencies allowed for pure logic
`vitest` (devDependency) is approved for unit-testing pure logic such as input state and audio throttling.
Any other new dependency still needs asking in the task summary.

## D-015 (2026-10-23) Input design for a one-handed 3-year-old
Touch buttons track each pointer continuously, so sliding a thumb from Left to Right switches buttons without lifting.
Buttons stay big and well spaced; mashing is harmless. A level can also declare "tap anywhere = jump".
Keys: Left = ArrowLeft/A, Right = ArrowRight/D, Jump = Space/ArrowUp/W, Power = X/Z/Shift.
Gamepad: d-pad or left stick = left/right, A = jump, X or B = power.

## D-016 (2026-10-23) No Claude attribution in commits or PRs
No `Co-Authored-By`, `Claude-Session` or "Generated with" lines. Enforced by a CLAUDE.md rule and
`.claude/settings.json` (`attribution` set to empty). Commits use the parent's own git identity.

## D-017 (2026-10-24) Task 002 review outcomes
Approved: shared Left/Right touch area split at the midpoint, pointer events for touch/mouse, `?debug=1` test hook.
D-013 amended: `MAX_WIDTH` raised from 1680 to 1920 (about 2.67:1) so ultra-wide screens have no side bars.
Safe area stays the central 960x720.

## D-018 (2026-10-24) Level format v1: ASCII grid with a legend
Levels are JSON with a `grid` array of equal-length strings. Legend: `#` solid ground, `.` empty, `c` coin,
`S` player start, `F` flag. Gaps are simply missing ground. This supersedes the separate `coins`/`gaps`/`flag`
arrays in the earlier ARCHITECTURE sketch (Code updates ARCHITECTURE.md). Characters added later (bricks, pipes, ...)
get new legend entries.

## D-019 (2026-10-24) Falling is never a failure
A fall plays a soft whoosh, and the character floats back on a small cloud to the last safe ground spot
(about 3 tiles behind the gap) and carries on. No lives, no counters, no penalty to stars.

## D-020 (2026-10-24) Stars
Finishing a level always gives 1 star. 2 and 3 stars come from coin thresholds declared per level.
Progress persistence arrives in Task 006; until then results are transient.

## D-021 (2026-10-24) Shared physics, forgiving feel
All characters share one tuning file (run speed, gravity, jump). Coyote time (about 120 ms) and jump buffering
(about 150 ms) are on. Jump height is fixed (no variable-height holding) because mashing and holding must behave the same.
