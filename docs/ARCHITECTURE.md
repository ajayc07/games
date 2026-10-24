# Architecture

## Layout
```
games/
  src/
    main.ts              entry: boots Phaser, loads default universe
    config.ts            defaultUniverse, base settings
    shell/               launcher (later), settings, parent view
    core/
      input/             InputManager: touch buttons + keyboard + gamepad -> actions
      avatar/            how characters are drawn: AvatarLook (robot, ball), rig, shared motion
      audio/             AudioManager: unlock on first gesture, placeholder beeps, per-option chimes
      storage/           per-universe progress + settings (for now only the chosen option, choice.ts)
      picker/            PickerScene (colour cards), pure selection + layout
      levels/            level JSON loader/runner, control-ladder rules
      ui/                reusable big buttons, cloud/lock visuals
    universes/
      registry.ts        id -> () => import('./<id>')   (lazy loading)
      robo/              "Robo World" (D-038); id and title in universe.ts
        manifest.ts      options, worlds, unlock config, routing
        options.ts       the eight colour cards
        scenes/          Phaser scenes specific to this universe (Input Lab)
        levels/          level JSON files
        assets/          images/audio (placeholders first, real files later)
  public/                PWA icons, manifest bits
  docs/                  PROGRESS, DECISIONS, ARCHITECTURE, tasks/
  .github/workflows/deploy.yml
```

## Shell vs universe
- **Shell** is always loaded and small. For now there is no launcher: `main.ts` reads `config.defaultUniverse` and opens it directly. A launcher screen is added when a second universe exists.
- **Universe module** is a dynamic import, so one universe's files are never downloaded for another. Each exports a `UniverseManifest`.

```ts
type Action = 'left' | 'right' | 'jump' | 'power';

interface UniverseManifest {
  id: string;                     // 'robo'
  title: string;                  // 'Robo World'
  options: AvatarOptionDef[];     // 8 colour cards; the first is the fallback
  worlds: WorldDef[];             // grass, cave, sky, castle
  unlock: { openAtATime: number };// default 2..3 levels open at once
  start(game: Phaser.Game): void; // boots the universe's first scene
}

interface AvatarOptionDef extends AvatarDef {   // AvatarDef = { palette?, scale?, antennae? }
  id: string;                     // 'blue'; used by ?color= and storage
  chime: { semitones: number; timbre: 'bell' | 'soft' | 'pluck' | 'bright' };
}
```
All options share identical physics (jump height, speed). Differences are cosmetic. No names, no pictures, no voices (D-038).

**Removed in Task 005c (D-037):** the `sprite` look (the real pictures in levels), the `portrait` look, and everything only they
used: `poses` (`idle`/`run`/`jump`, D-023), the run flipbook (`runFrames`, `runFps`, Task 004b), the idle-pose rule (Task 005),
`displayHeight`, the `portrait` crop, `characterLook.ts`, `poses.ts`, `SpriteLook.ts`, `portrait.ts` and the run-pose images.
**Removed in Task 005d (D-038):** the character cast (names, pictures, voice clips), `CharacterDef` (`image`, `color`, `sounds`,
`powerAnimation`), `characterTexture.ts`, `makeCapsuleTexture`, the voice slots (`voices.ts`, `registerVoices`/`playVoice`, the
1.5 s jump-voice limiter, `silentFallback`) and `?char=`. The files are archived outside git in `_sources/archive-private/`.

### Lively motion (Task 004b)
All character motion is visual only (the 40x84 physics body never changes) and works for every character and look.
Numbers and maths live in `core/levels/animation.ts` (`ANIM`, pure functions, unit-tested in `animation.test.ts`);
`AvatarDriver` applies them (`Player.updateAvatar` feeds it). The look's origin is at the feet, so squash and lean stay grounded.
Each look scales the shared motion with its `motion()` weights (the robot has its own bob and lean, so it uses less).
- **Run:** a stride phase advances with distance travelled on the ground (one whole number per footfall, step 56 px), so
  faster = quicker steps and standing = no stride. Per step: bounce (5 px), squash at foot-strike, stretch mid-stride,
  a forward lean (~4 deg) and an alternating rock (~2 deg). A run blend (in 160 ms, out 220 ms) fades it all in and out.
