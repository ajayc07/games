# Task 044: Map the remaining gamepad buttons

Requested by the parent after testing a USB Xbox-360-type controller on a laptop (it works in the browser).

## Goal
Every face button, bumper and trigger on a standard-mapping gamepad does something useful in a level, so a child pressing any of them gets a response.

## Read first
- docs/DECISIONS.md D-015 (one input abstraction), `core/input/bindings.ts`.

## In scope
- Extend `PAD_BUTTON_BINDINGS` with Y, LB, RB, LT and RT.

## Out of scope
- Start / Back / stick presses (the menu helper and the level-exit holds use them, Task 043).
- Right stick, rebinding UI.

## Acceptance criteria
- A / Y / RT = jump, B / X / LT = power, LB = left, RB = right, plus the existing d-pad and left stick.
- No other file changes; menus unchanged.

## How to verify
- `npm run build`; try each button with a real controller.

## Result (Code fills in at the end)
- What changed: `PAD_BUTTON_BINDINGS` now maps Y (3) jump, LB (4) left, RB (5) right, LT (6) power, RT (7) jump.
- Files touched: `src/core/input/bindings.ts`, `docs/DECISIONS.md` (D-015 line), `docs/PROGRESS.md`, this file.
- Deviations from plan (and why): none.
- How verified: the parent confirmed the controller works in the browser before the change; build run (see summary). Individual new buttons not yet tried on the real pad.
- Open issues / risks: LT/RT are analog; they count as pressed at the browser's threshold (0.5 in Chrome). Mapping choice (two buttons per action) is a first guess.
- Suggested next: parent tries every button; adjust if any layout feels wrong.
