# Architecture: Walking, levels, demo

Part of the architecture docs; the index is `docs/ARCHITECTURE.md`.

### Walking (D-029, Task 005)
Levels with `autoRun: false` move by holding Left/Right. `walk.ts` (pure, tested): `walkDirection(left, right)` (both = stand),
`rampSpeed` (0 to walk speed in `PHYSICS.walkRampUpMs` 60 ms, back to 0 in `walkRampDownMs` 80 ms; a reversal slows to 0 then
speeds up, no sliding), `edgeLimit` (invisible walls at both grid ends: speed toward a wall fades over the last 24 px, so the player
stops softly; Arcade world bounds stay as a backstop) and `nextFacing` (facing follows the pressed direction at once, at most one
change per 90 ms, so frantic alternating never flickers the picture). Speed: `PHYSICS.walkSpeed` 220 px/s, or the level's `walkSpeed`.
`Player.step(now, { move, jumpPressed }, dtMs)` takes a direction (-1/0/1); `PlayerOptions.ramp` switches the ramp on (walk levels)
or off (auto-run: speed set at once, as before). Air control equals ground control. `Player.halt()` stops at once (flag, respawn).
Stride, lean and blends from Task 004b follow the real speed, so standing has no stride motion; the robot's yaw follows it too.

**Camera:** follows by hand with a look-ahead (player at 36% of the safe area when heading right, 64% when heading left). The
look-ahead only turns round after moving the other way for 350 ms, and the anchor eases slowly, so quick back-and-forth does not swing
the view. A hard clamp keeps the player between 15% and 85% of the safe area.

**Buttons:** Left and Right bottom-left (shared band split at the midpoint), Jump and/or Power bottom-right (see "Input", the
four-button layout of Task 009). Until a button's first press it gets a gentle `invite` pulse every 2.6 s: one hand at a time, Left and
Right taking turns and Jump and Power taking turns, so at most two buttons pulse together and never all four. A tap on no button
gives a `nudge` pulse to the nearest visible button (`TouchControls.nearest`); it never moves or jumps.

