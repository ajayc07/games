# Task 005b: Avatar rig with Ball, Portrait and Robot looks

Do this after Task 005 is finished and committed (it touches Player and the look code).

## Goal
Give the player interchangeable "looks" so the game does not depend on having real art for every pose. Build a small code-driven rig, a Ball body, a Portrait ball and a friendly Robot, all with lively animation (idle, walk, run, jump, fall, land, win, shoot). The existing picture look stays as one option. The parent will compare them on the tablet with Athiran.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-021, D-023, D-028, D-032, D-033), docs/ARCHITECTURE.md
- Existing: `core/levels/{Player,characterLook,poses,animation,motionFx,LevelScene,demo*,ResultScreen}.ts`, `core/types.ts`, `universes/mario/manifest.ts`, `scenes/InputLabScene.ts`.
- Style reference only (do not trace or copy): `_sources/robot-reference.png` (gitignored). It shows a friendly cartoon robot: white/light-grey rounded body, dark-grey joints, cyan accents, a dark visor face with glowing cyan eyes, round ear discs, antennae with glowing tips, a hexagonal chest panel.

## In scope

### 0. Small fix carried over from Task 005 review
- Grass 3: on 16:10 screens the coins to the left of the start are partly behind the Left/Right buttons at the very start. Adjust the level data (move the start further right, for example column 9, and/or place the left coins higher or further from the button zone) so every coin is fully visible and reachable at 844x390, 1280x800, 1024x768 and 2400x1000 at level start. Keep 22 coins and the star thresholds, or adjust and note it.

### 1. The look abstraction (`core/avatar/`)
- `AvatarLook` interface used by Player and the demo ghost: create(scene, character, options), update(state), setFacing, trigger one-shot events (`jump`, `land`, `win`, `shoot`), setAlpha/tint for the ghost, destroy. Feed it a small state object: ground speed, vertical velocity, grounded, facing, distance travelled (stride phase), autoRun flag (gait), and level time.
- Refactor the current picture look (`characterLook.ts`) into one implementation of the interface with no change in behaviour or appearance.
- `?look=sprite|ball|portrait|robot` selects the look (default `sprite`, D-032). Unknown values fall back to sprite with one quiet console warning. Looks apply to the player, the demo ghost, the win screen character, the Input Lab, and the dust/shadow effects.
- Hit box, physics and level logic never depend on the look. Existing procedural squash/stretch/lean/shadow/dust from Task 004b keep working through the same hooks.

### 2. Rig building blocks
- A part is a small generated texture (draw with Phaser Graphics once at startup, cache by palette and size key, render at 2x for crispness on high-DPI) assembled in a Container tree (root at the feet). No per-frame Graphics redraws; at most about 20 display objects per avatar.
- Clip maths are pure functions of phase/time that return joint angles, offsets and expression flags (no Phaser imports) so they can be unit tested: idle, walk, run, jump (anticipation, rise), fall, land, win, shoot. Loops must be continuous at the wrap point and left/right limbs offset by half a cycle.
- Stride phase comes from distance travelled (as in 004b), so speed changes pace and standing still means no stride. Gait: use walk when `autoRun` is false, run when true. Blend between clips over about 100-160 ms; no popping.
- Expressions: normal, happy (win), blink (every 3-5 s, randomised), look direction (eyes shift toward the facing/movement direction, a few px). Facing flips with scaleX on the root; the face must read correctly mirrored.

### 3. Ball look
- A round body (about 96 px across) with soft shading and highlight, big friendly eyes with pupils, small cheeks, tiny mouth; the body rotates in proportion to distance travelled (angle = distance / radius) while the face stays upright (the face layer counter-rotates or sits on a non-rotating layer, so the eyes never roll upside down). Squash on landing, stretch on take-off, eyes look in the direction of travel, happy face on win, "shoot" = a quick mouth-open pulse plus a projectile spawn point.
- Palette and size factor come from the character (section 5).

### 4. Portrait look
- The Ball body with the character's face from its existing image placed on it as a round decal (cropped by a per-character `portrait: { x, y, radius }` in normalised image coordinates added to the manifest; choose values by eye from the 600x844 images so the face is centred and fills the disc). The decal stays upright like the ball's face. If the image is missing or fails to decode, fall back to the Ball look with eyes.
- Same animations as Ball (the decal replaces the drawn eyes; keep a subtle blink-like squash and the happy bounce on win).