- **Air / landing:** take-off, landing, the flag hop and respawn placement each start a squash/stretch `Pulse`
  (ease to a peak, settle back; landing settles in 120 ms). A new pulse starts from the current value, so a jump that
  interrupts a landing squash, or mashing, never pops. In the air the lean follows vertical speed (up = back, down = forward),
  eased toward its target.
- **Idle:** slow breathing. **Win:** `Player.celebrate` bounces on the spot (450 ms per bounce, the star-fill rhythm) until the
  Result buttons appear (`ResultScreen.fillMs`).
- **Shadow:** a soft ellipse (`fx-shadow`) on the ground under the character, smaller and fainter with height; hidden over a gap
  and on the cloud ride. LevelScene supplies `groundAt(x, feet)` from the grid.
- **Dust:** `motionFx.ts` owns three pooled Phaser emitters: a small puff per footfall (at most every 220 ms), a flat ring on
  landing, and short speed streaks behind the runner (one per 140 ms). Only the real player gets a `MotionFx`; the demo ghost
  shares all the motion and its shadow but has no dust.
- `?debug=1`: `__level.anim()` / `__level.ghostAnim()` give rotation, scales, stretch, blend, shadow, dust counts and the look's own numbers.

### Avatar looks (D-032, D-033, D-037; Tasks 005b, 005c)
How a character is drawn is separate from physics. `core/avatar/` holds:
- **`AvatarLook`** (`types.ts`): `root` (display object, origin at the feet), `ready`, `shadowScale`, `motion()`
  (how strongly the shared motion applies), `update(state)`, `setFacing`, `trigger('jump'|'land'|'win'|'shoot', now)`,
  `setAlpha`, `setDepth`, `setVisible`, `muzzle()` (world point where a shot leaves), `debug()`, `destroy()`.
- **`AvatarDriver`**: the Task 004b motion (stride phase from distance, run blend, take-off / landing / hop / placed pulses,
  breathing, lean, win bounce, shadow, dust). It turns physics facts into an `AvatarState` (position, lift, stretch, rotation,
  facing, grounded, speed, vy, stride phase, run blend, gait, time) every frame. `Player` (levels) and the Input Lab hero both
  use it, so every look behaves the same everywhere. Shadow size is scaled by the look's `shadowScale`. Physics, the 40x84 hit
  box and level logic never depend on the look.
- **Looks**: `RobotLook` (`robot`, default) and `BallLook` (`ball`). `createLook(scene, name, character, x, feet)` builds one;
  `lookFromUrl()` reads `?look=` (unknown values, including the removed `sprite` and `portrait`: one console warning, robot).
  LevelScene applies the look to the player, the demo ghost (same look at 55% alpha) and the win screen; the Input Lab uses it
  for its hero.
- **Robot parts** (`parts.ts`): drawn once with Canvas 2D (gradients, glow) at 2x and cached by palette
  (`av-robot-<part>-<palette>`); nothing is drawn per frame. Head shell, visor, ears and chest panel are separate parts so the
  view can move them. The robot is one Container (root at the feet) of about 25 flat images.
