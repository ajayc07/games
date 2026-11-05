# Progress

_Last updated: 2026-10-29 (Tasks 021-033 done: hold to run, zen mode, flight, rainbow coins, day/night, auto-pause, power bars, double power-ups, Mega Robo, stickers, volume). **Feature freeze lifted on 2026-11-03 for Tasks 034, 035 and 019 only (D-077). Tasks 034 (Flash, power-up rules, flash-1), 035 (Bolt Bug, bug-1) and 019 (footsteps, landing thump, idle wave) done. Task 036 (idle routine: wave, push-ups, taunt, D-084) done as a cosmetic follow-up. **2026-11-04: the freeze is lifted for the Cave world (D-085): Task 041 (zen day/night cycle), Task 037 (Cave world, the map branch, cave-1) and Task 038 (Rock Beetle, Glow Bat, cave-2, cave-3), Task 042 (enemies in zen) and Task 039 (cave-4, cave-5) and Task 040 (the Cave Guardian boss, the gate, the crown) done; the Cave is finished.**_
Full history, old checklists and every earlier open-question note: `docs/archive/PROGRESS-through-task-011.md`.

## Status
The original plan (Tasks 001-010) and Combo Practice (Task 011) are done. "Robo World" is a generic, original game (no franchise content):
first visit shows an eight-colour robot picker, then the world map (six Grass levels on a winding path, locked dots under clouds,
3 star slots each, teaser signposts for later worlds). Levels: Grass 1 tap to hop, Grass 2 big Jump button, Grass 3 Left and Right,
Grass 4 Power (pop bubbles into coins), Grass 5 walk and jump over gaps, Grass 6 all four buttons. A teal Practice button
(bottom-right of the map) opens four icon cards (walk + shoot, jump + shoot, walk + jump, everything): generated 120-tile levels,
combos fill a row of five stars, a ghost hand coaches, nothing is saved. A grey gear (top-left, held 3 s) opens the parent view
(sound, button size with preview, main button, look, unlock all, open the Cave now, show demos again, reset progress, walk assist in Practice, full screen where the browser supports it).
Test hooks: `?level=`, `?lab=1`, `?picker=1`, `?color=`, `?look=`, `?size=`, `?buttonScale=`, `?buttons=power`, `?unlock=all`,
`?demo=0|1`, `?variety=0|1`, `?rainbow=1` (forces one rainbow bubble on a varied run), `?sound=0|1`, `?parent=1`, `?practice=<mode>|1`, `?zen=1`, `?power=car|magnet|boots|flash` (start with that power on; with `?demo=0` on levels that have a demo, also works with `?zen=1`), `?bugs=0` (hide the Bolt Bugs in bug-1), `?enemies=0` (hide the Rock Beetles and Glow Bats in the Cave, and every enemy in zen), `?enemies=1` (zen: the first enemy comes early), `?level=cave-1|...|cave-5|cave-boss` (`?boss=0` opens the Guardian's gate without a fight) (the Cave levels; Home goes to the Cave map), `?unlock=all` also opens the Cave mouth, `?cycle=<seconds>|0` (zen day/night interval, 0 = off; needs the setting on Random), `?seed=`, `?assist=sticky`, `?fullscreen=0|1`, `?debug=1` (+ `&open=N`).
Everything through Task 011 and the docs trim is pushed to `origin/main`; Tasks 012-014b are all pushed.

## Roadmap
| # | Task | Status |
|---|------|--------|
| 001-005d | Setup, input/audio, level engine, Grass 1-3, motion, avatar rig, robot view, robo universe + picker | Done |
| 006 | World map, stars, unlocking, saved progress | Done |
| 007 | Grass 4 Shoot (Power, bubbles) | Done |
| 008 | Grass 5 Move and Jump | Done |
| 009 | Grass 6 Everything (four buttons) | Done |
| 010 | Parent view | Done |
| 011 | Combo Practice (free play) | Done |
| 013 | Browser fullscreen (first tap, parent-view toggle) | Done |
| 012 | Replay variety (shuffle coins and small bubbles on replays after a first clear, rare rainbow bubble), D-053 | Done |
| 014 | Charging pad instead of the flag, stronger rainbow bubble, robot hex-nut coin face (D-054, D-055) | Done |
| 014b | Bigger, unmistakable charging pad (chunky pad, charger column, big bulb, light column); `?rainbow=1` proof of the rainbow bubble (D-056) | Done |
| fix | Rainbow bubble on every play; big bubble takes 3 shots and shrinks with each hit (D-058, 83ebc44) | Done |
| 015 | Step blocks and bounce pads, new Grass 7 "Blocks and Bounce" (D-059) | Done (uncommitted until the parent commits) |
| 016 | Night world: stars, fireflies, headlamp glow and the new level night-1 "Night Walk" (D-060) | Done (uncommitted until the parent commits) |
| 017 | Car power-up: orb pickup, car transform for 10 s, new level car-1 "Zoom Car" (D-061) | Done (uncommitted until the parent commits) |
| 018 | Magnet and rocket boots: two pickups, new levels magnet-1 and boots-1 (D-062) | Done (uncommitted until the parent commits) |
| 019 | Polish bundle: footsteps, landing thump, idle wave (D-077, D-081) | Done (committed) |
| 041 | Zen day/night cycle: Random changes the look every 60-120 s with a 3 s fade (D-085, D-086) | Done |
| 037 | Cave world: a branch on the Grass map (cave mouth, boulder while locked, meadow arch back), the cave look, parent row "Open the Cave now", cave-1 "Cave Walk" (D-085) | Done |
| 038 | Cave enemies: Rock Beetle (ground, 5 shots, 8 coins) and Glow Bat (flying, 3 shots, 6 coins) on generalised enemy machinery, cave-2 "Rock Beetle", cave-3 "Glow Bat" (D-085) | Done |
| 042 | Enemies in zen: Bolt Bug, Rock Beetle, Glow Bat on flat stretches away from the swap windows (D-085) | Done |
| 039 | Cave levels 4-5: cave-4 "Crystal Bridges", cave-5 "Cave Run" (D-085) | Done |
| 040 | Cave Guardian boss: arena, 10 chest-crystal hits, crumble, gate, big crystal sticker, crowned Cave (D-085) | Done |
| 043 | Gamepad (and TV remote) navigation for the menus: picker, map, Practice, stickers, result, parent view; for an Android TV with a controller | Done (`docs/tasks/043-gamepad-menus.md`): a gamepad (or the TV remote's arrows and OK) drives the picker, map, Practice, stickers and win screen; the parent plugs a controller into a laptop. Not done: parent-view rows. The TV browser exited after the level pick (suspected load: a 2x canvas and 2x generated textures; no low-power mode exists); a TV / low-power mode is an idea, not drafted |
| 036 | Idle routine: wave, then push-ups, then a taunt, then rest (D-084) | Done |
| 034 | Flash power-up and power-up rules (Mega Robo combines with nothing) (D-078, D-079) | Done |
| 035 | Bolt Bug, a small harmless villain, and level bug-1 (D-080, D-082) | Done |
| 020 | Zen free play: endless level with every button and power-up, a Zen button on the map (D-063) | Done and committed |
| 021 | Hold to run (x1.45 after 350 ms) and a vibration on a fall (D-064) | Done and committed |
| 022 | Zen: seamless swap with no empty stretches, stairs and gaps (D-065) | Done (uncommitted until the parent commits) |
| 023 | Rocket boots fly like Iron Man: hold Jump (D-066, replaced by Task 028 / D-071) | Done (uncommitted) |
| 024 | Rainbow coins: special look, chime and counter bump (D-067) | Done (uncommitted) |
| 025 | Day / night setting (random by default), vibration switch and test, firmer buzz (D-068) | Done (uncommitted) |
| 026 | Power button icon: a toy blaster firing a ball instead of a star (D-069) | Done (uncommitted) |
| 027 | Auto-pause after 150 s without a touch, wake lock released, tap to resume (D-070) | Done (uncommitted) |
| 028 | Auto-flying rocket boots, Left/Right become Up/Down, power time bars (D-071) | Done (uncommitted) |
| 029 | Zen double power-ups, at most two timed powers at once (D-072) | Done (uncommitted) |
| 030 | Coin progress bar and Mega Robo (D-073) | Done (uncommitted) |
| 031 | Sticker rewards and the sticker book (D-074) | Done (uncommitted) |
| 032 | Mega Robo steps, new sounds, Volume setting (D-075) | Done (uncommitted) |
| 033 | Bug fixes: Mega Robo only late / rarer in zen, daily zen time limit (D-076) | Done (uncommitted) |
| post-plan (nothing starts without the parent's say-so) | Tablet test of Grass 5-6, parent view and Practice (basic pass worked 2026-10-25); unique per-colour traits, surprise map dot, polish bundle (Task 019: footsteps, landing thump, idle wave), left/right target mode, gentle auto-difficulty, weather skins (docs/IDEAS.md); git-history rewrite; more worlds (Cave, Sky, Castle) | Open |

## Pending for next session
0. **Newest:** Tasks 037-042 (the Cave, its enemies, the boss, zen enemies, the day/night cycle) are all built; the whole Cave (`?level=cave-1` to `cave-boss`) needs a tablet test (checklists under Parent action items). After that the open choice is more worlds (Sky, Castle) or tuning from what he does. The items below are older and kept for the tablet checks.
1. Task 014 (charging pad, hex-nut coin, rainbow rim) is done and pushed (D-056). Task 014b (bigger pad with a light column, `?rainbow=1` proof) is done and pushed (D-057). The planned work is complete.
   Optional next: Task 019 polish bundle (footsteps, landing thump, idle wave), not drafted. Variety plan in order (D-059): blocks and pads (done), night world (done), car power-up (done, D-061), magnet and rocket boots (done, D-062).
   Parent housekeeping: stop the Vite dev server still running on port 5173 (D-054, D-056).
2. Real-device checks: the charging pad (findable in Grass 6, still called "Mario"?), the rainbow bubble, Task 012 replay variety, Task 013 fullscreen.
3. Real-device checks for Task 015 (D-059): can he climb the blocks (stairs at 20-21 need a 2-tile climb), does the pad launch feel fun, do the pad coins get collected. Also, not unit-tested: Grass 7 has no demo and no bot run (the bot knows no blocks or pads).
4. Real-device checks for Task 016 (D-060): is the night level too dark or the headlamp too busy, do bubbles read on the pale hills, do all eight colour options stay visible.
5. Real-device checks for Task 017 (D-061): does he notice the orb, is 10 s as a car right, is x1.25 speed fun or too fast, does the change back confuse him.
6. Real-device checks for Task 018 (D-062): is the magnet ring noticed (it is faint), is the boots jump fun or too floaty, can he reach the high coins in Rocket Boots.
7. Real-device checks for Task 020 (D-063): does he find the purple infinity button, does he stay with zen (how long), is a power-up about every 60-70 tiles too busy or too quiet, does a big bubble in the path frustrate him, does the world ever look wrong at a swap (it should not).
8. Real-device checks for Task 021 (D-064): is holding an arrow for 350 ms a natural way to run for him, is x1.45 too fast on gap levels, does the buzz on a fall feel right (Android only).
10. Real-device checks for Task 022 (D-065): does zen ever look empty or jump at a swap, are the gaps and stairs enough or too much, does a fall in zen feel fine.
11. Real-device checks for Task 023 (D-066): does he find that holding Jump flies, is the climb speed and the glide right, can he get the sky coins.
12. Real-device checks for Task 025 (D-068): is the fall buzz felt on the Android phone (after closing and reopening the installed app so the new version loads), does the Test buzz button work, is random day/night welcome, does every level read well at night.
9. Real-device checks for D-058: the rainbow bubble now on every play of Grass 4 and 6; the big bubble's 3 hits (feel of the shrink sizes `BUBBLE.bigScales`, sound). Star thresholds not retuned for the +5 rainbow coins; optional idea: a coin or two per big-bubble hit.

## In progress
_(nothing)_

## Open issues and tuning (current)
- **Not verified on a real device:** chimes, pop and combo sounds by ear; 58+ fps (the headless test machine measures a 52-60 fps blank page);
  iOS Safari (audio unlock, private-mode storage); device insets (layout unit tests only); a real child on the gear hold;
  the map when dragged by a toddler. Progress is per browser and device.
- **Tuning numbers (first guesses):** Practice `COMBO` (`navGraceMs` 120, `minGapMs` 400) in `core/practice/combo.ts`, `COACH` (8 s / 2.5 s / 20 s) in `coach.ts`,
  `STICKY.tapMs` 250 in `core/levels/stickyWalk.ts`, `PRACTICE` (120 tiles) in `core/levels/practice.ts`; shots `SHOT` in `core/levels/shots.ts`
  (cooldown 300 ms, 3 in flight); bubbles `BUBBLE`, `POP_COINS` in `bubbles.ts`; buttons `BUTTON_SIZE`, `RIGHT_GAP`, `ARC_LIFT` in `core/ui/buttonLayout.ts`;
  physics in `core/levels/physics.ts`; robot view in `core/avatar/robotSpec.ts`; chimes in `core/audio/chimes.ts`; motion in `core/levels/animation.ts`.
  Level data: `grass-1..6.json` (stars Grass 1 7/12, 2 9/15, 3 10/16, 4 22/34 of 39 coins, 5 14/22 of 28, 6 38/62 of 78).
- **Pacing:** a right-leaning mashing bot takes a median 131 s on Grass 5 and 126 s on Grass 6 (10-23 falls); a child walking on purpose needs about
  22 s plus the jumps; Practice runs take about 35 s for a purposeful player. If the tablet says too long: 6 instead of 8 tiles between gaps in Grass 5,
  shorten Grass 6's 20-tile middle stretch, or drop a gap (each fall costs a masher about 5 s). Holding Right only loops fall and float-back until he lets go or
  presses Jump (never a soft lock, no star cost).
- **Accepted quirks:** sliding a thumb from Right to Jump crosses Power and fires one harmless shot; bottom-row bubbles near a screen edge can sit behind buttons;
  the Practice coach may show between gaps in walk + jump; facing flips on the first frame of a turn (a ~10 px slide, hidden by the yaw sweep); the robot's far ear
  peeks out in the three-quarter view (`ROBOT.view.earFarPeek: 0` hides it); a mid-air turn swaps the tucked legs for one frame; Phaser logs a harmless
  "Ignored attempt to cancel a touchcancel event".
- **Technical notes:** `src/sw.ts` is hand-written (workbox's generated SW breaks on the apostrophe in "Athi's Game"; fine on CI). High-DPI: each scene's camera zooms
  with origin (0, 0), so scenes scroll by hand and children of screen-fixed containers need `setScrollFactor(0, 0, true)` (docs/architecture/ui-input-audio.md "Screen layout").
  Phaser re-sends queued key events when several keys arrive in one frame; handle repeats in any new key code (the picker does). The picker is not driven by a gamepad.
  The map is about 2185 px wide, so it scrolls; the robot stands on the first open level not yet cleared.
- **Fullscreen (Task 013, built):** the first tap in a browser tab requests fullscreen + landscape lock (never re-requested after the child leaves it); parent view row "Full screen" On/Off (`?fullscreen=0|1`). Real-device checklist: Android Chrome tablet and phone, iPad Safari, iPhone Safari (no change expected, no row), desktop Chrome/Edge/Firefox; does the orientation lock work; does the layout re-fit.
- **Public git history** still contains the removed Nintendo files (`docs/IDEAS.md`); rewriting it is a parent decision.
- **No media files** in the game; the former character images and voice clips are archived in `_sources/archive-private/` (not committed).

## Parent action items
- Push the local repo to `origin` (https://github.com/ajayc07/games.git) after each task (or tell Claude Code "push it"). Currently up to date.
- Tablet checklist, newest first (https://ajayc07.github.io/games/):
  - **Task 043 (gamepad menus)** (laptop + controller, or a Bluetooth keyboard; fake pad for tests in `docs/architecture/ui-input-audio.md`): D-pad or stick moves, A = confirm / Next, B = back / Home, X = replay on the win screen. Does the picker work with the pad alone (move, A to choose, A to play)? On the map do Left / Right hop along the dots, Down reach Practice / Zen / Stickers (Left / Right choose, A opens, B or Up goes back), Up reach the cave mouth (at the Grass 6 dot) or the palette, and Left on the first Cave dot reach the meadow arch? In a level do jump, power and walking still feel the same, does mashing B or A never leave the level or open a menu, does holding Select for 1 s leave to the map, does Start + Select held for 3 s open the parent view (and a short press does nothing)? On the win screen A = Next, B = Home, X = Replay. Playing with only a pad for 3+ minutes must not trigger the auto-pause or the idle wave, and a press wakes the auto-pause. Parent view rows cannot be moved by pad (use the mouse or touch; B closes it).
  - **Task 040 (D-085)** (`?level=cave-boss`; `?boss=0` skips the fight; the Cave's last dot needs 10 stars in the Cave, or `?unlock=all`): is the Guardian cute-grumpy or scary to him; is he proud or worried when it walks toward him; does he shoot it from a distance, or walk into it; are 10 shots too many (about 6 s of steady shooting when he stands still); does he use the car or the magnet orb (the car turns each touch into a hit); do the crumble, the rumble and the opening gate delight him; does he notice the big crystal sticker and, later, the gold crown on the Cave mouth and on the Cave map; is the arena (36 tiles, flat) fun to play again?
  - **Task 039 (D-085)** (`?level=cave-4`, `?level=cave-5`, `?enemies=0` to compare): is Crystal Bridges (95 tiles, 3 gaps, a hurdle and a two-step stair, the magnet orb, a bat and a beetle) a good length and does he climb the blocks; in Cave Run does he find the Flash orb, pop the five-bubble run by running (rainbow coins) and meet the bug, two bats and the beetle without frustration; are 100 tiles too long for one go?
  - **Task 042 (D-085)** (`?zen=1&enemies=1` shows one early, `?enemies=0` compares): does he go for the enemies in zen, shoot them or walk on; too many or too few (about one every 70-80 tiles); does the bump annoy him in the flow of play; does the bat stay unnoticed overhead; do the two bubbles beside each enemy help or get in the way; does Mega Robo come too soon now?
  - **Task 038 (D-085)** (`?level=cave-2`, `?level=cave-3`, `?enemies=0` to compare; the Cave is open with `?unlock=all` or the parent's "Open the Cave now"): does he notice the Rock Beetle and the Glow Bat and what does he feel (scared, amused, curious); is 5 shots too many for the beetle and 3 right for the bat; can he shoot the bat (it hangs 1.5 tiles up; a standing shot reaches it, he can also jump and shoot); does he walk under the bat or jump into it; does the beetle's peek (head out for 1 s at each end) read; does the bump (slide back, boing, tiny hee) annoy him; does he like the 8 and 6 coins and the new stickers (first beetle, first bat); is the car in cave-2 noticed and does it pop the first beetle at once; in cave-3 does the coin bar fill and Mega pop the enemies; is the bat's quiet flap fine; are both enemies easy to see against the cave (cute-grumpy, not scary)?
  - **Task 037 (D-085)** (`?unlock=all` opens the mouth at once; the parent view's "Open the Cave now" row does too): does he see the big glowing cave mouth on the Grass map (right of Grass 6, above the path) and tap it; does the boulder on the closed mouth make sense and does the rolling-away after Grass 6 delight him; does he understand the green meadow arch at the left end of the Cave map is the way back; is the hop and fade through the dark calm; is the cave readable (all eight robot colours, bubbles and coins on the hills, the crystals and motes not distracting, nothing too dark); is cave-1 a good size (72 tiles, two gaps, five bubbles)?
  - **Task 041 (D-085)** (`?zen=1&cycle=8` to see it fast): in zen with Day / Night on Random the look changes every 1-2 minutes with a 3 s fade; does he notice and like it, is the fade calm, any hitch at the change or at a world swap, do the robot, bubbles and coins stay easy to see in both looks? With Day or Night set it must never change.
  - **Task 036 (D-084)**: after 7 s untouched the robot waves, does three push-ups (a quiet tap each) and then beckons and shimmies with a wink and a "hee-hee" (the ball: squash pulses, a rock and a hop). Do the push-ups and the taunt make him laugh, or confuse him? Is the routine too long or too frequent (5 s rest, then again)? Do the taps and the "hee-hee" sound friendly? Does any touch stop it at once?
  - **Task 019 (D-081)**: are the footsteps too loud or annoying (walk taps and the lighter run patter; Volume setting Low / Medium / High), does the soft thump on landing feel right, is the idle wave (after 7 s without a touch, robot: one arm waves; ball: small bounces) cute and not distracting, does any touch stop it at once.
  - **Task 035 (D-080)** (`?level=bug-1`, `?bugs=0` to compare): does he notice the bug and how does he react (scared, amused, curious); does he try to shoot it; is 3 shots right; does the bump (a gentle slide back, a boing and a tiny "hee") annoy him; does he find that Flash or a car pops it at once; does he like the 5 coins and the first sticker; is the bug easy to see (about a tile wide and slow)?
  - **Task 034 (D-078)** (`?level=flash-1`, `?power=flash`): does he find the yellow bolt orb in Flash Run; is x1.7 (374 px/s) right for him or too fast; do the afterimages and sparks read, is the whoosh pleasant; does he notice that running pops the small bubbles; does the dimmed orb while Mega is on make sense (or does he try to take it); is it fine that a full coin bar ends the other powers?
  - **Task 033 (D-076)**: early levels show no coin bar; late levels fill once; zen Mega Robo is rarer (50, 50, 50, 75...); parent page 2 Zen time row (default 30 min a day): does the night screen feel calm, does the Zen moon button make sense to him.
  - **Tasks 028-032 (D-071..D-075)**: rocket boots fly by themselves (Left = up, Right = down, 12 s): is it smooth for him, is 250 px/s too fast, does he understand he lands by himself? Do the time bars (top middle) make sense to him? Zen double power-ups (car + rocket = flying car): fun or confusing? Coin bar under the counter: does he notice it fills? Mega Robo (1.7x, 12 s, pops bubbles by walking, steps over small gaps): does he love it, is it too big or too fast, do the footsteps and screen shake feel good or scary? Stickers: does he notice the pop-up, find the sticker book button (map, left of Zen), want to collect them? Parent page 2: Volume row works, the tablet's real loudness at Low / Medium / High.
  - **Tasks 021-027 (D-064..D-070)**: hold-to-run feel; fall buzz on Android (needs a fresh PWA build: close the app fully and reopen once online); zen swap (no empty screens, gaps and stairs); rainbow coins; day / night random (parent page 2); the blaster icon; auto-pause after 150 s and wake lock released (does the screen then sleep by itself?).
  - **Charging pad (014)**: does it still get "is it Mario?"; does he understand the pad is the end; does he enjoy the charge effect (beam, rings, bolts); is the pad easy to spot from far away; is the rainbow bubble now easy to spot; does the hex-nut coin still read as a coin? The charge sound is just the existing win chime.
  - **Replay variety (012)** (`?level=grass-4&variety=1&demo=0` forces it; `&seed=1` always gives a rainbow bubble in Grass 4 and 6): does a replay feel different to him? Does he notice and enjoy the rainbow bubble (about 1 in 3
    replays of Grass 4 and 6; 8 coins, rising chime, coloured rings; the chime is not yet heard by ear)? Does any level feel unfair, too empty or too crowded after shuffling (coins and small bubbles only; arcs, gaps, big and high bubbles stay)?
  - **Practice (011)** (`?practice=walk-shoot` etc. jump straight in): does he find the teal Practice button and understand the four cards? Does he make combos (an arrow held while
    tapping the star or the up arrow)? Does the ghost hand help? Is walk assist needed (parent view, Sticky)? Is a run (about 35 s) too long or short? Does he enjoy the star row and celebration?
    Are the combo sounds pleasant? Does a new layout on each Replay keep it fresh?
  - **Parent view (010)** (`?parent=1`): can you open it (grey gear, hold 3 s), does a quick tap or mashing do nothing? Does the button-size preview match the real buttons? Which size and main button
    (Jump or Power) is best for his thumb? Do settings survive closing the app and an offline start? Does Reset keep colour and settings?
  - **Grass 6 (009)** (`?level=grass-6`, `?buttons=power`): can his thumb reach both Jump and Power, and which layout is better? Does he shoot in the air (the three high bonus bubbles)? Does four buttons overwhelm him?
    Is 80 tiles too long?
  - **Grass 5 (008)** (`?level=grass-5`): does he stop at gap edges or jump while walking? Do the coin arcs and 2-tile gaps work? Does the float-back confuse him? Is 75 tiles too long?
  - **Grass 4 (007)** (`?level=grass-4`): does he find Power and see it shoots the way the robot faces? Are the pops pleasant? Is the big bubble fun or a block? Is the 0.3 s cooldown right?
  - **Earlier (picker, map, robot view, Grass 1-3):** all worked on the tablet (D-044). Still worth a listen: the eight picker chimes and the win chime.
  - The Input Lab (`?lab=1`) is the quick place to test button size (`?lab=1&buttonScale=1.3`) and shooting.
- Enable GitHub Pages once if not done: repo Settings -> Pages -> Source: "GitHub Actions".

## Device test notes (parent fills in after trying on the tablet)
Format: date, device, what he did, what confused him, what bored him, what he loved.
- 2026-10-28, tablet (Tasks 021-027): he got excited when the robot transformed into a car; with the rocket boots he was excited but tapping Jump to stay up was not smooth for him (led to Task 028: automatic flight with Up / Down buttons), and the idea of double power-ups, a coin bar and a big robot (Tasks 029-030). 2026-10-29: mostly working as expected; asked for rewards (stickers), steps and sound control (Tasks 031-032). Feature freeze declared.
- 2026-10-24, tablet (D-037): compared the looks; liked the robot best and loves its shooting. Bored by auto-run and tap-to-jump (Grass 1 and 2); liked Grass 3 (walking). The running robot faced the
  player, so it looked like it ran backwards (fixed in 005c).
- 2026-10-24 evening, tablet (D-044): Grass 1-4, map and picker all worked; he enjoyed popping the bubbles; after repeated play of the same level he got bored.
- 2026-10-25, tablet (D-049): everything through Grass 6 and the parent view worked; he loves shooting bubbles; holding a navigation button while pressing an action button, and combos in general, are hard
  for him, which led to Combo Practice (Task 011).
- 2026-10-25, tablet (after Task 011): tested the pushed build; everything worked as expected. No details recorded on Practice feel (button discovery, run length, combos).
