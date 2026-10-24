# Task 004: Grass 2 "Big Jump button", "watch me" demo, character poses and voices

## Goal
Teach the second step of the control ladder: a real on-screen Jump button (taps elsewhere do nothing), introduced by a
short "watch me" demo. Also bring the characters to life with the real run pose and voice clips the parent added.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (especially D-016, D-022..D-025), docs/ARCHITECTURE.md
- Existing: `core/levels/*`, `core/input/*`, `core/ui/TouchControls`, `core/audio/*`, `universes/mario/{manifest,themes}.ts`, `levels/grass-1.json`.

## In scope

### 0. Assets and first commit
- New untracked files in `src/universes/mario/assets/`: 6 voice clips (`mario-ha-ha.mp3`, `mario-yeah-ho.mp3`, `mario-yipee.mp3`, `luigi-haha.mp3`, `luigi-oh-yeah.mp3`, `luigi-yeah-ha-ha.mp3`), `mario-run-towards-right.png` (side-view run pose, 310x380, transparent, **faces right**) and `luigi-running-towards-left-removebg-preview.png` (side-view run pose, 461x541, transparent, **faces left**). Rename them to `mario-run.png` and `luigi-run.png`. Also present is `luigi-running-towards-left.jpg`, the original source of the Luigi pose: do not commit it and do not bundle it (leave it untracked, or add it to .gitignore if you prefer, and mention it in the summary).
- Make a first, separate commit for just these assets (the 6 mp3 files and the two renamed run PNGs): `assets: add mario/luigi voice clips and run poses`. Then do the rest in a second commit `task-004: grass 2, demo, poses, voices`.
- If `npm ci` fails because `node_modules` is locked (a dev server may be running), stop and tell the parent in the summary instead of deleting anything.

### 1. Poses and voices (D-023)
- Extend `CharacterDef` as needed: `poses.run`, `poses.jump`, optional per-pose `displayHeight`, a per-pose facing (`runFacing: 'right' | 'left'`, default right; Luigi's run image faces left, Mario's faces right) so the flip logic is correct for each, and `sounds` as arrays of file names for `pick`, `jump`, `win`.
- Player uses run pose on the ground while moving, jump pose in the air, `image` when idle. All poses are trimmed and scaled so the character stays the same visible height across pose swaps (no popping size). Keep bob/squash/stretch/flip. The run pose faces right; flip when travelling left. Fall back gracefully to the single image or capsule when a pose is missing or fails to decode.
- Manifest: Mario gets `poses.run = mario-run.png` (faces right) and `poses.jump` = his main image; Luigi gets `poses.run = luigi-run.png` (faces left) and `poses.jump` = his main image; Mario and Luigi get the voice mapping from D-023. The other five characters have no voices yet and fall back to the generic sounds.
- AudioManager: register character voices when the level starts; random choice from the array; the jump voice is rate limited (one per 1.5 s) while the generic jump sfx always plays; the win voice plays at the flag. Missing or undecodable files must not throw.
- Fix the Task 003 issue where the first jump sound can be lost while audio unlocks: queue a play request made during unlock and play it once unlocked if it is less than about 300 ms old.

### 2. Grass 2 "Big Jump button"
- `grass-2.json`: `controls: { enabled: ['jump'], autoRun: true, tapAnywhereJumps: false, demo: { tiles: 20, jumpsAtTiles: [8, 15] } }`, same tuning as Grass 1. About 150 tiles; coin arcs that reward well-timed presses; 3 to 4 gaps of 1 to 2 tiles in the second two thirds, each preceded by a coin arc; flag at the end. About 30 coins; `stars` two = 15, three = 25. Add it to the grass world in the manifest after `grass-1`.
- TouchControls shows only a large Jump button (bottom-right, safe-area aware). Keyboard Space/Up/W still works.
- Taps elsewhere do nothing to the player, but cause the Jump button to give one small friendly pulse (teaches "press the button"). Before the first press, the button pulses gently now and then.
- Win screen per D-025: Replay, Next (if available), Home, all big icons, usable by tap and keyboard (Space/Right = Next, R = Replay, Escape/Enter = Home).

### 3. "Watch me" demo (D-024)
- Implement a demo runner in `core/levels/`: reads `controls.demo`, spawns a semi-transparent ghost at the start, which runs and jumps at the declared columns through the same player code (not a separate physics path), collecting no coins. Show a finger icon tapping the on-screen button in sync with the button's press animation when buttons are enabled (and a ripple at the character for tap-anywhere levels, in case Grass 1 later enables it).
- During the demo the real player is not present and input is ignored, except a tap after 1.5 s which skips. At the end the ghost fades, the camera returns to the start, a short "your turn" cue (a pulsing arrow or ripple plus a soft sound) plays, then the real run begins.
- Plays once per session per level, in memory. `?demo=1` forces it, `?demo=0` skips it. Grass 1 keeps `demo: false`.
- The parse/validation code accepts both `false` and the object form, with readable errors for bad values.

