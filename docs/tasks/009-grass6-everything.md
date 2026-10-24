# Task 009: Grass 6 "Everything" (Left, Right, Jump and Power together)

Run after Task 008. Design context: D-001 (control ladder), D-019 (falling is never a failure), D-029 (walking), D-041 (Power and bubbles), D-043 (this level), D-045 (physics facts and pacing). This is the last level of the control ladder: he already knows every button; here they all exist at once. Nothing may require two actions at the same instant, but shooting while jumping and jumping while walking both work.

## Goal
A sixth Grass level, "Everything", with Left, Right, Jump and Power on screen at once: walk, jump gaps, pop bubbles, including a few high bubbles that can only be reached by shooting from the air. It appears on the map as the sixth dot. The four-button layout must be easy for a 3-year-old's thumbs.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-001, D-002, D-015, D-019, D-029, D-030, D-041, D-043, D-045), docs/ARCHITECTURE.md (Levels, Walking, Shooting/bubbles, "Watch me" demo, Map, TouchControls)
- Existing: `core/ui/TouchControls.ts` (it already places Power above Jump when both are enabled; this has never been used or reviewed), `core/levels/{shots,Blaster,bubbles,BubbleField,LevelScene,demo}.ts`, `universes/robo/levels/{grass-4,grass-5}.json`, `core/map/mapLayout.ts`, `universes/robo/worlds.ts`.

## In scope

### 1. Four-button layout (the main design work)
- Left and Right stay bottom-left as in Grass 3-5. Jump and Power both live bottom-right, so one thumb can reach both. Replace the "Power above Jump" placement with a layout that works at all five sizes (844x390, 1280x800, 1024x768, 1366x512, 2400x1000): the two right-hand buttons side by side or in a gentle arc, similar size, each at least 0.20 of the screen's short edge in diameter (so at least about 78 px at 844x390; larger when there is room), at least 24 px between their edges, both inside the device insets, neither overlapping Left/Right or the exit icon.
- Hit testing: a touch goes to the button whose centre is nearest within its slop; the slop must not make two right-hand buttons ambiguous. A thumb sliding from Jump to Power (and back) switches buttons without lifting (D-015). Pressing Jump and Power together with two fingers works.
- Which button is bigger/closer to the thumb is a guess until the tablet: add a debug and parent-test override `?buttons=jump|power` (default `jump`) that makes that button the larger, lower-right-most one and the other the smaller neighbour. Report both layouts in screenshots. (The parent view, Task 010, may expose this later; do not build UI for it now.)
- `invite` pulses: Jump and Power take turns (as Left and Right do) until each has been pressed once; the nudge on a missed tap goes to the nearest visible button. Left and Right behave as before. Pulses must not make four buttons flash at once.
- Document the layout rules and the size table in ARCHITECTURE.

