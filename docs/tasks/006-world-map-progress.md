# Task 006: World map, stars, unlocking and saved progress

Run after Task 005d (which strips the Mario content, renames the universe to `robo`, removes character voices and adds the colour-card picker). Character ids are now colour ids (red, orange, yellow, green, teal, blue, purple, pink); `chosenCharacterId` stores one of these. The picker already exists and a first-run choice is held in a tiny localStorage key that this task migrates into the progress record; the map gets a small button to reopen the picker. `openAtATime` default is 3 (D-037), not 2.

## Goal
The game opens on a world map. Athiran taps a level dot, plays it, comes back to the map, and his stars and unlocked levels are remembered between visits. Includes two small carry-overs from the avatar review.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-003, D-016, D-020, D-035, D-036), docs/ARCHITECTURE.md, docs/IDEAS.md (context only, do not build)
- Existing: `core/levels/{LevelScene,ResultScreen,progression}.ts`, `core/avatar/*`, `core/storage/` (only `choice.ts` so far), `core/picker/*`, `core/ui/*`, `universes/robo/{manifest,worlds,themes,options,universe}.ts`.

## In scope

### 0. Housekeeping from the 005b review (D-035)
- **Contrast:** 005d already gave every option dark joints. What is left: the green option's accent is green on green hills, and the Ball look has no equivalent treatment. Add a subtle light rim or soft outline only where needed (green accent parts, Ball), without changing the other options' look. Verify with screenshots of all 8 options in both avatar looks on the Grass theme (`_sources/review/005d/options-on-grass.png` is the baseline).
- **Size knob:** one visual size factor (`avatarScale`, default 1) in the avatar config, applied to all looks (visual only; hit box unchanged), overridable with `?size=1.2` (clamped 0.8 to 1.6). Keep the character's feet on the ground and shadow/dust in proportion.

### 1. Progress storage (`core/storage/`)
- Per-universe record per D-036: `version`, `chosenCharacterId` (holds a colour id, D-038/D-039), `look`, `levels[id] = { stars, bestCoins }`, `settings` (reserved for Task 008: soundOn, buttonScale, unlockAll).
- Backend chain: IndexedDB, then localStorage, then in-memory; each wrapped in try/catch; an unavailable or throwing backend silently falls to the next. No new dependencies.
- Migration: on first load, if the record has no choice and `athi.<universe>.choice` (Task 005d, `core/storage/choice.ts`) exists, copy it into the record. Leave the old key in place (never delete). After that the record is the single source of truth and `choice.ts` becomes a thin wrapper or is removed.
- API: `load(universeId)`, `save(...)`, `recordResult(levelId, { stars, coins })` (keeps the best values, never lowers), `setChosenCharacter`, `setLook`. Writes are debounced/coalesced and flushed on page hide.
- Unknown `version`: use a fresh in-memory record and do not overwrite or delete the stored one.
- Pure logic (no browser APIs) is unit tested with fake backends: merge-best, fallback chain, version handling.

### 2. Unlocking (pure, unit tested)
- Per D-036: level i (in world order) is open if `i < clearedCount + openAtATime`; `unlock.openAtATime` comes from the manifest (default 3, D-037). A world may declare `finalLevelStarsRequired`; Grass does not yet. `?unlock=all` opens everything.
- Cleared means at least 1 star recorded.

### 3. Map scene (`core/map/MapScene`, generic; the universe supplies worlds and a theme)
- Horizontal scrolling map for the current world with a winding path and one dot per level. Dots show 3 star slots (filled from saved progress). Locked dots sit under a cloud. The avatar (in the chosen look and colour option) stands on the current dot (the furthest open uncleared level, or the last cleared one).
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
- Remember `chosenCharacterId` and `look` in the record. `?look=` overrides and is saved (so the tablet remembers the last comparison); `?color=<id>` overrides for that visit only and is not saved (as in 005d). `?char=` no longer exists.
- Picker flow (D-039): no saved choice and no `?level=` -> picker first, Play then opens the map (not Grass 1). `?picker=1` shows the picker, Play returns to the map. The map has a palette button (at least 96 px, top corner away from the dots) that opens the picker; Play returns to the map. The win-screen palette button from 005d stays (Play replays the same level). Reuse `PickerScene` as it is; no visual redesign of it.