### 5. Robot look
- Parts: head (wide rounded shape) with a dark visor panel and two glowing eyes (oval normally, ^ ^ arcs when happy), round ear discs with a coloured ring, one or two antennae with glowing tips that sway with a spring delay; small neck; torso (rounded) with a chest panel (hexagon or rounded square) in the accent colour; shoulder joints; upper arm and forearm as capsules; mitten hands; hips; thigh and shin capsules; rounded boots with a coloured toe cap. Standing height about 104 px (same as the picture look), pivot at the feet.
- Palette fields: body, joint, accent, visor, eye; defaults: body 0xF3F6F9, joint 0x59656F, accent 0x2FD6E0, visor 0x14232E, eye 0x4FF0FF.
- Clips: idle breathing with antenna sway and blink; walk (knees bend, arms swing opposite legs, body bobs); run (bigger swing, forward lean, bent elbows); jump (squat anticipation, arms up, legs tuck), fall (arms out, legs dangle), land (squash, arms down), win (arms up, little dance, happy eyes, antenna spin); shoot (forearm points forward, hand becomes a cannon with a small muzzle flash and recoil).
- It must read clearly at about 104 px high on a phone: bold simple shapes, no tiny details.

### 6. Character attributes (cosmetic only, in the manifest)
- Add `avatar: { palette, scale, antennae }` per character, scale within 0.9-1.15, applied to Ball, Portrait and Robot only. Suggested palettes by colour only (no emblems): Mario red accent, Luigi green, Peach pink, Toad blue with a red accent, Bowser orange (scale 1.12), Yoshi green, Donkey Kong brown (scale 1.12). Voices stay as already wired.

### 7. Shooting in the Input Lab
- In the Input Lab, Power triggers the `shoot` clip and fires a small energy ball (accent colour) that travels forward and fades; no damage or gameplay. Levels are unchanged (Power stays disabled there).

### 8. Review aids and docs
- Save review images (not committed) into `_sources/review/`: a contact sheet per look (Ball, Portrait, Robot) showing at least 8 consecutive frames each of walk, run, jump (take-off to landing), win and shoot, at 844x390 (dpr 3) and 1280x800, plus all 7 palettes of the robot side by side. The architect will review them; if the robot looks off, expect a second round of tweaks, so keep proportions and colours easy to adjust in one tuning/data file (`core/avatar/robotSpec.ts` or similar).
- Update ARCHITECTURE.md (AvatarLook, rig, looks, `?look=`, how to add a body) and PROGRESS.md (roadmap: 005b done, 006 map next; tablet checklist: which look does Athiran like best, do the eyes help him see direction, is the robot clear at that size). Fill in this file's Result.
- Unit tests: clip continuity at loop wrap, limb half-cycle offsets, blend/clamp, gait selection, look-parameter parsing and fallback, palette defaults and scale clamp, portrait rect validation.
- One commit: `task-005b: avatar rig and looks`. No `Co-Authored-By` or other attribution lines (D-016). Do not push.

## Out of scope
Real gameplay for Power/shooting, enemies, new levels, the picker, world map, persistence, new runtime dependencies, replacing the default look, changing physics.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- `?look=sprite|ball|portrait|robot` all work in Grass 1, 2 and 3, the demo ghost (translucent, same look), the win screen and the Input Lab; unknown values fall back with no errors.
- No change in sprite-look appearance or behaviour versus before this task.
- Frame sequences show: continuous walk and run cycles (no pops at loop wrap), clear anticipation/rise/fall/land on jumps, stopping and turning that blend smoothly, eyes looking in the facing direction, a happy win state, and a clear shoot with recoil in the Input Lab.
- All 7 characters render in every look with their palette and scale; Bowser and Donkey Kong are visibly bigger, Toad smaller or unchanged, but hit boxes are identical.
- 58+ fps during a full Grass 2 run and in 20-presses-per-second mashing on each look; no console errors; no per-frame texture generation.
- Portrait look gracefully falls back to the Ball look if an image fails.

## How to verify
Playwright with `?debug=1`, frame-by-frame stepping, saved contact sheets in `_sources/review/`. List what you could not check (feel on a real tablet, iOS Safari).