### 2. Level `grass-6.json` ("Everything")
- `autoRun: false`, `enabled: ["left", "right", "jump", "power"]`, about 85 tiles, walk speed as Grass 3-5. Gaps only of 1 or 2 tiles (D-045): five gaps, 1, 2, 1, 2, 2, with at least 7 tiles of solid ground between them (D-045: shorter than Grass 5's 8 to improve pacing; keep every gap crossable from a standing start at its edge, as the Grass 5 test does).
- Opening stretch (about 14 tiles, no gap): 3 small bubbles ahead at reachable height and 1 behind the start, so he is shooting before he has to jump.
- Then alternate: a gap with a coin arc, a stretch with 2-3 small bubbles. 12-14 small bubbles in total at reachable height (same placement rule as Grass 4: half a tile below cell centre).
- 3 optional HIGH bubbles (about 2.5 tiles above the ground) over safe ground, worth 4 coins each, reachable only by shooting while in the air near the top of a jump. Check by bot that a shot fired at a jump's peak reaches them for every colour option and both looks, and that a standing shot passes under them. They are bonus (3 stars never requires all of them: pick thresholds so two stars need about half of the coins, three about 80%).
- One big bubble blocker (as in Grass 4) on a long safe stretch (at least 3 tiles from any gap edge on both sides), placed at about 60% of the level.
- Coins: bubbles plus gap arcs plus 3-4 ground coins left of the start. Report the total and the star thresholds.
- No enemies, nothing moving toward the player. Falls follow D-019 and the Task 008 fix. Popped bubbles stay popped after a float-back (report if the code does otherwise).
- Demo (script form): shoot a bubble ahead, walk to the first gap, jump it, shoot again; about 9-10 s; show both Power and Jump presses with the finger and button animation. Plays once per session; `?demo=0|1` as before. Check that the demo finger can reach both right-hand buttons in the new layout.
- Add `grass-6` to the Grass world and the levels index. With `openAtATime` 3, Grass 6 (index 5) opens when three levels are cleared; check on the map. Do not add star gating (`finalLevelStarsRequired`); leave it for later.

### 3. Combination safety checks (fix only if broken; report either way)
- Shooting while airborne: the `shoot` clip blends with the jump/fall pose without glitches for both looks (animation numbers are out of scope; report anything ugly instead of tuning it).
- Holding Right plus mashing Power, holding Right plus mashing Jump, mashing all four buttons: no stuck states, no more than 3 shots in flight, no errors, and falling never loops in a way he cannot leave by pressing Jump.
- A shot fired as the player lands, or as he floats back after a fall, behaves sensibly.
- Slide a thumb across Right -> Jump -> Power and back on touch: no stuck-down buttons.

### 4. Map
- Six dots plus teasers; check `mapLayout` at 844x390, 1280x800, 1024x768 and 2400x1000 (dots, clouds and avatar fully visible; scrolling sensible; targets at least 96 px, dots 150 px). Fresh state: dots 1-3 open, 4-6 under clouds. Next from Grass 5 goes to Grass 6 only when it is open. Task 006 progress for Grass 1-5 untouched.

### 5. Docs and tests
- Unit tests: `grass-6.json` loads and validates; every gap 1 or 2 tiles and every safe stretch at least 7 tiles; the big bubble sits at least 3 tiles from every gap edge; high-bubble reachability (a shot from the jump peak hits, a standing shot misses) for several options; button layout geometry (sizes, gaps, no overlaps, inside insets) at the five sizes; nearest-button hit rule; coin/star sanity. Any new pure code gets tests.
- ARCHITECTURE.md (layout, level, high bubbles, `?buttons=`), PROGRESS.md (Task 009 done, Next 010 parent view; open issues; tablet checklist: can he reach both right-hand buttons, which layout is better (`?buttons=jump` vs `?buttons=power`), does he shoot in the air, does he get overwhelmed by four buttons, is the level too long or too short, are the high bubbles fun or frustrating). Fill in this file's Result.
- One commit: `task-009: grass 6 everything`. No attribution lines (D-016). Do not push. Include any uncommitted architect doc edits in the commit.

## Out of scope
Enemies, moving or flying bubbles, aiming up or down, new bubble types, gaps wider than 2 tiles, steps or ledges, double jump, star gating of Grass 6, a "world complete" celebration, the parent view, new worlds, new runtime dependencies, changes to physics numbers or hit boxes (report if a number looks wrong), changes to the robot's animation clips.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; the banned-names test still passes.
- `?level=grass-6` loads with four buttons; no overlaps at the five sizes with both `?buttons=jump` and `?buttons=power`; every button diameter and spacing meets the rules above (assert in tests and show in screenshots saved to `_sources/review/009/`, not committed).
- Bot runs (headless): an all-actions scripted bot (walk, shoot bubbles, jump each gap) finishes with every coin and 3 stars; a bot that skips all small bubbles but pops the big one and jumps the gaps finishes with 1-2 stars; a bot that only holds Right and mashes Power falls at the first gap, floats back, and the level does not soft-lock; random mashing (about 1.5 presses per second per button) finishes and never gets stuck (report median and longest; target a median clearly below Grass 5's 131 s).
- High bubbles reachable from a jump peak, not from standing, for every option and both looks.
- The demo plays once, shows both Power and Jump presses with finger and button animation, ends cleanly; a tap after 1.5 s skips it.
- Map: six dots at all four sizes, fresh and cleared states; Grass 6 opens after three levels are cleared with the normal unlock animation.
- 58+ fps where measurable (report the headless baseline; Task 008 measured 53.2 blank and 57.4 mashing on a busy machine), including a run mashing all four buttons; no console errors.

## How to verify
Playwright with touch (multi-touch and sliding) and keyboard plus `?debug=1`; unit tests; screenshots of Grass 6 at five sizes in both button layouts, a high-bubble shot from the jump peak (4 frames), the demo, the map with six dots (fresh and cleared). List what could not be checked (a real tablet, his thumb reach, pop sounds by ear).

## Result (Code fills in at the end)
- What changed: Grass 6 "Everything" (`grass-6.json`, 80 tiles) as the sixth Grass dot, with all four buttons. New pure module
  `core/ui/buttonLayout.ts` decides where the buttons go and which one a touch hits; `TouchControls` now uses it (the layouts of
  Grass 1-5 are unchanged, tested). Four buttons: Left and Right bottom-left as before; Jump and Power side by side bottom-right,
  the primary in the corner (0.26 of the short edge) and the other beside it (0.22), 48 logical px apart (26 px at 844x390), the
  second one lifted 0.3 of its radius in a gentle arc; their enlarged hit circles never overlap. `?buttons=jump|power` (default
  jump) picks the primary. Invite pulses: Left/Right take turns and Jump/Power take turns, so at most two buttons pulse together.
  Level: five gaps (1, 2, 1, 2, 2 tiles; at columns 20, 28-29, 37, 58-59, 67-68; 7 or more tiles of ground between and after), a 14-tile
  opening (1 bubble behind the start, 3 ahead, 3 coins to the left), 13 small bubbles, one big blocker at 60% (columns 48-49, 8-10
  tiles from the nearest gaps), 3 high bubbles over safe ground, 18 gap-arc coins; 78 coins in all; stars 38/62; demo about 10 s with
  4 Power presses and 1 Jump. New grid letter `h`: a high bubble (small picture, 4 coins, raised a quarter tile above its cell).
  Tests: layout geometry in both orders at the five sizes (sizes, gaps, insets, no overlaps, hit circles), the nearest-button rule and
  sliding, the Grass 6 rules (gaps, stretches, big-bubble distance, bubble counts, coins, stars, demo), high-bubble reach from the jump
  peak vs standing, unlock chain to six dots, the map with up to six levels.
- Files touched: src/core/ui/{buttonLayout.ts, buttonLayout.test.ts (new), TouchControls.ts}, src/core/levels/{format, grid, bubbles,
  shots, LevelScene}.ts and shots.test.ts, src/core/map/map.test.ts, src/universes/robo/{worlds.ts, levels/grass-6.json (new),
  levels/levels.test.ts, levels/README.md}, docs/{ARCHITECTURE,PROGRESS}.md, this file; plus the architect's uncommitted
  docs/{DECISIONS,ARCHITECT_HANDOFF,IDEAS}.md edits. (`.claude/launch.json`, a dev-server config that is not part of this task, is left
  uncommitted.)
- Deviations from plan (and why):
  1. A new grid letter `h` for the high bubbles. The task asks for bubbles worth 4 coins at a different height and also lists "new
     bubble types" as out of scope; I treated `h` as a variant of the small bubble (same picture and behaviour, 4 coins, no drop) rather
     than a new type. Easy to remove if the architect disagrees.
  2. High bubbles sit 2.75 tiles up (a quarter tile above the 2.5-tile row), not 2.5. Measured shot heights: standing 32-49 px, jump
     peak 177-205 px (both looks, 8 options, size 1). At exactly 160 px the purple robot was 1 px from missing at the peak; at 176 px
     every option and both looks pop it from the top half of a jump, and none from standing (also not at `?size=1.6`).
  3. The flag is at column 76 (not 75) so that 7 tiles of ground follow the last gap.
  4. With four buttons, a `?buttonScale` above about 1.2 is reduced at 960 logical width so the two clusters cannot meet.
  5. Sizes: the primary right-hand button is 0.26, the other 0.22 (both over the 0.20 minimum). Left and Right keep 0.18; the 0.20
     rule applies to the two right-hand buttons.
  6. Random mashing misses the pacing target (see Open issues): reported, not tuned.
- How verified: `npm run typecheck && npm test && npm run build` pass (260 tests, banned-names test included). Playwright (headless
  Chrome, keyboard and CDP touch, `?debug=1`):
  - Layout: `?buttons=jump` and `?buttons=power` at 844x390, 1280x800, 1024x768, 1366x512, 2400x1000: four buttons, the two right-hand
    ones 86-102 px across physically at 844x390 (right radius 94 and 79 logical), 26-67 px apart, no overlaps, all inside the screen.
  - Bots: the all-actions bot (walk, shoot, jump each gap, jump-and-shoot at each high bubble, shoot left first) finishes with 78/78
    coins, 3 stars, 0 falls (13 small, 3 high, 1 big popped). The bot that skips all small bubbles and pops only the big one finishes
    with 24 coins and 1 star. Right held + Power mashed: 6 falls in 20 s, never past the first gap, at most 3 shots in flight, and a
    Jump at the edge still crosses afterwards.
  - High bubbles: for both looks and all 8 options, a shot from the top of a jump pops the high bubble and a standing shot passes under
    (16 of 16).
  - Combinations: Right + Power held with Jump mashed; Right held with Power mashed; all four mashed together for 5 s; Power mashed
    during the float-back and landing: at most 3 shots in flight each time, back to play, no shot pictures left behind, no console errors.
  - Touch: a thumb sliding Right > Jump > Power > Jump > Right shows each button down alone in left-to-right order (crossing Power
    between Right and Jump), nothing stuck after lifting; two fingers press Jump + Power together; Right + Power with two fingers works.
  - Air shots: frames for both looks (`air-shot-*-sheet.png`): the robot's cannon arm and the ball's open mouth blend with the jump pose
    without glitches.
  - Demo (both layouts): the ghost jumps once and fires 4 times, the finger reaches both buttons, it ends cleanly in about 10 s with all
    bubbles back and 0 coins, does not repeat in the session, and a tap after 1.5 s skips it.
  - Map: six dots at 844x390, 1280x800, 1024x768 and 2400x1000 with 4-6 under clouds on a fresh start and teasers reachable at the scroll
    end; after three clears Grass 6 opens with its cloud lifting; Next from Grass 5 is hidden with only Grass 5 cleared and goes to Grass 6
    when three are cleared; earlier progress is never lowered; all six cleared shows correctly.
  - Random bots (real time, headless): right-leaning masher (Right 2.5/s, Jump 1.5/s, Power 1.5/s, Left 0.5/s, presses held 150-500 ms),
    5 runs, all finished, median 126 s, longest 161 s, 7-18 falls, never stuck, no errors. Unbiased masher (all four 1.5/s): a random
    walk, x 937 of 5120 after 120 s.
  - fps (844x390): blank page 51.8, map 58.4, Grass 6 mashing all four buttons about 20 times a second for 10 s: average 58.0, lowest 53.8.
  Screenshots in `_sources/review/009/` (five sizes in both layouts, air shots for both looks, demo with the finger on Jump and on Power in
  both layouts, the map fresh, at the end, unlocking and cleared).
- Open issues / risks: random-mashing time is not clearly below Grass 5's (126 s against 131 s; the 80 tiles and the bubbles cost back what
  the 7-tile stretches and one gap fewer save); a child who walks on purpose needs about 22 s of walking plus the jumps. Levers: shorten the
  20-tile middle stretch or drop a gap (about 5 s per fall for a masher). Sliding from Right to Jump crosses Power (one harmless shot).
  Bottom-row bubbles near a screen edge can sit behind the buttons. The blank-page frame rate was 52 fps today, so 58+ could not be shown as an
  absolute; Grass 6 averaged 58.0 even while mashing four buttons. Not checked on a real tablet (his thumb reach, which layout is better, the
  pop sounds by ear).
- Suggested next: Task 010 (parent view: sound, button size, unlock-all, reset; it may expose `?buttons=`), after a tablet session with Grass 5
  and 6.
