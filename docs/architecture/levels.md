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

### Cave world (Task 037, D-085)
`caveTheme` (`universes/robo/themes.ts`, `themeForWorld('cave')`) is the second non-Grass look; a level opts in with `"world": "cave"` and the Cave world has its own map (see map-and-flow.md, "Branches"). `LevelTheme.cave` (`core/levels/theme.ts`) switches on three cosmetic extras generated in code, all inside `ParallaxBackground` so the map and every level get them (nothing in `LevelScene` changes): a tileable strip of **stalactites** hanging from the top edge (`makeCaveTextures`, depth -92, scrolls at 0.25), a strip of **crystal clusters** (pastel cyan, violet and pink with a glow and a glint) along the floor behind the play (depth -78, scrolls at 0.7), and 14 slow **glow-motes** (additive `fx-glow`, drifting and pulsing by tweens, restarted on a resize). Colours: a dark-teal sky, pale "lit rock" hills (like the night hills they are kept light so every robot option's dark joints reach 3:1 against them, tested), dark-blue rock ground with a lighter blue top, a pale cyan crystal coin with a deep-blue edge, the pad rim dark navy. Cave levels are always dark: Day / Night does not repaint them.
**cave-1 "Cave Walk":** 72 tiles, walking, all four buttons, start column 6, goal column 66, no demo, replay variety on, no enemies, no pickups. Two small gaps (column 26, one tile; columns 47-48, two tiles) each with a coin arc over it, 29 coins and 5 small bubbles (a rainbow bubble joins on every play: four or more small bubbles) on the two rows a standing shot reaches. Stars 18 / 34 of 44 (two never needs a bubble, three does). Tests: structure, gap reach (as Night Walk), coin arcs, star ratios, and a scripted bot that finishes it as written and on 200 varied grids.

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

### Zen day/night cycle (Task 041, D-085)
With the Day / Night setting on **Random**, zen changes between day and night every 60-120 s of play (random each time; `ZEN_CYCLE` in `core/settings/settings.ts`: `minMs` 60 000, `maxMs` 120 000, `fadeMs` 3000; `zenCycleDelayMs(mode, rng, search)` is the pure rule: `null` for `day` and `night`). The first look is rolled as before (`pickLook`).
- **Scene:** `LevelSceneData.zen.cycle = { delayMs, next }` (the universe supplies it in `openZen`: night <-> the world's day theme). `LevelScene.theme` is the look now showing (`data0.theme` only the first). `tickLook` runs inside `tickZen` (so it counts only while playing; it pauses with the rest screen and the auto-pause).
- **A change (`beginFade`, `applyFade`, `finishFade`):** a 3 s cross-fade driven by play time. A second `ParallaxBackground` (new `setAlpha`, `destroy`) fades in over the old one; each ground strip gets a clone with the new texture that fades in (`makeGroundClones`, strips carry `themeKey` data, then the strips swap texture and the clones go); the coins and the HUD coin icon swap to the new coin texture at the half-way point; going to night builds the headlamp glow (raised with the fade) and the fireflies (they come in after 1.5 s); going to day fades them out. Nothing in physics, coins, bubbles, power-ups, the Mega bar, the avatar or the camera is touched.
- **Zen swap during a change:** `rebaseZen` drops and rebuilds the ground clones with the new ground (`dropGroundClones`, `makeGroundClones`); new coins use `coinKey()` (the new look after the half-way point). The background layers are not rebuilt by a swap.
- **Debug:** `__level.state().zenLook = { theme, to, progress, nextInMs, groundKey, groundKeys, coinKey }`.
- **Test hook:** `?cycle=<seconds>` fixes the interval, `?cycle=0` turns the cycle off (zen only, Random only).
- Not covered: the normal levels, Practice and the `night` world keep their one look. Both themes' textures are generated; the day look's real image files (if any are dropped in later) are only preloaded when the visit starts in day.

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
A small harmless "villain": a purple-grey round gadget with two big eyes (cute-grumpy brows), a tiny yellow bolt antenna and stubby legs, drawn in code (`placeholders.makeBugTextures`, `bolt-bug`, 72 x 80 at scale 1). Pure rules in `levels/bugs.ts` (tested; Task 038 generalised the machinery to enemy kinds, see "Cave enemies" below, and the Bolt Bug's numbers and behaviour did not change), drawing and animation in `EnemyField.ts` (was `BugField.ts`), wiring in `LevelScene` (`makeEnemyField`, `updateBugs`, `bugBump`, the forced move in `updatePlay`, the shot test in `updateShots`).
- **Legend `g`:** the middle of the patrol, on the row above the ground (`extractEntities().bugs`). Not solid. Only `bug-1` has bugs; none in Practice (zen has them since Task 042), and `variety: false` there (the shuffle code does not know bugs).
- **Numbers (`BUG`):** picture radius 0.45 tile (about a tile wide), speed 40% of the walk speed (88 px/s), patrol 4 tiles of travel (2 each side of the cell's middle) as a triangle wave (`patrolPose`: right, a 500 ms pause with a 14 px turning hop, left, pause); two bugs use phases 0 and 0.618 so they never walk in step. 3 shots beat it: after each hit it wobbles, squashes and shrinks to 82% then 66% (`bugScale`, bottom stays on the ground), the hit circle stays at the full radius x 1.3 (so a tall muzzle still reaches the shrunken bug), the third hit pops it (`bugPop` sound, ring, 20 sparkles). 5 coins (`BUG.coins`) appear in an arc and fly to him via `BubbleField.spawnCoins` (the same flow as bubble coins: counted for stars and `bestCoins`; `totalCoins` in the debug state and the Mega plan include `bugs.totalCoins`).
- **Quick way:** while he is Mega Robo, a car or Flash, a touch (`bugTouches`: his body rectangle against a circle of 0.9 x the picture radius) pops it at once with 3 rings and 34 sparkles. Boots and magnet change nothing.
- **Bump (never hurts):** otherwise a touch starts `BugBump`: he walks away from the bug by himself for 300 ms (`intent.move` forced, `noTurn` keeps his facing; about 66 px at walking speed), the bug hops with a `boing` and a tiny `bugHee`, a puff of stars. Then an 800 ms grace time in which the bug does not bump at all, so he can always walk on through it even if a wall or a big bubble stopped the slide (tested in a 1-D simulation with walls at several distances). No bump while he flies; a jump over it (peak 160 px) never touches it. Nothing is lost, no float-back.
- **Validator** (`bugErrors`, called by `parseLevel`): 3 tiles of unbroken flat ground beyond each end of the patrol (columns `col +- 5`), no start, goal, orb, block, pad or big bubble in the two rows above the ground within those columns, nothing at all (coin, bubble) in the patrol columns in the three rows above the ground, 5 columns of room at the level edges, two bugs at least 7 columns apart.
- **Sticker:** the first bug he ever beats earns the next sticker (`StickerReason` `bug`; the universe's `awardSticker` checks `ProgressRecord.bugBeaten` through `ProgressStore.markBugBeaten()`; the flag is saved and kept on a progress reset, like the stickers).
- **`bug-1` "Bolt Bug":** 92 tiles, Left/Right/Jump/Power, start column 6, a Flash orb at column 17, bugs at columns 32 and 62, two gaps (47 and 76, a coin arc over each), seven small bubbles (a rainbow one on every play), a coin line at head height every 2 columns outside the bugs' areas, goal at 88; 20 coins + 7 bubbles + 2 bugs (+ the rainbow bubble's bonus) = 56 coins; stars 24/38 (ignoring everything gives 1 star, popping the bubbles gives 3, the bugs are a bonus), no demo, `variety: false`. No Mega bar (the level has an orb).
- **Hook:** `?bugs=0` hides the bugs in a level (`bugsFromSearch`). Debug: `__level.state().bugs` is `{ index, x, y, r, hits, scale, beaten }`.

### Cave enemies: Rock Beetle and Glow Bat (Task 038, D-085)
Two more gentle enemies on the Bolt Bug machinery (D-002: nothing hurts, no lives). One table of per-kind data drives the field, the validator and the stickers: `levels/enemies.ts` (`ENEMIES`, `EnemyKind` `bug | beetle | bat`, pure and tested), `levels/patrol.ts` (the shared triangle-wave walk, also used by `bugs.ts`: `patrolPose` is now `patrolPoseOf(BUG, ...)` and a test pins it to the old result to the pixel), `EnemyField.ts` (drawing, was `BugField.ts`). The Bolt Bug's entry mirrors `BUG`; its tests are unchanged.
| | Bolt Bug (`g`) | Rock Beetle (`k`) | Glow Bat (`w`) |
|---|---|---|---|
| Where | ground | ground | flying, the cell is two rows above the ground row: its middle is 1.5 tiles up |
| Size | radius 0.45 tile (about 1 tile wide) | radius 0.7 (about 1.4 tiles wide) | radius 0.42 (small) |
| Movement | patrol 4 tiles at 40% of his walk, 500 ms hop at each end | patrol 6 tiles at 55% of his walk, 1 s **peek** at each end (the head comes right out, a little bigger, and looks about) | slow horizontal sine 4 tiles wide, period 7 s (fastest point about 115 px/s, half his walk), the picture bobs up to 8 px; never dives, never chases |
| Shots / picture size | 3 / 1, 0.82, 0.66 | **5** / 1, 0.94, 0.88, 0.82, 0.76, a crack on the shell per hit (4 crack pictures) | **3** / 1, 0.84, 0.7 |
| Hit circle | picture radius x 1.3 | x 1.2 | x **1.9** (a standing muzzle is 32-50 px up and the bat's middle 96 px; reach is 65 px at the lowest muzzle) |
| Touch circle | x 0.9 | x 0.85 | x **0.4**: the picture bottom is 85 px up, his body 84 px, so a standing robot walks under it without a touch; a jump into it bumps (at the peak, 160 px, his feet are above it) |
| Coins | 5 | **8** | **6** |
| Sounds | `bugHee`, `bugPop` | `beetleHit` (a low tok), `beetlePop` | `batFlap` (very quiet, only while he is within 520 px, every 520 ms), `batPop` |
The hit and touch tests use the full picture radius, never the shrunken one, and the bat's hit and touch centre is the middle of its cell (the bob only lifts the picture), so a shot always reaches it and a standing robot never touches it. The bump is the Bolt Bug's (`BugBump`, shared): he slides away 300 ms, the enemy hops with `boing` and `bugHee`, then 800 ms in which nothing bumps. One touch as Mega Robo, a car or Flash pops any kind at once (3 rings, 34 sparkles). No stomp, no float-back, nothing lost. The 1-D bump test is extended to both patrols: a frame-by-frame walk through the real beetle and bug patrols, right and left, with a wall behind him, always gets through.
- **Validator** (`enemyErrors`, called by `parseLevel`; `bugErrors` as before): *beetle*: its cell and 3 tiles each side are the patrol, with 3 tiles of unbroken flat ground beyond each end (columns `col +- 6`), no start, goal, orb, block, pad or big bubble in the two rows above the ground there, nothing at all in the patrol in the three rows above the ground, 6 columns of room at the level edges. *Bat*: the ground row is exactly two rows under its cell and flat from `col - 3` to `col + 3` (its 2-tile sine plus 1), no start, goal, orb, block, pad or big bubble in the three rows around its cell there, nothing at all (coin, bubble) in its sine area (`col +- 2`) in those rows, 3 columns of room. Enemies of different kinds are at least 6 columns apart (two Bolt Bugs keep 7).
- **Grid** (`extractEntities().enemies`, every kind with its `kind`; `.bugs` still lists only the bugs), **scene** (`LevelScene.enemies`, `makeEnemyField`, `updateBugs` also passes the player's x so a near bat flaps), debug `__level.state().enemies` (`bugs` still lists the bugs) with `kind`.
- **Not in Practice (zen has them since Task 042, below). `?enemies=0`** hides the beetles and bats (`?bugs=0` still hides the Bolt Bugs; in zen `?enemies=0` hides all three); `enemiesFromSearch`. Both new letters are in `LEGEND`; levels that use them set `"variety": false` (the shuffle code does not know enemies).
- **Stickers:** the first Rock Beetle and the first Glow Bat he beats each give the next sticker (`StickerReason` is now `mega | finish | EnemyKind`; the universe's `awardSticker` asks `ProgressStore.markEnemyBeaten(kind)`, which keeps the Bolt Bug's `bugBeaten` and saves the others in `ProgressRecord.enemiesBeaten`, a cleaned list kept on a progress reset; an old save loads `[]`). 3 of the 24 stickers can now come from enemies, so the catalogue allows it cleanly.
- **`cave-2` "Rock Beetle":** 85 tiles, Left/Right/Jump/Power, start column 6, a **car orb** at column 14, beetles at columns 33 and 62, one 2-tile gap (47-48, a coin arc over it), seven small bubbles (a rainbow one on every play), 16 loose coins; 16 + 7 bubbles x 3 + 2 beetles x 8 = 53 coins (+5 rainbow); stars 21 / 36 (the car, about 43 tiles at x1.25, is still on at the first beetle and pops it at once; the second is shot 5 times or bumped past). No Mega bar (the level has an orb). No demo, `variety: false`.
- **`cave-3` "Glow Bat":** 90 tiles, Left/Right/Jump/Power, start column 6, bats at columns 22, 40 and 70 (row 7, over flat ground), a beetle at column 56, two 2-tile gaps (31-32 and 78-79, coin arcs), nine small bubbles, 17 loose coins, no orbs (so the Mega bar fills at 70% of the coins and he can pop enemies by touch); 17 + 9 x 3 + 3 x 6 + 8 = 70 coins (+5 rainbow); stars 28 / 42 (three stars never need an enemy). No demo, `variety: false`.
- Tests: `levels/enemies.test.ts` (the Bolt Bug unchanged, the numbers, reach from both muzzle heights and every picture size, a standing robot under the bat at every pose, the rules, the spacing, the bump walk-through, stickers, saved flags, sounds) and the Cave block of `universes/robo/levels/levels.test.ts` (both levels' structure, stars, a bot on the written grids and 200 grids each).

- **`cave-4` "Crystal Bridges" (Task 039):** 95 tiles, Left/Right/Jump/Power, start column 6, goal 88, a **magnet orb** at column 12, a bat at 20 (row 7) and a beetle at 60 on separate stretches, three gaps (30-31, 52-53, 72; coin arcs), step blocks (a 1-block at 40, stairs of 1 then 2 at 44-45, a hurdle at 82, coins on top; blocks are 7+ columns from an enemy and 4+ from a gap), eight small bubbles (a rainbow one on every play), 25 loose coins; 25 + 8 x 3 + 8 + 6 = 63 coins (+5 rainbow); stars 28 / 40. No demo, `variety: false`.
- **`cave-5` "Cave Run" (Task 039):** 101 tiles, start 6, goal 94, a **Flash orb** at column 12, then a run of five small bubbles at columns 15-23 (rows alternate, so Flash pops them by running: the rainbow-coin spot, the rainbow bubble joins one of the ten on every play), a Bolt Bug at 32, a bat at 50, a beetle at 66, a bat at 78, three gaps (40-41, 58, 86-87; coin arcs), 29 loose coins; 29 + 10 x 3 + 5 + 8 + 6 + 6 = 84 coins (+5 rainbow); stars 36 / 50. The charging pad ends the level (Task 040 may put a closed rock gate behind it). No demo, `variety: false`.
- Both: no enemy within 6 columns of a gap, 10 of the start or 8 of the goal; the validator and `levels.test.ts` (Task 039 block) check structure, gap reach, star ratios (three never needs an enemy), block rules for cave-4, and a bot on the written grid and 200 rainbow grids. The test bot ignores blocks and enemies (a purposeful bot: median 25.4 s on cave-4 and 27.1 s on cave-5; Grass 5-6 purposeful is about 22 s). The Cave map order is cave-1 to cave-5; `finalLevelStarsRequired` is for Task 040.

### Cave Guardian (Task 040, D-085)
The Cave's last level, `cave-boss` "Cave Guardian": a big, friendly-grumpy rock golem. It never hurts him (D-002) and never shoots; he beats it by shooting its glowing chest crystal. Pure rules and numbers in `levels/boss.ts` (tested), drawing in `BossField.ts`, the arena and gate in `LevelScene` (`buildArena`, `makeBoss`, `openGate`, `updateBoss`), textures in `placeholders.makeGolemTextures` (`GOLEM_KEYS`). Grid letter **`G`** (`extractEntities().boss`, one per level, the middle of its walk); not an enemy kind, so `enemies` and the zen generator are untouched. Never in zen or Practice (the scene builds it only for a level with a `G`).
- **Numbers (`BOSS`):** about 4 tiles tall (256 px); walks 10 tiles (5 each side of `G`) at 35% of his walk (77 px/s) with a 900 ms pause at each end (`bossPose`, the shared `patrolPoseOf`); **10 hits**; each hit drops **2 coins**, the crumble **20** (40 in all, `BOSS_COINS`, counted in the totals and stars like bubble coins). Crystal hit circle: middle 1.9 tiles up, radius 1.6 tiles (a standing muzzle at 32-50 px and a muzzle at the top of a jump at 177-211 px both reach it from any distance up to the shot range of 640 px; a shot 330 px up flies over; tested). Touch circle: middle 1.6 tiles up, radius 1.25 tiles (`bossTouches`).
- **Hits and touches:** a shot on the crystal is a hit (the golem squashes, the crystal pulses and shines brighter, a ring, 2 coins, `golemHit`). A touch as Mega Robo, a car or Flash is **one hit** (never a kill), spaced by the Bolt Bug's grace time (`BugBump`: about one hit a second); otherwise a touch is the usual gentle bump (he slides 300 ms away, the golem hops with `boing`, 800 ms grace; no bump while he flies). Nothing is lost, no fall, no timer. Leaving and coming back restarts the fight (the scene restarts).
- **Crumble and gate:** at the 10th hit the pieces shake, sink and fade, rubble bounces, three rings and 46 sparkles fly (`golemCrumble`), 20 coins fly to him, the sticker pop comes at 1.3 s, and at 1.2 s the **gate** rolls up (`gateOpen`, a camera shake of 1.6 s, the opening glows) and the **charging pad** fades in. Until then the pad is built hidden and `goalX` is infinite (so the goal cannot be reached); `?boss=0` opens the gate at the start with no Guardian. The win adds the longer `guardianWin` tune and a second shower of confetti. Arena look: a rock wall at the left end, the closed rock gate at the right end (`cave-gate`, `cave-gate-back`, `cave-wall`); the level's own end limits are the walls.
- **Level:** `cave-boss` is 36 tiles, flat, no gaps, blocks, pads, bubbles or enemies; start column 4, the Guardian at column 20 (walks columns 15-25), a car orb (8) and a magnet orb (11) before it, 12 loose coins, the pad at column 31; stars 24 / 40 (the Guardian's 40 coins always give three stars, so beating it is 3 stars). `variety: false`, no demo. **Validator** (`bossErrors`, called by `parseLevel`): one `G`, flat unbroken ground along the whole width, the arena at least 28 wide, room for the walk plus 3 clear tiles, no start, goal or orb within the walk and those 3 tiles, no block, pad, big or high bubble anywhere, nothing in the walk in the four rows above the ground.
- **Cave world:** `cave-boss` is the sixth Cave level and has `finalLevelStarsRequired: 10` (stars in the Cave; `?unlock=all` opens it).
- **Sticker and crown:** `onSticker('guardian')` (`StickerReason` adds `guardian`). The universe's `awardSticker` always marks the Cave cleared (`ProgressStore.markWorldCleared('cave')`, saved in `ProgressRecord.worldsCleared`, kept on a progress reset like the stickers) and gives the **Cave Guardian sticker** `g01` once (`GUARDIAN_STICKER`, a crystal badge, not part of the 24 regular ones: `nextSticker` never hands it out; the book gets a 25th slot once he has it; the pop-up is bigger). A cleared Cave wears a gold crown over its mouth on the Grass map (`BranchSpec.crowned`) and over the last dot of the Cave map (`MapSceneData.crowned`), `drawCrown` in `MapScene`.
- **Sounds (recipes):** `golemStep` (quiet, every 640 ms while it walks within 620 px of him), `golemHit`, `golemCrumble`, `gateOpen`, `guardianWin`. **Debug:** `__level.state().boss` is `{ x, y, r, hits, beaten, groundY }` and `.gateOpen`.
- Tests: `levels/boss.test.ts` (numbers, brightness, pose, reach from both muzzle heights, touch circle, bump, search hook, arena rules, and a kinematic bot that beats it by shooting from a distance in under 25 s without a bump and by walking into it with a power, one hit per touch) and the cave-boss block of `universes/robo/levels/levels.test.ts`.


### Enemies in zen (Task 042, D-085 addendum)
Zen gets the three gentle enemies (same shots, bump, coins and stickers as in the levels; nothing else changed). `ZEN_ENEMY` in `core/levels/zen.ts`.
- **Motif `enemy`:** one enemy in the middle of a reserved stretch of flat ground: its patrol plus 3 clear tiles each side (`enemyReach(kind)` = half patrol + 3: bug 5, beetle 6, bat 5 columns). The patrol itself is bare; the clear tiles hold one small bubble each side (so the stretch is never empty); no gap, step, pad, orb or big bubble within reach. A bat's cell is `ROW.up` (two above the ground), the bug and beetle's `ROW.low`. The result passes `enemyErrors` (the first segment goes through `parseLevelOrThrow`).
- **Which kind:** a shuffled bag of six: bug 3, bat 2, beetle 1 (`ZEN_ENEMY.bag`).
- **Where and how often:** the first is due 20-45 tiles into the content (the first segment counts from tile 40), then the next is due 45-60 tiles from the previous enemy's middle (tests: never within 20). Real density is about 2.5 per segment (one every 70-80 tiles) because motifs move the cursor in steps and the zone is limited. The enemy's stretch is taken off the power-up clock (`setDue`) and one more `gap` entry went into `MOTIFS`, so orbs, gaps and bubbles are as common as before (the old zen tests are unchanged and green).
- **Seam safety by position, not by carrying:** enemies are only placed with their whole stretch inside columns 52-262 (`zoneMin`, `zoneMax`), outside the two swap windows (old columns 2-50 and 270-318) and at least 26 tiles from the swap trigger, so a swap never cuts one and the carry never contains one (the window copy also blanks any enemy letter as a safeguard). A popped enemy goes away with its segment. `rebaseZen` destroys the old `EnemyField` (`EnemyField.destroy`) and builds the new segment's.
- **Mega Robo:** enemy coins feed the coin bar like bubble coins (bug 5, beetle 8, bat 6, about 15-20 per segment against the 50-coin first fills). Gating is unchanged (`zenCapacity`); Mega comes a little sooner, perhaps 10-15%.
- **Hooks:** `?enemies=0` hides every enemy in zen; `?enemies=1` makes the first segment's first enemy come as early as it can (the first power-up stretch waits until it is placed); `enemiesForced`. Debug: `__level.state().enemies`.
- Tests: `levels/zenEnemies.test.ts` (200 seeds: validator, clear patrols, spacing and frequency, none in a window, window copy exact, bag mix, forced hook, never empty, the 1-D bump walk-through).
