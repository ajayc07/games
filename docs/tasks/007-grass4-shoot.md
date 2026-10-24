# Task 007: Grass 4 "Shoot" (the Power button as gameplay)

Run after Task 006 (map and saved progress). Design is fixed in D-041; read it first. Athiran loves the robot's shooting (D-037); this level turns it into a game: friendly bubbles pop into coins. No enemies, nothing harmful, no failure.

## Goal
A fourth Grass level, "Shoot", where the new control is the Power button. Walking with Left/Right as in Grass 3, pressing Power fires a soft energy ball that pops friendly bubbles into coins. One big bubble blocks the path and must be popped to reach the flag. It appears on the map as the fourth dot.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-001, D-002, D-015, D-029, D-030, D-037, D-040, D-041), docs/ARCHITECTURE.md (Levels, "Watch me" demo, Avatar looks "Shooting", Walking, Map)
- Existing: the Input Lab's shooting code (`universes/robo/scenes/InputLabScene.ts`, the avatar `muzzle()` and `shoot` event), `core/levels/{format,grid,LevelScene,demo,physics}.ts`, `core/input/*` (TouchControls), `core/audio/recipes.ts` (`power`), `universes/robo/levels/grass-3.json`, `universes/robo/worlds.ts`, `core/map/mapLayout.ts`.

## In scope

### 1. Level format and Power input
- Legend: `o` small bubble, `O` big bubble (see below). Both are non-solid for the player except the big one (see 3). Update `format.ts` (`parseLevel` errors with position, tests), `grid.ts` (`extractEntities` returns bubbles), ARCHITECTURE (format, legend).
- `controls.enabled` may include `power`. TouchControls shows a Power button only when enabled: bottom-right in Jump's slot, same size rule as Jump when it is the only right-hand button (about 0.28 of the screen height), in a colour clearly different from Jump and Left/Right, with a simple star or blast icon (match the Input Lab's star button). `invite` pulse until first press; the existing nudge on a missed tap goes to the nearest visible button. Keyboard (X/Z/Shift) and gamepad already map to `power`.
- Demo script format (D-030) accepts `"action": "power"` (a single press, no `hold`). Validation: `power` must be in `controls.enabled`; `hold` on power is an error. The finger icon and the button press animation work for it. Tests.

### 2. Shooting (core, not universe-specific)
- A small pure, unit-tested module (e.g. `core/levels/shots.ts`): cooldown (about 300 ms; holding Power repeats at that rate), max 3 in flight, speed about 700 px/s, range about 640 px, direction = the avatar's facing at the moment of firing, start at the avatar's `muzzle()`. All numbers in one tuning object (`SHOT`), also used by the Input Lab so the Lab and the level never drift apart (refactor the Lab to share the code; its behaviour may only change by gaining the cooldown and cap).
- The avatar plays its existing `shoot` clip on each shot; works with both looks (robot and ball). The shot is drawn in the avatar's accent colour as a soft glowing orb with a short fading trail, round and friendly. It passes through coins. Sound: the existing `power` synth.
- A shot that hits nothing fades out softly at the end of its range.

### 3. Bubbles
- Drawn in code: translucent soft-blue/white bubbles with a highlight, gently bobbing (a few px, slow, each with its own phase), no faces. Small `o` about 1 tile across, big `O` 2 tiles wide and 2 tall. Sit at a height a horizontal shot from standing can reach: muzzle height plus or minus about 1 tile.
- Hit test: circle vs circle with the bubble radius times 1.3 (generous). One hit pops a bubble. A shot is consumed by the bubble it pops.
- Pop: a quick scale-up and fade, a ring of sparkles, a soft new `pop` sound (add a synth recipe, short, gentle, pitched up a little for each pop within a second so a run of pops sounds musical, capped). Then the bubble's coins appear (small 3, big 6) in a little arc and are collected automatically after about 400 ms (they fly to the avatar or the coin counter; no need to walk to them). Coins count for stars and `bestCoins` like any other coin, with the normal coin sound but throttled so 6 coins do not become a wall of sound.
- The big bubble is a soft blocker: while unpopped it is solid for the player (the walk code stops at it using the same soft stop as the level-end walls, not a hard bump). Popping it removes the blocker. It cannot be jumped over (Jump is disabled in this level; the blocker is tall enough anyway).
- Bubbles never move toward the player, never block a camera view of the flag, never harm. Respawn/fall logic is unchanged (this level has no gaps).

