# Progress

_Last updated: 2026-10-24 (Task 005c done)_

## Status
Three playable levels (Grass 1 "Tap to hop", Grass 2 "Big Jump button", Grass 3 "Left and Right"), each with Next to the following
level. Grass 1 and 2 are now about 60% of their old length (Task 005c). The player is a friendly code-built robot (default) in the
chosen character's colours: it faces the player when standing and turns into a three-quarter view toward where it is going when
walking, running, jumping or shooting (head first, then body). `?look=ball` shows a rolling ball instead; the real-picture (`sprite`)
and `portrait` looks are gone (D-037). Robot and ball work in all levels, the demo ghost, the win screen and the Input Lab (Power
shoots a harmless energy ball). Voices for Mario, Luigi, Peach, Toad and Bowser. Opening the app starts Grass 1; the Input Lab is
behind `?lab=1`.
Next: Task 006 (world map, stars, unlocking, storage).

## Roadmap (draft, architect may reorder)
| # | Task | Status |
|---|------|--------|
| 001 | Project setup: Vite + TS + Phaser, universe loader, PWA, Pages deploy | Done |
| 002 | Core input layer (touch/keyboard/gamepad -> actions) + audio manager | Done |
| 003 | Level engine + player physics + Grass 1 "Tap to hop" (auto-run, tap anywhere) | Done |
| 004 | Grass 2 "Big Jump button" + "watch me" demo system | Done |
| 004b | Lively character motion (procedural run, shadow, dust) | Done |
| 005 | Grass 3 "Left and Right" (no auto-run) | Done |
| 005b | Avatar looks (robot, ball; sprite and portrait later removed) | Done |
| 005c | Robot three-quarter running view, remove sprite/portrait looks, re-pace Grass 1-2 | Done |
| 006 | World map + stars + unlocking + per-universe progress storage | Next |
| 007 | Grass 4 "Shoot": Power button gameplay (friendly bubbles/targets that pop into coins) | Planned |
| 008 | Grass 5: move + jump gaps | Planned |
| 009 | Character picker (real pictures, voices) | Planned |
| 010 | Minimal parent view (sound, button size, unlock-all) | Planned |
| later | Pipe/Sky/Castle worlds, boss question, polish | Later |

## Done
- 2026-10-23: Planning, decisions D-001..D-011, starter pack, local repo created.
- 2026-10-23: Task 001 project setup (skeleton, universe registry, placeholder scene, PWA, deploy workflow).
- 2026-10-23: Character images moved to `src/universes/mario/assets/<id>.avif` and referenced from the manifest via `asset()` (commit b794b3e, outside the task flow).
- 2026-10-23: Task 002 input, audio, edge-to-edge scaling, Input Lab.
- 2026-10-24: Task 003 level engine and Grass 1 (plus MAX_WIDTH 1920 and high-DPI rendering).
- 2026-10-24: Mario/Luigi voice clips and run poses committed (`assets:` commit before Task 004).
- 2026-10-24: Task 004 Grass 2, "watch me" demo, character poses and voices, Next button, first-tap sound fix.
- 2026-10-24: Task 004b lively motion (procedural run/air/idle motion, win bounce, shadow, dust, optional `poses.runFrames` flipbook).
- 2026-10-24: Peach, Toad and Bowser voice clips renamed (D-031) and committed (`assets:` commit before Task 005).
- 2026-10-24: Task 005 Grass 3 "Left and Right": walking (ramp, both-held = stand, facing hysteresis, soft level-end walls),
  look-ahead camera, demo script v2, idle pose rule, invite/nudge pulses for three buttons, Peach/Toad/Bowser voices wired.
- 2026-10-24: Task 005b avatar looks: `AvatarLook` + shared `AvatarDriver`, Sprite (unchanged), Ball, Portrait and Robot looks with
  tested clips, per-character avatar palettes/sizes/portrait crops, shooting in the Input Lab, Grass 3 walking coins at head height.
- 2026-10-24: First tablet session with Athiran (D-037): robot liked best, loves shooting; bored by Grass 1-2, liked Grass 3.
- 2026-10-24: Task 005c: robot three-quarter view (yaw, head-then-body turn, pure rig solver `robotRig.ts`), sprite and portrait
  looks and all pose/flipbook code removed (robot is the default), Grass 1 cut to 85 tiles and Grass 2 to 90 tiles.

## In progress
_(nothing)_