## Levels (data-driven)
Levels are plain JSON in `universes/<id>/levels/`, loaded by that folder's `index.ts` with `import.meta.glob`
(adding a level = a data file plus its id in a world's `levels` list). Format v1 (D-018):
```json
{
  "version": 1,
  "id": "grass-1",
  "world": "grass",
  "title": "Tap to hop",
  "controls": { "enabled": ["jump"], "autoRun": true, "tapAnywhereJumps": true, "demo": false },
  // or "demo": { "tiles": 20, "jumpsAtTiles": [8, 15] }
  "tileSize": 64,
  "runSpeed": 200,              // auto-run levels; "walkSpeed": 220 for Left/Right levels (both optional)
  "stars": { "two": 12, "three": 20 },
  "grid": ["....", "S..F", "####"]
}
```
- `grid`: equal-length rows, top row first. Legend: `#` ground, `.` empty, `c` coin, `S` start, `F` goal (the charging pad stands in
  that cell), `o` small bubble, `O` big bubble (a whole 2x2 block of `O`; a broken block is an error naming its first cell),
  `h` high bubble (Task 009: the small picture, 4 coins, centred in its cell and raised a quarter tile, never solid),
  `r` rainbow bubble (Task 012: added to every play by `withRainbowBubble`, never written in the JSON),
  `B` step block (Task 015: a solid one-tile toy block, stacked at most 2 high, drawn as its own orange block, not as ground),
  `^` bounce pad (Task 015: a low pink springy plate on the ground, not solid; stepping on it launches him).
  Gaps are missing ground. Bubbles are not ground. New tile kinds get new legend entries in `core/levels/format.ts`.
- **Vertical placement:** the grid's bottom row sits on the bottom of the 720-high screen; rows above the top of the grid
  are sky. Grass 1 uses 11 rows of 64 (704 px), so the top 16 px are sky. Grids taller than 720 extend above the screen.
- `controls` is the **control ladder**: `InputManager.configure` follows it, and TouchControls only shows enabled
  actions (none with `tapAnywhereJumps`). `autoRun` runs right at `runSpeed`; otherwise Left/Right move and release stops.
- `practice` (optional, Task 011): `true` marks a generated Combo Practice level (no progress saved, combo stars on the win
  screen); any other non-boolean value is an error. Absent on Grass 1-6.
- `variety` (optional, Task 012): `false` keeps the level's coins and bubbles where they are on replays; absent = they may be shuffled.
- `stars` (D-020): finishing = 1, `two` and `three` are coin thresholds. `runSpeed` is optional (default in physics.ts).
- `demo` (D-024, D-030): `false`, or one of two forms (mixing them is an error):
  - Tile form `{ "tiles": N, "jumpsAtTiles": [..] }` (auto-run levels). Both are grid columns, 0-based from the left edge
    (as read in the grid strings): the ghost runs until its centre reaches column `tiles` and presses Jump on entering each
    `jumpsAtTiles` column. Validation: tiles after the start column and inside the grid; every jump column after the start
    and before `tiles`; unknown fields rejected; jump columns are sorted and deduplicated.
  - Script form `{ "script": [{ "t": 300, "action": "right", "hold": 1500 }, { "t": 3300, "action": "jump" }] }`:
    `t` = ms after the demo starts, `action` = left / right / jump / power, `hold` = ms for Left/Right only (default 600).
    Validation (readable errors with the step number): non-empty array, `t` 0 or more and in time order (equal times allowed),
    known actions that the level enables, `hold` positive and never on jump or power (single presses), unknown fields rejected.

### "Watch me" demo (D-024)
`core/levels/demo.ts` (pure, tested): `createDemo(config, tile)` returns a `DemoRunner` for either form; `step(elapsedMs, x)`
gives `{ move, jump, power, presses, aim, done }`. `DemoScript` = tile form (always moves right). `TimedDemo` = script form: each step
fires once (even if a long frame skips past it), Left/Right stay held for `hold` (both held = stand), the finger `aim`s at the held
button, else the next one, but stays on a just-tapped Jump/Power button for `TAP_LINGER_MS` (350 ms, Task 007); the demo is done 600 ms after the last step finishes, and the scene also waits for the ghost to land, so it never
fades out mid-jump. Also `shouldPlayDemo`, `demoOverrideFrom`.
A `power` step makes the ghost shoot through its own `Blaster`; its pops are shown (coins fly to the ghost) but never counted, and
when the demo ends its shots vanish and every popped bubble grows back (`BubbleField.restore`).
LevelScene modes: `demo` -> `turn` -> `play` (-> `respawn` / `finish` / `result`). In `demo` the real player is hidden
and frozen, a ghost `Player` (alpha 0.55, same `Player` class, physics and walk ramp as real play, collects no coins) moves
as scripted. Each press animates the on-screen button for its hold time (`TouchControls.animatePress(action, ms)`) and a finger
icon presses it, gliding between Left, Right and Jump and staying down while held (`demoFx.ts`); on tap-anywhere levels a ripple
appears at the character instead. The "your turn" pulse goes to the first button the demo pressed. Input is not read during the
demo; a tap or key after 1.5 s skips it. At the end the ghost fades, the camera glides back to the start, then the
"your turn" cue (bouncing arrow over the character, ripples at its feet, a button pulse and the soft `yourTurn` sound)
and the real run starts. Plays once per session per level (static set in LevelScene); `?demo=1` forces, `?demo=0` skips.

### Goal pad (Task 014, D-055)
The stage end is an original robot charging pad, the same on every level and in Practice (grid letter `F`, `LEGEND.F` = "goal"; level JSON untouched).
`core/levels/goal.ts` (pure, tested): `GOAL` numbers (Task 014b sizes: pad 3 tiles wide and 0.45 tall, charger column 0.5 x 1.4 tiles, beacon bulb 0.9 tile across, idle light column 4 tiles tall and 1 wide; `settleMs` 250, `beamMs` 1000, `beamTiles` 3, `ringPulses` 2,
`resultDelayMs` 1100), `columnSize`, `bulbSize`, `padReachCols` (1: the pad covers the `F` column and one column each side), `goalX(cell, tile)` (middle of the `F` column, the same trigger x as the old flag), `padHeight`, `arrivalTotalMs` (settle + 1100, so 250 ms
longer than before). Look, all generated from `theme.goal` colours (`goal-pad`, `goal-ring`, `goal-post`, `goal-beacon` textures, `fx-beam`, `fx-bolt` effects): a chunky slab with a dark raspberry
rim (3:1 against hills and sky, unit-tested, like the beacon outline), a gold top face and rivets, a cyan glowing ring on the top, and at the back a short thick **charger column** (rounded,
light stripe, cyan band, hex-nut emblem; texture key `goal-post`) topped by a big outlined yellow bulb (`goal-beacon`) with a halo. No thin pole anywhere.
Idle: ring and halo pulse softly, the bulb blinks every 1 s (alpha 1 to 0.55), a few sparkles rise slowly, and a faint tall **light column** (`fx-lightcol`, 4 tiles, translucent, breathing every 2.6 s)
rises from the bulb so the goal can be found above the buttons from far away (tweens and one emitter; no per-frame work). Clearance: levels and varied grids keep coins and bubbles at least 2 columns from `F` (tested), so the pad never covers one.
Arrival (`LevelScene.reachGoal` unchanged trigger, then `updateFinish` once grounded): `settleOnPad` eases the body to the pad centre in 250 ms (`body.reset` each tick) while
`Player.lift` raises the picture onto the top face; `chargePad` then plays the option's win chime and the `win` clip (hop), makes the beacon solid, pulses the ring twice, rises a beam
3 tiles for about 1 s, bursts sparkles, flashes the body and throws a few accent-coloured bolts, then confetti; the result screen follows 1100 ms after the charge starts.

### Replay variety (Task 012, D-053)
`core/levels/variety.ts` (pure, seeded with `makeRng`, tested): `varyLevel(level, seed)` returns the level with a shuffled grid; same level and
seed = same grid. Only loose coins and small bubbles move, sideways, along their own ground stretch (between gaps, the start and the flag, so
an item stays on its side of the start); rows never change. Never moved: `S`, `F`, `#`, big `O` and high `h` bubbles, any coin within 2
columns of a gap (`VARIETY.arcReach`, the arcs over gaps), and in tile-demo levels (Grass 1-2) coins within 3 columns of a `jumpsAtTiles`
column. Coins move as rigid clusters (touching coins, so arcs keep their shape). Spacing: a moved item keeps 3 columns from any gap column
(`VARIETY.clear`) and from the start and flag (2 when it has no other place: `tightClear`), no coin touches a bubble or another coin
(diagonals count), no bubble is within 1 tile of another bubble (big-bubble cells included). Counts and kinds are preserved, so `stars`
stay valid. Shots reach a moved bubble because its row is unchanged (D-042 rows). A level can write `"variety": false` to opt out; practice
levels never vary. Over 200 seeds each of Grass 1-6 differs from the written grid in 199-200 of them.
Rainbow (D-058): every play has exactly one, so it is no longer a replay-only surprise. `withRainbowBubble(level, seed = 0)` turns one `o`
into `r` when the level has 4+ small bubbles (Grass 4 and 6; Grass 5 has none) and no `r` yet; `openLevel` applies it to the canonical grid
too (fixed seed 0, so the demo and a first play agree), and `openPractice` applies it with the practice seed. `varyLevel` still picks with
`rainbowPick` (`VARIETY.rainbowChance` = 1). The legend char `r` is never used in the JSON files. See shooting-bubbles.md.
When it applies (`useVariety`, `openLevel` in `universes/robo/manifest.ts`): the first play of a level (no stars yet) is the grid as written (apart from the rainbow bubble, D-058);
any play after a clear, and the win screen's Replay (`onReplay`), gets a fresh random seed kept in memory only (nothing saved, progress
records unchanged). A level whose watch-me demo is about to play (`LevelScene.demoWillPlay`) is always canonical, even with `?variety=1`.
`?variety=1` forces varied, `?variety=0` canonical, `?seed=<n>` fixes the seed (then Replay repeats the same grid). `?debug=1` state has `grid`.