### 4. Level `grass-4.json` ("Shoot")
- `autoRun: false`, `enabled: ["left", "right", "power"]`, about 80 tiles wide, walk speed as Grass 3. Flat ground, no gaps.
- Layout: start with 2 small bubbles close ahead and 1 behind (left of start), so he learns that Power shoots where he faces and that turning round works; then a calm stretch with about 8 more small bubbles spaced 5-9 tiles apart at slightly different heights (all within reach); the big bubble about 60% along; a short stretch with a final few small bubbles; flag at the end. About 10-12 small bubbles plus the big one, so about 36-42 coins. Stars thresholds around 22 / 34 (tune so 3 stars need most bubbles but not all).
- Demo (script form): walk right a little, press Power once so a shot pops the first bubble, keep walking, press Power again. About 6-8 s. Plays once per session like the others; `?demo=0|1` as before.
- Add `grass-4` to the Grass world in `worlds.ts` and to the levels index. `openAtATime` 3 stays: Grass 4 is under a cloud on a fresh start and opens when Grass 1 is cleared.
- `?level=grass-4` works; Next from Grass 3 goes to Grass 4 only when it is open (existing rule).

### 5. Map and housekeeping
- The map shows four dots; check `mapLayout` for four levels plus teasers at 844x390, 1280x800, 1024x768 and 2400x1000 (dots, clouds and the avatar fully visible; scrolling sensible). Fresh state: dots 1-3 open, dot 4 under a cloud.
- Housekeeping (D-040): stop the stepping stones and signpost posts showing through the clouds over the teasers (draw order, or an opaque cloud body).

### 6. Docs and tests
- Unit tests: shots (cooldown, hold repeat, cap, range, direction from facing), bubble hit test, level parser for `o`/`O`, demo validation for `power`, coin accounting for a pop, and `grass-4.json` loads and validates (existing levels test pattern).
- ARCHITECTURE.md (format, shots, bubbles, Power button, demo `power`, map with four levels), PROGRESS.md (Task 007 done, Next 008; move D-041 items; open issues; a tablet checklist: does he find the Power button, does he understand that it shoots where he faces, does he like popping, is the big bubble a problem or fun, is the cooldown too slow or too fast, are the pop sounds pleasant). Fill in this file's Result.
- One commit: `task-007: grass 4 shoot`. No attribution lines (D-016). Do not push. If `docs/DECISIONS.md` or other docs have uncommitted architect edits, include them in the commit.

## Out of scope
Enemies or anything moving toward the player, moving or flying bubbles, aiming up or down, Jump in this level, shooting at coins or blocks, power-ups, the parent view, music, new worlds, new runtime dependencies, changes to physics numbers, hit boxes or the robot's animation clips.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; the banned-names test still passes.
- Grass 4 loads with `?level=grass-4`; Left, Right and Power are the only buttons; Power is bottom-right in its own colour and pulses until first pressed; no overlap with Left/Right at 844x390, 1280x800, 1024x768, 1366x512, 2400x1000 (screenshots in `_sources/review/007/`, not committed).
- Pressing Power fires toward the facing; holding repeats at the cooldown; mashing 20 presses per second never exceeds 3 shots in flight and never errors; shots fade at range.
- A shot pops a bubble it touches; coins appear and are collected automatically; the coin total matches the level's coins (bot test: shoot everything, then check coins and 3 stars; shoot nothing but the big bubble, check the flag is reachable and the level finishes with 1-2 stars).
- The big bubble blocks until popped and does not trap the player (the soft stop behaves like the level-end wall; walking left away from it works).
- Both avatar looks shoot; all 8 colour options fire in their accent colour.
- The demo plays once, shows a Power press with the finger and button animation, and ends cleanly; a tap skips it after 1.5 s.
- Map: four dots at all four sizes, Grass 4 under a cloud on a fresh start, opens after clearing Grass 1 with the normal unlock animation; progress for Grass 1-3 from Task 006 is untouched; teaser posts no longer show through the clouds.
- The Input Lab still works and uses the shared shot code.
- 58+ fps where measurable (report the headless baseline too; 006 measured 60.2 blank, 59.9 map), including a mash-Power run with bubbles popping; no console errors.

## How to verify
Playwright with touch and keyboard plus `?debug=1` (extend the test hook with shots, bubbles and coins); unit tests; screenshots of Grass 4 at five sizes, a pop sequence (4-6 frames), the demo, the big bubble blocker, the map with four dots (fresh and cleared). List what could not be checked (the pop sound by ear, a real tablet).

## Result (Code fills in at the end)
- What changed: Grass 4 "Shoot" (80 tiles, Left/Right/Power, 11 small bubbles and one big one, 39 coins, stars 22/34, a 7 s
  script demo with three Power presses) as the fourth Grass dot. Level format: `o` small bubble, `O` big bubble (whole 2x2 blocks,
  errors with position); demo scripts accept `power` (single press, no `hold`, must be enabled). Shooting: pure `shots.ts`
  (`SHOT`: cooldown 300 ms, hold repeats, a 300 ms press buffer, at most 3 in flight, 700 px/s, range 640, 40 ms spawn delay,
  direction = facing at the press, start at `muzzle()`), Phaser `Blaster.ts` (accent-colour orb with halo and fading trail, soft
  fade at range, puff on hit, `shoot` clip, `power` sound) shared by the levels and the Input Lab. Bubbles: pure `bubbles.ts`
  (geometry, bob, generous hit test x1.3, big-bubble soft walls, coin arc, `CoinFlow`, `PopPitch`) and `BubbleField.ts`
  (code-drawn translucent bubbles, pop with ring and sparkles, coins that fly to the player and count on arrival, throttled coin
  sound). New `pop-0..5` synth sounds (pentatonic, rising for quick pops, capped). The big bubble stops the player with the
  level-end soft stop (`Player.step` takes extra `walls`). Power button in Jump's slot at the solo size (0.28) when there is no
  Jump. Invite pulses include Power. Map: four dots; teaser clouds opaque. Docs, tests (26 new), the green shot gets the light rim.
