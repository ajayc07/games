# Progress

_Last updated: 2026-10-24 (Task 004b done)_

## Status
Two playable levels. Grass 1 "Tap to hop" (tap anywhere) and Grass 2 "Big Jump button" (only a big on-screen Jump button; taps elsewhere make it pulse instead of jumping), with a "watch me" ghost demo the first time Grass 2 opens. Mario and Luigi have run/jump poses and voice clips; the other five use their single image and generic sounds. Win screen has Replay, Next (Grass 1 -> Grass 2) and Home. Opening the app starts Grass 1; the Input Lab is behind `?lab=1`. Characters now move with lively procedural motion (stride bounce, lean, squash/stretch, soft shadow, subtle dust) and support an optional multi-frame run cycle. Next: Task 005 (Grass 3 "Left and Right").

## Roadmap (draft, architect may reorder)
| # | Task | Status |
|---|------|--------|
| 001 | Project setup: Vite + TS + Phaser, universe loader, PWA, Pages deploy | Done |
| 002 | Core input layer (touch/keyboard/gamepad -> actions) + audio manager | Done |
| 003 | Level engine + player physics + Grass 1 "Tap to hop" (auto-run, tap anywhere) | Done |
| 004 | Grass 2 "Big Jump button" + "watch me" demo system | Done |
| 004b | Lively character motion (procedural run, shadow, dust, optional run frames) | Done |
| 005 | Grass 3 "Left and Right" (no auto-run) | Next |
| 006 | World map + stars + unlocking + per-universe progress storage | Planned |
| 007 | Character picker + 7-character cast with placeholders + asset import of real files | Planned |
| 008 | Minimal parent view (sound, button size, unlock-all) | Planned |
| 009+ | Level 4+ (move+jump), Power button, Pipe/Sky/Castle worlds, boss question, polish | Later |

## Done
- 2026-10-23: Planning, decisions D-001..D-011, starter pack, local repo created.
- 2026-10-23: Task 001 project setup (skeleton, universe registry, placeholder scene, PWA, deploy workflow).
- 2026-10-23: Character images moved to `src/universes/mario/assets/<id>.avif` and referenced from the manifest via `asset()` (commit b794b3e, outside the task flow).
- 2026-10-23: Task 002 input, audio, edge-to-edge scaling, Input Lab.
- 2026-10-24: Task 003 level engine and Grass 1 (plus MAX_WIDTH 1920 and high-DPI rendering).
- 2026-10-24: Mario/Luigi voice clips and run poses committed (`assets:` commit before Task 004).
- 2026-10-24: Task 004 Grass 2, "watch me" demo, character poses and voices, Next button, first-tap sound fix.
- 2026-10-24: Task 004b lively motion (procedural run/air/idle motion, win bounce, shadow, dust, optional `poses.runFrames` flipbook).

## In progress
_(nothing)_

## Open questions
- Motion tuning (Task 004b) is by eye from frame captures; all numbers are in `core/levels/animation.ts`. Landing squash is 15%, take-off stretch 18%, run lean ~4 deg plus ~2 deg rock, bounce 5 px.
- The flipbook (`poses.runFrames`) is tested only with temporary rotated copies of the run pose; real HD run frames have not been tried yet.
- Phaser logs "Ignored attempt to cancel a touchcancel event" in the console when a touch is cancelled (Phaser calls preventDefault on it). Harmless.
- High-DPI rendering (Task 003) zooms each scene's camera with origin (0, 0). Phaser's camera bounds and `startFollow` assume a centred origin, so scenes scroll by hand; children of screen-fixed containers need `setScrollFactor(0, 0, true)` or taps miss them. See ARCHITECTURE "Screen layout".
- Voice mapping (D-023) is a guess; confirm by ear: Mario pick = yeah-ho, jump = ha-ha, win = yipee; Luigi pick = oh-yeah, jump = haha, win = yeah-ha-ha. `pick` clips are registered but not played until the character picker (Task 007).
- Luigi's run picture faces left, so it is mirrored while he runs right: the "L" on his cap reads backwards in that pose. A right-facing Luigi run image would fix it (drop it in and set `facing: 'right'`).
- Run-pose heights for Mario (86) and Luigi (90) are smaller than their main images (104/108) because the main pictures include a raised arm; this keeps the head and body the same size when the pose swaps. Tuned from side-by-side renders; check on the tablet that the swap does not "pop".
- Grass 2 tuning to confirm: two 1-tile and two 2-tile gaps (2-tile gaps need a press within about half a second), demo length 20 tiles (about 5 s), Jump button 0.28 of the screen height when it is the only button.
- Device safe-area insets (notches) could not be tested in headless Chrome (all zero); the Jump button uses the same inset-aware anchor as before.
- Grass 1 tuning to confirm on the tablet: run speed 200, jump peak 2.5 tiles, gaps 1 tile. All in `grass-1.json` / `core/levels/physics.ts`.
- Character `displayHeight` values (manifest) were tuned by eye from screenshots: Toad 96, Mario/Yoshi 104, Luigi/Peach 108, DK 110, Bowser 112.
- Service worker uses a hand-written `src/sw.ts` (injectManifest) because workbox's generated SW breaks when the local path contains an apostrophe ("Athi's Game"). Fine on CI. Keep in mind if the PWA setup changes.
- Not yet tested on a real phone/tablet (iOS Safari especially: fullscreen display, audio unlock, double-tap zoom).
- Bowser as player vs castle boss: settle later (friendly race, or swap boss when Bowser is chosen).
- Unlock rule: 2-3 levels open at a time is the default; confirm after device testing.
- Real PNGs/voices for the 7 characters: parent will supply (transparent PNG ~512px tall, 3 short sounds each). Not blocking.