`core/levels/` (all universe-agnostic):
- `format.ts`: types, `parseLevel` (readable errors: row lengths, unknown characters with position, exactly one S/F,
  valid actions, star thresholds), `parseLevelOrThrow`.
- `grid.ts`: `extractEntities` (solid map, coins, bubbles, start, goal), `mergeSolids` (few collision rectangles, no seams),
  `surfaceRow`, `findRespawn` (D-019: nearest standable column at least 3 behind the last grounded column, preferring
  ground on both sides; Task 008: `dir` = the way he was heading, so a fall while walking LEFT over a gap puts him on the
  side he came from, 3 or more columns to the right of where he last stood, and never across the gap; at the right end of
  the level it falls back to the left side), `starsFor`. Pure and unit-tested (`levels.test.ts`).
- `physics.ts`: the one shared tuning file (D-021): run speed 200, walk speed 220 (ramp 60 ms up / 80 ms down), gravity 1800, jump velocity 760 (peak 160 px = 2.5
  tiles, ~2.6 tiles carried at 200 px/s), max fall 1100, coyote 120 ms, jump buffer 150 ms, body 40x84. Fixed jump height.
- `LevelScene.ts`: the generic Phaser scene (Arcade physics). Started with `LevelSceneData { level, theme, option, look?,
  onHome, onNext?, nextAvailable?, onResult?, onPicker? }` from the universe, so core never imports a universe. Player = invisible 40x84 physics zone + a separate
  look (robot or ball, lively motion, see "Avatar looks" above). Camera follows by hand with a look-ahead (see "Walking");
  scenery ground extends past both level ends.
  Falls: whoosh, a cloud carries the player to the respawn spot, facing the gap he fell into (his facing at the fall). Goal: see "Goal pad" below.
  `?debug=1` exposes `window.__level` (state, scene, input, layout, audio) for tests.
- `theme.ts`: `LevelTheme` = colours for sky, hills, clouds, ground, coin, goal (pad: rim, top, ring, glow, beacon, beaconRim, post) plus optional image files per texture
  (`ground-top`, `ground-fill`, `coin`, `goal-pad`, `goal-ring`, `goal-post`, `goal-beacon`, `hills-far`, `hills-near`, `cloud`).
- `placeholders.ts`: generates the theme textures (and effect/capsule textures) at 2x resolution for any texture without
  a file. Real art: drop the file into the universe assets; the Grass theme already looks up `grass-ground-top.png` etc.
