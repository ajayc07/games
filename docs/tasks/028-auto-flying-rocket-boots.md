# Task 028: Auto-flying rocket boots and power time bars

Design: D-071.

## Goal
Rocket boots fly him forward automatically; Left/Right become Up/Down while flying; every active power shows a time bar.

## In scope
`levels/flight.ts` (pure, tested), `Player`, `TouchControls`, `PowerBars`, `LevelScene`, `AvatarDriver`, zen boots stretch and edge fillers, boots-1 level checks.

## Out of scope
Zen double power-ups (Task 029), coin bar and Mega Robo (Task 030), a parent switch for the old hold-Jump flight.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- Chromium: boots start auto-flight, Up/Down work, Jump hidden, bar shows, landing after 12 s over plain ground.

## Result
- What changed: see D-071.
- Deviations from plan (and why): none.
- How verified: 465 tests and the build pass; Chromium run, no errors.
- Open issues / risks: feel on a real tablet; the 250 px/s speed and 12 s are first guesses.
- Suggested next: Task 029 zen double power-ups.
