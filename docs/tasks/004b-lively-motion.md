# Task 004b: Lively character motion (procedural run, shadow, dust, optional run frames)

## Goal
Make the characters feel alive while moving, using only the existing images, and add support for a multi-frame run cycle so extra HD poses can be dropped in later without code changes.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-021, D-023, D-026, D-027), docs/ARCHITECTURE.md
- Existing: `core/levels/{Player,characterLook,poses,LevelScene,demo,demoFx,ResultScreen}.ts`, `universes/mario/manifest.ts`.

## In scope

### 0. Housekeeping
- `_sources/` exists (parent's raw material, already in `.gitignore`); do not touch its contents. Add one line to `src/universes/mario/assets/README.md`: only files used by the game belong there, raw material goes in `_sources/`.

### 1. One animation tuning file
- `core/levels/animation.ts` (all numbers in one place, with short comments). Pure functions for the maths (stride phase, bounce offset, squash/stretch scales, lean angle) so they can be unit tested without Phaser.

### 2. Procedural motion (works for all 7 characters, one image or several)
- **Stride:** a stride phase advances with distance travelled (so faster means quicker steps and no motion when standing still). Per step: vertical bounce, small squash at foot-strike and stretch at mid-stride, a slight forward lean (a few degrees, in the direction of travel) and a gentle side-to-side rock. Smoothly blend in and out when starting or stopping so there is no popping.
- **Air:** stretch on take-off, a small lean that follows vertical velocity (up = tilt back a little, down = lean forward), squash on landing that settles in about 120 ms.
- **Idle (start of a level, win screen):** a slow breathing pulse; on the win hop, a joyful repeat bounce while the stars fill.
- Pivot at the feet so squash and lean look grounded. All effects are visual only; the physics body is untouched.
- **Shadow:** a soft ellipse on the ground under the character that shrinks and fades with height and follows the character (hidden while over a gap).
- **Dust:** a small puff at each footfall (not every frame; rate-limited), a larger ring on landing, and brief speed streaks behind the character while running on the ground. Pooled particles/objects, no per-frame allocations that cause GC hiccups.
- The demo ghost uses the same animation (it shares the Player), with its lower opacity and no dust.
- Mashing jump must not stack or glitch the animation; interrupting a landing squash with a jump is smooth.

### 3. Optional multi-frame run cycle
- Extend poses with `runFrames?: PoseDef[]` (same shape as a pose: `{ image, facing, displayHeight }`) and `runFps` (default 10). When present (2 or more frames), the ground-run flipbook plays at `runFps` scaled by speed, in addition to a reduced-amplitude version of the procedural motion. When absent or when frames fail to decode, behaviour is exactly as now.
- Frames are trimmed and scaled the same way as existing poses so the character does not change size or pop between frames; each frame's feet anchor to the same ground line.
- Nothing new is shipped for this feature except code and tests. For verification only, generate temporary test frames (for example, copies of an existing run pose rotated by plus and minus 6 degrees) outside the committed assets, show it works, and do not commit them.
- Document in ARCHITECTURE.md how to add frames: put files in assets, list them in the manifest (`runFrames: [...]`), done.

### 4. Tests and docs
- Unit tests: stride phase vs distance and speed, blend-in/out, squash/lean outputs at key phases, flipbook frame selection (including frame count 0, 1, 2+, fps scaling, facing), landing-squash interrupt.
- Update ARCHITECTURE.md and PROGRESS.md (Task 004b done, Task 005 next, and a tablet checklist: does the run feel lively without looking jittery? is the shadow/dust distracting for a 3-year-old?). Fill in this file's Result.
- One commit: `task-004b: lively motion`. No `Co-Authored-By` or other attribution lines (D-016). Do not push.

## Out of scope
New art or sounds, Left/Right levels, power effects, map, character picker, new runtime dependencies, changing physics tuning.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- Visual review: a frame sequence (at least 8 consecutive frames at each of 844x390 and 1280x800) of Mario running, jumping and landing shows distinct squash/stretch/lean states with no change in apparent size or foot position drift; same check for Luigi (left-facing run image mirrored when running right), Toad, Bowser and Donkey Kong (single image).
- Standing still produces no stride motion; starting/stopping blends smoothly; shadow follows and shrinks with height; dust is subtle and rate limited.
- 60 fps (or the same as before this task) in the 20-taps-per-second mashing test and in a full Grass 2 run; no console errors.
- With temporary test frames, the flipbook plays, speeds up with speed, mirrors correctly and falls back cleanly when a frame fails to load.

## How to verify
Playwright with `?debug=1`, screenshot sequences, and the unit tests. State what you could not check (feel on a real tablet).

## Result (Code fills in at the end)
- What changed: New `core/levels/animation.ts` holds every motion number and the pure maths (stride phase from distance, bounce, strike squash / mid-stride stretch, forward lean, alternating rock, run blend in/out, air lean from vertical speed, interruptible squash/stretch pulses, breathing, celebration bounce, shadow size/alpha, flipbook frame selection). `Player` applies it with the sprite pivoted at the feet, keeps a soft ground shadow (hidden over gaps and on the cloud), and sends footfall puffs / landing ring / speed streaks to the new pooled `MotionFx` (real player only; the ghost shares all motion and the shadow but has no dust). The win screen gets a joyful bounce on the spot until the buttons appear. Poses gain optional `runFrames` + `runFps`: a flipbook on the ground at runFps scaled by speed, with 45% procedural motion; frames are trimmed/scaled like poses, broken frames skipped, under 2 usable = old behaviour. Assets README notes that raw material goes in `_sources/`.
- Files touched: `src/core/levels/{animation.ts (new), animation.test.ts (new), motionFx.ts (new), Player.ts, characterLook.ts, LevelScene.ts, ResultScreen.ts, placeholders.ts}`, `src/core/types.ts`, `src/universes/mario/assets/README.md`, `docs/{ARCHITECTURE,PROGRESS}.md`, this file. Also committed the architect's pending `.gitignore` (`_sources/`), `docs/DECISIONS.md` (D-026, D-027) and this task file.
- Deviations from plan (and why): (1) The old landing dust in LevelScene (also used by the ghost) is replaced by `MotionFx`, so the ghost no longer makes landing dust (the task asks for no ghost dust). (2) `Player.hop()` now takes `now` (for the pulse). (3) Take-off stretch eases in over 70 ms instead of a one-frame snap, so a jump that interrupts a landing squash changes size by less than 15% per frame (unit-tested). Otherwise none.
- How verified: `npm run typecheck`, `npm test` (90 tests, 22 new), `npm run build` pass. Playwright + headless Chrome against `vite preview`, stepping the Phaser loop by hand one 60 Hz frame at a time:
  - Frame strips (31-38 consecutive/sampled frames: running, take-off, air, landing) for Mario, Luigi, Toad, Bowser and Donkey Kong at 844x390 (dpr 3) and 1280x800. Distinct states: run bounce 0-5 px with stretch -0.05..+0.04, lean+rock 4-6 deg; take-off stretch to +0.18 with lean easing to -2 deg (back) going up and +4 deg coming down; landing squash -0.15 settling within ~8 frames. Unstretched height constant per pose (e.g. Mario run 86, Luigi run 90); feet return exactly to the ground line (lift 0.0 at strike/after landing). Luigi's left-facing run picture is mirrored (scaleX < 0) when running right. Shadow ~63 px on the ground, ~39 px at the top of a jump.
  - Standing / stop: at the Grass 1 flag the run blend falls 1 -> 0 over ~13 frames, lift and lean fade to 0, then no stride motion. Win: bounce 0 -> 20 px repeating every 450 ms while the stars fill.
  - Full Grass 2 run (random presser): finished, 22 coins, 2 cloud rescues, min fps 58.6; in 28 samples below the ground line (falling into a gap) the shadow was hidden every time.
  - Mashing the Jump button at 20 taps/s for 6 s: avg 59.2-59.8 fps, min 56.8 (844x390 dpr 3) / 58.1 (1280x800), the same as the pre-task build measured the same way; stretch stayed within -0.05..+0.2. Ghost: 0 dust events, shadow alpha scaled by the ghost's alpha. No console messages in any run.
  - Flipbook with temporary frames made in the browser (run pose rotated +/-6 deg, never written to the repo): frames alternate 5 times per 0.5 s at normal speed and 10 at double speed, Mario unmirrored / Luigi mirrored, same 86/90 height as the run pose; with one broken frame among four the other three play; with only one usable frame it falls back to the run pose. No console errors.
  - Not checked: feel on a real tablet (lively vs jittery, whether shadow/dust distract a 3-year-old), real HD run frames.
- Open issues / risks: Motion tuning is by eye. Landing ring and streaks are subtle in captures but might still distract; easy to turn down in `ANIM.dust` or `motionFx.ts`. Nine new sound files appeared in the Mario assets folder during this task; left untracked (see PROGRESS).
- Suggested next: Task 005 (Grass 3 "Left and Right"), which will be the first real test of the start/stop blend and of the lean flipping with direction.
