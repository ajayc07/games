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
- `grid`: equal-length rows, top row first. Legend: `#` ground, `.` empty, `c` coin, `S` start, `F` flag (pole stands in
  that cell), `o` small bubble, `O` big bubble (a whole 2x2 block of `O`; a broken block is an error naming its first cell),
  `h` high bubble (Task 009: the small picture, 4 coins, centred in its cell and raised a quarter tile, never solid),
  `r` rainbow bubble (Task 012: made by replay variety, never written in the JSON).
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
Rainbow: `rainbowPick(smallBubbles, seed)` = 1 in 3, only with 4+ small bubbles (Grass 4 and 6; Grass 5 has none), picks which `o`
becomes `r`; the legend char `r` is never used in the JSON files. See shooting-bubbles.md.
When it applies (`useVariety`, `openLevel` in `universes/robo/manifest.ts`): the first play of a level (no stars yet) is the grid as written;
any play after a clear, and the win screen's Replay (`onReplay`), gets a fresh random seed kept in memory only (nothing saved, progress
records unchanged). A level whose watch-me demo is about to play (`LevelScene.demoWillPlay`) is always canonical, even with `?variety=1`.
`?variety=1` forces varied, `?variety=0` canonical, `?seed=<n>` fixes the seed (then Replay repeats the same grid). `?debug=1` state has `grid`.

`core/levels/` (all universe-agnostic):
- `format.ts`: types, `parseLevel` (readable errors: row lengths, unknown characters with position, exactly one S/F,
  valid actions, star thresholds), `parseLevelOrThrow`.
- `grid.ts`: `extractEntities` (solid map, coins, bubbles, start, flag), `mergeSolids` (few collision rectangles, no seams),
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
  Falls: whoosh, a cloud carries the player to the respawn spot, facing the gap he fell into (his facing at the fall). Flag: stop, the option's win chime, hop, confetti, `ResultScreen`.
  `?debug=1` exposes `window.__level` (state, scene, input, layout, audio) for tests.
- `theme.ts`: `LevelTheme` = colours for sky, hills, clouds, ground, coin, flag plus optional image files per texture
  (`ground-top`, `ground-fill`, `coin`, `flag-pole`, `flag-cloth`, `hills-far`, `hills-near`, `cloud`).
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
- `variety.ts`: replay variety (Task 012), see "Replay variety" above. `testBot.ts`: the kinematic test bot shared by the practice and variety tests.
