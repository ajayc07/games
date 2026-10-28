# Task 025: Day / night and vibration settings

Design: D-068.

## Goal
A parent setting for bright, dark or random levels, a vibration switch with a test button, and a firmer fall buzz.

## In scope
`settings.ts` (`resolveDayNight`, `resolveVibration`, `pickLook`), `progress.ts`, `haptics.ts`, `ParentScene` page 2, `parentLayout`, manifest `themeForRun`, tests.

## Out of scope
A day/night cycle inside a level, night themes for the map.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- Verified in the browser as described below.

## Result
- What changed: see D-068.
- Deviations from plan (and why): none.
- How verified: Tests pass (459); Chromium: `?time=night` and `day` give the night and grass themes, random zen gave 4 night and 4 day in 8 starts, the first play of grass-1 under random was bright 6 of 6, the parent page 2 buttons save and Test buzz calls `navigator.vibrate([160,70,160])`, Off stops the buzz.
- Open issues / risks: not on a real device yet.
- Suggested next: Phone check of the buzz; whether random is welcome as the default.
