# core/avatar

How a character is drawn (D-032, D-033), separate from physics. Pick a look with `?look=sprite|ball|portrait|robot`.

- `types.ts`: the `AvatarLook` interface and the per-frame `AvatarState`.
- `AvatarDriver.ts`: shared lively motion (Task 004b maths: stride, squash/stretch, lean, win bounce, shadow, dust) feeding any look.
- `SpriteLook.ts` (real pictures, default), `BallLook.ts` (Ball and Portrait), `RobotLook.ts`; `createLook.ts` picks one.
- `clips.ts` (pure, tested): robot clips (idle, walk, run, jump, fall, land, win, shoot), blending, blink, eye look, springs.
- `robotSpec.ts`: every proportion, colour default and clip amplitude. Tweak the robot here.
- `parts.ts`: generated part textures (Canvas 2D, once per palette). `portrait.ts`: the face decal. `config.ts`: `?look=`, palette/scale, portrait crop.

See docs/ARCHITECTURE.md, "Avatar looks".
