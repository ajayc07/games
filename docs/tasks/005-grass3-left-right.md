# Task 005: Grass 3 "Left and Right", demo script v2, more voices

## Goal
Introduce walking: auto-run off, Left and Right buttons plus Jump, one hand at a time. Teach "hold to move, let go to stop" and "press Jump while standing". Extend the demo to scripted Left/Right/Jump, and wire the new voice clips.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-021, D-023, D-024, D-028..D-031), docs/ARCHITECTURE.md
- Existing: `core/levels/*` (Player, LevelScene, demo*, animation, motionFx), `core/input/*`, `core/ui/TouchControls`, `universes/mario/{manifest,worlds}.ts`, `levels/grass-2.json`.

## In scope

### 0. Assets and first commit
- Nine new untracked voice files in `src/universes/mario/assets/`. Rename per D-031: `sound-bowser-0.mp3` -> `bowser-0.mp3`, `sound-bowser-1.mp3` -> `bowser-1.mp3`, `sound-bowser-he-ha-ha.mp3` -> `bowser-he-ha-ha.mp3`, `sound-peach-he-he0yeah.mp3` -> `peach-he-he-yeah.mp3`, `sound-peach-hello.mp3` -> `peach-hello.mp3`, `sound-peach-yeah.mp3` -> `peach-yeah.mp3`, `sound-toad-0.mp3` -> `toad-0.mp3`, `sound-toad-1.mp3` -> `toad-1.mp3`, `sound-toad-2.mp3` -> `toad-2.mp3`.
- Separate first commit: `assets: add peach, toad and bowser voice clips`. Then wire them in the manifest as in D-031 (pick/jump/win arrays). The remaining work goes in a second commit `task-005: grass 3 left and right`.

### 1. Walking movement (D-029)
- Player supports non-auto-run movement driven by `left`/`right`: constant walk speed (add `walkSpeed` to `physics.ts`, about 220; a level may override with `walkSpeed`), ramp up about 60 ms, ramp down about 80 ms, no sliding. Facing flips at once; the run pose and lean follow direction; stride phase follows distance as before; no stride motion when standing; start/stop blends from Task 004b still apply.
- Pressing both Left and Right cancels to stand still. Alternating quickly must not jitter or flip the sprite every frame (add a small facing hysteresis if needed).
- Jump while standing works; jumping while holding a direction also works (natural, not required).
- Idle pose: Mario's and Luigi's main image is a jump pose, which looks odd when standing on the ground. Decide with screenshots which of these looks best and record the choice: (a) main image, (b) the run pose at its neutral frame, (c) add an optional `poses.idle` and fall back to (b) for characters whose main image is flagged as a jump pose. Use the same rule for all characters.
- Level bounds: invisible walls at both ends of the grid; the player stops softly there. Scenery extends past the ends as now.
- Camera: manual scroll with look-ahead in the direction of facing, smoothed so it does not swing wildly when changing direction; the player never leaves the central safe area.

### 2. Grass 3 "Left and Right"
- `grass-3.json`: `controls: { enabled: ['left','right','jump'], autoRun: false, tapAnywhereJumps: false, demo: { script: [...] } }`. About 70 tiles long. No gaps, no enemies, flat ground. `stars`: two = 10, three = 16.
- Start about 6 tiles from the left end. Place 3 to 4 coins to the LEFT of the start (so going left is rewarded), then a path of ground coins to the right in short trails, and about 4 lone coins roughly 2 tiles above the ground (collected by pressing Jump while standing under them). About 22 coins in total. Flag near the right end.
- TouchControls shows Left, Right (shared area split at the midpoint, as built) bottom-left, and Jump bottom-right. Until the first press of each, gently pulse that button (Left and Right alternate). Taps elsewhere do nothing except a soft pulse of the nearest relevant button.
- World order: add `grass-3` after `grass-2` in `worlds.ts`; Next on Grass 2's win screen leads to Grass 3; Grass 3 has no Next.
- Keyboard: arrows or A/D move, Space/Up/W jump.

