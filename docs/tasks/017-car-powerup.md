# Task 017: Car power-up and the level "Zoom Car"

Design: D-061. Step 3 of the variety plan in D-059 (the parent asked for a car instead of the ball).

## Goal
A glowing pickup that turns the robot into a little car for about 10 seconds. It should be fun and obvious, never disturb the play, and end by itself.

## In scope
- Legend `P` (car pickup, not solid); `extractEntities().pickups`.
- `core/levels/car.ts` (pure, tested), `CarSprite.ts` (code-drawn car), car and orb textures, `transform` and `transformBack` sounds.
- `LevelScene`: pickups, `startCar` / `endCar` / `updateCar`; `Player.speedScale` and `alphaWanted`.
- `car-1.json` "Zoom Car", listed after Night Walk in the Grass world.
- Tests: car unit tests, level checks, world list and unlock order.

## Out of scope
A bonus for being a car, car shots from the muzzle (Power is off in car-1), a car in the demo or in Practice, a second transformation, music.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- In the browser: touching the orb shows the car and hides the robot, speed rises, the change back happens after about 10 s, no console errors.

## Result
- What changed: see D-061 and levels.md "Car power-up".
- Deviations from plan (and why): none. Defaults (10 s, x1.25, no bonus, short new level) were chosen because the parent did not answer the questions.
- How verified: typecheck, 408 tests and build pass; Chromium on `?level=car-1&debug=1` at 1280x720 and 844x390: orb visible, touching it shows the car and hides the robot (speed 220 to 275 px/s), after 10 s he is a robot again at normal speed, no console errors. The car was then drawn 20% bigger (not re-run in the browser, size only).
- Open issues / risks: not seen on a tablet; if Power is ever enabled in a level with a car, shots still leave from the hidden robot's muzzle; the car's roof sits just under head-height coins, which the hit box still collects.
- Suggested next: tablet check, then step 4: magnet and rocket boots.
