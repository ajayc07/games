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

## D-039 (2026-10-24) Task 005d review outcomes
Approved all deviations: per-file `git mv` (Windows lock), `?level=` skipping the picker (and `?picker=1` then playing that level), win-screen palette button replaying the same level, the `rest` avatar event (no animation numbers changed), teal with one antenna, removal of unused picture helpers, the picker key-repeat guard.
Architect review of the sheets: all eight options read clearly on the cards, in the standing view and on the Grass theme; sizes (yellow small, purple big) show. Win screen and picker fit at 844x390. Still to be judged on the tablet: chimes by ear, cards without text, dimming.
Flow once the map exists (Task 006): no saved choice -> picker, then Play opens the map; the map has a palette button that opens the picker and returns to the map; `?color=` is per visit and not saved; `chosenCharacterId` in the progress record holds a colour id and absorbs the 005d `athi.robo.choice` key (old key left in place).
CLAUDE.md updated to describe Robo World instead of the Mario universe. Picker gamepad support: not needed for now (parked). Git-history rewrite stays a parent action after 005d is pushed (docs/IDEAS.md); the architect will give exact steps on request.
Order unchanged: 006 map and progress, 007 Grass 4 Shoot, 008 Grass 5 move+jump, 009 parent view.

## D-040 (2026-10-24) Task 006 review outcomes
Approved all deviations: the avatar stands on the first open level not yet cleared (not the furthest open one, which would start a fresh game on Grass 3); signposts cave/sky/castle; `?color=` without a saved choice goes to the map; Escape held 1 s exits on desktop and the exit icon is also hidden during the "your turn" cue; the Input Lab takes colour and look from the manifest.
Architect review of the sheets (fresh, mid, cleared, arrival): the path, pads, 3 star slots, clouds and the palette button read clearly with no text; layouts hold at 844x390 and 1280x800. Known cosmetic flaw: the stepping stones and signpost posts show faintly through the clouds (fixed as housekeeping in Task 007).
Still to judge on the tablet: the 1 s hold-to-exit, whether he drags the map away by accident, and whether the cloud-clearing delights him.

## D-041 (2026-10-24) Grass 4 "Shoot": Power button gameplay
- Controls: `left`, `right`, `power` only (no Jump in this level: one new control per level, D-001). Walking as in Grass 3. The Power button takes Jump's slot (bottom-right) in its own colour and gets the usual `invite` pulse until first pressed.
- Shot: a soft energy ball in the robot's accent colour, fired horizontally from the muzzle in the facing direction. Pressing fires; holding repeats at the cooldown rate. Cooldown about 300 ms, at most 3 shots in flight, range about 640 px, speed about 700 px/s. Mashing is harmless. Shots pass through coins and never hurt anything.
- Targets: friendly bubbles, no enemies, nothing harmful, no faces. A hit pops the bubble (soft pop sound, sparkle) and it turns into coins that are collected automatically (no need to walk to them). Small bubble `o` = 1 hit, 3 coins. Big bubble `O` = a 2-tile-high soft blocker on the path, 1 hit, 6 coins; it stays solid until popped. Hit areas are generous (about 1.3x the picture).
- No failure: bubbles never move toward the player; the flag always ends the level. The only gate is the big bubble, which is why the Power button pulses and the "watch me" demo shows a shot.
- Stars: 1 for finishing; coin thresholds as declared per level.
- New level legend entries `o` and `O`; the demo script format gains the action `power` (validated against `controls.enabled` like the others).
- Order unchanged after this: 008 Grass 5 move+jump, 009 parent view.

