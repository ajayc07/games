# Task 038: Cave enemies, the Rock Beetle and the Glow Bat

Design: D-085. Read D-002, D-080, D-082 and D-085 first. Depends on 037.

## Goal
Two new gentle enemies, a step up from the Bolt Bug (D-080) but still never able to hurt him: a tougher ground enemy and a flying one, each introduced in its own level.

## In scope
- **Reuse the Bug machinery** (`bugs.ts`, `BugField.ts`, validator, sticker rules). Generalise it to enemies by kind with per-kind data (hits, speed, patrol, size, coins, sounds); do not copy code. The Bolt Bug's numbers and behaviour must not change.
- **Rock Beetle** (ground, "a bit more powerful than the bug"): rounded grey-blue rock-shell beetle, about 1.4 tiles wide, patrol 6 tiles at 55% of his walk, **5 shots** (cracks show on the shell and it shrinks a little per hit), pops into **8 coins**. It peeks (head out, 1 s) at each end of its patrol. A touch is the same gentle bump (slide back, boing, tiny hee, 800 ms grace). One touch as Mega, car or Flash pops it. No stomp.
- **Glow Bat** (flying): small round bat with a glowing belly, slow horizontal sine patrol 4 tiles wide, about one and a half tiles above the ground, so he walks under it, jumps into its bump or shoots it. **3 shots**, pops into **6 coins**. Same gentle bump. Never dives, never chases. Hittable while he stands and while he jumps (test reach from both muzzle heights; hit circle stays full size).
- **Validator:** beetle needs a flat 6-tile patrol plus 3 tiles each side clear of gaps, blocks, pads, orbs, start and goal; bat needs 4 tiles of clear ground below and no block within its height; coins and bubbles never inside a patrol; enemies at least 6 tiles apart.
- **Levels:** `cave-2` "Rock Beetle" (2 beetles, a Flash or car orb, bubbles, about 85 tiles) and `cave-3` "Glow Bat" (3 bats and 1 beetle, about 90 tiles). Enemy coins count for stars (as D-080). No demos.
- **Stickers:** first beetle and first bat beaten each give a sticker if the catalogue allows it cleanly (saved flags kept on reset), else say so.
- **Sounds** as tone recipes (`beetleHit`, `beetlePop`, `batFlap` quiet, `batPop`) through the normal audio path.
- Hook `?enemies=0` hides all Cave enemies. Not in zen or Practice.
- Docs: `levels.md` ("Enemies" section with all numbers), PROGRESS (roadmap row, checklist), Result.
- One commit: `task-038: rock beetle, glow bat, cave-2 and cave-3`.

## Out of scope
Damage, health, lives, scary looks, dive or chase behaviour, enemy projectiles, the boss, zen, new buttons.

## Acceptance criteria
- typecheck, tests, build, banned-names pass; no image files; Bolt Bug tests unchanged and green.
- Bot finishes `cave-2` and `cave-3` ignoring enemies, shooting them, and using an orb; he can never get stuck (extend the 1-D bump test to both patrols).
- Screenshots at 844x390 and 1280x800 (`_sources/review/038/`): each enemy idle, after hits, popping into coins, bumping; clearly different from a bubble, a coin and the Bolt Bug; cute-grumpy, never scary.

## Result
- What changed:
- Files touched:
- Deviations from plan (and why):
- How verified:
- Open issues / risks:
- Suggested next: Task 039
