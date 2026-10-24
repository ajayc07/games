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
      avatar/            how characters are drawn: AvatarLook (sprite, ball, portrait, robot), shared motion
      audio/             AudioManager: unlock on first gesture, placeholder beeps, voice clips
      storage/           per-universe progress + settings (IndexedDB or localStorage wrapper)
      levels/            level JSON loader/runner, control-ladder rules
      ui/                reusable big buttons, cloud/lock visuals
    universes/
      registry.ts        id -> () => import('./<id>')   (lazy loading)
      mario/
        manifest.ts      characters, worlds, unlock config
        scenes/          Phaser scenes specific to Mario universe
        levels/          level JSON files
        assets/          images/audio (placeholders first, real files later)
  public/                PWA icons, manifest bits
  docs/                  PROGRESS, DECISIONS, ARCHITECTURE, tasks/
  .github/workflows/deploy.yml
```

## Shell vs universe
- **Shell** is always loaded and small. For now there is no launcher: `main.ts` reads `config.defaultUniverse` and opens it directly. A launcher screen is added when a second universe exists.
- **Universe module** is a dynamic import, so Ben 10 files are never downloaded for Mario. Each exports a `UniverseManifest`.

```ts
type Action = 'left' | 'right' | 'jump' | 'power';

interface UniverseManifest {
  id: string;                     // 'mario'
  title: string;
  characters: CharacterDef[];     // 7 for Mario
  defaultCharacterId: string;
  worlds: WorldDef[];             // grass, pipe, sky, castle
  unlock: { openAtATime: number };// default 2..3 levels open at once
  start(game: Phaser.Game): void; // boots the universe's first scene
}

