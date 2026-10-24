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
      storage/           per-universe progress record: IndexedDB -> localStorage -> memory (store.ts)
      picker/            PickerScene (colour cards), pure selection + layout
      map/               MapScene (world map), pure unlock rule + map layout
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
  worlds: WorldDef[];             // grass, cave, sky, castle; WorldDef may set finalLevelStarsRequired
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
- **Size knob (Task 006):** `AVATAR_SIZE.avatarScale` (1) in `avatar/config.ts`, overridden by `?size=` (clamped 0.8-1.6,
  `parseSize`, `sizeFromUrl`). `createLook(..., size)` multiplies it into the look's scale, the robot's step length (feet do not
  skate), the ball's roll radius and `shadowScale`; `MotionFx(scene, depth, size)` scales the dust. Visual only: the 40x84 hit
  box never changes, and the root's origin is at the feet, so they stay on the ground. The picker passes size 1 (its cards set
  their own robot size).
- **Hill rim (Task 006, D-035):** `needsHillRim(accent)` (`avatar/config.ts`, pure, tested) is true when the accent's hue is
  within 40 deg of the hills' green (115 deg) with saturation 0.3 or more; of the eight options only `green` qualifies. Then
  `parts.ts` adds a thin light rim (white 85%) to the robot's accent parts (antenna tips, ear rings, cannon, boot toe caps)
  and a soft light ring inside the Ball's outline. Every other option is drawn exactly as before.
- **Option attributes** (the `AvatarDef` part of each option, `resolveAvatar`): palette (body, joint, accent, visor, eye; defaults
  white / dark grey / cyan / dark visor / cyan eyes), scale clamped to 0.9-1.15, antennae 0-2 (default 2). Colour only, no emblems.
  Looks take an `AvatarDef` (`createLook(scene, name, avatar, x, feet)`). Event `rest` ends a `win` (the picker's one-off wave).
- **Shooting** (Task 007): Power plays `shoot` and fires a soft orb in the accent colour from `muzzle()`; see "Shooting and
  bubbles" below. The Input Lab and the levels share the same code (`Blaster`) and numbers (`SHOT`).
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
- **Choice storage:** since Task 006 the choice lives in the progress record (`chosenCharacterId`, see "Storage").
  `core/storage/choice.ts` only reads the old 005d key `athi.<universe>.choice` once, for the migration; the key is left in place.
- **Flow** (Task 006, D-039): see "Map and flow" below.

### Map and flow (D-036, D-039, Task 006)
- **Unlock rule** (`core/map/unlock.ts`, pure, tested): `worldDots(world, record.levels, { openAtATime, unlockAll })` gives each
  level's `{ id, index, stars, cleared, open }`. Level i is open if `i < clearedCount + openAtATime` (cleared = at least 1 star,
  counted anywhere in the world); with `finalLevelStarsRequired` the world's last level also needs that many stars in the world;
  `unlockAll` opens everything. `currentDot`: the first open level not yet cleared, else the furthest cleared one.
  `newlyOpened(before, after)` drives the cloud-clearing animation; `stepOpen` the keyboard hops. `unlockFromSearch`: `?unlock=all`,
  and only with `?debug=1` an `?open=N` override of `openAtATime` (to see the unlock animation with Grass 1-3).
- **MapScene** (`core/map/`, generic; data `{ theme, dots, teasers, option, look, arrival?, onPlay, onPicker }`): one world as a
  horizontal map (`mapLayout.ts`, pure, tested): dots 300 px apart on a wavy line (y 320-440), three teaser signposts after the
  last dot; with six Grass levels the map is 2785 px wide (scrolls on every screen, the avatar's dot stays in view; tested
  with 3, 4 and 5 levels at all five screen sizes). A map narrower than the screen is centred; a wider one scrolls (drag with a finger, 14 px
  threshold so taps stay taps) and eases to keep the avatar at 42% of the screen. Sky, clouds and hills reuse
  `ParallaxBackground` and the theme textures; the path is a sandy spline, then stepping stones toward the teasers. Each dot is
  a round pad (orange open, green cleared, grey locked) with 3 star slots; a locked pad is under a theme cloud. Teaser clouds are fully opaque (Task 007), so the
  stepping stones and posts no longer show through. Tap targets:
  dots 150 px, teasers 170 px, palette button r 56 (hit 123 px, top-right). The avatar (`AvatarDriver` + `createLook` with the
  chosen option, look and `?size=`) stands on the current dot; hops are 420 ms arcs (70 px) using the driver's take-off/land.
  Tap an open dot (or Enter/Space): hop there, a green play icon pops, `pick`, then `onPlay(levelId)`. Tap a locked dot or a
  teaser: a soft shake and the `bump` sound. Left/Right: hop between open dots (`hop` sound). Arrival (back from a win): new
  stars pop in one by one (`coin`), the pad turns green, each newly opened cloud lifts away with sparkles (`unlock`), then the
  avatar hops to the new current dot. Input is ignored while it plays. `?debug=1`: `window.__map.state()`.