- **Clips** (`clips.ts`, pure, tested): a `RobotPose` per frame: angles (0 = hanging down, positive = forward; knees bend back,
  elbows forward) plus an arm `s`pread (out to the side). idle (breathing, symmetric), walk/run (2 steps per cycle from the
  driver's stride phase, scaled to the robot's step length so feet do not skate; far limbs half a cycle behind; arms opposite
  the legs), jump (crouch, then both arms up in a V and legs tucked), fall (arms out to the sides, legs dangle, by vy), land
  (crouch, quick in and out), win (arms up in a V, waving, a little dance, happy ^ ^ eyes, antennae wiggle), shoot (near arm
  points forward, recoil, the hand becomes a cannon, muzzle flash). Blending uses linear weights (ground: idle <-> gait by run
  blend; air in 90 ms, out 80 ms; win in 160 ms) so cycles keep their full swing and nothing pops. Gait: `walk` when `autoRun`
  is false, `run` when true. Eyes blink every 3-5 s; antennae sit on a damped spring (in screen space, so turning never jerks them).
- **Three-quarter view / yaw (Task 005c, D-037)**: the robot has a smoothed yaw in -1..1 (sign = facing, 0 = facing the
  player). `yawTarget` (clips.ts): 0 when standing (friendly front view), `move` 0.75 toward the travel direction when moving
  (scaled by speed, full at half the level speed), `air` 0.45 in the air so the face stays readable, `shoot` 0.8 while shooting
  so the cannon arm reads, 0 for the win. `yawStep` moves the head yaw and the body yaw at steady rates (a full -0.75 to +0.75
  sweep: head 100 ms, body 160 ms), so a turn is a head-then-body sweep through the front view (this replaces the flat paper flip;
  the Task 005 facing hysteresis still decides when to turn).
- **Rig solver** (`robotRig.ts`, pure, tested): a tiny 3D model. Every joint has forward (f), sideways (l, negative = near side)
  and down (y) coordinates in the body frame; a view (`viewOf(yaw)`: `dir`, `side` = sin(|yaw| x 90 deg), `front` = cos) projects
  them as `x = dir * (f*side + l*front)`, and limb images are rotated and foreshortened to the projected segment. So at the front
  view forward swings vanish and only the left/right layout shows; at three-quarter view limbs swing forward like a side view
  while the far ones tuck in behind. Parts that follow yaw (numbers in `ROBOT.view`): head shell narrows, visor and eyes move to
  the facing side, the far eye narrows and the near eye keeps its size, the near ear moves to the back of the head (drawn over
  the shell past `earFrontAt`), the far ear narrows and peeks out behind the face, antennae move forward and together, the torso
  narrows, the chest panel slides to the facing side, boots point their toe forward (narrow and centred seen from the front),
  far-side limbs get a light tint (none at the front view), the lean and the boot tilt foreshorten. Head parts use the head's
  view, the rest the body's.
  **Depth order:** the clip's `N` limbs are always drawn on the near side, in front of the body; `F` limbs behind it, so the
  container order never changes. Which of the robot's own sides is near (`nearSide`) changes only at yaw 0, where the front view
  is left/right symmetric (idle is symmetric, visor highlight centred), so the mirror flip is invisible; at that moment the walk
  cycle shifts by one step (`phaseShift`) so every limb stays where it was. Unit tests check the continuity across yaw 0, the
  sweep timing, the targets and the three-quarter layout in both directions.
  **To tweak the robot, edit `robotSpec.ts` only** (`ROBOT.parts`, `layout`, `yaw`, `view`, `ROBOT_CLIPS`).
- **Ball**: a 96 px ball in the accent colour with a band and spots that roll (angle = distance / radius) under a fixed
  highlight; the face (eyes with pupils, cheeks, mouth) stays upright and slides toward the facing. Happy eyes and a grin on win;
  "shoot" opens the mouth.