## Open questions
- Robot three-quarter view (Task 005c), to judge on the tablet and in the review sheets (`_sources/review/005c/`, not committed;
  before-sheets in `_sources/review/005c-before/`): does running read as "forward" now? Is the head-then-body turn too slow or too
  quick (head 100 ms, body 160 ms)? Is facing the player when standing still right, or should idle keep a slight turn toward
  the facing (`ROBOT.yaw.idle`, now 0)? A standing jump now turns the robot to 0.45 toward its facing. All numbers in
  `core/avatar/robotSpec.ts` (`yaw`, `view`).
- The far ear "peeks out" behind the face side in the three-quarter view (a cartoon cheat; strictly it would be hidden). Easy to
  hide (`ROBOT.view.earFarPeek: 0`) if it reads as a third ear.
- At the instant a turn passes through the front view, the robot's near and far sides swap. Idle, walk and run are continuous
  there (unit-tested), but a turn in mid-air shows a one-frame swap of the tucked legs (the jump/fall poses are not left/right
  symmetric). Rare and brief; noting it in case it is visible.
- The take-off arm swing is quick (arms back to arms up in 140 ms, about 0.65 rad per frame at most) so the V shows early.
- Green avatars (Luigi, Yoshi, Bowser's joints) have low contrast against the green Grass hills; the outline helps but a darker
  outline or a different palette may be wanted.
- Grass 3 tuning to confirm on the tablet: walk speed 220, ramp 60/80 ms, 4 coins left of the start, overhead coins 2.5 tiles up
  (need a standing jump), stars 10/16. All in `grass-3.json` / `core/levels/physics.ts`.
- Facing flips on the first frame of a turn (D-029), so the character briefly slides about 10 px backwards (4 frames) while slowing.
  With the robot's yaw sweep (Task 005c) the body turns through the front view over 160 ms, which hides most of it.
- On wide screens (wider than 4:3) Left and Right sit outside the central 960-wide safe area: they are anchored to the screen's
  bottom-left corner (inside the device insets) as all UI is (D-013). Grass 3's walking coins now sit at head height (Task 005b), so no
  coin is ever behind a button; this changes D-029's "coins at ground level" wording (they are still collected by walking).
- Mashing at 20 presses per second: average 59.8 fps, Phaser's smoothed fps dipped to 57.9 once at 844x390 (dpr 3) in headless
  Chrome; full Grass 3 run 60 fps (min 59.1).
- Motion tuning (Task 004b) is by eye from frame captures; all numbers are in `core/levels/animation.ts` (the robot uses half of the squash and none of the stride lean, `ROBOT_CLIPS.motion`).
- Phaser logs "Ignored attempt to cancel a touchcancel event" in the console when a touch is cancelled (Phaser calls preventDefault on it). Harmless.
- High-DPI rendering (Task 003) zooms each scene's camera with origin (0, 0). Phaser's camera bounds and `startFollow` assume a centred origin, so scenes scroll by hand; children of screen-fixed containers need `setScrollFactor(0, 0, true)` or taps miss them. See ARCHITECTURE "Screen layout".
- Voice mapping (D-023, D-031) is a guess; confirm by ear: Mario pick = yeah-ho, jump = ha-ha, win = yipee; Luigi pick = oh-yeah, jump = haha, win = yeah-ha-ha; Peach pick = hello, jump = yeah, win = he-he-yeah; Toad pick = toad-2, jump = toad-0, win = toad-1; Bowser pick = bowser-1, jump = bowser-0, win = he-ha-ha. `pick` clips are registered but not played until the character picker.
- Grass 2 (Task 005c): 90 tiles, one 1-tile gap (42) and two 2-tile gaps (60-61, 76-77; 2-tile gaps need a press within about half a second), 18 coins, stars 9/15, demo unchanged (20 tiles, about 5 s), Jump button 0.28 of the screen height when it is the only button.
- Bot timing (Task 005c, random presses about 1.5 per second, headless Chrome): Grass 1 25-45 s (median 31; the 45 s run fell in the
  gaps 6 times), Grass 2 29-33 s without the demo and 34-54 s with it (the demo is about 7 s; the slow runs fell 5-6 times).
  A child who taps on purpose falls less. Old levels took 44-52 s (Grass 2) in the same test.
- Frame rate (Task 005c): on this test machine headless Chrome now runs a blank page at only 47 fps, and every build (old and new,
  robot and ball) measures the same ~56 fps average in a full Grass 2 run with mashing and in a Grass 3 walk, no console errors.
  So the robot's view costs nothing measurable here, but 58+ fps could not be shown on this machine; needs a check on the tablet.
- Device safe-area insets (notches) could not be tested in headless Chrome (all zero); the Jump button uses the same inset-aware anchor as before.
- Grass 1 tuning to confirm on the tablet (Task 005c): 85 tiles (about 25 s of running), 16 coins, two 1-tile gaps at 50 and 66, stars 7/12; run speed 200, jump peak 2.5 tiles. All in `grass-1.json` / `core/levels/physics.ts`.
- Service worker uses a hand-written `src/sw.ts` (injectManifest) because workbox's generated SW breaks when the local path contains an apostrophe ("Athi's Game"). Fine on CI. Keep in mind if the PWA setup changes.
- Not yet tested on a real phone/tablet (iOS Safari especially: fullscreen display, audio unlock, double-tap zoom).
- Bowser as player vs castle boss: settle later (friendly race, or swap boss when Bowser is chosen).
- Unlock rule: `openAtATime` is 3 (D-037), so all three Grass levels are open; the map (Task 006) applies it. Until then any level opens with `?level=` and Next goes 1 -> 2 -> 3 (checked).
- Real pictures are now only for the character picker (Task 009); voices for Yoshi and Donkey Kong still missing. Not blocking.

## Asset notes (architect, 2026-10-23)
- Parent added 7 character images (originally `public/images/character-<name>.avif`). Code already moved them to `src/universes/mario/assets/<id>.avif` (mario, luigi, peach, toad, bowser, yoshi, donkeykong) and the manifest references them with `asset('<id>.avif')`. All are 600x844, transparent, one hero pose each (Mario/Luigi jump pose, Yoshi mid-run, Peach/Toad floating, Bowser/DK standing, front-ish view).
- Characters occupy different amounts of their canvas, so normalise by display height per character in the manifest (e.g. `displayHeight`), do not edit the files.
- Plan for Task 007: optionally move them into an `assets/characters/` subfolder, and convert AVIF to WebP (alpha, quality about 90) for wider browser support, unless the parent says all his devices handle AVIF.
- (Superseded by D-037, Task 005c: pictures are no longer drawn in levels, so no run poses are needed; the images are for the picker.)

## Parent action items
- After pushing Task 005c, a short check on the tablet (any level, e.g. https://ajayc07.github.io/games/?level=grass-3):
  - Does the robot now look like it runs forward, both ways? Does Athiran notice it turning round?
  - Standing still it faces him; is that friendly, or confusing about which way it will go?
  - Jump and shoot still as good as before (the Input Lab: `?lab=1`, press the 4-dots mode, then the star button)?
  - Are Grass 1 and Grass 2 short enough now (about 30 s each)?
  - Still smooth (no stutter) while mashing?
- After pushing Task 005, try Grass 3 on the tablet with Athi (finish Grass 2 and press Next, or open `?level=grass-3`):
  - Does he find Left and Right? Does he watch the demo's finger move between the buttons?
  - Does he understand that letting go stops? Or does he keep the button held and get surprised at the wall?
  - Does he reach the four overhead coins (stop under one and press Jump)? Does he go left for the four coins behind the start?
  - Do the button sizes and spacing work for one hand (thumb on Left/Right, then over to Jump)? Any accidental presses?
  - Listen to Peach, Toad and Bowser (`?char=peach`, `?char=toad`, `?char=bowser`): is each clip in the right slot (jump / win)?
- After pushing Task 004b, watch Athi play Grass 1 and Grass 2 on the tablet:
  - Does the run feel lively without looking jittery or wobbly? Is the lean / bounce too much or too little?
  - Is the landing squash fun, or does it look like the character got hurt?
  - Is the shadow or the dust (footfall puffs, landing ring, speed streaks) distracting for him, or does he not notice?
  - Does the win bounce while the stars fill feel joyful?
  - Still 60 fps on the tablet (no stutter while mashing Jump)?
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
- Push the local repo to `origin` (https://github.com/ajayc07/games.git) after each task.

## Device test notes (parent fills in after trying on the tablet)
Format: date, device, what he did, what confused him, what bored him, what he loved.
- 2026-10-24, tablet (recorded by the architect as D-037): compared the looks; liked the robot best and loves its shooting. Bored by
  auto-run and tap-to-jump (Grass 1 and 2); liked Grass 3 (walking). Parent: the running robot faced the player, so it looked like
  it ran backwards; the jump looked great. Acted on in Task 005c.