### 5. Tests and docs
- Unit tests: unlock rule (several cleared counts, `openAtATime` 1/2/3, `unlockAll`), best-merge, storage fallback chain, version handling, map position choice (current dot), hold-to-exit timing logic.
- Update ARCHITECTURE.md (storage, map, flow, size knob, contrast rim) and PROGRESS.md (Task 006 done, Task 007 next). Add a tablet checklist for the map and progress (does he tap dots? does the cloud clearing delight him? does he get lost? is the hold-to-exit working for the parent?). Fill in this file's Result.
- One commit: `task-006: world map and progress`. The architect's uncommitted doc edits (docs/ARCHITECT_HANDOFF.md, DECISIONS.md D-039, CLAUDE.md, this task file) go into the same commit. No `Co-Authored-By` or other attribution lines (D-016). Do not push.

## Out of scope
Changes to the picker's look or behaviour beyond the flow above, gamepad support in the picker, parent view/settings screen, new levels/worlds, the Power button, music, walkable map, sync/export of progress, new runtime dependencies.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- Fresh start (clean storage): picker first, then the map with Grass 1-3 all open (`openAtATime` 3), all 0 stars, and the teaser worlds under clouds. A unit test with `openAtATime` 2 proves that Grass 3 stays under a cloud until Grass 1 is cleared, and the unlock animation can be shown with `?debug=1` plus a forced `openAtATime` override if needed; stars/coins persist after reload and survive going offline; best values never decrease.
- Storage works with IndexedDB blocked (falls to localStorage) and with both blocked (in-memory, no errors).
- `?lab=1`, `?level=grass-2`, `?unlock=all`, `?look=robot|ball`, `?color=blue`, `?picker=1`, `?size=` all work; the stored colour choice survives the migration into the record.
- Hold-to-exit: a 1-second hold leaves a level to the map; a tap does not; the ring is visible.
- Map layouts at 844x390, 1280x800, 1024x768, 2400x1000: dots, clouds and avatar fully visible and tappable; scrolling/centering sensible with 3 levels plus teasers.
- Contrast treatment visible and tasteful on Grass for all 8 options in both looks; `?size=1.3` keeps feet/shadow correct.
- 58+ fps on the map and in a full level; no console errors.

## How to verify
Playwright with touch and keyboard plus `?debug=1`; screenshots of the map in fresh, mid and cleared states, the unlock animation frames, and the contrast sheets saved in `_sources/review/` (not committed). List what could not be checked (real tablet, iOS Safari private mode storage).

## Result (Code fills in at the end)
- What changed: Progress storage (`core/storage/progress.ts` pure record/parse/best-merge, `backends.ts` IndexedDB with
  timeouts / localStorage / memory, `store.ts` ProgressStore: fallback chain, later-backend read, write failover, unknown
  version kept in memory and never overwritten, 005d choice migrated in with the old key left, 250 ms coalesced writes,
  flush on page hide). `choice.ts` is now only the legacy reader. Pure unlock rule and current dot (`core/map/unlock.ts`,
  incl. `finalLevelStarsRequired`, `?unlock=all`, `?debug=1&open=N`). Generic `core/map/MapScene` (+ pure `mapLayout.ts`):
  wavy path, pads with 3 star slots, locked pads under clouds, 3 cloud-covered teaser signposts (cave, sky, castle), avatar
  in the chosen option/look/size hopping between dots, tap/keyboard to play, soft bump for locked dots and teasers, drag
  scrolling, arrival animation (stars pop, cloud clears with sparkles, hop to the next dot), palette button. New sounds
  `bump`, `unlock`, `hop`. Flow in the manifest: picker first without a saved choice, then the map; `?lab=1` and `?level=`
  bypass; Home and hold-to-exit go to the map; Next only when the next level is open; result recorded and flushed before
  the win screen; `?look=` saved, `?color=` per visit. Hold-to-exit icon (`core/ui/hold.ts` + `HoldButton.ts`, 1 s with a
  ring, tap = wobble, Escape on desktop, ignored by the level's input). Size knob `avatarScale` / `?size=` (looks, stride,
  shadow, dust). Light rim for accents near the hills' green (only the green option) on robot accent parts and the Ball.
