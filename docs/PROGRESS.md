# Progress

_Last updated: 2026-10-24 (Task 008 done)_

## Status
"Robo World" (D-038) has five Grass levels on the world map (Task 008). New: Grass 5 "Move and Jump", the first level that
combines two controls he knows: walk with Left/Right and press Jump to cross gaps (1, 1, 2, 1, 2, 2 tiles, always 8 or more tiles
of ground between them). He can walk to an edge, stop and press Jump when ready, or jump while walking; a coin arc shows where to
jump. Falling still floats him back on the cloud, now to the side he came from (a fall while walking left no longer carries him
across the gap). Buttons are the same as Grass 3 (Left, Right, Jump). Grass 4 "Shoot" (Task 007) and the rest are unchanged. On
a fresh start Grass 4 and 5 are under clouds; Grass 4 opens after one level is cleared and Grass 5 after two.
Next: Task 009 (Grass 6 "Everything": Left, Right, Jump and Power together, D-043).

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
| 005d | Generic "robo" universe, remove character voices, colour-card picker (D-038) | Done |
| 006 | World map + stars + unlocking + per-universe progress storage | Done |
| 007 | Grass 4 "Shoot": Power button gameplay (friendly bubbles/targets that pop into coins) | Done |
| 008 | Grass 5 "Move and Jump": walking over gaps (D-043) | Done |
| 009 | Grass 6 "Everything": Left, Right, Jump and Power together (D-043) | Next |
| 010 | Minimal parent view (sound, button size, unlock-all, reset progress) | Planned |
| later | Cave/Sky/Castle worlds, polish | Later |

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
- 2026-10-24: D-038 (parent): the jump voice is annoying and goes; the universe becomes generic; only the idea of a selection
  card stays, as a colour/size/antennae choice for the robot.
- 2026-10-24: Task 005d: universe renamed `robo` ("Robo World"); 7 character images and 15 voice clips archived to
  `_sources/archive-private/` and removed from the repo; voice machinery removed; eight colour options with synthesized pick/win
  chimes; picker scene (cards, keyboard, Play), stored choice, win-screen palette button. Bundle 1,895,904 -> 1,358,453 bytes
  (`dist/`), universe chunk 91,940 -> 101,868 bytes (picker code added, all media gone).

- 2026-10-24: D-039 (architect review of 005d): all deviations approved; flow for the map settled.
- 2026-10-24: Task 006: progress storage (IndexedDB -> localStorage -> memory, unknown-version safety, 005d choice migrated),
  unlock rule, world map scene (dots, stars, clouds, teasers, hops, arrival animation, keyboard, drag scrolling), hold-to-exit
  icon in levels, map and win-screen flow, `?size=` knob, light rim for green accents and the green ball. Universe chunk
  101,868 -> 125,446 bytes; `dist/` 1,358,453 -> 1,382,446 bytes.

- 2026-10-24: D-041 (architect): Grass 4 "Shoot" design.
- 2026-10-24: Task 007: shots (`SHOT`, pure `ShotCannon`, shared `Blaster` for levels and the Input Lab), bubbles (`o`/`O` legend,
  pure geometry/hit/coin flow, `BubbleField`), soft big-bubble blocker, Power button in Jump's slot, demo `power` steps, pop sounds,
  `grass-4.json`, four map dots, opaque teaser clouds. Universe chunk 125,446 -> 139,797 bytes; `dist/` 1,382,446 -> 1,397,162 bytes.

- 2026-10-24: D-042..D-044 (architect): Task 007 review, Grass 6 "Everything", second tablet session (replay boredom is the main risk).
- 2026-10-24: Task 008: Grass 5 `grass-5.json` (75 tiles, six gaps, 28 coins, stars 14/22, 8 s demo), `findRespawn` heading direction
  (a fall while walking left puts him back on the right side of the gap), five-dot map, tests (gaps, safe stretches, crossing margins,
  coins, stars, respawn direction, map with 3/4/5 levels). Universe chunk and `dist/` sizes in the task file.

## In progress
_(nothing)_

## Open questions
- Grass 5 (Task 008), to judge on the tablet: does he walk to the edge and stop, or press Jump while walking? Does he understand the
  coin arcs? Are the 2-tile gaps frustrating? Does the cloud float-back confuse him (he is put back 2.5-3 tiles from the gap he fell into)?
  All in `grass-5.json` and `core/levels/physics.ts`.
- Grass 5 length (Task 008): a bot that mashes with a right-leaning bias (Right 2.5/s, Jump 1.5/s, Left 0.5/s, presses held 150-500 ms)
  finished 5 of 5 runs in a median of 131 s (108-173 s) with 10-23 falls, against the task's target of about 60 s. An unbiased bot
  (all three buttons 1.5/s, as in the earlier timing tests) is a random walk on a walking level and reached only x 806 of 4700 in
  120 s. A child who walks on purpose will be much faster (one hold of Right walks the level in about 21 s plus the jumps), so this is
  mostly about mashing. Easy levers if the tablet shows it is too long: fewer tiles between the gaps (8 down to 6 saves about 12
  tiles), or fewer gaps. Each fall costs about 5 s for a masher (1.7 s on the cloud, then walking back).
- Respawn loop (Task 008): holding Right only falls at the first gap, floats back, walks on and falls again until he lets go or
  presses Jump (7 falls in 24 s). It is never a soft lock and costs no stars; if the tablet shows him holding Right forever, the
  respawn could ignore held Right for a moment or put him farther back.
- Frame rate (Task 008, headless Chrome, 844x390): blank page 53.2 fps today (60.2 in Task 007; the machine was busier), map 58.5,
  Grass 5 while mashing Jump about 20 times a second, walking and falling: average 57.4, lowest 54.1, no console errors.
- Grass 4 (Task 007), to judge on the tablet: does he find Power and see that it shoots the way the robot faces (one bubble is
  behind the start)? Is the cooldown (300 ms) too slow or too fast? Are the pops (a rising "plip" for quick pops) pleasant?
  Is the big bubble a problem or fun? Stars 22/34 of 39 coins. All in `grass-4.json`, `core/levels/shots.ts` (`SHOT`) and
  `bubbles.ts` (`BUBBLE`, `POP_COINS`).
- Bubble heights: the shot leaves 26-78 px above the feet (robot or ball, every colour, `?size=` 0.8-1.6), so a small bubble
  floats half a tile below its cell centre (resting on the ground in the bottom row, 1 tile up in the row above). Centred in
  its cell the upper row would be out of reach for the ball and the small robots. Rule in `BUBBLE.smallDrop`.
- Bubbles in the bottom row pass behind the Left/Right and Power buttons while they are near a screen edge (far from the robot);
  the one behind the start is in the upper row so it stays visible. A shot can pop a bubble that is partly behind Power.
- Holding Power with the 3-shot cap: 3 shots 300 ms apart, then the 4th about 70 ms late (it waits for the first to end).
- The demo pops three bubbles (they grow back when it ends, its coins never count). The finger now stays on a tapped Jump/Power
  button for 350 ms before gliding on (Grass 3's demo finger changes the same way).
- Frame rate (Task 007, headless Chrome on this machine): blank page 60.2 fps, map 59.3, Grass 4 while mashing Power about 20
  times a second and walking (5 pops): average 58.9, min 57.5; no console errors.
- Pop and coin sounds were tuned by numbers only (short, soft sines, pentatonic steps, coin sound at most every 140 ms), not by ear.
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
- Avatar contrast on the green hills: every option now has dark joints (at least 3:1 against both hill colours, unit-tested) and the
  body stays white; since Task 006 the green option's accent parts and the green ball get a thin light rim. Check on the tablet
  (`_sources/review/006/contrast-robot-on-grass.png`, `contrast-ball-on-grass.png`).
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
- Map (Task 006), to judge on the tablet: does he understand the dots and the stars without text? Is dragging the map needed
  or confusing (it follows the robot by itself)? Is 1 s the right hold time for the exit icon, and is the icon too tempting?
- Current dot (Task 006): the task says "the furthest open uncleared level"; the robot stands on the FIRST open level not yet
  cleared (so a fresh start begins at Grass 1, not Grass 3). Easy to change in `core/map/unlock.ts` (`currentDot`).
- The map is 2185 px wide (4 dots + 3 teasers since Task 007), so it scrolls on every screen; on narrow screens with
  everything cleared Grass 1 is off to the left until the child drags back.
- Teaser worlds are drawn as cave, sky and castle signposts (the task text says "pipe"; the world was renamed Cave in 005d).
- Progress is per device and browser: clearing site data or a different browser starts fresh. iOS Safari private mode and the
  tablet's storage could not be tested here (headless Chrome only).
- `openAtATime` is 3 (D-037): Grass 1-3 are open from the start, Grass 4 opens when Grass 1 is cleared; with `?debug=1&open=1`
  or `open=2` more of the unlocking can be seen.

- Picker (Task 005d), to judge on the tablet: does he understand the cards without text? Is the default (first card, or the last
  choice) fine, or should a first launch have no selection until he taps? Dimming the other cards (0.24) may look like "disabled".
- Chimes (Task 005d) were tuned by numbers only (unit tests for distinctness, range and loudness), not by ear. Listen to all eight
  (tap each card): pleasant, clearly different, not too loud? Numbers in `core/audio/chimes.ts` and each option's `chime`.
- Phaser re-sends queued keyboard events when several keys arrive in one frame (its duplicate check only remembers the last
  event). The picker ignores repeats; the result screen and the level are not affected in practice (they act once), but keep it
  in mind for any new key handling.
- The picker reads the keyboard directly (arrows, Enter/Space), like the result screen; gamepads do not drive it yet.
- `?level=` skips the picker even on a first launch (as the acceptance criteria ask); with `?picker=1` the picker comes first.
- The "Pipe" world (empty) was renamed "Cave" to drop a franchise-like detail; the coin, flag, hills and clouds stay generic.

## Asset notes
- Task 005d (D-038): no media files in the game. The former character images and voice clips are archived in
  `_sources/archive-private/` (not committed) and remain in the public git history until the parent rewrites it (docs/IDEAS.md).

## Parent action items
- After pushing Task 008 (tablet, https://ajayc07.github.io/games/, or `?level=grass-5`; `?demo=1` replays the demo):
  - Grass 5 opens after two levels are cleared (or `?unlock=all`). Does the cloud over the fifth dot clear when he finishes his second level?
  - Does he walk to a gap edge and stop, or press Jump while walking? Both work.
  - Does he follow the coin arcs over the gaps? Are the 2-tile gaps frustrating or fun?
  - Does the cloud that carries him back after a fall confuse him? Does he keep walking into the same gap?
  - Is the level too long (about 75 tiles) for him? Does the demo (about 8 s) make sense?
- After pushing Task 007 (tablet, https://ajayc07.github.io/games/, or `?level=grass-4`; `?demo=1` replays the demo):
  - Does he find the purple Power button by himself (it pulses until first pressed)? Does the demo's finger on it help?
  - Does he understand that it shoots the way the robot faces (turn round for the bubble behind the start)?
  - Does he like popping? Are the pop sounds pleasant, and the coins flying to the robot fun?
  - Is the big bubble a problem (stuck, confused) or fun?
  - Is the cooldown right (hold Power: a shot every 0.3 s), or too slow/fast for his mashing?
  - Clearing Grass 1 on a fresh start: does the cloud over the fourth dot clear?
- After pushing Task 006 (tablet, https://ajayc07.github.io/games/):
  - First visit: picker, then the map. Does he tap a dot by himself? Does he see that the robot walks to the dot?
  - After a win (press the house button on the win screen): does he notice the stars filling in on the map? With
    `?debug=1&open=1` (one level open at a time), does the cloud clearing over the next dot delight him?
  - Does he get lost on the map (dragging it away, tapping the clouds or signposts)? Are the signposts' bumps fun or confusing?
  - Hold-to-exit: can you (the parent) leave a level by holding the small house icon top right for a second? Does he leave by
    accident? Does a quick tap on it ever do anything (it should only wobble)?
  - Close the app and open it again: are the stars and the colour still there? Also in airplane mode?
  - Try `?size=1.2` and `?size=1.4` in a level: is a bigger robot better for him?
- After pushing Task 005d (rewriting the git history is a separate, later step; see docs/IDEAS.md):
  - Open https://ajayc07.github.io/games/?picker=1 on the tablet: does he tap a card without help? Does he find the green Play button?
  - Listen to all eight chimes (tap each card) and the win chime at the flag: pleasant, different, not too loud?
  - Is jumping nicer without the voice? Does he miss it?
  - Is the palette button on the win screen distracting, or does he enjoy changing colour?
  - Do the robot sizes (yellow small, purple big) read as "different robots"?
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
  - Do the 2-tile gaps frustrate him? Does he notice the coin arcs need a press?
  - Does the first tap make a sound?
  - Does he find Next on the win screen? (`?demo=1` replays the demo; it otherwise plays once per session.)
- Enable GitHub Pages: repo Settings -> Pages -> Source: "GitHub Actions" (needed before first deploy works).
- After pushing Task 003, try Grass 1 on the tablet with Athi (https://ajayc07.github.io/games/, landscape):
  - Does he hop? Does he understand that tapping does something (the pulsing finger icon disappears after the first hop)?
  - Is the speed right, too slow or too fast? (About 45 s to the flag.)
  - Any frustration at the two small gaps (a fall floats him back on a cloud)? Does he enjoy the cloud or find it confusing?
  - Does he notice the coins and the stars at the end? Does he find Replay without help? (Home now goes to the map.)
  - Is the picture sharp on the tablet? Any sound missing on the first tap?
- Input Lab (now at `?lab=1`): button size check with `?lab=1&buttonScale=1.3` or `0.8`; thumb slide Left to Right.
- Push the local repo to `origin` (https://github.com/ajayc07/games.git) after each task.

## Device test notes (parent fills in after trying on the tablet)
Format: date, device, what he did, what confused him, what bored him, what he loved.
- 2026-10-24, tablet (recorded by the architect as D-037): compared the looks; liked the robot best and loves its shooting. Bored by
  auto-run and tap-to-jump (Grass 1 and 2); liked Grass 3 (walking). Parent: the running robot faced the player, so it looked like
  it ran backwards; the jump looked great. Acted on in Task 005c.
- 2026-10-24 (evening), tablet (recorded by the architect as D-044): Grass 1-4, map and picker all worked as expected; no problems reported. He enjoyed popping the bubbles (Grass 4). After repeated play of the same level he got bored; otherwise fine. Parent expects him to cope with the next stages.