### 3. Demo script v2 (D-030)
- Parse and validate `{ script: [{ t, action, hold? }] }` alongside the existing `{ tiles, jumpsAtTiles }`; reject mixing both forms, bad actions, negative times, unsorted times (or sort and warn), `hold` on jump, with readable errors.
- The ghost executes the script through the same Player input path; the finger icon and button press animation follow each step (Left, Right and Jump buttons). Demo ends 600 ms after the last step finishes, then the ghost fades and the real run begins. Grass 3 demo script: walk right about 1.5 s, walk left about 0.9 s, press Jump once, then end.
- Same skip rules as before (tap after 1.5 s, `?demo=0/1`).

### 4. Tests and docs
- Unit tests: movement ramp (up/down, both pressed, facing hysteresis), demo script v2 parsing/validation and scheduling, world progression to Grass 3, voice mapping for the 9 new files (manifest resolves each slot, missing files tolerated).
- Update ARCHITECTURE.md (movement, demo v2, idle pose rule) and PROGRESS.md (Task 005 done, Task 006 next, tablet checklist for Grass 3: does he find Left and Right? does he understand that letting go stops? does he reach the overhead coins? does the button size work for one hand?). Fill in this file's Result.
- No `Co-Authored-By` or other attribution lines (D-016). Do not push.

## Out of scope
Move-plus-jump coordination levels (Task 009+), gaps in Grass 3, Power button, world map, persistence, picker, new art, new runtime dependencies, voices for Yoshi and Donkey Kong.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- Grass 3: no auto-run; holding Left or Right moves, releasing stops within about 80 ms; both held = stand; sliding a thumb from Left to Right turns around without a dead spot; Jump works while standing; keyboard works.
- Demo plays once per session for Grass 3, performs the scripted walk right, walk left, jump with matching button animations, then hands over; `?demo=0/1` and skip work; the older Grass 2 demo still works.
- Left coins, ground coin trails and overhead coins are all collectable; a bot using only holds and single presses can finish with 3 stars; a bot that never presses stays put without errors.
- Characters: all 7 work (`?char=<id>`); Mario and Luigi show the chosen idle pose and the run pose in the right direction with no size popping; Bowser, Peach and Toad play their voices; missing files do not throw.
- Layouts at 844x390, 1280x800, 1024x768 and 2400x1000: Left, Right and Jump fit, do not overlap, and sit inside the safe area; the HUD is unchanged.
- 58+ fps in a full Grass 3 run and in 20 presses per second mashing; no console errors.

## How to verify
Playwright with touch and keyboard plus `?debug=1`, frame strips for turning around and stopping, screenshots of start, demo, mid-level, win. List what you could not check (voices by ear, real tablet, thumb ergonomics).

## Result (Code fills in at the end)
- What changed: Nine voice files renamed per D-031 and committed first (`assets: add peach, toad and bowser voice clips`), then wired
  in a new plain-data `universes/mario/characters.ts` (moved out of `manifest.ts` so tests can read it). Walking for non-auto-run levels
  (`core/levels/walk.ts`, pure and tested): walk speed 220 (`PHYSICS.walkSpeed`, level `walkSpeed` override), 60 ms ramp up / 80 ms
  down, reversal slows to 0 first, both held = stand, facing changes at most once per 90 ms, soft invisible walls at both grid ends.
  `Player.step` now takes a direction (`move`) plus frame time; auto-run levels keep the instant speed. Camera look-ahead turns round
  only after 350 ms of moving the other way and is clamped so the player stays within 15-85% of the safe area. Grass 3 (70 tiles, 22
  coins, stars 10/16, script demo) added after Grass 2. Demo script v2: `{ script: [{ t, action, hold? }] }` parsed and validated next
  to the tile form; one `DemoRunner` interface for both; the finger glides between Left, Right and Jump and stays down while held; the
  button press animation lasts the hold. Invite pulses for every not-yet-pressed button (Left and Right take turns), miss taps nudge the
  nearest button. Idle rule: option (c), `poses.idle` if given, else the run picture standing still when the main image is the jump
  pose (Mario, Luigi), else the main image; the main image shows on the win screen (`win` pose).