## D-042 (2026-10-24) Task 007 review outcomes
Approved all seven deviations: small bubbles half a tile lower so every robot, ball and colour can reach them; a Power press during the cooldown is remembered for 0.3 s (the 4th held shot comes about 70 ms late with the 3-ball cap); shot hit size 14 px; the demo has three shots (two ahead, one behind the start, so it shows turning round) plus a short walk so the coins land, with bubbles regrowing and the demo finger staying down 350 ms (Grass 3's demo too); the bubble behind the start sits in the upper row so the buttons do not hide it; coins fly to the robot; wider spread for the big bubble's 6 coins and a light outline on the green robot's shot.
Architect review of the sheets (844x390, 1280x800, big-bubble blocker): Left, Right and Power do not overlap, Power is clearly distinct, the big bubble reads as a soft blocker.
Parent question: Jump stays out of Grass 4 (D-041 stands); it comes back in Grass 5.
Open for the tablet: pop sounds by ear, does he find Power, is the big bubble fun or a block, stars 22/34 and the 0.3 s cooldown are first guesses. Known and accepted: bottom-row bubbles near the screen edge can pass behind the buttons, far from the robot.

## D-043 (2026-10-24) The control ladder ends with an "everything together" level
Parent asked that all buttons eventually work together. Updated order:
- 008 Grass 5 "Move and Jump": Left, Right and Jump, with gaps (walking, so he can stop at the edge and jump; falls float back, D-019).
- 009 Grass 6 "Everything": Left, Right, Jump and Power together. Gaps to jump and bubbles to pop (some over gaps), nothing requiring more than one action at a time. Button layout for four buttons is decided in that task (Left/Right bottom-left; Jump and Power bottom-right, Power biggest or Jump biggest to be judged on the tablet).
- 010 Parent view (sound, button size, unlock-all, reset progress).
Grass 5 and 6 are new, separate levels; earlier levels keep their single new control.

## D-044 (2026-10-24) Second tablet session
Findings: everything built so far (picker, map, Grass 1-4, hold-to-exit) worked on the tablet with no problems; he enjoyed popping bubbles; he got bored after replaying the same level many times. Parent expects him to handle the next stages.
Decisions:
- Plan stands: 008 Grass 5, 009 Grass 6 "Everything", 010 parent view.
- Replay boredom is now the main risk, not control difficulty. Direction: make a replay feel different without adding rules. Candidate (to design after 009, not before): optional per-play variation, e.g. bubble and coin positions shuffled within safe zones on replay, or a different bubble pattern each play. Parked in docs/IDEAS.md; the parent view (010) may later offer an "endless/free play" level. Do not build before the control ladder is complete.

## D-045 (2026-10-24) Task 008 review outcomes
Approved all three deviations: the float-back fix in shared code (a fall while walking left over a gap now returns him to the side he came from); the coin after each 1-tile gap moved 2 columns on (a jump flies over the earlier position at its peak), with a test guarding coin reachability; the demo at about 8.2 s.
Physics facts to reuse (Task 008 report): a jump lasts 0.84 s and carries about 186 px running, 179-189 px from standing; a 1-tile gap needs 44 px, a 2-tile gap 108 px (71 px margin), a 3-tile gap 172 px (7 px margin, too tight). The body is 40 px wide, so a 1-tile gap cannot be walked over. Gaps stay at 1 or 2 tiles.
Accepted risk: a mashing bot biased to the right takes a median of 131 s on Grass 5 (a deliberate child needs about 21 s of walking plus the jumps). If the tablet shows it is too long: use 6 instead of 8 tiles between gaps (saves about 12 tiles) or fewer gaps. Also watch: holding Right only loops fall and float-back until he lets go or presses Jump (no star cost).
Architect review of the sheets (844x390 Grass 5, map with five dots): buttons match Grass 3 and do not overlap, the gap and coins read clearly, the map holds five dots with two under clouds.
Task 009 therefore uses shorter safe stretches (7 tiles) and fewer gaps.

## D-046 (2026-10-24) Task 009 review outcomes
Approved all five deviations: new grid letter `h` for the high bonus bubbles (a small bubble worth 4 coins with no drop; this is the only new bubble kind and it stays); high bubbles at 2.75 tiles (measured shot heights: standing 32-49 px, top of a jump 177-205 px; at 160 px the purple robot was 1 px from missing; at 176 px all 8 colours and both looks pop it from a jump and none from standing); the flag at column 76 so 7 tiles of ground follow the last gap; a large `?buttonScale` shrinks when four buttons would collide (above about 1.2 at 960 wide); the random-mashing pacing miss reported rather than tuned.
Final layout: Left and Right bottom-left; Jump (larger, 0.26 of the short edge) in the bottom-right corner and Power (0.22) beside it, at least 26 px apart; `?buttons=power` swaps which one is in the corner. The pure `core/ui/buttonLayout.ts` owns placement and the nearest-button hit rule; Grass 1-5 layouts are unchanged (tested).
Architect review of the sheets (844x390 in both layouts): no overlaps, both right-hand buttons clearly distinct, finger room around the thumb arc, the bubbles near the buttons stay visible.
Accepted: sliding a thumb from Right to Jump crosses Power on the way and fires one harmless shot; bottom-row bubbles near a screen edge can sit behind the buttons.
Pacing: random-mashing medians are 131 s (Grass 5) and 126 s (Grass 6) for a bot biased to the right; a child who walks on purpose needs about 22 s plus the jumps. The tablet decides; levers if too long: shorten Grass 6's 20-tile middle stretch, drop a gap, or use 6 tiles between gaps.
Open for the tablet: which layout is better (`?buttons=jump` vs `?buttons=power`), thumb reach, whether four buttons overwhelm him, whether the high bubbles are fun, pop sounds by ear.
Parent rule restated: Claude Code does not push (it offered to push `133c5f4`; the answer is no). `.claude/launch.json` and `.claude/settings.local.json` stay uncommitted.

## D-047 (2026-10-25) Parent view design (Task 010)
Goal: the parent can tune the game for Athiran without code or URL parameters. It is the last task of the original plan (D-043 order).
- Access: a small gear icon on the map that must be held 3 seconds (visible filling ring, longer than the 1 s level-exit hold) so a 3-year-old cannot open it by accident. `?parent=1` opens it directly (testing). Not reachable from levels, the picker or the win screen.
- Text is allowed here (the parent reads it); every control is large (at least 80 px) and works with touch and keyboard.
- Settings (saved in the progress record's `settings`; URL parameters still override for that visit): sound on/off (default on); button size steps 0.8 / 1.0 / 1.2 / 1.4 with a live preview of the real four-button layout; main button when Jump and Power are both shown (Jump or Power, replacing `?buttons=`); robot look (robot or ball); unlock all levels; "show the watch-me demos again".
- Reset progress: a held button (3 s, ring) that clears stars, best coins and unlocks only; the colour choice, look and settings stay.
- Precedence everywhere: URL parameter, then saved setting, then default.
- Not in scope: passcodes or maths gates, accounts, cloud sync, export/import, usage statistics, per-level settings, language options.