## Result (Code fills in at the end)
- What changed:
  - Section 0: Grass 3's 4 left coins, and also the 14 trail coins, moved up one row to head height. They are still collected by
    walking and now never sit behind any button (checked programmatically at all 4 sizes, with and without the demo). 22 coins, stars
    10/16 unchanged; the bot still gets 3 stars.
  - `core/avatar/`: `AvatarLook` interface; `AvatarDriver` (the Task 004b motion, moved out of Player); `SpriteLook` (old picture
    rendering); `BallLook` (Ball + Portrait); `RobotLook`; `createLook` / `lookFromUrl` (`?look=`); pure `clips.ts` (idle, walk, run,
    jump, fall, land, win, shoot, blending, blink, eye look, paper turn, spring, roll); `config.ts` (look parsing, palette defaults,
    scale clamp, portrait validation); `robotSpec.ts` (all tuning); `parts.ts` (Canvas 2D part textures, cached per palette);
    `portrait.ts` (face decal).
  - Player keeps physics only and drives a look through `AvatarDriver`. LevelScene builds looks for the player and the ghost and
    uses the look on the win screen. Input Lab hero = the chosen character in the chosen look; Power = shoot clip + energy ball.
  - Manifest: `avatar` (palette, scale, antennae) and `portrait` crops for all 7 characters (Bowser and DK 1.12, Luigi 1.03,
    Toad 0.92 with 1 antenna).
- Files touched:
  - New: `src/core/avatar/{types,config,clips,robotSpec,parts,portrait,AvatarDriver,SpriteLook,BallLook,RobotLook,createLook}.ts`,
    `avatar.test.ts`, `README.md`.
  - Changed: `src/core/levels/{Player,LevelScene,motionFx}.ts`, `src/core/types.ts`,
    `src/universes/mario/{characters.ts, scenes/InputLabScene.ts, levels/grass-3.json, levels/levels.test.ts}`,
    `docs/{ARCHITECTURE,PROGRESS,DECISIONS}.md`, this file.
- Deviations from plan (and why):
  - Section 0: all walking coins in Grass 3 are at head height, not only the left ones. Ground-level coins at the right screen edge
    sat behind the Jump button at level start on 3 of the 4 sizes, whatever the start column. Head height fixes it for the whole
    level. This differs from D-029's "coins at ground level"; the start stays at column 6.
  - The Task 004b motion lives in a shared `AvatarDriver` rather than inside each look, so every look gets the same stride, pulses,
    shadow and dust, and the sprite stays bit-identical. Each look sets how strongly it applies (`motion()`); the robot has its own
    bob and lean.
  - Win and jump-rise arms are a "V" (near arm up-forward, far arm up-back): straight up hid the far arm behind the head and folded
    the near one over the face. The "antenna spin" on win is a big, fast wiggle (a full spin looked broken).
  - Portrait decals are not mirrored when facing left (faces and letters stay readable); direction shows by the roll and the decal
    sliding toward the facing.
  - Robot standing height is about 98 px plus antennae (about 110 px), so with the head it reads like the 104 px pictures.
  - `docs/DECISIONS.md` (the architect's uncommitted D-034) is included in this commit.
- How verified:
  - `npm run typecheck`, `npm test` (143 tests, including 26 new avatar tests: loop continuity, half-cycle limb offsets, blend and
    clamp, gait selection, look parsing and fallback, palette defaults, scale clamp, portrait validation) and `npm run build` pass.
  - Sprite unchanged: a deterministic, frame-stepped record of 6,016 player and ghost frames (Grass 2 demo, Luigi run, a full
    Grass 1 run to the win screen, Grass 3 walking/turning/jumping, Toad mashing) was taken before the refactor; after it, 0
    differences in texture, position, rotation, scale, shadow and frame.
  - Headless Chrome with `?debug=1`, every look:
    - Grass 1, 2 and 3 run. The ghost uses the same look at alpha 0.55. Win screen shows the win pose above the dim layer.
    - Hit box is 40x84 in every look and for Bowser. No texture is created during play.
    - `?look=dragon` falls back to sprite with one warning.
    - Portrait with all images blocked shows the Ball face, with no errors.
    - Input Lab Power shows cannon and flash and fires one energy ball.
    - Full Grass 2 runs with 20/s mashing average 59.6-60 fps for every look at 844x390 (dpr 3) and 1280x800; no console errors.
  - Review sheets in `_sources/review/` (frame-stepped):
    - `ball|portrait|robot-844x390.png` and `-1280x800.png`: walk, run, jump take-off to landing, turn + stop, win and shoot.
    - `characters-all-looks.png` (7 characters x 4 looks) and `robot-palettes.png`.
  - Not checked: feel on a real tablet, iOS Safari, Athiran's reaction.
- Open issues / risks:
  - Phaser's smoothed minimum fps dipped to 52-57 at 844x390 dpr 3, from single long frames that the unchanged sprite look shows
    too (test machine).
  - Green palettes have low contrast on the green hills.
  - Portrait crops were chosen by eye.
  - Portrait shows real faces (D-032 vs D-033, see PROGRESS).
  - The robot's look may need a tuning round (`robotSpec.ts`).
- Suggested next: architect reviews the sheets; tablet session comparing looks with Athiran; then Task 006 (world map, stars,
  unlocking, storage).
