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

## D-022 (2026-10-24) Task 003 review outcomes
Approved: bottom-anchored grid, Image.decode() loading with capsule fallback, trimmed `displayHeight`, manual camera scroll
(high-DPI), 26 coins. Rule recorded in ARCHITECTURE "Screen layout": every scene calls `bindToScene`; buttons in
screen-fixed containers need scroll factor 0.

## D-023 (2026-10-24) Character poses and voices
Pose use: on the ground while running = `poses.run`; in the air = `poses.jump`; idle (before the run, win screen) = `image`.
Mario's main image is already a jump pose, so for Mario `poses.jump` = his main image and `poses.run` = `mario-run.png` (faces right).
Luigi's `poses.run` = `luigi-run.png` faces LEFT, so poses carry a facing field and flipping is derived from it.
Characters without extra poses keep the single-image bob/stretch/squash/flip trick.
Voice slots are arrays (random pick): `pick`, `jump`, `win`. The generic jump sfx always plays; the voice clip for jump is
rate-limited (at most one per 1.5 s) so mashing is not annoying. `win` plays at the flag.
Proposed mapping (parent to confirm by ear, easy to swap in the manifest):
Mario: pick = mario-yeah-ho, jump = mario-ha-ha, win = mario-yipee.
Luigi: pick = luigi-oh-yeah, jump = luigi-haha, win = luigi-yeah-ha-ha.
_Superseded in part by D-037 (Task 005c): the pose part (run/jump/idle pictures) was removed with the sprite look; the voice part stands._

## D-024 (2026-10-24) "Watch me" demo
A level declares `controls.demo` as `false` or `{ "tiles": N, "jumpsAtTiles": [..] }`. A semi-transparent ghost of the chosen
character runs the first N tiles, pressing jump at those columns through the same player code; the on-screen button (if shown)
animates a press and a finger icon taps it in sync. The real run then starts from the start. The demo plays once per session per
level (in-memory for now; persistence decides later), `?demo=1` forces it, `?demo=0` skips it. It can be skipped by a tap after 1.5 s.

## D-025 (2026-10-24) Win screen gets a Next button
Replay, Next (only if another level follows in the world; the biggest and pulsing) and Home. The map replaces this in Task 006.

## D-026 (2026-10-24) Task 004 review outcomes
Approved: pose objects `{ image, facing, displayHeight }`, smaller run-pose heights (86/90) to match body size, ghost without voice,
`worlds.ts` data file. Luigi's mirrored cap "L" is accepted for now; a right-facing Luigi run image can replace it later (poses support facing).
Voice mapping stays a guess until the parent has listened on the tablet.
_Pose parts superseded by D-037 (Task 005c): poses were removed._

## D-027 (2026-10-24) Ripped game sprite sheets are not used
Mario/Luigi (NSMB) and Bowser (Super Mario Maker) sheets are low-resolution, opaque-background rips in a different art style
from the HD renders, so they would look soft and mismatched. Parked in `_sources/` (gitignored, not bundled).
Run animation is made from the HD renders: procedural motion now (Task 004b), optional extra HD frames later via `poses.runFrames`.
`src/universes/<id>/assets/` is for files the game uses only: every file there is bundled.
_The `poses.runFrames` flipbook was removed in Task 005c (D-037); the rule about `_sources/` and bundled assets stands._

## D-028 (2026-10-24) Task 004b review outcomes
Approved all three deviations (new dust replaces old landing dust; `hop(now)`; 70 ms take-off ease to avoid a 24% size jump).
Motion numbers live in `ANIM`; the parent will judge dust/shadow on the tablet (they can be dialled down or off).

## D-029 (2026-10-24) Walking feel for non-auto-run levels
Holding Left/Right moves at a constant walk speed (about 220 px/s) with a very short ramp (about 60 ms up, 80 ms down), no sliding or
momentum, so "hold = move, release = stop" is obvious. Facing flips at once. Air control equals ground control.
Grass 3 has no gaps and no enemies: nothing requires moving and jumping at the same time (that is level 4).
Coins at ground level teach walking (including a few to the LEFT of the start); a few lone coins about 2 tiles up teach pressing Jump while standing.

## D-030 (2026-10-24) Demo script format v2
`controls.demo` may now be `{ "tiles": N, "jumpsAtTiles": [...] }` (auto-run levels, as before) or
`{ "script": [ { "t": ms, "action": "left"|"right"|"jump", "hold": ms? } ... ] }` (time-based; `hold` for left/right, default 600 ms).
The ghost presses through the same Player code; the finger icon and button animation follow the scripted action. The demo ends 600 ms
after the last step finishes. Both forms are validated with readable errors.

## D-031 (2026-10-24) Voice slots for Peach, Toad and Bowser (guess, parent to confirm)
Files are renamed to the character-first convention (drop the `sound-` prefix, `he-he0yeah` becomes `he-he-yeah`).
Peach: pick = hello, jump = yeah, win = he-he-yeah. Bowser: pick = bowser-1, jump = bowser-0, win = he-ha-ha.
Toad: pick = toad-2, jump = toad-0, win = toad-1 (by length and feel only; nobody has listened yet).
Yoshi and Donkey Kong still have no voices and use the generic sounds.

## D-032 (2026-10-24) Avatar "looks": sprite, ball, portrait, robot
The player can be drawn in several interchangeable looks behind one `AvatarLook` interface: `sprite` (current real-image look),
`ball`, `portrait` (ball with the character's face from its image) and `robot`. Selected with `?look=<name>` for now (parent setting
later). Physics, hit box and gameplay are identical for every look and every character. The picker (Task 007) still shows the real
images and plays the real voices; the chosen character supplies colours, a small size factor and sounds to the avatar.
Default stays `sprite` until the parent has compared the looks on the tablet with Athiran.
_Superseded in part by D-037 (Task 005c): looks are now `robot` (default) and `ball`; `sprite` and `portrait` were removed._

## D-033 (2026-10-24) Original, code-built characters (no Nintendo designs on avatars)
Avatar bodies are built from code-drawn parts (cached generated textures assembled in a container hierarchy), animated by pure,
unit-tested clip functions: idle, walk, run, jump, fall, land, win, shoot. No M cap, moustache or other character-specific signatures
on avatars; character identity comes only from palette, size factor and sounds. The robot is an original design in the spirit of a
friendly white/grey bot with cyan accents, a dark visor face and antennae. `_sources/robot-reference.png` is a style reference only; do not trace it.

## D-034 (2026-10-24) Task 005 review outcomes
Approved: idle rule (c) with the run picture as fallback, demo waiting for the ghost to land, strict (unsorted-rejecting) script validation,
`characters.ts` split. A real standing picture (`poses.idle`) would improve Mario/Luigi idle later; no code change needed.
_The idle rule and `poses.idle` were removed in Task 005c (D-037)._
The tablet test with Athiran is deliberately postponed until the avatar looks (Task 005b) exist, so all looks can be compared in one session.
Grass 3 left-coin placement vs. buttons on 16:10 is fixed in 005b section 0.

## D-035 (2026-10-24) Task 005b review outcomes
Approved: shared motion driver, V-arms on jump/win, wiggle instead of antenna spin, un-mirrored portrait faces, raising all Grass 3 coins to head height.
Architect review of the sheets: all four looks read well; the robot is a good first version and does not need a redesign.
Follow-ups (done in Task 006 housekeeping): low contrast of green avatars (Luigi, Yoshi, Bowser limbs) on green hills needs a subtle light rim/outline;
add a global visual size knob (`?size=1.2` for the tablet test) since 104 px may be small for a 3-year-old on a tablet.
Portrait using real faces is accepted for the private build (D-005 applies); it must not ship in any commercial build (docs/IDEAS.md).
Default look stays `sprite` until the tablet comparison.

## D-036 (2026-10-24) World map, progress storage and unlocking
Map is the default start screen. Level dots along a path, locked dots under clouds, 3 star slots per dot, the avatar on the current dot.
Unlock rule: level i is open if i < clearedCount + openAtATime (default 2). Optional per-world `finalLevelStarsRequired`. Later worlds show as cloud-covered
teasers (icons only). `?unlock=all` overrides for testing; the parent view (Task 008) gets the real switch.
Storage: per-universe record `{ version: 1, chosenCharacterId, look, levels: { [id]: { stars, bestCoins } }, settings }` in IndexedDB with
localStorage then in-memory fallback, no dependencies; failures never crash; unknown versions fall back to a fresh record without deleting the old one.
In-level exit: a small home icon needing a 1-second hold (progress ring) so a 3-year-old cannot leave a level by accident.

## D-037 (2026-10-24) First tablet session with Athiran
Findings: of all looks he liked the robot best and loves its shooting. He is already bored by auto-run and tap-to-jump (Grass 1 and 2) and liked Grass 3 (walking).
Parent feedback on the robot: while running it faces the player, so it looks like it is running backwards and unnatural; jumping looks great.
Decisions:
- Remove the `sprite` and `portrait` looks and all pose/run-frame/idle-pose machinery. Looks are `robot` (default) and `ball`. Real character images stay only for the future picker; voices stay.
- Fix running view: the robot turns into a three-quarter (yaw) view in the direction of travel, front view when idle. Turning is a head-then-body yaw sweep, not a flat flip.
- Re-pace: Grass 1 and 2 shortened to about 60%, `openAtATime` default 3 so he can reach Grass 3 immediately. Supersedes the default of 2 in D-036.
- Content direction: he is ready for more. Because he loves shooting, the Power button comes next as gameplay ("Grass 4 Shoot": friendly bubbles/targets that pop into coins, no enemies, nothing harmful), then move-plus-jump gaps ("Grass 5").
Updated order: 005c (this cleanup/fix/pacing), 006 map and progress, 007 Grass 4 Shoot (Power), 008 Grass 5 move+jump, 009 character picker, 010 parent view.

## D-038 (2026-10-24) Generic "robo" universe; Mario content removed; colour-card picker; no character voices
Parent decisions: the character jump voice is annoying and goes; the universe becomes generic; Mario-related content is stripped except the idea of a
character selection card, which is kept as a colour/size/antennae selection for the robot.
- Universe id `robo`, title "Robo World" (single constant, easy to rename). `universes/mario` becomes `universes/robo`.
- Cast of 7 Nintendo characters (names, images, voices, face crops) is removed from the game and bundle; files are archived locally in `_sources/archive-private/` (gitignored), not deleted from the parent's disk.
- Character options become generic colour cards (ids: red, orange, yellow, green, teal, blue, purple, pink) with palette, small scale variation and antenna count.
- Sounds: no voice clips. Jump uses only the generic jump sound. Each card has a synthesized pick chime and win chime (same recipe, different pitch/timbre).
- Supersedes D-004 (cast), D-005 (real art/voices bundled), D-023 voices and D-031 voice mapping. D-001..D-003, D-006..D-022 otherwise stand.
- The public git history still contains the removed Nintendo files until it is rewritten (see docs/IDEAS.md); that is a separate parent action.
- Order: 005d (this), 006 map and progress, 007 Grass 4 Shoot, 008 Grass 5 move+jump, 009 parent view. The picker is now part of 005d.
