# Task 005b: Avatar rig with Ball, Portrait and Robot looks

Do this after Task 005 is finished and committed (it touches Player and the look code).

## Goal
Give the player interchangeable "looks" so the game does not depend on having real art for every pose. Build a small code-driven rig, a Ball body, a Portrait ball and a friendly Robot, all with lively animation (idle, walk, run, jump, fall, land, win, shoot). The existing picture look stays as one option. The parent will compare them on the tablet with Athiran.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-021, D-023, D-028, D-032, D-033), docs/ARCHITECTURE.md
- Existing: `core/levels/{Player,characterLook,poses,animation,motionFx,LevelScene,demo*,ResultScreen}.ts`, `core/types.ts`, `universes/mario/manifest.ts`, `scenes/InputLabScene.ts`.
- Style reference only (do not trace or copy): `_sources/robot-reference.png` (gitignored). It shows a friendly cartoon robot: white/light-grey rounded body, dark-grey joints, cyan accents, a dark visor face with glowing cyan eyes, round ear discs, antennae with glowing tips, a hexagonal chest panel.

## In scope

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
- Files touched:
- Deviations from plan (and why):
- How verified:
- Open issues / risks:
- Suggested next:
