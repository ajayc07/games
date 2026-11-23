# Task 046: Fix the Guardian's gate staying closed on a replay

## Goal
After beating the Cave Guardian the exit must always work, including on a second play of `cave-boss`.

## Result
- What changed: `LevelScene` now resets `boss`, `gate`, `gateOpen`, `hiddenGoal` and `realGoalX` with the other per-play state. The scene object is reused on a restart, so `gateOpen` stayed true from the earlier play; `openGate` returned at once, the pad stayed hidden and `goalX` stayed infinite, so he walked to the end wall and could go no further.
- Files touched: `src/core/levels/LevelScene.ts`, this file, `docs/PROGRESS.md`.
- Deviations from plan (and why): none.
- How verified: `tsc` clean; found by reading (the fields were declared but never reset). Not run in the browser, and no unit test (the scene needs Phaser). Parent to replay `cave-boss` twice.
- Open issues / risks: other per-play fields set only at declaration may have the same problem; not audited.
- Suggested next: parent replays `cave-boss` twice (win, replay, win) and confirms the gate opens each time.