- **Flow** (`universes/robo/manifest.ts`): `boot` awaits `ProgressStore.open` (with the migrated 005d choice), then:
  `?lab=1` Input Lab; `?level=<id>` that level directly (with `?picker=1`: the picker first); `?picker=1`, or no saved choice
  and no `?color=`, the picker, whose Play saves the choice and opens the map; otherwise the map. `?color=<id>` is for this
  visit only (not saved; a real pick in the picker replaces it). `?look=` is saved in the record and used on later visits.
  In a level: `onResult` records the result (best values) and flushes before the win screen appears; Home (win screen) and the
  hold-to-exit icon go to the map, which then plays the arrival animation once; Next is shown only when the next level exists
  and is open after this result (`LevelSceneData.nextAvailable`); Replay restarts; the palette button opens the picker and
  then replays the level. The map's palette button opens the picker and returns to the map.
  The demo still plays once per session (in memory), not from the record.
- **Hold-to-exit** (`core/ui/hold.ts` pure + `HoldButton.ts`): a small home icon (r 40, hit 110 px) top-right in a level. Held
  1 s (a yellow ring fills) it leaves to the map; a shorter press only wobbles it; sliding off cancels. Escape held 1 s does the
  same on desktop. Hidden during the demo and the "your turn" cue and on the win screen. The level's InputManager ignores
  pointers on it (`ignorePointer`), so on tap-anywhere levels touching it never jumps.

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
  `h` high bubble (Task 009: the small picture, 4 coins, centred in its cell and raised a quarter tile, never solid).
  Gaps are missing ground. Bubbles are not ground. New tile kinds get new legend entries in `core/levels/format.ts`.
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

### Shooting and bubbles (D-041, Task 007)
- **`shots.ts`** (pure, tested): all numbers in `SHOT` (cooldown 300 ms, at most 3 in flight, 700 px/s, range 640 px, spawn delay
  40 ms so the ball leaves once the arm points forward, hit radius 14, press buffer 300 ms). `ShotCannon.update(now, dt, { pressed,
  held }, facing, muzzle)`: a press fires at once if the cooldown is over and fewer than 3 are on their way; holding repeats at the
  cooldown; a press during the cooldown (or at the cap) is kept for 300 ms, so mashing fires steadily and never loses a shot it could
  fire. The direction is the facing at the press; the ball starts at `muzzle()` and flies straight. Events: `fired` (play `shoot` +
  the `power` sound), `launched`, `expired` (end of range: fade). `consume(shot)` = it hit something. With the cap, holding fires 3
  shots 300 ms apart and the 4th about 70 ms later (when the first ends).
- **`Blaster.ts`** (Phaser): one per shooter. Draws each shot as `shotOrb` (`avatar/parts.ts`: 40 px with its halo, solid core 20 px,
  accent colour; a light rim for green accents, like the robot's) with a 3-copy fading trail that never reaches back past the muzzle;
  a shot that hits nothing fades out at the end of its range (180 ms), one that pops something puffs out. `Shooter` = `{ facing,
  muzzle(), shoot(now) }`, so levels (a `Player`) and the Input Lab (its hero) use it the same way.
- **`bubbles.ts`** (pure, tested): `BUBBLE` (picture radius 0.47 tile small / 1 tile big, 3 / 6 coins, hit circle x1.3, bob 4 px /
  2 px over 2.2 s with golden-ratio phases, pop 220 ms). `bubbleSpecs`: a big bubble is centred in its 2x2 block (bottom on the
  ground); a small one floats `smallDrop` (half a tile) below its cell centre but rests on the ground at the lowest, so the row on the
  ground gives a centre 30 px up and the row above 64 px up. Why: the shot leaves 26-78 px above the feet (both looks, every option,
  `?size=` 0.8-1.6); a bubble centred in the second row (96 px) would be out of reach for the ball and the small robots.
  `shotHitsBubble` (circle vs circle), `blockerWalls` (a big bubble's soft wall on the side the body comes from, only while they
  overlap vertically), `coinArc`, `CoinFlow` (coins appear in an arc, wait 400 ms, leave 70 ms apart, fly 380 ms to the player's
  chest, count on arrival; the coin sound at most every 140 ms; `flushAll` at the flag; demo coins `counted: false`), `PopPitch`
  (each pop within 1 s goes one step up `POP_STEPS` (pentatonic), capped at the top, then starts again).
- **`BubbleField.ts`** (Phaser): bubbles drawn once per size with Canvas 2D (translucent soft blue/white, white rim, a pink soap-film
  sheen, highlight streak and dot, no faces), behind the player. `tryHit` pops the first unpopped bubble a shot touches (scale-up and
  fade, a white ring, sparkles, `pop-<step>` sound), then its coins. `walls(body)` gives the player's extra soft walls.
- **LevelScene**: `Player.step` takes `walls` (the big bubble's soft wall, same `edgeLimit` stop as the level ends). `updateShots`
  runs every frame in every mode, so shots in flight finish their path; Power is read only in play; pops count in play and during
  the cloud ride. At the flag every coin still flying lands (`flushCoins`) before the stars are worked out. Coins from bubbles count
  for stars and `bestCoins` like grid coins (`totalCoins` = grid coins + bubble coins).
- **High bubbles** (`h`, Task 009): a small bubble worth 4 coins that is only reachable by shooting from the air. It floats
  `BUBBLE.highRise` (a quarter tile) above its cell centre; in the row 2.5 tiles over the ground its centre is 176 px up. Shot
  heights, measured in the browser at size 1 for both looks and all eight options (`SHOT_HEIGHT` in `shots.ts`): leaving the
  muzzle standing 32-49 px up; pressing Power at the top of a jump 177-205 px up (211 at the true peak). With the hit circle
  (bubble 30 x 1.3 = 39 px, shot 14 px, bob 4 px) the bubble is hit by a shot fired from the top half of a jump and never by a
  standing shot, even at `?size=1.6` (78 px). A bubble 160 px up was 1 px from missing for the biggest option at the peak, hence
  the raise. The unit test and the bot (`?level=grass-6`, 16 option/look combinations) both check this.
- **Power button**: `TouchControls` shows Power only when enabled. Without Jump it takes Jump's bottom-right slot at the solo size
  (0.28 of the screen height), purple with a yellow star; with Jump see "Input" (four-button layout).
- `?debug=1`: `__level.state()` adds `shots` (`inFlight`, `fired`, `visible`, `flying`), `ghostShots`, `bubbles` (kind, x, y, r,
  popped, coins), `pops`, `coinsFlying`, `gridCoins`, `muzzle`; `__lab.shots()`.

Robo World routing: see "Map and flow"; test params `?level=<id>`, `?color=<id>`, `?look=`, `?size=`, `?picker=1`,
`?unlock=all`, `?demo=0|1`, `?lab=1`, `?debug=1` (plus `?open=N`). The world list is plain data in `universes/robo/worlds.ts` (Grass: grass-1 .. grass-6; then Cave, Sky,
Castle, empty), and so are the options (`universes/robo/options.ts`), so tests can read both without Phaser.

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
Grass 4 "Shoot" (Task 007): 80 tiles, flat, no gaps, Left/Right/Power (no Jump), start at column 6, no grid coins. 11 small bubbles
(1 behind the start, 2 just ahead, 5 about 6 tiles apart, 3 after the big one; low ones resting on the ground, high ones 1 tile up)
and one big bubble at columns 48-49 (60%), flag at column 74: 39 coins, stars 22/34 (3 stars need 10 of the 11 small bubbles and the
big one; the big one alone gives 1 star). Demo script (about 7 s): right 0.5 s, Power, right 0.9 s, Power, left 0.9 s, Power (the
bubble behind the start), right 0.3 s.
Grass 6 "Everything" (Task 009): 80 tiles, walking, all four buttons, start at column 6, flag at column 76. Five gaps of 1, 2,
1, 2, 2 tiles at columns 20, 28-29, 37, 58-59, 67-68 with 7 or more tiles of ground between (and after the last), an opening stretch of
14 tiles with no gap (1 small bubble behind the start, 3 ahead, 3 coins to the left). 13 small bubbles (3 coins each, the low ones
resting on the ground and the upper ones 1 tile up, as in Grass 4), 3 high bubbles (4 coins each, columns 25, 33, 54, over safe
ground 3+ tiles from any gap), one big bubble at columns 48-49 (60%, 10 and 8 tiles from the nearest gaps; never within 3). Coins:
18 in gap arcs (a coin before each gap, one or two above it, one after: 3 columns after a 1-tile gap, 1 after a 2-tile gap), 3 left of
the start, 39 + 12 + 6 from bubbles = 78 in all. Stars 38 (about half) and 62 (about 80%); three stars never need the high bubbles
(66 coins without them), a run that skips every small bubble and the high ones gets 24 coins = 1 star. Popped bubbles stay popped
after a float-back (the bubble field does not depend on the player). Demo script (about 9 s plus the 0.6 s tail and the "your turn"
cue, 10 s in all): right, Power (pops the first bubble), right to the edge with a Power on the way, Jump over the first gap, Power,
right, Power.
Grass 5 "Move and Jump" (Task 008): 75 tiles, walking, Left/Right/Jump laid out exactly as in Grass 3, no Power, no bubbles, start
at column 6, flag at column 71. Six gaps of 1, 1, 2, 1, 2, 2 tiles at columns 14, 23, 32-33, 42, 51-52, 61-62, always 8 or more tiles
of ground between them (6 is the tested minimum), 14 tiles of ground before the first gap. 28 coins: 4 to
the LEFT of the start (head height), a coin arc over every gap (a coin before it, one or two above it, one after), 3 at the very end;
stars 14/22 (the bot gets all 28). The coin after a 1-tile gap sits 3 columns after the gap starts (where a jump from the edge lands):
a coin 1-2 columns after it is flown over at the apex and cannot be collected without walking back (found by the bot, tested).
Demo script (about 8.2 s): right 2.2 s to the first gap's edge, Jump + right 1 s, right 1.5 s, Jump + right 1 s over the second gap.

**Walking over gaps (Task 008, measured in the browser).** Air time 2 x 760 / 1800 = 0.844 s. A jump carries 186 px at walk speed 220
(running) and about 179-189 px from a standing start (the ramp loses about 7 px; measured 178-189). The body centre must travel
`gap - 20 px` when it starts on the edge (the far side of the 40 px body has to reach the far edge), so 1 tile needs 44 px, 2 tiles
108 px (margin 71 px, about 0.3 s of walking) and 3 tiles 172 px (margin 7 px: too tight, so gaps are 1 or 2 tiles). A body supported
by the ground overhangs by up to 20 px, so a standing player can be 20 px past the edge, which only makes a jump easier. A 1-tile gap
(64 px) is wider than the 40 px body: a stationary player with the centre between 16 and 44 px past the near edge falls in, and
walking over without a jump falls too. All six gaps were crossed from a standing start at the edge (centre 0 and 19 px past it)
with Right and Jump pressed together. Holding Right only: he falls at the first gap, floats back (about 160 px behind the gap),
walks on and falls again, in a loop (7 falls in 24 s) that is never a soft lock: a Jump at the edge crosses it at any time.

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
Where the buttons go and which one a touch hits is decided by the pure, tested `core/ui/buttonLayout.ts` (`placeButtons`,
`pickButton`). `pulse(action, 'invite'|'nudge')`
swells the button face and spreads a ring (ignored while one is running, so mashing is harmless); `animatePress` shows a
press without input (the demo). InputManager emits `miss` for a touch that starts on no button (not in tap-anywhere mode):
LevelScene answers with a `nudge` pulse, and gives an `invite` pulse every 2.6 s until the first Jump press;
pointers are re-tested on every move, and Left/Right split their shared band at the midpoint so a sliding thumb never hits a gap.
Size comes from the short edge times `buttonScale` (`?buttonScale=` for now). Blur, visibility change and pointer cancel release everything.

### Button layout (Task 009)
Diameters are fractions of the short edge (720 logical px; physical px = x screen height / 720). `buttonLayout.ts` (`BUTTON_SIZE`):

| Situation | Left, Right | Jump | Power |
|-----------|-------------|------|-------|
| Grass 1-2 (Jump only) | - | 0.28 (solo) | - |
| Grass 3, 5 (Left, Right, Jump) | 0.18 | 0.22 | - |
| Grass 4 (Left, Right, Power) | 0.18 | - | 0.28 (solo, in Jump's corner) |
| Grass 6 (all four), `?buttons=jump` (default) | 0.18 | 0.26 (corner) | 0.22 |
| Grass 6, `?buttons=power` | 0.18 | 0.22 | 0.26 (corner) |

At 844x390 the right-hand buttons are 86-102 px across physically and Left and Right 70 px. Rules: Left and Right are bottom-left, side by side with a gap of 0.9 of their
radius, margin 28 px inside the device insets; the right-hand buttons are bottom-right inside the insets. With both Jump and Power,
the primary sits in the corner and the other beside it, 48 logical px between their edges (at least 26 physical px at 844x390; 34-67
at the other sizes) and lifted by 0.3 of its radius, a gentle arc, so one thumb reaches both. Each right-hand button is at least
0.20 of the short edge. Their enlarged hit circles (x1.1) never overlap, so no touch is ambiguous (`hitCirclesOverlap`, tested),
and `pickButton` gives a touch to the nearest button whose enlarged circle holds it; Left and Right keep their shared band with no
dead zone. If a big `?buttonScale` would make the left and right clusters meet, the scale is reduced to fit (at 960 wide that starts
at about 1.2 with four buttons). `?buttons=jump|power` (`parsePrimary`, default jump) picks which right-hand button is the larger
corner one; which is better is a tablet question (the parent view of Task 010 may expose it). Quirk: with Jump in the corner,
Power sits between the left cluster and Jump, so a thumb sliding from Right to Jump crosses Power (one harmless shot) and back;
every button is released as the thumb leaves it, never two at once, nothing stays down (touch tests, CDP touch events).
The layouts of Grass 1-5 are exactly as before (tested). The Input Lab's mode 4 (all four) uses the new layout.

## Audio
`core/audio/AudioManager` (`audio` singleton) unlocks Web Audio on the first touch/click/key. `register(id, { file?, synth?, volume? })`,
`play(id)`: plays the file if it loaded, otherwise the synth recipe (`core/audio/recipes.ts`: tap, jump, coin, win, tryAgain, whoosh, yourTurn, pick, power, bump, unlock, hop, and `pop-0`..`pop-5`
(`popRecipe(step)`, Task 007);
plus the per-option chimes, see "Avatar options and picker").
Never throws; a failed file logs one warning. A play request made while audio is still unlocking (the first tap both
unlocks and jumps) is queued (`pendingQueue.ts`, tested: one per id, at most 4) and played once the context runs if it is
at most 300 ms old. Per-sound cap of 3 voices and a 40 ms retrigger gap (`voiceLimiter.ts`, unit-tested);
a compressor on the master bus prevents clipping. `setMuted`, `setMasterVolume`, `state` (locked/running).
All sounds are generic synth recipes or per-option chimes; there are no voice clips (D-038). A future real sound is a file in the
universe's assets plus a `register(id, { file, synth })` entry: the synth stays the fallback.

## Storage (D-036, Task 006)
`core/storage/progress.ts` (pure, tested): one record per universe, key `athi.<universe>.progress`:
`{ version: 1, chosenCharacterId (a colour id or null), look (or null), levels: { [id]: { stars 0-3, bestCoins } }, settings }`
(`settings` is reserved for the parent view: soundOn, buttonScale, unlockAll). `parseRecord` repairs bad fields and reports
`empty`, `corrupt` or `unknown-version`; `mergeResult` keeps the best stars and coins (never lowers them).
`core/storage/backends.ts`: `IndexedDbBackend` (database `athi-games`, store `kv`, every call with a 1.5 s timeout so a stuck
private mode never hangs the game), `LocalStorageBackend`, `MemoryBackend`.
`core/storage/store.ts` `ProgressStore.open(universeId, { backends?, legacyChoice? })`: reads the backends in order; the first
one that works is the write target, and if it has no record the later ones are checked too (a visit with IndexedDB blocked
saved to localStorage). A throwing backend is skipped silently; a failing write moves on to the next backend (memory last).
Unknown version: play with a fresh record in memory and never write over the stored one. Migration: no choice in the record
and the 005d key exists -> copied in (the old key stays). API: `record`, `level(id)`, `recordResult(id, { stars, coins })`
(returns before/after), `setChosenCharacter`, `setLook`; writes are coalesced (250 ms) and flushed on `pagehide` and when the
page is hidden; `flush()` never rejects. `?debug=1`: `window.__progress` (record, backend, status, flush, session).

## PWA / hosting
- GitHub Pages project site, Vite `base: '/games/'`. No router needed yet (scene-based navigation); if URLs are added later, use hash routing since Pages has no SPA fallback.
- Service worker precaches the shell and caches each universe chunk + assets on first use, so the game works offline after the first visit. Bump version to update.
- Web app manifest: `display: fullscreen`, `orientation: landscape`, installable to the home screen.
- Deploy via GitHub Actions on push to `main`.
- Asset budget: keep each universe under about 15-20 MB.