interface CharacterDef {
  id: string; name: string;
  image?: string;                 // URL from assets/ (placeholder capsule if missing); idle picture
  displayHeight?: number;         // visible height in logical px after trimming (default 104)
  color?: number;                 // placeholder capsule colour
  poses?: { idle?: PoseDef; run?: PoseDef; jump?: PoseDef;  // D-023; idle: Task 005
            runFrames?: PoseDef[]; runFps?: number }; // optional run-cycle flipbook (Task 004b)
  sounds?: { pick?: string[]; jump?: string[]; win?: string[] };  // voice clip URLs, random pick
  avatar?: { palette?: Partial<AvatarPalette>; scale?: number; antennae?: number }; // code-built looks (Task 005b)
  portrait?: { x: number; y: number; radius: number };  // face in `image` for the Portrait look (normalised)
  powerAnimation: string;         // key of a power animation; cosmetic only
}
interface PoseDef { image?: string; facing?: 'right' | 'left'; displayHeight?: number }
```
All characters share identical physics (jump height, speed). Differences are cosmetic.

### Poses (D-023)
`core/levels/characterLook.ts` loads `image` (idle) and the `run`/`jump` poses, each trimmed and pre-scaled to its
`displayHeight` (default: the character's). Fallbacks: missing or undecodable pose -> main image -> capsule.
`poses.ts` (pure, tested) picks the pose: ground + moving = run, air = jump (after 70 ms, so a bump does not flicker),
otherwise idle (standing, before the run, cloud ride); after the flag hop, `win` (the main image). `flipSign(travel, facing)` mirrors a picture so it
faces the direction of travel: a left-facing picture (Luigi's run) is mirrored when going right.
Mario's and Luigi's main images are jump poses with a raised arm, so their run poses use a smaller `displayHeight`
(86/90) to keep head and body the same size across the swap. Characters without poses use the single image everywhere.

**Idle rule (Task 005, chosen from screenshots):** standing still shows `poses.idle` if the character has one; otherwise, if the
main image doubles as the jump pose (`poses.jump.image` is the main image: Mario, Luigi), the **run picture standing still**
(no stride, only breathing); otherwise the main image. Why: with the main (jump) image as idle, Mario standing and Mario jumping
were the same picture, so a standing jump showed no change, and he looked mid-air on the ground. The run picture also means no
texture swap between standing and walking. The main image still shows on the win screen (`win` pose). A real standing picture
can be added later as `poses.idle` with no code change.

### Lively motion (Task 004b)
All character motion is visual only (the 40x84 physics body never changes) and works for every character, with one
picture or several. Numbers and maths live in `core/levels/animation.ts` (`ANIM`, pure functions, unit-tested in
`animation.test.ts`); `Player.updateSprite` applies them. The sprite's origin is at the feet, so squash and lean stay grounded.
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
- **Run flipbook (optional):** `poses.runFrames` (2 or more `PoseDef`s) plays on the ground instead of `poses.run`, at `runFps`
  (default 10) scaled by speed / the level's run speed, with the procedural motion at 45% strength. Frames are trimmed and
  scaled like poses (default height = `poses.run.displayHeight`, then the character's), so feet sit on the same line and size
  does not change; each frame has its own `facing` for mirroring. A frame that fails to decode is skipped; with fewer than
  2 usable frames the character uses `poses.run` exactly as before.
  **To add frames:** drop the files into `src/universes/<id>/assets/`, then in the manifest:
  `poses: { run: {...}, runFrames: [{ image: asset('mario-run-1.png'), facing: 'right' }, { image: asset('mario-run-2.png'), facing: 'right' }], runFps: 10 }`.
  Done; no code change.
- `?debug=1`: `__level.anim()` / `__level.ghostAnim()` give pose, frame, rotation, scales, stretch, blend, shadow and dust counts.

### Avatar looks (D-032, D-033, Task 005b)
How a character is drawn is separate from physics. `core/avatar/` holds:
- **`AvatarLook`** (`types.ts`): `root` (display object, origin at the feet), `ready`, `shadowScale`, `motion()`
  (how strongly the shared motion applies), `update(state)`, `setFacing`, `trigger('jump'|'land'|'win'|'shoot', now)`,
  `setAlpha`, `setDepth`, `setVisible`, `muzzle()` (world point where a shot leaves), `debug()`, `destroy()`.
- **`AvatarDriver`**: the Task 004b motion moved out of Player unchanged (stride phase from distance, run blend, take-off /
  landing / hop / placed pulses, breathing, lean, win bounce, shadow, dust). It turns physics facts into an `AvatarState`
  (position, lift, stretch, rotation, facing, pose, grounded, speed, vy, stride phase, run blend, gait, time) every frame.
  `Player` (levels) and the Input Lab hero both use it, so every look behaves the same everywhere. Shadow size is scaled by
  the look's `shadowScale`. Physics, the 40x84 hit box and level logic never depend on the look.
- **Looks**: `SpriteLook` (the real pictures, default; frame-for-frame identical to before, checked against a recorded
  baseline of 6,016 frames), `BallLook` (`ball`, and `portrait` with the face decal), `RobotLook`. `createLook(scene, name,
  character, x, feet)` builds one; `lookFromUrl()` reads `?look=` (unknown value: one console warning, sprite).
  LevelScene applies the look to the player, the demo ghost (same look at 55% alpha) and the win screen; the Input Lab uses it
  for its hero.
- **Rig** (`parts.ts`, `clips.ts`, `robotSpec.ts`): parts are drawn once with Canvas 2D (gradients, glow) at 2x and cached by
  palette (`av-robot-<part>-<palette>`); nothing is drawn per frame. The robot is one Container (root at the feet) with 20
  flat images; joint positions come from forward kinematics of a `RobotPose` (angles: 0 = hanging down, positive = forward;
  knees bend back, elbows forward). The lower foot is snapped to the ground while grounded, so bent knees lower the body.
  Clips are pure functions (tested): idle (breathing), walk/run (2 steps per cycle from the driver's stride phase, scaled to the
  robot's step length so feet do not skate; far limbs half a cycle behind; arms opposite the legs), jump (crouch, then arms up
  and legs tucked), fall (arms out, legs dangle, by vy), land (crouch, quick in and out), win (arms up in a V, waving, a little
  dance, happy ^ ^ eyes, antennae wiggle), shoot (near arm points forward, recoil, the hand becomes a cannon, muzzle flash).
  Blending uses linear weights (ground: idle <-> gait by run blend; air in 90 ms, out 80 ms; win in 160 ms) so cycles keep their
  full swing and nothing pops. Gait: `walk` when `autoRun` is false, `run` when true. Facing turns like a paper cut-out
  (scaleX passes through 0 in 120 ms). Eyes blink every 3-5 s and shift toward the facing and with vertical speed; antennae
  sit on a damped spring. **To tweak the robot, edit `robotSpec.ts` only.**
- **Ball**: a 96 px ball in the accent colour with a band and spots that roll (angle = distance / radius) under a fixed
  highlight; the face (eyes with pupils, cheeks, mouth) stays upright and slides toward the facing. Happy eyes and a grin on win;
  "shoot" opens the mouth. **Portrait**: the same ball with the character's face cut from its image as a round decal
  (`portrait` crop in the manifest, validated by `portraitProblems`); blink = a small squash, a wiggle on win. No image, a bad crop
  or a decode failure keeps the Ball face.
- **Character attributes** (`avatar` in the manifest, `resolveAvatar`): palette (body, joint, accent, visor, eye; defaults
  white / dark grey / cyan / dark visor / cyan eyes), scale clamped to 0.9-1.15, antennae 0-2 (default 2). Colour only, no emblems.
- **Shooting** exists only in the Input Lab: Power plays `shoot` and fires a harmless energy ball (accent colour) from `muzzle()`.
- **Adding a body:** implement `AvatarLook` (use `AvatarState`, return your `motion()` weights), add the name to `LOOK_NAMES`
  in `config.ts` and a case in `createLook.ts`. Put tuning numbers in a spec file like `robotSpec.ts`.
- `?debug=1`: `__level.anim()` / `ghostAnim()` include `look` and the look's own numbers (robot: weights, limb angles, flash,
  cannon, eye openness; ball: decal, face direction).

### Voices (D-023)
`audio.registerVoices(characterId, sounds)` (called by LevelScene) registers each clip as `voice:<id>:<slot>:<n>`
with `silentFallback`, so a missing or broken file is simply silent (the generic sounds carry on).
Voices exist for Mario, Luigi (D-023), Peach, Toad and Bowser (D-031); Yoshi and Donkey Kong use the generic sounds.
`audio.playVoice(id, slot)` picks at random (never the same clip twice in a row when there is a choice) through
`VoicePicker` (`core/audio/voices.ts`, tested): `jump` at most once per 1.5 s, `pick`/`win` unlimited.
The generic `jump` sfx always plays; `win` voice plays 350 ms after the win jingle. `pick` is registered but used by the
character picker later (Task 007).

### Walking (D-029, Task 005)
Levels with `autoRun: false` move by holding Left/Right. `walk.ts` (pure, tested): `walkDirection(left, right)` (both = stand),
`rampSpeed` (0 to walk speed in `PHYSICS.walkRampUpMs` 60 ms, back to 0 in `walkRampDownMs` 80 ms; a reversal slows to 0 then
speeds up, no sliding), `edgeLimit` (invisible walls at both grid ends: speed toward a wall fades over the last 24 px, so the player
stops softly; Arcade world bounds stay as a backstop) and `nextFacing` (facing follows the pressed direction at once, at most one
change per 90 ms, so frantic alternating never flickers the picture). Speed: `PHYSICS.walkSpeed` 220 px/s, or the level's `walkSpeed`.
`Player.step(now, { move, jumpPressed }, dtMs)` takes a direction (-1/0/1); `PlayerOptions.ramp` switches the ramp on (walk levels)
or off (auto-run: speed set at once, as before). Air control equals ground control. `Player.halt()` stops at once (flag, respawn).
Stride, lean, run pose and blends from Task 004b follow the real speed, so standing has no stride motion.

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
- `LevelScene.ts`: the generic Phaser scene (Arcade physics). Started with `LevelSceneData { level, theme, character,
  onHome }` from the universe, so core never imports a universe. Player = invisible 40x84 physics zone + a separate
  sprite (lively motion, see "Lively motion" above). Camera follows by hand with a look-ahead (see "Walking");
  scenery ground extends past both level ends.
  Falls: whoosh, a cloud carries the player to the respawn spot. Flag: stop, win sound, hop, confetti, `ResultScreen`.
  `?debug=1` exposes `window.__level` (state, scene, input, layout, audio) for tests.
- `theme.ts`: `LevelTheme` = colours for sky, hills, clouds, ground, coin, flag plus optional image files per texture
  (`ground-top`, `ground-fill`, `coin`, `flag-pole`, `flag-cloth`, `hills-far`, `hills-near`, `cloud`).
- `placeholders.ts`: generates the theme textures (and effect/capsule textures) at 2x resolution for any texture without
  a file. Real art: drop the file into the universe assets; the Mario theme already looks up `grass-ground-top.png` etc.
- `characterTexture.ts`: decodes the character image with `Image.decode()` (failure = silent capsule fallback, no console
  errors), trims transparent margins and pre-scales it to `displayHeight` x 2 for a crisp, non-shimmering sprite.
- `background.ts`: parallax sky gradient, wrapping clouds and two tiling hill strips, all screen-fixed and scrolled by hand.
- `walk.ts` (pure, tested): walking direction, speed ramp, soft level-end walls, facing hysteresis (see "Walking").
- `Player.ts`: the physics box + picture of one character (movement, buffered/coyote jump, poses and run frames,
  lively motion and shadow, flip, cloud ride). Used for the real player and the demo ghost.
- `animation.ts` (pure, tested): all motion tuning and maths. `motionFx.ts`: pooled dust emitters for the real player.
- `ResultScreen.ts` (D-025): 3 star slots filling one by one, then big icon buttons that only accept input 600 ms after
  appearing, so leftover mashing does not press them: Home (left, smaller), Replay, and Next (right, biggest, pulsing;
  only when `LevelSceneData.onNext` is given). Without Next: Replay and Home either side of the character.
  Keys: Space/Right = Next (Replay if there is no Next), R = Replay, Escape/Enter = Home.
- `progression.ts`: `nextLevelId(worlds, id)` = the next level in the same world or null (tested). The universe passes
  `onNext` from it; Next keeps the chosen character.

Mario routing (`universes/mario/manifest.ts`, until the world map exists): `/games/` opens the first Grass level;
`?level=<id>` any level, `?char=<id>` any character, `?demo=0|1`, `?lab=1` the Input Lab. Home goes to the Input Lab
for now. The world list is plain data in `universes/mario/worlds.ts` (Grass: grass-1, grass-2, grass-3), and so is the cast
(`universes/mario/characters.ts`: images, poses, voices), so tests can read both without Phaser.

Mario levels: Grass 1 "Tap to hop" (tap anywhere, no demo). Grass 2 "Big Jump button": 150 tiles, only the Jump button
(taps elsewhere never jump), demo `{ tiles: 20, jumpsAtTiles: [8, 15] }`, 30 coins (3 at head height, 9 three-coin arcs
that need a timed press: pressing on entering column k-1 collects the arc centred on k), gaps at 58, 80, 103-104,
125-126, each with an arc about 5 tiles before it, stars 15/25. Grass 3 "Left and Right": 70 tiles, flat, no gaps, no auto-run,
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
`play(id)`: plays the file if it loaded, otherwise the synth recipe (`core/audio/recipes.ts`: tap, jump, coin, win, tryAgain, pick, power).
Never throws; a failed file logs one warning. A play request made while audio is still unlocking (the first tap both
unlocks and jumps) is queued (`pendingQueue.ts`, tested: one per id, at most 4) and played once the context runs if it is
at most 300 ms old. Per-sound cap of 3 voices and a 40 ms retrigger gap (`voiceLimiter.ts`, unit-tested);
a compressor on the master bus prevents clipping. `setMuted`, `setMasterVolume`, `state` (locked/running).
Shared sounds are generic; per-character sounds (pick / jump / win) will be registered from the universe manifest.

## Storage
Per-universe keys: `{ chosenCharacterId, levelStars: Record<levelId, 0..3>, settings }`. Progress is shared across characters within a universe. Parent settings: sound on/off, button size, unlock-all.

## PWA / hosting
- GitHub Pages project site, Vite `base: '/games/'`. No router needed yet (scene-based navigation); if URLs are added later, use hash routing since Pages has no SPA fallback.
- Service worker precaches the shell and caches each universe chunk + assets on first use, so the game works offline after the first visit. Bump version to update.
- Web app manifest: `display: fullscreen`, `orientation: landscape`, installable to the home screen.
- Deploy via GitHub Actions on push to `main`.
- Asset budget: keep each universe under about 15-20 MB.

## Map and unlocking (later tasks)
World map with winding path and level dots; locked levels behind clouds; 2-3 levels open at a time (config `unlock.openAtATime`); stars gate each world's final level. Evolves to a walkable map later.