- Files touched: `src/core/levels/{walk.ts, walk.test.ts, demoScript.test.ts, Player.ts, LevelScene.ts, demo.ts, demo.test.ts,
  demoFx.ts, format.ts, physics.ts, poses.ts, characterLook.ts, README.md}`, `src/core/types.ts`, `src/core/ui/TouchControls.ts`,
  `src/universes/mario/{characters.ts, manifest.ts, worlds.ts, levels/grass-3.json, levels/levels.test.ts, levels/README.md,
  assets/README.md}`, nine `src/universes/mario/assets/*.mp3` (renamed, separate commit), `docs/{ARCHITECTURE,PROGRESS,DECISIONS}.md`,
  this file.
- Deviations from plan (and why):
  - Idle rule: chose (c) with (b) as the fallback (screenshots of (a) vs (b) for Mario and Luigi). With (a) the standing picture equals
    the jump picture, so a standing jump showed no change, and the raised leg looks like floating. Added a `win` pose so the main
    image still shows after the flag hop.
  - The timed demo also waits for the ghost to land before ending (600 ms after the jump the ghost is still in the air; fading it
    mid-jump looked broken). The tile form (Grass 2) is unchanged.
  - Unsorted script times are rejected (not sorted with a warning): an error points at the step, which is clearer for a data file.
    Equal times are allowed. Also rejected: a script action the level does not enable.
  - Characters moved from `manifest.ts` to `characters.ts` so the voice mapping can be unit-tested without Phaser.
  - "Inside the safe area" for buttons read as inside the device-safe UI area (`uiRect`), since D-013 anchors UI to screen corners;
    on wide screens Left/Right are outside the central 960 gameplay area.
  - `docs/DECISIONS.md` (architect's uncommitted D-028..D-033) is included in this commit.
- How verified: `npm run typecheck`, `npm test` (117 tests, incl. new walk, demo script v2, Grass 3, world order and voice tests) and
  `npm run build` pass. Headless Chrome (playwright-core, scratch scripts) with `?debug=1`: keyboard ramp (full speed about 60 ms,
  stop 72 ms), both held = 0, A/arrows/Space, soft stop at the left wall (x = 20, all 4 left coins); touch slide Left -> Right with no
  dead spot (L L L L L L R R ...) and turning round; miss tap = no move/jump; demo `?demo=1`: presses right/left/jump at the scripted
  times, ghost 416 -> 733 -> 533, hands over to play; bot with holds and single presses: 22/22 coins, 3 stars, no Next; bot that never
  presses: stays at x = 416, no errors; all 7 characters (`?char=`): correct textures and flip in both directions, voices played for
  Mario, Luigi, Peach, Toad, Bowser (jump + win); layouts 844x390, 1280x800, 1024x768, 2400x1000: buttons inside the UI area, no
  overlap, player inside the safe area; camera during fast alternating: max 3 px per frame, player stayed within the safe area;
  frame strips (paused loop, stepped by hand) of turning round and stopping for Mario and Luigi: no size popping; full run 60 fps,
  mashing 20 presses/s average 59.8 fps (min 57.9 smoothed at 844x390 dpr 3); Grass 2 demo still presses twice and hands over; Grass 1
  still auto-runs. No console errors anywhere.
  Not checked: voices by ear, real tablet, thumb ergonomics, iOS Safari.
- Open issues / risks: idle run picture looks like a paused run (a real `poses.idle` picture would fix it); facing flips before the
  speed reverses (about 10 px backward slide); left coins partly behind the Left/Right buttons at the very start on 16:10 screens;
  voice slots for Peach/Toad/Bowser are guesses.
- Suggested next: Task 006 (world map, stars, unlocking, progress storage), or Task 005b (avatar looks) if the architect wants the
  look comparison first. Before either: tablet test of Grass 3 with Athi.