- **Option attributes** (the `AvatarDef` part of each option, `resolveAvatar`): palette (body, joint, accent, visor, eye; defaults
  white / dark grey / cyan / dark visor / cyan eyes), scale clamped to 0.9-1.15, antennae 0-2 (default 2). Colour only, no emblems.
  Looks take an `AvatarDef` (`createLook(scene, name, avatar, x, feet)`). Event `rest` ends a `win` (the picker's one-off wave).
- **Shooting** exists only in the Input Lab for now: Power plays `shoot` and fires a harmless energy ball (accent colour) from
  `muzzle()`. Power becomes gameplay in Grass 4 (D-037).
- **Adding a body:** implement `AvatarLook` (use `AvatarState`, return your `motion()` weights), add the name to `LOOK_NAMES`
  in `config.ts` and a case in `createLook.ts`. Put tuning numbers in a spec file like `robotSpec.ts`.
- `?debug=1`: `__level.anim()` / `ghostAnim()` include `look` and the look's own numbers (robot: head/body yaw, weights, limb
  angles, flash, cannon, eye openness, ear depth; ball: face direction).

### Avatar options and picker (D-038, Task 005d)
- **Options** (`universes/robo/options.ts`): eight colour cards in order red, orange, yellow, green, teal, blue, purple, pink.
  Body stays the default white; `accent` = the hue, `joint` = a dark shade (contrast at least 3:1 against both hill colours,
  unit-tested), `eye` = a light tint. Scale 0.92 (yellow, one antenna) to 1.12 (purple); teal also has one antenna.
  `core/avatar/options.ts` (pure, tested): `validateOptions` (ids unique and lower-case, scale/antennae/chime ranges; problems are
  console warnings at start), `findOption`, `colorFromSearch` (`?color=<id>`, case-insensitive; unknown = first option + one warning).
- **Chimes** (`core/audio/chimes.ts`, pure, tested): one recipe per kind, shaped by the option's `semitones` (from C5, clamped
  -7..+10) and `timbre`. `pick`: a quick rising glide into a held upper note (under 0.4 s). `win`: a 5-6 note arpeggio (under 1.3 s;
  bell = sine + inharmonic overtone, soft = pure sine major, pluck = short bouncing triangle, bright = triangle with octave
  shimmer). Overtones above 4.5 kHz are dropped; summed peak gain stays 0.6-1.6 (x 0.3 in the AudioManager). The eight options'
  pitches are at least 2 semitones apart and neighbours never share a timbre; bigger robots sound lower. `playChime(option, kind)`
  (`chimePlayer.ts`) registers `chime:<id>:<kind>` on first use and plays it. Jump plays only the generic `jump` sound; the flag
  plays the option's win chime instead of the generic `win` jingle; a card pick plays its pick chime.
- **PickerScene** (`core/picker/`, generic; data `{ options, selectedId, onPlay }`): cards in 2 rows of 4 from `pickerLayout`
  (pure, tested at 844x390, 1280x800, 1024x768, 1366x512, 2400x1000 and with insets): Play (green circle, r 84) in the bottom-right
  corner inside the insets, cards at most 250x300 (at least 120) centred on the screen or pushed left of Play. Each card is a
  rounded panel in the accent colour with a front-on robot (an `AvatarDriver` fed "standing" every frame, inside a container
  scaled about 1.44 so the option's own scale still shows). A tap selects: card pop, robot hop + wave for 1.1 s (then `rest`),
  pick chime, white/yellow ring and a star badge, other cards dim (0.24 overlay). Keys (`selection.ts`, pure, tested): arrows/WASD
  move a yellow cursor (Left/Right wrap through the cards, Up/Down move a row), Enter/Space selects the cursor's card, again plays.
  Phaser re-sends queued key events when several arrive in one frame, so the scene ignores an event it has already handled.
  `?debug=1`: `window.__picker.state()` (selection, card rects, dim, Play, fps).
- **Choice storage** (`core/storage/choice.ts`): one localStorage key `athi.<universe>.choice` with the option id, every access
  in try/catch (blocked storage = nothing stored; the game still works). Task 006 migrates it into the progress record.
- **Flow** (until the map, Task 006): `?lab=1` Input Lab; `?color=<id>` straight to the level (no picker, nothing stored);
  `?picker=1`, or no stored choice and no `?level=`, shows the picker; otherwise the level with the stored option. Play stores the
  choice and opens `?level=` or Grass 1. The win screen has a palette button (top-right, r 56, hit area 123 px; key C) that reopens
  the picker and then replays the same level.

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

**Buttons:** Left and Right bottom-left (shared band split at the midpoint), Jump bottom-right. Until a button's first press it gets a
gentle `invite` pulse every 2.6 s (Jump each time, Left and Right taking turns). A tap on no button gives a `nudge` pulse to the
nearest visible button (`TouchControls.nearest`); it never moves or jumps.

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
  that cell). Gaps are missing ground. New tile kinds get new legend entries in `core/levels/format.ts`.
