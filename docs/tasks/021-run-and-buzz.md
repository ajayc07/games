# Task 021: Hold to run, and a buzz when he falls

Design: D-064.

## Goal
Holding an arrow makes him run (a tap stays a walk), and falling gives a short vibration.

## In scope
`core/levels/runHold.ts` (pure, tested); `Player.runOnHold`; `AvatarDriver.setGait`; `core/ui/haptics.ts`; the fall buzz in `LevelScene.startRespawn`.

## Out of scope
A parent switch for the buzz or for running, vibration on other events, running on auto-run levels or in the demo, a different run for the car.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- In the browser: a 250 ms press stays at 220 px/s with the walking legs; a long hold reaches about 319 px/s with the running legs; releasing returns to a walk; a fall calls `navigator.vibrate(90)`.

## Result
- What changed: see D-064.
- Deviations from plan (and why): none. Hold time (350 ms), run speed (x1.45) and buzz length (90 ms) are first guesses.
- How verified: typecheck, 443 tests and build pass; Chromium on Grass 5: tap 250 ms gave 220 px/s and the walk gait, a hold gave 220, 225, 255, 293, 314, 319 px/s and the run gait, release gave 0 and the walk gait, a forced fall called `navigator.vibrate(90)`, no console errors.
- Open issues / risks: not on a tablet; iOS has no vibration; the walk-to-run leg switch is a quick pose change (not blended).
- Suggested next: tablet check, then tune 350 ms / x1.45 / 90 ms if needed.
