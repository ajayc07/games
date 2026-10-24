# Task 005c: Robot three-quarter running view, remove sprite/portrait looks, re-pace Grass 1-2

## Goal
Act on the first tablet session (D-037): make the robot look like it is running forward, remove the unused looks, and tighten the first two levels so Athiran does not get bored.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-023, D-033, D-035, D-036, D-037), docs/ARCHITECTURE.md
- Existing: `core/avatar/*` (RobotLook, BallLook, AvatarDriver, SpriteLook, portrait, robotSpec, clips), `core/levels/{Player,characterLook,poses,LevelScene,ResultScreen,demo*}.ts`, `universes/mario/{characters,manifest,worlds}.ts`, `levels/grass-1.json`, `grass-2.json`.
- Review images: save to `_sources/review/` (not committed) as in 005b.

## In scope

### 1. Robot three-quarter view (the important one)
Problem: the robot's face and body stay front-on while it moves sideways, so it looks like it runs backwards.
- Add a smoothed `yaw` value in -1..1 (sign = facing direction) to the robot rig. Idle: yaw 0 (front-on, faces the player, friendly). Walking/running: yaw moves toward about 0.75 in the direction of travel, scaled by speed. Jump/fall: keep about 0.4 to 0.5 so the face stays readable (the parent loves the jump, so the jump must not look worse; compare before/after frames and keep it at least as good).
- Yaw changes drive all parts through the same spec file: head and visor panel shift and narrow toward the facing side; the far eye is compressed and the near eye stays large (three-quarter face); the near ear disc is full size and the far ear is narrower and partly behind the head; antennae offset slightly with yaw; the torso narrows and the chest panel shifts toward the facing side; boots point their toe in the facing direction.
- Depth ordering: the near-side arm and leg are drawn in front of the body, the far-side ones behind; the order swaps when facing changes.
- Turning: replace the flat horizontal flip with a yaw sweep: head leads (about 100 ms), body follows (about 160 ms), passing through front-on. Keep the facing hysteresis from Task 005. No size popping or feet sliding beyond what exists.
- Eye look direction and happy/blink states keep working with yaw. Shoot clip (parent loves it) must still look as good: arm cannon fires in the facing direction; with yaw the cannon arm must read clearly (compare frames).
- Win pose: yaw returns to about 0 so the robot faces the player and celebrates.
- All numbers live in the robot spec/tuning file. Unit tests: yaw smoothing and mapping from speed/facing/state, turn sweep timing, depth order flag per facing, no discontinuity across yaw 0.
- Provide review sheets: run right, run left, stop, turn, jump, shoot (right and left), win, for Mario and Bowser palettes, at 844x390 (dpr 3) and 1280x800.

### 2. Remove the sprite and portrait looks
- Delete SpriteLook, the portrait look and its crop data, `poses`, `runFrames`, `runFps`, idle-pose rules, run-pose images (`mario-run.png`, `luigi-run.png`: `git rm`) and all code, tests and docs only they used. Keep the character image files (`mario.avif` etc.) and their `image` field because the future character picker needs them; keep image-decoding helpers only if the picker will clearly reuse them (say what you kept and why).
- Looks are now `robot` (default) and `ball`. `?look=` accepts those two; anything else falls back to robot with one quiet warning. The demo ghost, win screen, Input Lab and levels all use the chosen look.
- Remove `displayHeight` and pose-related fields from the cast data if unused; the avatar size comes from `avatar.scale`.
- Keep voices, palettes and the shared motion driver. The 004b procedural motion (squash/stretch/dust/shadow) must still apply to the robot and ball.
- Update the earlier docs (ARCHITECTURE, DECISIONS notes: mark D-023 poses part superseded by D-037) and the README.

### 3. Re-pace Grass 1 and Grass 2 and unlock defaults
- Shorten Grass 1 to about 85 tiles and Grass 2 to about 90 tiles, keeping their teaching purpose (Grass 1: tap to hop with coin arcs and one or two tiny gaps near the end; Grass 2: the Jump button with 2 to 3 gaps), keeping the demo for Grass 2, and keeping the coin density. Scale the star thresholds proportionally (round sensibly) and note the new values.
- Set `unlock.openAtATime` to 3 in the Mario manifest (D-037) so all three Grass levels are open from the start.
- Grass 3 is unchanged.

### 4. Docs and housekeeping
- PROGRESS.md: record the tablet findings (D-037), mark 005c done, and replace the roadmap table with the order from D-037: 006 map and progress, 007 Grass 4 Shoot (Power button gameplay), 008 Grass 5 move+jump gaps, 009 character picker, 010 parent view, later worlds.
- Update ARCHITECTURE.md (looks, yaw, removal). Fill in this file's Result.
- One commit: `task-005c: robot running view, remove sprite looks, re-pace`. No `Co-Authored-By` or other attribution lines (D-016). Do not push.

## Out of scope
The map and storage (Task 006), new levels, Power gameplay, the picker, parent view, new runtime dependencies, changes to physics or hit boxes.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; no references to the removed looks remain in code or docs except history notes.
- Frame sequences show the robot clearly running forward in both directions: leading face side visible, boots pointing forward, near/far limbs ordered correctly, front view at idle and win, a smooth head-then-body turn. Jump and shoot look at least as good as before.
- All 7 character palettes work in both looks; Bowser and Donkey Kong are still larger.
- `?look=sprite` and `?look=portrait` fall back to the robot with one warning; the ball still works.
- Grass 1 completes in roughly 25 to 35 seconds of continuous play (the random-press bot time), Grass 2 in roughly 30 to 40 seconds; all three Grass levels are open from the start of a session (the map arrives in Task 006, so check via the Next/Home flow and `?level=`).
- 58+ fps in a full run and in 20-press mashing; no console errors; bundle size smaller than before (report the numbers).