- `background.ts`: parallax sky gradient, wrapping clouds and two tiling hill strips, all screen-fixed and scrolled by hand.
- `walk.ts` (pure, tested): walking direction, speed ramp, soft level-end walls, facing hysteresis (see "Walking").
- `Player.ts`: the physics box + look of one character (movement, buffered/coyote jump, facing, the AvatarDriver's
  lively motion and shadow, cloud ride). Used for the real player and the demo ghost.
- `animation.ts` (pure, tested): all motion tuning and maths. `motionFx.ts`: pooled dust emitters for the real player.
- `ResultScreen.ts` (D-025): 3 star slots filling one by one, then big icon buttons that only accept input 600 ms after
  appearing, so leftover mashing does not press them: Home (left, smaller), Replay, and Next (right, biggest, pulsing;
  only when `LevelSceneData.onNext` is given). Without Next: Replay and Home either side of the character. With `onPicker`, a
  small palette button in the top-right corner (Task 005d).
  Keys: Space/Right = Next (Replay if there is no Next), R = Replay, Escape/Enter = Home, C = picker.
- `progression.ts`: `nextLevelId(worlds, id)` = the next level in the same world or null (tested). The universe passes
  `onNext` from it; Next keeps the chosen option.
- `shots.ts`, `Blaster.ts`, `bubbles.ts`, `BubbleField.ts`: shooting and bubbles (Task 007), see below.
- `pads.ts`: bounce pads and step blocks (Task 015, D-059), see "Blocks and bounce pads" below. `variety.ts`: replay variety (Task 012), see "Replay variety" above. `testBot.ts`: the kinematic test bot shared by the practice and variety tests.

### Blocks and bounce pads (Task 015, D-059)
`core/levels/pads.ts` (pure, tested): `PAD` numbers (launch 1000 px/s = the body's vertical speed cap, peak `padPeak()` about 277 px = 4.3 tiles against a normal jump's 160 px; plate 1 tile wide and 0.4 tile tall; `edge` 8 px; `rearmMs` 700; squash 320 ms), `BLOCK_MAX_TILES` = 2 (a jump peaks 2.5 tiles), `padAirMs()`, and `PadTrigger.update(now, body, plate, grounded)`:
a pad fires once when his feet reach the plate while he is not rising and the body overlaps the plate by at least 8 px; it re-arms when he steps off, or after he has stood on it 700 ms (so landing back on it never loops, standing on it for a while bounces again).
- **Step block `B`:** solid like ground (`extractEntities` puts it in `solid` and in `blocks`), so collision, shadows and respawn need no change; `LevelScene.buildGround` skips drawing it as ground and `buildObstacles` draws a toy block texture (`obs-block-<tile>`) at depth just above the ground. A block must rest on ground or another block; no step between neighbouring columns is taller than 2 tiles (tested).
- **Bounce pad `^`:** not solid (the cell above the ground); `buildObstacles` draws a spring and a plate (`obs-pad-<tile>`, `obs-pad-spring-<tile>`) behind the player, `updatePads` (play mode only, never the demo ghost) calls `Player.launch(now, PAD.launch)` (sets the upward speed and counts as a used jump, so no double jump), plays the `boing` sound recipe, a sparkle burst and a plate squash tween. No new button; a pad only ever helps him reach coins.
- **Grass 7 "Blocks and Bounce"** (`grass-7.json`): 70 tiles, flat (no gaps), Left/Right/Jump, no Power, no bubbles, start column 6, goal column 66, no demo, `"variety": false` (its coin arcs over blocks and pads must stay put). Features: a 1-block at 14, stairs at 20-21 (heights 1 then 2), a bounce pad at 30, two hurdles at 38 and 40, a bounce pad at 48, a small pyramid at 56-58 (heights 1, 2, 1). 34 coins: 15 at head height (walking), 9 on top of blocks, 10 above the pads (5 each, rows 3 to 5; the pad launch reaches up to row 3). Stars 20/28: finishing = 1; 20 needs the block coins; 28 needs a pad or two as well. Level tests check supports, stack height, spacing, coin reach and that no coin sits inside a block.

