# Task 027: Auto-pause after inactivity

Design: D-070.

## Goal
If nobody touches the screen for 150 s the game pauses and lets the screen sleep; a tap resumes it.

## In scope
`shell/idle.ts` (pure, tested), `shell/idleSleep.ts`, `shell/wakeLock.ts`, `main.ts`.

## Out of scope
A parent setting for the wait, lowering the frame rate while idle.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- Chromium with `?idle=4`: sleeps, frames stop, wake lock released, a tap or key wakes it without a jump.

## Result
- What changed: see D-070.
- Deviations from plan (and why): none.
- How verified: 464 tests and the build pass; Chromium run as above, no errors.
- Open issues / risks: not on a device; the 150 s is a first guess.
- Suggested next: a parent switch for the wait if needed.
