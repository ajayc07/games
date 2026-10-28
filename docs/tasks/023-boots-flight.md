# Task 023: Rocket boots fly like Iron Man

Design: D-066.

## Goal
Holding Jump with the boots on makes him fly up; letting go glides down.

## In scope
`powerups.ts` (`FLIGHT`, `flightVelocity`), `Player.flight`, `AvatarDriver.flying`, scene flames, boots-1 sky coins, zen boots sky coins, tests.

## Out of scope
A new button, flight without boots, flying through the ceiling.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- Verified in the browser as described below.

## Result
- What changed: see D-066.
- Deviations from plan (and why): none.
- How verified: Tests pass; Chromium: holding Space rose from 492 to 237 px (top of body) in 2 s at 430 px/s, release glided with the fall under 320 px/s, flames and lean visible, no errors.
- Open issues / risks: not on a real device yet.
- Suggested next: Tablet check of control feel.