- Files touched: src/core/levels/{format,grid,demo,Player,LevelScene,README}.ts/md, src/core/levels/{shots,Blaster,bubbles,
  BubbleField}.ts and shots.test.ts (new), demoScript.test.ts, src/core/ui/TouchControls.ts, src/core/audio/{recipes,AudioManager}.ts,
  src/core/avatar/parts.ts (`shotOrb`; the unused `energyBall` removed), src/core/map/MapScene.ts,
  src/universes/robo/{worlds.ts, scenes/InputLabScene.ts, levels/grass-4.json (new), levels/levels.test.ts, levels/README.md},
  docs/{ARCHITECTURE,PROGRESS}.md, this file; plus the architect's uncommitted docs/DECISIONS.md (D-040, D-041) and
  docs/ARCHITECT_HANDOFF.md edits.
- Deviations from plan (and why):
  1. Small bubbles float half a tile below their cell centre (resting on the ground at the lowest), so the two rows give centres
     30 px and 64 px above the feet. Measured shot heights are 26-78 px (both looks, all colours, `?size=` 0.8-1.6); centred in its
     cell the upper row (96 px) is out of reach for the ball and the small robots. Rule in `BUBBLE.smallDrop`, tested.
  2. A press during the cooldown (or at the 3-shot cap) is buffered for 300 ms, so mashing never loses a shot it could fire. Holding
     with the cap gives 3 shots 300 ms apart, then the 4th about 70 ms late.
  3. Shot hit radius 14 (core 10, glow 20) to keep every option in reach of both bubble heights with the bob.
  4. Demo: three presses (two ahead, one behind the start, so turning round is shown) and a final short walk right so the last pop's
     coins land before the demo ends; the demo's popped bubbles grow back. The finger stays on a tapped Jump/Power button for
     350 ms before gliding on (also affects Grass 3's demo finger, a small improvement).
  5. The bubble behind the start is in the upper row so it is not hidden behind the Left/Right buttons.
  6. Coins from a pop fly to the robot (not the HUD); the HUD counter bumps on arrival.
  7. The big bubble's 6 coins use a wider arc; the green option's shot gets the hill rim (like its accent parts).
- How verified: `npm run typecheck && npm test && npm run build` pass (231 tests, banned-names test included). Playwright (headless
  Chrome, touch + keyboard, `?debug=1` hook extended with shots, bubbles, coins): shoot-everything bot = 12 pops, 39/39 coins, 3 stars,
  nothing left flying; big-bubble-only bot = 6 coins, 1 star, flag reached; the big bubble stops the walk softly at its wall (x 3051.9
  vs 3052, vx 0.5) and walking left away works; mashing Power about 14 taps/s while walking for 6 s at 844x390: at most 3 in flight,
  no errors, shot pictures all gone afterwards; holding 1 s fires 4; both looks x 8 colours fire and pop; buttons Left/Right/Power
  only, Power r 101 bottom-right, no overlap at 844x390, 1280x800, 1024x768, 1366x512, 2400x1000; invites stop after the presses;
  demo fires, ends with 0 coins and all bubbles back, a tap after 1.5 s skips it; Input Lab fires through the shared code. Map: 4 dots
  at 844x390, 1280x800, 1024x768, 2400x1000, Grass 4 under a cloud on a fresh start, opens (cloud cleared) after clearing Grass 1,
  a 006-style record with Grass 1-3 cleared is kept and Grass 4 open, Next from Grass 3 goes to Grass 4, no Next on Grass 4, best
  results never lowered; teaser clouds no longer show the stones/posts. fps: blank page 60.2, map 59.3, Grass 4 mashing 58.9 average
  (min 57.5). Screenshots in `_sources/review/007/` (five sizes, pop sequence, big pop, blocker, demo, shots per look/colour, map
  fresh/mid/cleared/unlock/teasers, Lab).
- Open issues / risks: not checked by ear (pop and coin sounds) or on a real tablet. Bottom-row bubbles pass behind the Left/Right
  and Power buttons while near a screen edge (far from the robot). Stars 22/34 and the cooldown are first guesses for the tablet.
- Suggested next: Task 008 (Grass 5: move + jump gaps) after a tablet session with Grass 4.