### 4. Tests and docs
- Unit tests (Vitest): demo config parsing/validation, the demo schedule (which column triggers which press), next-level resolution in a world, voice picking and the jump-voice rate limit, the pending-unlock sound queue.
- Update ARCHITECTURE.md (poses, voices, demo format, win screen) and PROGRESS.md (Task 004 done, Task 005 next, a tablet checklist for Grass 2: does he press the button, does he tap elsewhere, does the demo make sense, are the voice clips right for jump/win?). Fill in this file's Result.
- No `Co-Authored-By` or other attribution lines (D-016). Do not push.

## Out of scope
Left/Right (Task 005), power button, world map, unlocking, persistence, character picker, converting AVIF to WebP, new runtime dependencies, voices for the other five characters.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass (a fresh `npm ci` too if node_modules is not locked).
- Grass 2 opens with the demo (first time); ghost jumps at the declared columns, the button animates, the real run then starts. `?demo=0` skips it, `?demo=1` forces it, a tap after 1.5 s skips it.
- In Grass 2 a tap elsewhere never jumps but pulses the button; the button and Space/Up/W jump. The Jump button is large, fully on screen and inside the safe area at 844x390, 1280x800, 1024x768 and 2400x1000.
- Mario shows run pose while running on the ground, jump pose in the air, no visible size change when swapping; Luigi uses his left-facing run pose with the facing logic correct (no moonwalking) and his main image in the air; other characters still work (`?char=<id>` for all 7).
- Jump voice does not play more than once per 1.5 s while mashing, the generic jump sfx does; the win voice plays at the flag; missing audio files do not throw.
- The first jump after page load produces a sound (unless unlock genuinely fails).
- Bots: a bot that presses the button at random intervals finishes Grass 2; a bot that never presses falls at the first gap, floats back and loops smoothly. Screenshots of the demo, mid-level with button, win screen with three buttons reviewed.
- Win screen: Next goes from Grass 1 to Grass 2; on Grass 2 (last level) Next is hidden.

## How to verify
Playwright with touch and keyboard, `?debug=1` hook, screenshots. List clearly what you could not check (audibility, real tablet, iOS Safari).

## Result (Code fills in at the end)
- What changed:
  - Assets committed first (`assets: add mario/luigi voice clips and run poses`): 6 mp3s, `mario-run.png`, `luigi-run.png`.
  - Poses (D-023): `CharacterDef.poses` = `{ run?, jump? }` of `PoseDef { image, facing, displayHeight }`; `sounds` are arrays.
    New `Player` class (physics box + picture) used by both the real player and the demo ghost; `CharacterLook` loads
    idle/run/jump textures with fallbacks (pose -> main image -> capsule); pure `choosePose`/`flipSign`.
  - Voices: `audio.registerVoices` / `playVoice` with `VoicePicker` (random, no repeat, jump voice max one per 1.5 s);
    generic jump sfx always plays; win voice 350 ms after the jingle; missing/broken clips stay silent.
  - First-tap sound fix: requests made while audio unlocks are queued (`PendingQueue`) and played if at most 300 ms old.
  - Demo (D-024): `controls.demo` = false or `{ tiles, jumpsAtTiles }` with readable validation; `DemoScript`; ghost run with
    finger tapping the button (ripple on tap-anywhere levels), skip by tap/key after 1.5 s, ghost fade, camera back,
    "your turn" cue (arrow, ripples, button pulse, soft sound); once per session per level; `?demo=1` / `?demo=0`.
  - Grass 2 "Big Jump button": 150 tiles, 30 coins (3 head-height, 9 timed arcs), gaps at 58, 80, 103-104, 125-126 each
    with an arc before it, stars 15/25. Only the Jump button (bigger when alone), taps elsewhere make it pulse,
    gentle invite pulse every 2.6 s until the first press. Space/Up/W still jump.
  - Win screen (D-025): Home, Replay, Next (biggest, pulsing, only if a level follows). Space/Right = Next, R = Replay,
    Escape/Enter = Home. `nextLevelId` in `core/levels/progression.ts`; Next keeps the character.