- **Vertical placement:** the grid's bottom row sits on the bottom of the 720-high screen; rows above the top of the grid
  are sky. Grass 1 uses 11 rows of 64 (704 px), so the top 16 px are sky. Grids taller than 720 extend above the screen.
- `controls` is the **control ladder**: `InputManager.configure` follows it, and TouchControls only shows enabled
  actions (none with `tapAnywhereJumps`). `autoRun` runs right at `runSpeed`; otherwise Left/Right move and release stops.
- `stars` (D-020): finishing = 1, `two` and `three` are coin thresholds. `runSpeed` is optional (default in physics.ts).
- `demo` (D-024, D-030): `false`, or one of two forms (mixing them is an error):
  - Tile form `{ "tiles": N, "jumpsAtTiles": [..] }` (auto-run levels). Both are grid columns, 0-based from the left edge
    (as read in the grid strings): the ghost runs until its centre reaches column `tiles` and presses Jump on entering each
    `jumpsAtTiles` column. Validation: tiles after the start column and inside the grid; every jump column after the start
    and before `tiles`; unknown fields rejected; jump columns are sorted and deduplicated.
  - Script form `{ "script": [{ "t": 300, "action": "right", "hold": 1500 }, { "t": 3300, "action": "jump" }] }`:
    `t` = ms after the demo starts, `action` = left / right / jump, `hold` = ms for Left/Right only (default 600).
    Validation (readable errors with the step number): non-empty array, `t` 0 or more and in time order (equal times allowed),
    known actions that the level enables, `hold` positive and never on jump, unknown fields rejected.

### "Watch me" demo (D-024)
`core/levels/demo.ts` (pure, tested): `createDemo(config, tile)` returns a `DemoRunner` for either form; `step(elapsedMs, x)`
gives `{ move, jump, presses, aim, done }`. `DemoScript` = tile form (always moves right). `TimedDemo` = script form: each step fires
once (even if a long frame skips past it), Left/Right stay held for `hold` (both held = stand), the finger `aim`s at the held button,
else the next one; the demo is done 600 ms after the last step finishes, and the scene also waits for the ghost to land, so it never
fades out mid-jump. Also `shouldPlayDemo`, `demoOverrideFrom`.
LevelScene modes: `demo` -> `turn` -> `play` (-> `respawn` / `finish` / `result`). In `demo` the real player is hidden
and frozen, a ghost `Player` (alpha 0.55, same `Player` class, physics and walk ramp as real play, collects no coins) moves
as scripted. Each press animates the on-screen button for its hold time (`TouchControls.animatePress(action, ms)`) and a finger
icon presses it, gliding between Left, Right and Jump and staying down while held (`demoFx.ts`); on tap-anywhere levels a ripple
appears at the character instead. The "your turn" pulse goes to the first button the demo pressed. Input is not read during the
demo; a tap or key after 1.5 s skips it. At the end the ghost fades, the camera glides back to the start, then the
"your turn" cue (bouncing arrow over the character, ripples at its feet, a button pulse and the soft `yourTurn` sound)
and the real run starts. Plays once per session per level (static set in LevelScene); `?demo=1` forces, `?demo=0` skips.

`core/levels/` (all universe-agnostic):
- `format.ts`: types, `parseLevel` (readable errors: row lengths, unknown characters with position, exactly one S/F,
  valid actions, star thresholds), `parseLevelOrThrow`.
- `grid.ts`: `extractEntities` (solid map, coins, start, flag), `mergeSolids` (few collision rectangles, no seams),
  `surfaceRow`, `findRespawn` (D-019: nearest standable column at least 3 behind the last grounded column, preferring
  ground on both sides), `starsFor`. Pure and unit-tested (`levels.test.ts`).
- `physics.ts`: the one shared tuning file (D-021): run speed 200, walk speed 220 (ramp 60 ms up / 80 ms down), gravity 1800, jump velocity 760 (peak 160 px = 2.5
  tiles, ~2.6 tiles carried at 200 px/s), max fall 1100, coyote 120 ms, jump buffer 150 ms, body 40x84. Fixed jump height.
- `LevelScene.ts`: the generic Phaser scene (Arcade physics). Started with `LevelSceneData { level, theme, option,
  onHome, onNext?, onPicker? }` from the universe, so core never imports a universe. Player = invisible 40x84 physics zone + a separate
  look (robot or ball, lively motion, see "Avatar looks" above). Camera follows by hand with a look-ahead (see "Walking");
  scenery ground extends past both level ends.
  Falls: whoosh, a cloud carries the player to the respawn spot. Flag: stop, the option's win chime, hop, confetti, `ResultScreen`.
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

Robo World routing (`universes/robo/manifest.ts`, until the world map exists): see "Avatar options and picker" for the picker
flow; `?level=<id>` any level, `?color=<id>` any option, `?demo=0|1`, `?lab=1` the Input Lab. Home goes to the Input Lab
for now. The world list is plain data in `universes/robo/worlds.ts` (Grass: grass-1, grass-2, grass-3; then Cave, Sky, Castle,
empty), and so are the options (`universes/robo/options.ts`), so tests can read both without Phaser.

Grass levels (re-paced in Task 005c, D-037: about 60% of their old length, same coin density):
Grass 1 "Tap to hop": 85 tiles, tap anywhere, no demo, 16 coins (3 at head height, two five-coin arcs, one five-coin arc over the
1-tile gap at 50 and a three-coin arc over the 1-tile gap at 66), flag at 80, stars 7/12 (was 140 tiles, 26 coins, 12/20).
Grass 2 "Big Jump button": 90 tiles, only the Jump button (taps elsewhere never jump), demo `{ tiles: 20, jumpsAtTiles: [8, 15] }`,
18 coins (3 at head height, 5 three-coin arcs that need a timed press: pressing on entering column k-1 collects the arc centred on
k), gaps at 42, 60-61 and 76-77, each with an arc 5 tiles before it, flag at 85, stars 9/15 (was 150 tiles, 30 coins, 15/25). Grass 3 "Left and Right": 70 tiles, flat, no gaps, no auto-run,
Left/Right/Jump buttons, start at column 6, 22 coins (4 to the LEFT of the start, 14 in four short trails to the right, all 18 at
head height: collected by walking and always above the buttons, Task 005b; 4 lone coins 2.5 tiles up that need a standing jump),
flag at column 64, stars 10/16 (16 needs some left or overhead coins), demo script:
right 1.5 s, left 0.9 s, one jump.

## Screen layout (D-013)
`core/ui/layout.ts`: logical height is always 720, logical width follows the screen (960..1920, D-017). `getLayout()` gives
`width`, `height`, `safeRect` (central 960x720 for gameplay-critical content), `insets` (device safe areas, logical units),
`anchor(corner, dx, dy)` for UI, and `bindToScene(scene, fn)` to re-layout on resize/rotation.

