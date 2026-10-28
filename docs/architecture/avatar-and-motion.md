# Architecture: Avatar and motion

Part of the architecture docs; the index is `docs/ARCHITECTURE.md`.

### Lively motion (Task 004b)
All character motion is visual only (the 40x84 physics body never changes) and works for every character and look.
Numbers and maths live in `core/levels/animation.ts` (`ANIM`, pure functions, unit-tested in `animation.test.ts`);
`AvatarDriver` applies them (`Player.updateAvatar` feeds it). The look's origin is at the feet, so squash and lean stay grounded.
Each look scales the shared motion with its `motion()` weights (the robot has its own bob and lean, so it uses less).
- **Run:** a stride phase advances with distance travelled on the ground (one whole number per footfall, step 56 px), so
  faster = quicker steps and standing = no stride. Per step: bounce (5 px), squash at foot-strike, stretch mid-stride,
  a forward lean (~4 deg) and an alternating rock (~2 deg). A run blend (in 160 ms, out 220 ms) fades it all in and out.
- **Air / landing:** take-off, landing, the goal-pad hop and respawn placement each start a squash/stretch `Pulse`
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