- Files touched: src/core/storage/{progress.ts, backends.ts, store.ts, choice.ts, progress.test.ts, choice.test.ts, README.md},
  src/core/map/{MapScene.ts, mapLayout.ts, unlock.ts, map.test.ts, README.md}, src/core/ui/{hold.ts, hold.test.ts,
  HoldButton.ts, icons.ts}, src/core/levels/{LevelScene.ts, ResultScreen.ts, motionFx.ts}, src/core/avatar/{config.ts,
  createLook.ts, RobotLook.ts, BallLook.ts, parts.ts, options.test.ts}, src/core/audio/recipes.ts, src/core/picker/PickerScene.ts,
  src/core/types.ts, src/universes/robo/{manifest.ts, scenes/InputLabScene.ts}, README.md, docs/{ARCHITECTURE.md, PROGRESS.md},
  this file; plus the architect's CLAUDE.md, docs/DECISIONS.md (D-039) and docs/ARCHITECT_HANDOFF.md, committed as given.
- Deviations from plan (and why): (1) Current dot = the FIRST open level not yet cleared (else the furthest cleared one), not
  "the furthest open uncleared level": with 3 levels open, the literal rule would put the robot on Grass 3 on a fresh start.
  (2) Teasers are cave/sky/castle (the "pipe" world was renamed Cave in 005d). (3) `?color=` with no saved choice skips the
  picker (as in 005d; it is a per-visit test override) and goes to the map. (4) `?level=` + `?picker=1` keeps the 005d/D-039
  behaviour (picker, then that level). (5) Added Escape-hold as the desktop equivalent of hold-to-exit, and hid the icon during
  the "your turn" cue as well as the demo. (6) The Input Lab now gets its option and look from the manifest (saved record /
  `?color=`) instead of reading storage itself. (7) The unlock animation can be shown with `?debug=1&open=1` (or 2).
- How verified: `npm run typecheck && npm test && npm run build` pass (205 tests: unlock rule with openAtATime 1/2/3, unlockAll
  and star gate; current dot; best-merge; parse/repair/version; fallback chain with throwing and write-failing fakes; unknown
  version never overwritten; migration; coalesced writes; map layout at the 4 sizes; hold timing incl. mashing; `?size=`; rim
  rule). Playwright on the preview build, touch + keyboard + `?debug=1`, 53 checks all passing: fresh start -> picker -> map
  with Grass 1-3 open, 0 stars, 3 teasers; tap dot -> level; win records 3 stars before the win screen; Home -> map arrival
  (stars fill, hop to Grass 2); Left/Right/Enter; reload keeps progress; worse replay keeps the best; IndexedDB used; offline
  reload (service worker) keeps progress; stored 005d choice migrated (old key kept) and skips the picker; `open=1`: locked dots
  bump, clearing Grass 1 clears Grass 2's cloud (frames saved), Grass 3 stays locked; Next hidden when the next level is
  locked; hold-to-exit (tap: no exit and no jump on tap-anywhere Grass 1; ring at 0.57 after 0.55 s; 1 s hold -> map; hidden
  in the demo and on the win screen); IndexedDB blocked -> localStorage (survives reload); both blocked -> memory, no errors;
  `?lab=1`, `?level=grass-2`, `?unlock=all`, `?look=ball|robot` (saved), `?color=blue` (not saved), `?picker=1` -> map, map
  palette -> picker -> map, `?size=1.3`. No console errors anywhere. Map at 844x390 (dpr 3), 1280x800, 1024x768, 2400x1000 in
  fresh/mid/cleared states: current dot, avatar and palette button on screen, dragging reaches the teasers. Feet stay on the
  ground at size 1, 1.3 and 1.6 (look y = body bottom). fps: blank page 60.2, map with hops 59.9, full Grass 2 run with
  mashing 59.9. Bundle: universe chunk 101,868 -> 125,446 bytes, `dist/` 1,358,453 -> 1,382,446 bytes.
  Screenshots in `_sources/review/006/` (map states and sizes, arrival, unlock frames, hold ring, win screen, contrast sheets
  for robot and ball, size close-ups).
- Open issues / risks: not tested on the real tablet or in iOS Safari private mode (IndexedDB there is guarded by a 1.5 s
  timeout and the fallback chain). Progress is per browser/device. The map scrolls a little even on wide screens (about 1885 px
  wide). Stepping stones and teaser posts show faintly through the slightly transparent clouds. Hold time (1 s) and whether
  he drags the map away need a tablet check.
- Suggested next: Task 007 (Grass 4 "Shoot", Power button gameplay); the parent view (Task 009) can then use `settings` in the
  record (soundOn, buttonScale, unlockAll) and add a "reset progress" action.