High-DPI: the canvas has `renderScale` pixels per logical unit (physical pixels / 720, in quarter steps, between 1 and 2;
`renderScaleFor` in layoutMath.ts). `bindToScene` sets the scene's main camera to zoom = renderScale with origin (0, 0),
so all game code keeps using logical coordinates. InputManager converts pointer positions back to logical units.
Rules that follow: every scene must call `layout.bindToScene`; children of a screen-fixed container need
`setScrollFactor(0, 0, true)` so Phaser hit-tests them correctly; text should use `resolution: layout.renderScale`;
camera bounds/`startFollow` assume a centred origin, so scenes scroll the camera by hand.

## Input
`core/input/InputManager` (one per scene) merges DOM pointer events (touch + mouse), keyboard and gamepads (bindings in
`core/input/bindings.ts`, D-015). API: `configure({ enabled, tapAnywhereJumps })`, `isDown`, `justPressed`, `justReleased`
(one frame), `press`/`release` events and `onPress` with timestamps. The pure state logic is `core/input/actionState.ts`
(unit-tested): every device input is a "source"; the merged state is derived after tap-anywhere mapping and enabled filtering.
`core/ui/TouchControls` draws the buttons, shows only enabled actions (none in tap-anywhere mode) and provides the hit test.
When Jump is the only button it is drawn larger (0.28 of the short edge instead of 0.22). `pulse(action, 'invite'|'nudge')`
swells the button face and spreads a ring (ignored while one is running, so mashing is harmless); `animatePress` shows a
press without input (the demo). InputManager emits `miss` for a touch that starts on no button (not in tap-anywhere mode):
LevelScene answers with a `nudge` pulse, and gives an `invite` pulse every 2.6 s until the first Jump press;
pointers are re-tested on every move, and Left/Right split their shared band at the midpoint so a sliding thumb never hits a gap.
Size comes from the short edge times `buttonScale` (`?buttonScale=` for now). Blur, visibility change and pointer cancel release everything.

## Audio
`core/audio/AudioManager` (`audio` singleton) unlocks Web Audio on the first touch/click/key. `register(id, { file?, synth?, volume? })`,
`play(id)`: plays the file if it loaded, otherwise the synth recipe (`core/audio/recipes.ts`: tap, jump, coin, win, tryAgain, whoosh, yourTurn, pick, power;
plus the per-option chimes, see "Avatar options and picker").
Never throws; a failed file logs one warning. A play request made while audio is still unlocking (the first tap both
unlocks and jumps) is queued (`pendingQueue.ts`, tested: one per id, at most 4) and played once the context runs if it is
at most 300 ms old. Per-sound cap of 3 voices and a 40 ms retrigger gap (`voiceLimiter.ts`, unit-tested);
a compressor on the master bus prevents clipping. `setMuted`, `setMasterVolume`, `state` (locked/running).
All sounds are generic synth recipes or per-option chimes; there are no voice clips (D-038). A future real sound is a file in the
universe's assets plus a `register(id, { file, synth })` entry: the synth stays the fallback.

## Storage
Task 005d: only the chosen option id (`athi.<universe>.choice`, see above). Planned for Task 006 (D-036): per-universe `{ chosenCharacterId, levelStars: Record<levelId, 0..3>, settings }`. Progress is shared across characters within a universe. Parent settings: sound on/off, button size, unlock-all.

## PWA / hosting
- GitHub Pages project site, Vite `base: '/games/'`. No router needed yet (scene-based navigation); if URLs are added later, use hash routing since Pages has no SPA fallback.
- Service worker precaches the shell and caches each universe chunk + assets on first use, so the game works offline after the first visit. Bump version to update.
- Web app manifest: `display: fullscreen`, `orientation: landscape`, installable to the home screen.
- Deploy via GitHub Actions on push to `main`.
- Asset budget: keep each universe under about 15-20 MB.

## Map and unlocking (later tasks)
World map with winding path and level dots; locked levels behind clouds; `unlock.openAtATime` levels open at a time (Robo World: 3, D-037, so all three Grass levels are open from the start); stars gate each world's final level. Evolves to a walkable map later.