- Files touched: `src/core/types.ts`, `src/core/audio/{AudioManager,recipes}.ts`, new `src/core/audio/{voices,pendingQueue,voices.test}.ts`,
  `src/core/input/InputManager.ts` (`miss` event), `src/core/ui/TouchControls.ts`, `src/core/levels/{LevelScene,ResultScreen,format,README}`,
  new `src/core/levels/{Player,characterLook,poses,demo,demoFx,progression,demo.test}.ts`, `src/universes/mario/{manifest,assets}.ts`,
  new `src/universes/mario/worlds.ts`, new `src/universes/mario/levels/{grass-2.json,levels.test.ts}`, `src/universes/mario/levels/README.md`,
  `docs/{ARCHITECTURE,PROGRESS,DECISIONS}.md`, this file.
- Deviations from plan (and why):
  1. Poses are objects (`poses.run = { image, facing, displayHeight }`) instead of separate `runFacing` fields: keeps each pose's settings together, matches D-023 "poses carry a facing field".
  2. Mario/Luigi run poses use displayHeight 86/90 (main images 104/108), not the same trimmed height: the main pictures include a raised arm, so equal trimmed height made the runner's head and body clearly bigger. Matching head/body size is what avoids visible popping (side-by-side renders reviewed).
  3. The Luigi source file on disk was `luigi-running-towards-left.png` (no `-removebg-preview` suffix, no `.jpg`); renamed to `luigi-run.png`. No jpg existed, so nothing to leave out.
  4. Demo columns are absolute grid columns (0-based), validated against the start column and grid width.
  5. Jump button is 0.28 of the short edge when it is the only button (0.22 otherwise), to make it "large".
  6. The world list moved to `universes/mario/worlds.ts` (plain data) so tests can read it without loading Phaser.
  7. The demo ghost plays the generic jump sound but not the voice (the voice is for the child's own jumps).
- How verified: `npm run typecheck`, `npm test` (68 tests), `npm run build` pass after a fresh `npm ci` in the working folder (and in a clean copy of the tree). Playwright + headless Chrome against `vite preview`:
  - Demo: ghost (alpha 0.55, run pose) pressed at x 514 and 971 (columns 8 and 15), button showed pressed and the finger tapped it, demo -> turn at 5.2 s -> play at 7.1 s with the player at the start. Restart in the same session: no demo. `?demo=0` skips, `?demo=1` forces on restart, a tap at 0.2 s is ignored and at 1.6 s skips. Grass 1: no demo, tap hint as before.
  - Jump button visible alone and fully on screen at 844x390 (dpr 3), 1280x800, 1024x768, 2400x1000 (radius 55-140 css px). 6 taps elsewhere: 0 jumps, 6 pulses. Button tap and Space/ArrowUp/KeyW all jump; invite pulse stops after the first press.
  - First tap after load: audio locked -> running and the jump sound played (`played.jump = 1`).
  - Mashing the button 6 s at ~10 taps/s: 8 jump sfx, 4 jump voices (max allowed), 60 fps.
  - Poses: Mario run pose on the ground, main image in the air, flip +1; Luigi run pose mirrored when running right (-1) and unmirrored when running left; the other 5 characters use their single image; no console messages.
  - Random presser finished Grass 2 in 53 s (24 coins, 2 cloud rescues, 46 jumps); never-presser fell at the first gap, floated back and looped 3 times, min fps 58.
  - Win: Grass 1 shows Home/Replay/Next; Right key and tapping Next open Grass 2 (with its demo), Next keeps Luigi; R replays; Escape goes Home; Grass 2 shows only Replay/Home.
  - mp3 404 and garbage mp3: game plays and finishes, generic sounds play, no errors.
  - Screenshots reviewed: demo press, demo run, your-turn cue, mid-level with the button, Grass 1 win with three buttons, 844x390, pose crops.
  - Not checked: audibility of the clips, a real tablet/phone, iOS Safari, device notch insets (all zero in headless Chrome), real gamepad.
- Open issues / risks:
  - The first `npm ci` in the working folder failed (EPERM) because a running `npm run dev` locked the rolldown binary, after npm had already removed most of `node_modules`. After the parent stopped the dev server, `npm ci` + typecheck + 68 tests + build passed in the working folder.
  - Three untracked files appeared mid-task (`Bowser sprite.png`, `Luigi spirite.png`, `Mario sprite.png`); not committed or wired.
  - Luigi's mirrored run pose shows his "L" backwards; voice mapping is still a guess; run-pose heights and 2-tile gaps need the tablet test.
- Suggested next: Task 005 (Grass 3 "Left and Right"). The demo already supports non-auto-run levels in a basic way (ghost walks right); a Left/Right demo would need scripted left/right presses in `DemoConfig`.
