# Task 006: World map, stars, unlocking and saved progress

Run after Task 005c (which removes the sprite/portrait looks, fixes the robot's running view and re-paces Grass 1-2). `openAtATime` default is 3 (D-037), not 2.

## Goal
The game opens on a world map. Athiran taps a level dot, plays it, comes back to the map, and his stars and unlocked levels are remembered between visits. Includes two small carry-overs from the avatar review.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-003, D-016, D-020, D-035, D-036), docs/ARCHITECTURE.md, docs/IDEAS.md (context only, do not build)
- Existing: `core/levels/{LevelScene,ResultScreen,progression}.ts`, `core/avatar/*`, `core/storage/` (empty), `core/ui/*`, `universes/mario/{manifest,worlds,themes,characters}.ts`.

## In scope

### 0. Housekeeping from the 005b review (D-035)
- **Contrast:** give the Ball and the Robot's limbs/joints a subtle light rim or soft outline so Luigi, Yoshi and Bowser stay readable on green hills. Keep the look tidy; verify with screenshots of all 7 characters in both avatar looks on the Grass theme.
- **Size knob:** one visual size factor (`avatarScale`, default 1) in the avatar config, applied to all looks (visual only; hit box unchanged), overridable with `?size=1.2` (clamped 0.8 to 1.6). Keep the character's feet on the ground and shadow/dust in proportion.

### 1. Progress storage (`core/storage/`)
- Per-universe record per D-036: `version`, `chosenCharacterId`, `look`, `levels[id] = { stars, bestCoins }`, `settings` (reserved for Task 008: soundOn, buttonScale, unlockAll).
- Backend chain: IndexedDB, then localStorage, then in-memory; each wrapped in try/catch; an unavailable or throwing backend silently falls to the next. No new dependencies.
- API: `load(universeId)`, `save(...)`, `recordResult(levelId, { stars, coins })` (keeps the best values, never lowers), `setChosenCharacter`, `setLook`. Writes are debounced/coalesced and flushed on page hide.
- Unknown `version`: use a fresh in-memory record and do not overwrite or delete the stored one.
- Pure logic (no browser APIs) is unit tested with fake backends: merge-best, fallback chain, version handling.

### 2. Unlocking (pure, unit tested)
- Per D-036: level i (in world order) is open if `i < clearedCount + openAtATime`; `unlock.openAtATime` comes from the manifest (default 3, D-037). A world may declare `finalLevelStarsRequired`; Grass does not yet. `?unlock=all` opens everything.
- Cleared means at least 1 star recorded.

### 3. Map scene (`core/map/MapScene`, generic; the universe supplies worlds and a theme)
- Horizontal scrolling map for the current world with a winding path and one dot per level. Dots show 3 star slots (filled from saved progress). Locked dots sit under a cloud. The avatar (in the chosen look and character) stands on the current dot (the furthest open uncleared level, or the last cleared one).
- Tap a dot to start the level: a big play icon and a short sound, then the level scene. Tapping a locked dot makes the cloud bump softly with a gentle sound (no text, no scolding). Keyboard for desktop: Left/Right to move the avatar between open dots with a small hop, Enter or Space to play.
- After finishing a level: back on the map the avatar hops along the path to the next dot, the cloud over the newly opened dot clears with sparkles and a happy sound, the stars on the finished dot fill in.
- Teasers: beyond the last Grass dot, show three cloud-covered signposts with simple icons for the next worlds (pipe, sky, castle). Tapping one bumps it. No gameplay.
- Everything is large and icon-only; every tap target at least 96 px. Uses the layout system (safe area, edge anchoring, high-DPI rules in ARCHITECTURE "Screen layout").
- Simple, original, code-drawn art (sky, hills, path, dots, clouds); reuse theme generators where possible.

### 4. Flow and navigation
- Start order: `?lab=1` (Input Lab) and `?level=<id>` (direct level) still bypass the map exactly as before; otherwise the map opens first.
- The win screen's Home button goes to the map; Next goes to the next level if one exists and is open; Replay restarts. On win, call `recordResult` before showing the screen, so quitting right after still keeps progress.
- In-level exit: a small home icon in a top corner that must be held for 1 second (a visible progress ring fills); a quick tap does nothing (or gives a tiny wobble). Hidden during the demo and on the win screen.
- The demo-plays-once-per-session rule stays in memory for now (the saved record is not used for it).
- Remember `chosenCharacterId` and `look` in the record; `?char=` and `?look=` override and are saved too (so the tablet remembers the last comparison). A minimal fallback character picker is NOT in scope (Task 007).

### 5. Tests and docs
- Unit tests: unlock rule (several cleared counts, `openAtATime` 1/2/3, `unlockAll`), best-merge, storage fallback chain, version handling, map position choice (current dot), hold-to-exit timing logic.
- Update ARCHITECTURE.md (storage, map, flow, size knob, contrast rim) and PROGRESS.md (Task 006 done, Task 007 next). Add a tablet checklist for the map and progress (does he tap dots? does the cloud clearing delight him? does he get lost? is the hold-to-exit working for the parent?). Fill in this file's Result.
- One commit: `task-006: world map and progress`. No `Co-Authored-By` or other attribution lines (D-016). Do not push.

## Out of scope
Character picker, parent view/settings screen, new levels/worlds, the Power button, music, walkable map, sync/export of progress, new runtime dependencies.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- Fresh start (clean storage): map shows Grass 1 and 2 open, Grass 3 under a cloud, all 0 stars; completing Grass 1 opens Grass 3; stars/coins persist after reload and survive going offline; best values never decrease.
- Storage works with IndexedDB blocked (falls to localStorage) and with both blocked (in-memory, no errors).
- `?lab=1`, `?level=grass-2`, `?unlock=all`, `?look=robot|ball`, `?char=`, `?size=` all work.
- Hold-to-exit: a 1-second hold leaves a level to the map; a tap does not; the ring is visible.
- Map layouts at 844x390, 1280x800, 1024x768, 2400x1000: dots, clouds and avatar fully visible and tappable; scrolling/centering sensible with 3 levels plus teasers.
- Contrast rims visible and tasteful on Grass for all 7 characters in both looks; `?size=1.3` keeps feet/shadow correct.
- 58+ fps on the map and in a full level; no console errors.

## How to verify
Playwright with touch and keyboard plus `?debug=1`; screenshots of the map in fresh, mid and cleared states, the unlock animation frames, and the contrast sheets saved in `_sources/review/` (not committed). List what could not be checked (real tablet, iOS Safari private mode storage).

## Result (Code fills in at the end)
- What changed:
- Files touched:
- Deviations from plan (and why):
- How verified:
- Open issues / risks:
- Suggested next:
