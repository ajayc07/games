# Progress

_Last updated: 2026-10-28 (rainbow bubble on every play, big bubble takes 3 shots, D-058)_
Full history, old checklists and every earlier open-question note: `docs/archive/PROGRESS-through-task-011.md`.

## Status
The original plan (Tasks 001-010) and Combo Practice (Task 011) are done. "Robo World" is a generic, original game (no franchise content):
first visit shows an eight-colour robot picker, then the world map (six Grass levels on a winding path, locked dots under clouds,
3 star slots each, teaser signposts for later worlds). Levels: Grass 1 tap to hop, Grass 2 big Jump button, Grass 3 Left and Right,
Grass 4 Power (pop bubbles into coins), Grass 5 walk and jump over gaps, Grass 6 all four buttons. A teal Practice button
(bottom-right of the map) opens four icon cards (walk + shoot, jump + shoot, walk + jump, everything): generated 120-tile levels,
combos fill a row of five stars, a ghost hand coaches, nothing is saved. A grey gear (top-left, held 3 s) opens the parent view
(sound, button size with preview, main button, look, unlock all, show demos again, reset progress, walk assist in Practice, full screen where the browser supports it).
Test hooks: `?level=`, `?lab=1`, `?picker=1`, `?color=`, `?look=`, `?size=`, `?buttonScale=`, `?buttons=power`, `?unlock=all`,
`?demo=0|1`, `?variety=0|1`, `?rainbow=1` (forces one rainbow bubble on a varied run), `?sound=0|1`, `?parent=1`, `?practice=<mode>|1`, `?zen=1`, `?seed=`, `?assist=sticky`, `?fullscreen=0|1`, `?debug=1` (+ `&open=N`).
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
| 019 | Polish bundle (footsteps, landing thump, idle wave), not drafted | Optional |
| 020 | Zen free play: endless level with every button and power-up, a Zen button on the map (D-063) | Done (uncommitted until the parent commits) |
| post-plan (nothing starts without the parent's say-so) | Tablet test of Grass 5-6, parent view and Practice (basic pass worked 2026-10-25); unique per-colour traits, surprise map dot, polish bundle (Task 019: footsteps, landing thump, idle wave), left/right target mode, gentle auto-difficulty, weather skins (docs/IDEAS.md); git-history rewrite; more worlds (Cave, Sky, Castle) | Open |

## Pending for next session
1. Task 014 (charging pad, hex-nut coin, rainbow rim) is done and pushed (D-056). Task 014b (bigger pad with a light column, `?rainbow=1` proof) is done and pushed (D-057). The planned work is complete.
   Optional next: Task 019 polish bundle (footsteps, landing thump, idle wave), not drafted. Variety plan in order (D-059): blocks and pads (done), night world (done), car power-up (done, D-061), magnet and rocket boots (done, D-062).
   Parent housekeeping: stop the Vite dev server still running on port 5173 (D-054, D-056).
2. Real-device checks: the charging pad (findable in Grass 6, still called "Mario"?), the rainbow bubble, Task 012 replay variety, Task 013 fullscreen.
3. Real-device checks for Task 015 (D-059): can he climb the blocks (stairs at 20-21 need a 2-tile climb), does the pad launch feel fun, do the pad coins get collected. Also, not unit-tested: Grass 7 has no demo and no bot run (the bot knows no blocks or pads).
4. Real-device checks for Task 016 (D-060): is the night level too dark or the headlamp too busy, do bubbles read on the pale hills, do all eight colour options stay visible.
5. Real-device checks for Task 017 (D-061): does he notice the orb, is 10 s as a car right, is x1.25 speed fun or too fast, does the change back confuse him.
6. Real-device checks for Task 018 (D-062): is the magnet ring noticed (it is faint), is the boots jump fun or too floaty, can he reach the high coins in Rocket Boots.
7. Real-device checks for Task 020 (D-063): does he find the purple infinity button, does he stay with zen (how long), is a power-up about every 60-70 tiles too busy or too quiet, does a big bubble in the path frustrate him, does the world ever look wrong at a swap (it should not).
8. Real-device checks for D-058: the rainbow bubble now on every play of Grass 4 and 6; the big bubble's 3 hits (feel of the shrink sizes `BUBBLE.bigScales`, sound). Star thresholds not retuned for the +5 rainbow coins; optional idea: a coin or two per big-bubble hit.

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
- 2026-10-24, tablet (D-037): compared the looks; liked the robot best and loves its shooting. Bored by auto-run and tap-to-jump (Grass 1 and 2); liked Grass 3 (walking). The running robot faced the
  player, so it looked like it ran backwards (fixed in 005c).
- 2026-10-24 evening, tablet (D-044): Grass 1-4, map and picker all worked; he enjoyed popping the bubbles; after repeated play of the same level he got bored.
- 2026-10-25, tablet (D-049): everything through Grass 6 and the parent view worked; he loves shooting bubbles; holding a navigation button while pressing an action button, and combos in general, are hard
  for him, which led to Combo Practice (Task 011).
- 2026-10-25, tablet (after Task 011): tested the pushed build; everything worked as expected. No details recorded on Practice feel (button discovery, run length, combos).