### Night world (Task 016, D-060)
`nightTheme` (`universes/robo/themes.ts`, `themeForWorld('night')`) is the first non-Grass look; a level opts in with `"world": "night"` (the level still sits in the Grass world's list on the map, so progress and Next work as for any level). `LevelTheme.night` (`core/levels/theme.ts`) switches on three cosmetic extras, all generic in `core/`:
- **Stars:** `ParallaxBackground.drawStars` paints about 46 fixed stars in the top half of the sky (a faint layer and a layer that twinkles by an alpha tween).
- **Headlamp:** `LevelScene.buildNight` adds a soft additive glow (`fx-glow`, 440 px, alpha 0.36, warm white) that follows the player's chest, a little ahead in the facing direction, under the player and over the ground, so the robot and nearby bubbles and coins stay bright.
- **Fireflies:** 16 small additive glows spread over the level width, each with its own alpha pulse and slow drift (seeded by the level id).
Colours: deep blue sky (0x0b1445 to 0x3a3f9a), pale periwinkle moonlit hills (kept light on purpose: every robot option's dark joints must reach 3:1 against them, tested), dark green grass, purple dirt, brighter gold coin, pad rim dark navy (3:1 against the hills, tested; the pad's bright top, ring and light column carry it against the dark sky). Nothing in the level logic changes.
**night-1 "Night Walk":** 75 tiles, walking, all four buttons (no new control), gaps of 1, 2 and 1 tiles (columns 24, 42-43, 60, 17+ tiles apart), 12 small bubbles (one becomes the rainbow bubble on every play), 12 coins (arcs over the gaps and two left of the start), no demo, replay variety on. Stars 24/38 of 48 coins. Tests: level checks, theme checks, a scripted bot on 200 varied grids.

### Car power-up (Task 017, D-061)
`core/levels/car.ts` (pure, tested): `CAR` numbers (10 s, gentle blink in the last 1.6 s, speed x1.25, pickup picture radius 28 and touch circle 40, picture 112 x 66 drawn at scale 1.2), `CarTimer` (start, stop, active, remaining; a second pickup restarts the time), `carAlpha` (1, or a dim 0.55 / bright blink at the end, never fully gone), `touchesPickup` (body rectangle against the pickup circle, like coins), `wheelAngle`.
- **Pickup `P`** (legend, `extractEntities().pickups`): not solid, a bobbing, pulsing white-cyan orb with a little blue car on it (`car-orb`). `LevelScene.buildPickups/updatePickups` (play mode only).
- **Transform:** `startCar` hides the robot (look alpha 0; the shadow and dust keep running), shows `CarSprite` (code-drawn: body in the robot's accent and joint colours, its head looking out of the window, two spinning wheels, a headlight glow; follows the body, nose lifts when rising), sets `Player.speedScale` to 1.25 (the walk ramp uses the scaled speed), plays `transform` (rising arpeggio), a sparkle burst and a ring of puffs. `updateCar` each frame follows the body and ends it when the timer runs out (`transformBack` sound, puffs, robot alpha back to `Player.alphaWanted`). `endCar` also runs at once on a respawn and at the goal.
- **Unchanged:** the 40 x 84 hit box, jump height, gravity, coins, gaps, stars and every rule. Level without a `P` cell: nothing is built.
- **car-1 "Zoom Car":** 80 tiles, walking, Left/Right/Jump, start column 6, the pickup at column 10 (4 tiles from the start), a coin trail at head height from column 14 to 52 (18 coins), two 1-tile gaps (28 and 40) with a coin above each, two 1-tile blocks (34 and 46), 3 coins before the goal at 70 and 2 left of the start; 25 coins, stars 12/20, no demo, `"variety": false`. The car lasts about 43 tiles at 275 px/s, so it covers the trail and ends before the goal.

### Magnet and rocket boots (Task 018, D-062)
`core/levels/powerups.ts` (pure, tested): `PICKUP_CHARS` (`P` car, `M` magnet, `J` boots), `MAGNET` (10 s, radius 230 px, pull speed 560 px/s), `BOOTS` (10 s, jump x1.3, max speed 1000), `bootsJumpSpeed`, `bootsPeak` / `normalPeak` (theory: about 270 and 160 px), `inMagnetRange`, `pullStep` (straight line, never overshoots). The timers are `CarTimer` instances and the blink is `carAlpha`, shared with the car.
- **Pickups `M` and `J`:** not solid, orbs like the car's (`orb-magnet` red with a horseshoe, `orb-boots` orange with a boot/flame). `extractEntities().pickups` carries `kind`.
- **Magnet:** `LevelScene.pullCoins` each frame: an uncollected coin inside the radius is marked `pulled` and moves toward the body centre at the pull speed, then collects normally (same code path as touching it). A faint red ring (`field`) follows the body. Bubbles, shots and every rule are unchanged.
- **Boots:** `Player.jumpScale` is set to the boots' ratio; the jump uses `-min(1000, jumpVelocity * jumpScale)`; two additive orange flames sit at his feet (brighter in the air) and a badge over his head shows which power is on. Gravity, fall cap and hit box unchanged.
- **Ending:** time up plays `transformBack`; `endPowers(false)` runs silently on a respawn and at the goal and resets the scale, ring, flames and badge.
- **magnet-1 "Coin Magnet":** flat, `variety: false`, Left/Right/Jump, magnet at tile 10, 27 coins (a field at columns 14-52 at four heights plus two high ones), stars 14/22.
- **boots-1 "Rocket Boots":** flat, `variety: false`, Left/Right/Jump, boots at tile 10, 29 coins: 16 low ones for two stars and 8 high ones (row 4, only reachable with the boots, tested against `bootsPeak`) for the third; stars 14/23.

### Zen free play (Task 020, D-063)
`core/levels/zen.ts` (pure, tested): `ZEN` (300 x 11 tiles of 64 px, start tile 30, content from tile 52 and until 52 tiles before the right edge, the first segment's content from 38), `zenRebase(x)` (past tile 278 on the right, or 22 on the left: the direction and the shift in px, 248 tiles), `zenSegmentSeed(seed, lap)`, `generateZen(seed, world, first)` (returns the level config and the motif list), `zenFromSearch` (`?zen=1`, `?seed=`).
- **Level flag:** `"zen": true` (`LevelData.zen`, validated in `parseLevel`). The grid still has one `S` and one `F` (the flag at the last tile, never reached and not drawn), flat ground in rows 9-10, nothing solid but the ground.
- **Generator:** a cursor walks the content stretch drawing motifs: `shoot` (small bubbles 3-4 tiles apart in the two rows a standing shot reaches, coins between, now and then a rainbow bubble), `air` (high bubbles taking turns with small ones), `arc` (coins to jump through), `pad` (a `^` with a plus of coins above, as in Grass 7), `big` (a 2x2 big bubble), `rest` (three coins). A power-up stretch is due 24-36 tiles in and then 6-20 tiles after the last one: an orb (`P`, `M` or `J` from a shuffled bag of the three) and 34 tiles of coins that suit it (a head-height trail for the car, a field at several heights for the magnet, low coins and row-4 coins only the boots reach). After a stretch with no bubbles the next motif has bubbles. A rainbow bubble is forced if the dice gave none.
- **Scene:** `create()` skips `buildGoal` and sets `goalX` to infinity. `updatePlay` calls `updateZen`; a swap runs `rebaseZen(dir, dx)`: flush flying coins (they count), clear shots, `clearContent` (kills tweens and destroys coins, pads, orbs and `BubbleField`), generate the segment for the new lap, `Player.shiftX(dx)` (position and previous position, speed untouched), shift `camX`, add to `bgShift` (the parallax is fed `camX + bgShift`, so the hills and clouds do not jump), rebuild coins, pads, orbs and bubbles. The car sprite is built once (`buildPickups` makes it in zen even when the first segment has no car orb). The ground, the power-up timers, the car and the badge are not touched.
- **Why it is invisible:** the swap happens 22+ tiles inside the empty stretch at either end, so the old content is already out of sight behind him and the new content is out of sight ahead (the widest logical screen is under 20 tiles on one side of him). Any new object that stores a world x must be moved or rebuilt at a swap.
- **Map and start:** `openZen` in the robo manifest (a new seed each time, theme from `themeForWorld`, Home returns to the map, no `onResult`); the map's violet infinity button (`addZenBadge`, `mapZenSpot`: left of Practice on the same line).
- **Debug:** with `?debug=1`, `__level.state().zen` is `{ lap, seed, bgShift }` and `__map.state().zen` the button's spot.

### Hold to run and the fall buzz (Task 021, D-064)
`core/levels/runHold.ts` (pure, tested): `RUN_HOLD` (hold 350 ms, ramp 250 ms, x1.45, total cap x1.6, legs switch to the run gait above x1.2 and back below x1.1), `runScale(heldMs)`, `totalScale(run, other)`, `RunHold` (tracks how long one direction has been held; reset by a release, a turn, `halt` and `placeAt`). `Player` created with `runOnHold` multiplies its speed by `totalScale(run, speedScale)` and calls `AvatarDriver.setGait('run' | base gait)`; `LevelScene.makePlayer` sets it for the real player on Left/Right levels only. `core/ui/haptics.ts`: `vibrate(pattern)` (safe where unsupported) and `FALL_BUZZ_MS` (90), called at the start of `startRespawn`. (Replaced by `FALL_BUZZ` and the parent switch in Task 025.)

### Zen seamless swap, blocks and gaps (Task 022, D-065)
`generateZen(seed, world, { first?, carry? })` makes a 320-tile segment; with `carry: { grid, dir }` the 49 tiles `zenWindow(dir)` copies from the old segment (as `LevelScene.zenCarryGrid` prunes it: taken coins and orbs and popped bubbles cleared) land at the arrival position and content is generated only outside them (`dir 1`: from tile 66; `dir -1`: up to tile 262). `ZEN`: rightAt 294, rightArrival 34, leftAt 26, window 24, shift 260. The first segment skips the 12 tiles around the start. New motifs `steps` and `gap`; gap rules as in Practice (width 1-2, 7+ ground tiles between gaps). `rebaseZen` also destroys and rebuilds the ground strips (`groundObjs`), the step block images (`blockImgs`) and the collision bodies (the array the player collides with is refilled in place).

### Rocket boots flight (Task 028, D-071; replaces Task 023, D-066)
`levels/flight.ts` (`FLY`, `FlightState`, `flyDirection`, `flyVelocity`, `plainGround`): automatic forward flight for 12 s, Up/Down from the Left/Right buttons (`TouchControls.setFlightMode`), landing only over plain ground (`Player.beginLanding`), `PowerBars` for every power's time left. The text below is the old hold-Jump design, kept for history.

### (old) Rocket boots flight (Task 023, D-066)
`FLIGHT` and `flightVelocity(vy, held, dtMs, top, ceilTop)` in `powerups.ts`. `Player.flight = { ceilTop }` is set while the boots are on; `Player.step` takes `jumpHeld` and applies `flightVelocity` after the jump logic; `AvatarDriver.flying` leans him forward. Flames grow while thrusting (`LevelScene.updatePowers`).

### Rainbow coins (Task 024, D-067)
`FlyingCoin.rainbow` from `CoinFlow.pop(..., rainbow)`; `BubbleField` draws `coin-rainbow` (46 px, spinning in flight, a rainbow ring on landing); `collect` reports `rainbow` and plays `rainbowCoin`; `LevelScene.addCoins(n, special)` bumps the counter bigger.

### Day / night and vibration settings (Task 025, D-068)
`ProgressSettings.dayNight` and `vibration`; `resolveDayNight` (`?time=`), `resolveVibration` (`?vibrate=`), `pickLook(mode, { nightLevel, varied, roll })`; `themeForRun(worldId, varied)` in `manifest.ts` picks `nightTheme` or the world theme at each level start. `haptics.ts`: `vibrate(pattern, force)` obeys the setting, `vibrationSupported()`, `FALL_BUZZ`. Parent view: `page` 1 or 2; `parentLayout` returns `more` (the page button) and `page2` (two rows of three controls over the full width, and a note area).

### Mega Robo and the coin bar (Task 030, D-073)
`levels/mega.ts` (pure, tested), `CoinBar.ts` (bar and the Mega icon). `LevelScene`: `feedBar` (from `addCoins`), `startMega` / `endMega` / `updateMega`, `buildBridges` (invisible floors over gaps of up to two tiles, pushed into `groundBodies`, rebuilt in `buildGround`), `applySpeed`, `makeRoom` (at most two timed powers). `AvatarLook.setBoost` draws the body bigger without touching physics.

### Stickers (Task 031, D-074)
`core/rewards/`: catalogue and rules (`stickers.ts`), drawing (`stickerArt.ts`), the earned pop-up (`StickerPop.ts`), the book (`StickerScene.ts`, `stickerLayout.ts`). `LevelSceneData.onSticker(reason, stars)` asks the universe for the id to show; the robo manifest's `awardSticker` saves it with `ProgressStore.addSticker`. `MapSceneData.onStickers` adds the map button (`mapStickerSpot`).


### Mega availability and zen time (Task 033, D-076)
`megaPlan` decides per level whether the coin bar exists and its capacity (`LevelScene.plan`, `barOn()`, `barCap()`, `megaFills`). Zen time: `LevelScene.tickZen` adds clamped frame time while playing and reports to `data.zen.onSpent` (store `addZenTime`); `zenTimeUp` switches to mode `rest`. Rules and URL override in `settings/zenTime.ts`.

### Flash and the power-up rules (Task 034, D-078)
**Flash** (`L` in the legend, `PICKUP_CHARS.L = 'flash'`, orb `orb-flash`: a yellow bolt): `FLASH` in `levels/powerups.ts` (10 s, speed x1.7, small-bubble pop reach 70 px every 120 ms, 3 afterimages every 55 ms, a whoosh every 400 ms). While it is on he runs at x1.7 whenever an arrow is held (no 350 ms hold; `Player.flash` makes `totalScale(run, other, true)` ignore the hold bonus and cap at `RUN_HOLD.flashCap` 1.8; the legs use the run gait while moving). `LevelScene.updateFlash`: three yellow silhouettes (`fx-flash-ghost`) trail at his past positions while he runs, sparks, the `flashWhoosh` sound, and `BubbleField.tryHit(..., smallOnly = true)` pops small and rainbow bubbles at his chest (big and high bubbles are left alone; big ones still block him). Pickup sound `flashZip`; the end is the usual `transformBack`. Flash works with the flying boots (the flight speed scales too: a fast flier).
**Rules in one place** (`levels/powerRules.ts`, pure, tested): `excludes` / `combines` (matrix below), `orbTakeable(megaOn)`, `dropsForPickup(active, kind)` (what ends when an orb is taken: whatever excludes it, then, if it would be a third power, the one with the least time left; the same kind just restarts), `dropsForMega(active)` (all), `powerFromSearch` (`?power=`).
| | car | magnet | boots | Flash | Mega |
|---|---|---|---|---|---|
| car | - | yes | yes | **no** (later pickup replaces) | **no** |
| magnet | yes | - | yes | yes | **no** |
| boots | yes | yes | - | yes | **no** |
| Flash | **no** | yes | yes | - | **no** |
At most two timed powers (`MAX_TIMED`). Mega: orbs cannot be taken while he is big (`updatePickups` returns early and dims them to alpha 0.3 with a slow shimmer; they can be taken after Mega if still ahead); when the coin bar fills, `startMega` ends every running power (`endCar`, `endPowers` which also stops flight, flames, ring, badge and Flash) softly with one `transformBack` and starts Mega. `LevelScene.activePowers` lists the running ones, `dropPower` ends one, `applySpeed` multiplies car, Mega and Flash scales (never more than one is above 1). `?power=<car|magnet|boots|flash>` starts that power at the start of play (needs `?demo=0` on a level with a demo; works with `?zen=1`).
**flash-1 "Flash Run":** 80 tiles, Left/Right/Jump, start column 6, the orb at column 10, a head-height coin line (row 7) every 2 columns from column 14 to 72 (clear of gaps and bubbles, 15 within a Flash's reach), three 1-tile gaps (34, 49, 64) each with three coins at row 6 above, five small bubbles (columns 20, 28, 41, 56, 70) he pops by running, goal at 76; 24 coins plus 5 bubbles, stars 20/32, `variety: false`, no demo.
**Zen:** the orb bag now has four kinds (still shuffled); a Flash stretch is 44 tiles of coins every 2 tiles with a small bubble every 9 tiles; a double power-up never pairs the car with Flash (`excludes`); a stretch with Flash or boots in it that does not fit waits for the next segment.

### Bolt Bug (Task 035, D-080)
A small harmless "villain": a purple-grey round gadget with two big eyes (cute-grumpy brows), a tiny yellow bolt antenna and stubby legs, drawn in code (`placeholders.makeBugTextures`, `bolt-bug`, 72 x 80 at scale 1). Pure rules in `levels/bugs.ts` (tested), drawing and animation in `BugField.ts`, wiring in `LevelScene` (`makeBugField`, `updateBugs`, `bugBump`, the forced move in `updatePlay`, the shot test in `updateShots`).
- **Legend `g`:** the middle of the patrol, on the row above the ground (`extractEntities().bugs`). Not solid. Only `bug-1` has bugs; none in zen or Practice (`makeBugField` returns null), and `variety: false` there (the shuffle code does not know bugs).
- **Numbers (`BUG`):** picture radius 0.45 tile (about a tile wide), speed 40% of the walk speed (88 px/s), patrol 4 tiles of travel (2 each side of the cell's middle) as a triangle wave (`patrolPose`: right, a 500 ms pause with a 14 px turning hop, left, pause); two bugs use phases 0 and 0.618 so they never walk in step. 3 shots beat it: after each hit it wobbles, squashes and shrinks to 82% then 66% (`bugScale`, bottom stays on the ground), the hit circle stays at the full radius x 1.3 (so a tall muzzle still reaches the shrunken bug), the third hit pops it (`bugPop` sound, ring, 20 sparkles). 5 coins (`BUG.coins`) appear in an arc and fly to him via `BubbleField.spawnCoins` (the same flow as bubble coins: counted for stars and `bestCoins`; `totalCoins` in the debug state and the Mega plan include `bugs.totalCoins`).
- **Quick way:** while he is Mega Robo, a car or Flash, a touch (`bugTouches`: his body rectangle against a circle of 0.9 x the picture radius) pops it at once with 3 rings and 34 sparkles. Boots and magnet change nothing.
- **Bump (never hurts):** otherwise a touch starts `BugBump`: he walks away from the bug by himself for 300 ms (`intent.move` forced, `noTurn` keeps his facing; about 66 px at walking speed), the bug hops with a `boing` and a tiny `bugHee`, a puff of stars. Then an 800 ms grace time in which the bug does not bump at all, so he can always walk on through it even if a wall or a big bubble stopped the slide (tested in a 1-D simulation with walls at several distances). No bump while he flies; a jump over it (peak 160 px) never touches it. Nothing is lost, no float-back.
- **Validator** (`bugErrors`, called by `parseLevel`): 3 tiles of unbroken flat ground beyond each end of the patrol (columns `col +- 5`), no start, goal, orb, block, pad or big bubble in the two rows above the ground within those columns, nothing at all (coin, bubble) in the patrol columns in the three rows above the ground, 5 columns of room at the level edges, two bugs at least 7 columns apart.
- **Sticker:** the first bug he ever beats earns the next sticker (`StickerReason` `bug`; the universe's `awardSticker` checks `ProgressRecord.bugBeaten` through `ProgressStore.markBugBeaten()`; the flag is saved and kept on a progress reset, like the stickers).
- **`bug-1` "Bolt Bug":** 92 tiles, Left/Right/Jump/Power, start column 6, a Flash orb at column 17, bugs at columns 32 and 62, two gaps (47 and 76, a coin arc over each), seven small bubbles (a rainbow one on every play), a coin line at head height every 2 columns outside the bugs' areas, goal at 88; 20 coins + 7 bubbles + 2 bugs (+ the rainbow bubble's bonus) = 56 coins; stars 24/38 (ignoring everything gives 1 star, popping the bubbles gives 3, the bugs are a bonus), no demo, `variety: false`. No Mega bar (the level has an orb).
- **Hook:** `?bugs=0` hides the bugs in a level (`bugsFromSearch`). Debug: `__level.state().bugs` is `{ index, x, y, r, hits, scale, beaten }`.
