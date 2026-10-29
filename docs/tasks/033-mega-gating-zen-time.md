# Task 033 - Mega Robo only late, rarer in zen, daily zen time limit

Status: Done (uncommitted). Decision: D-076.

## Why
Parent playtest bugs: Mega Robo appeared in early stages (made them too easy) and too often in zen; zen had no way to limit his play time.

## What changed
- `levels/mega.ts`: `megaPlan` (where the bar exists), `zenCapacity` (50 -> 75 -> 100 ... max 200, every 3 fills), stage bar fills once at 70% of coins.
- `levels/LevelScene.ts`: `plan`, `megaFills`, `barOn()`, `barCap()`; zen timer (`tickZen`, `flushZen`, moon hint, `zenTimeUp` night screen, `leaveRest`).
- `settings/zenTime.ts` (+ tests): limits 15/30/60/none, default 30, `?zenlimit=<min>`.
- Progress record: `settings.zenLimit`, `zenDay`; store `addZenTime`.
- Parent page 2: Zen time row. Map: sleeping-moon Zen button when the budget is used.

## Check
483 tests pass, build clean. Chromium: see D-076. Tablet: does the 30-minute default suit, is the night screen calm (not scary), do the Mega Robo steps feel right.