## Asset notes (architect, 2026-10-23)
- Parent added 7 character images (originally `public/images/character-<name>.avif`). Code already moved them to `src/universes/mario/assets/<id>.avif` (mario, luigi, peach, toad, bowser, yoshi, donkeykong) and the manifest references them with `asset('<id>.avif')`. All are 600x844, transparent, one hero pose each (Mario/Luigi jump pose, Yoshi mid-run, Peach/Toad floating, Bowser/DK standing, front-ish view).
- Characters occupy different amounts of their canvas, so normalise by display height per character in the manifest (e.g. `displayHeight`), do not edit the files.
- Plan for Task 007: optionally move them into an `assets/characters/` subfolder, and convert AVIF to WebP (alpha, quality about 90) for wider browser support, unless the parent says all his devices handle AVIF.
- No side-view run poses yet; use bob/stretch/flip tricks (ARCHITECTURE.md). Side-view images may be added later as `run` poses.

## Parent action items
- Nine new sound files appeared in `src/universes/mario/assets/` during Task 004b (`sound-bowser-*.mp3`, `sound-peach-*.mp3`, `sound-toad-*.mp3`). Left untracked and unwired (not in the 004b commit). Say which slot each is (pick / jump / win) and they can be wired in the manifest; note every file in that folder is bundled once committed.
- After pushing Task 004b, watch Athi play Grass 1 and Grass 2 on the tablet:
  - Does the run feel lively without looking jittery or wobbly? Is the lean / bounce too much or too little?
  - Is the landing squash fun, or does it look like the character got hurt?
  - Is the shadow or the dust (footfall puffs, landing ring, speed streaks) distracting for him, or does he not notice?
  - Does the win bounce while the stars fill feel joyful?
  - Still 60 fps on the tablet (no stutter while mashing Jump)?
- Three new files appeared in `src/universes/mario/assets/` during Task 004: `Bowser sprite.png`, `Luigi spirite.png`, `Mario sprite.png`. Left untracked and unwired. Note every file in that folder is bundled; say what they are for (more poses? sprite sheets?) and they can be wired in a later task (file names without spaces are safer).
- After pushing Task 004, try Grass 2 on the tablet with Athi (finish Grass 1 and press the orange Next button, or open `?level=grass-2`):
  - Does the "watch me" demo make sense to him? Does he watch it, or try to tap through it (a tap skips after 1.5 s)?
  - Does he press the red Jump button, or keep tapping elsewhere? Does the button's pulse after a miss-tap help him find it?
  - Is the Jump button big enough and in a comfortable place for his thumb (bottom-right)?
  - Are the voice clips right for jump and win (Mario, and Luigi with `?char=luigi`)? Is the jump voice too often or too rare (at most every 1.5 s)?
  - Do the 2-tile gaps frustrate him? Does he notice the coin arcs need a press?
  - Does the first tap make a sound?
  - Does he find Next on the win screen? (`?demo=1` replays the demo; it otherwise plays once per session.)
- Enable GitHub Pages: repo Settings -> Pages -> Source: "GitHub Actions" (needed before first deploy works).
- After pushing Task 003, try Grass 1 on the tablet with Athi (https://ajayc07.github.io/games/, landscape):
  - Does he hop? Does he understand that tapping does something (the pulsing finger icon disappears after the first hop)?
  - Is the speed right, too slow or too fast? (About 45 s to the flag.)
  - Any frustration at the two small gaps (a fall floats him back on a cloud)? Does he enjoy the cloud or find it confusing?
  - Does he notice the coins and the stars at the end? Does he find Replay without help? (Home goes to the Input Lab for now.)
  - Is the picture sharp on the tablet? Any sound missing on the first tap?
  - Optional: try `?char=toad`, `?char=bowser` etc. to see the other characters.
- Input Lab (now at `?lab=1`): button size check with `?lab=1&buttonScale=1.3` or `0.8`; thumb slide Left to Right.
- `luigi-running-towards-left.jpg` (original source of the Luigi run pose) was not in the folder during Task 004, so nothing to do; if it reappears, keep it out of `src/universes/mario/assets/` (every file there is bundled).
- Push the local repo to `origin` (https://github.com/ajayc07/games.git) after each task.

## Device test notes (parent fills in after trying on the tablet)
Format: date, device, what he did, what confused him, what bored him, what he loved.
_(none yet)_