## How to verify
Playwright with `?debug=1`, frame stepping, saved review sheets in `_sources/review/`, bot runs for timing. List what you could not check (feel on a real tablet).

## Result (Code fills in at the end)
- What changed:
  - Robot three-quarter view: head and body yaw (-1..1) driven by `yawTarget` (idle 0, moving 0.75 scaled by speed, air 0.45,
    shoot 0.8, win 0) and `yawStep` (full sweep: head 100 ms, body 160 ms, through front-on). New pure rig solver `robotRig.ts`
    projects a small 3D joint model (`x = dir * (f*side + l*front)`), so limbs swing forward in the turned view and the front view
    is left/right symmetric (the mirror flips there invisibly; the walk cycle shifts one step when the near side changes).
    Head shell, visor, ears and chest panel are now separate parts: visor/eyes shift to the facing side, far eye narrows, near ear
    moves to the back of the head (over the shell), far ear narrows and peeks out, antennae move forward, torso narrows, chest
    slides, boots point forward, far limbs lightly tinted. Arm spread (`s`) added to poses: jump rises into a V with both arms up,
    fall has arms out to the sides, win is a symmetric waving V facing the player; idle made symmetric. Antenna spring in screen space.
  - Removed: SpriteLook, Portrait look, `characterLook.ts`, `poses.ts`, flipbook code and tests, `poses`/`displayHeight`/`portrait`
    in the cast and types, `mario-run.png`/`luigi-run.png` (`git rm`), `pose`/`flipX` debug fields. Looks are `robot` (default)
    and `ball`; anything else falls back to robot with one warning.
  - Kept for the picker: `image` files and field, `color`, `characterTexture.ts` (decode, trim, pre-scale, silent failure) and
    `makeCapsuleTexture` (placeholder without a picture). Both are unused in levels now (tree-shaken), commented as such.
  - Grass 1: 85 tiles, 16 coins (was 140 / 26), 1-tile gaps at 50 and 66 with arcs, flag 80, stars 7/12 (was 12/20).
    Grass 2: 90 tiles, 18 coins (was 150 / 30), gaps 42, 60-61, 76-77 with an arc 5 tiles before each, demo unchanged, flag 85,
    stars 9/15 (was 15/25). `openAtATime` was already 3.
  - Docs: ARCHITECTURE (looks, yaw, rig, removal, levels), DECISIONS notes (D-023, D-026, D-027, D-032, D-034 marked superseded
    in part by D-037), README, PROGRESS (tablet findings, new roadmap).
- Files touched: `src/core/avatar/{robotRig.ts (new), RobotLook, BallLook, AvatarDriver, clips, config, createLook, parts,
  robotSpec, types, avatar.test}.ts`, deleted `src/core/avatar/{SpriteLook,portrait}.ts`, `src/core/levels/{Player, LevelScene,
  animation, animation.test, demo.test, characterTexture, placeholders}.ts`, deleted `src/core/levels/{characterLook,poses}.ts`,
  `src/core/types.ts`, `src/universes/mario/{characters.ts, levels/grass-1.json, levels/grass-2.json, levels/levels.test.ts}`,
  deleted `src/universes/mario/assets/{mario-run,luigi-run}.png`, `README.md`, `docs/{ARCHITECTURE,DECISIONS,PROGRESS}.md`, this file.
- Deviations from plan (and why):
  - Jump and win arms redesigned (both arms up and spread, instead of one forward and one back): the old forward/back V
    collapses or crosses in a turned view, the spread V reads from the front and in three-quarter. Compared frame by frame with
    the before-sheets; the jump keeps arms up in a V and legs tucked.
  - The far ear peeks out behind the face (a cartoon cheat) because a strict projection hides it completely and the spec asks for
    "partly behind the head". One number to switch off.
  - `Player.updateSprite` renamed `updateAvatar`, debug `spriteHeight` renamed `avatarHeight` (no sprite any more).
- How verified: `npm run typecheck && npm test && npm run build` pass (145 tests, including new yaw/rig tests: targets, sweep
  timing, head leads body, near-side flag per facing, no jump across yaw 0, three-quarter layout both ways, cannon direction).
  Playwright on the built app: review sheets (run right, walk left, stop, turn, jump, shoot right/left, win) for Mario and Bowser
  at 844x390 dpr 3 and 1280x800, plus all 7 characters in both looks, in `_sources/review/005c/` (before: `005c-before/`).
  `?look=sprite`/`portrait` fall back to the robot with one warning (levels and Input Lab); ball works in levels, demo ghost and
  Lab; Next goes grass-1 -> grass-2 -> grass-3 (no Next on 3). Random-press bot (about 1.5 presses/s): Grass 1 25-45 s (median 31),
  Grass 2 29-33 s without the demo, 34-54 s with it (slow runs fell 5-6 times). Bundle: dist 2,280,656 -> 1,895,904 bytes,
  universe chunk 98.3 -> 91.9 kB, main chunk unchanged (Phaser). No console errors.
- Open issues / risks:
  - 58+ fps could not be shown: headless Chrome on this machine now gets only 47 fps on a blank page; old and new builds, robot and
    ball, all measure the same ~56 fps (full Grass 2 run with mashing, Grass 3 walk). No regression, but needs the tablet.
  - Feel on a real tablet not checked (turn speed, idle facing the player, standing jump now turning to 0.45).
  - A turn in mid-air swaps the tucked legs for one frame at yaw 0 (air poses are not symmetric). Rare.
  - Bot timing for Grass 2 with the demo and several falls runs past 40 s; the level itself is about 26 s of running.
- Suggested next: Task 006 (map, stars, unlocking, storage, with the green-contrast rim and `?size=` knob carry-overs).
