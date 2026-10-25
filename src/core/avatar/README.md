# core/avatar

How the player is drawn (D-032, D-033, D-037), separate from physics. Pick a look with `?look=robot|ball`.

- `types.ts`: the `AvatarLook` interface and the per-frame `AvatarState`.
- `AvatarDriver.ts`: shared lively motion (Task 004b maths: stride, squash/stretch, lean, win bounce, shadow, dust) feeding any look.
- `RobotLook.ts` (default), `BallLook.ts`; `createLook.ts` picks one.
- `clips.ts` (pure, tested): robot clips (idle, walk, run, jump, fall, land, win, shoot), blending, blink, eye look, springs.
- `robotRig.ts` (pure, tested): the three-quarter view solver.
- `robotSpec.ts`: every proportion, colour default and clip amplitude. Tweak the robot here.
- `parts.ts`: generated part textures (Canvas 2D, once per palette). `config.ts`: `?look=`, palette/scale/antennae.
- `options.ts` (pure, tested): the universe's avatar options (colour cards, D-038): validation, `?color=`.

See docs/architecture/avatar-and-motion.md, "Avatar looks" and "Avatar options and picker".
