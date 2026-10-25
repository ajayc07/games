# Task 010: Parent view (settings the parent can change)

Run after Task 009. Design is fixed in D-047; read it first. This is the last task of the original plan. The progress record already has reserved `settings` fields (`soundOn`, `buttonScale`, `unlockAll`, see `core/storage/progress.ts`); `?buttonScale=`, `?buttons=`, `?unlock=all` and `?look=` exist as URL parameters and must keep working.

## Goal
A small, hidden parent area where the parent can switch sound on/off, change the button size (with a live preview), choose the main button for Grass 6, choose the robot look, unlock all levels, replay the demos and reset progress. A 3-year-old must not be able to reach it by accident, and nothing in it can break his saved progress by accident.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-002, D-015, D-036, D-040, D-046, D-047), docs/ARCHITECTURE.md (Storage and progress record, Map, Hold-to-exit, TouchControls and button layout, Audio)
- Existing: `core/storage/{progress,store,choice}.ts`, `core/ui/{hold,HoldButton,buttonScale,buttonLayout,TouchControls,icons}.ts`, `core/audio/AudioManager.ts` (`setMuted`), `core/map/MapScene.ts` (palette button and layout), `core/levels/unlock*.ts`/`core/map/unlock.ts`, `universes/robo/manifest.ts` (flow and boot), `core/levels/LevelScene.ts` (demo "played once" set).

## In scope

### 1. Settings module (pure core plus storage)
- One small module (e.g. `core/settings/settings.ts`) that resolves every setting as: URL parameter, then saved value, then default. Keys: `soundOn` (default true), `buttonScale` (steps 0.8, 1.0, 1.2, 1.4; any stored or URL value is clamped to 0.6-1.6 as today), `buttonsPrimary` (`jump` or `power`, default `jump`), `look` (existing record field, `robot` or `ball`), `unlockAll` (default false).
- Add `buttonsPrimary` to the record's `settings` (validated on load like the others; invalid values dropped). No version bump: the field is optional and additive; check that an existing saved record loads unchanged and that a record with an unknown version still follows the existing rule (never overwritten). Tests.
- `?unlock=all` still wins; `?buttonScale=`, `?buttons=` and `?look=` still win for that visit. A URL value is not written to the saved settings by this module (the existing `?look=` saving rule stays as it is; do not change it).
- Everything that reads these values (TouchControls via `readButtonScale`/`readButtonsPrimary`, the unlock rule, AudioManager mute, avatar look selection) goes through the module instead of reading `location.search` directly. Pure logic tested with fake storage.
- Sound off: AudioManager muted from boot (before the first sound) and live when toggled; the Input Lab respects it too. No audio unlock problems: turning sound on plays one short test chime.

### 2. Access and flow
- A small gear icon on the map (at least 96 px hit area, placed away from the palette button and the dots, inside the insets) that opens the parent view only after a 3-second hold with a visible filling ring (reuse `hold.ts` and `HoldButton`, with the 3 s duration as a constant). A quick tap only wobbles it. Mashing it does nothing harmful. Keyboard on desktop: hold `P` for 3 s on the map.
- `?parent=1` opens the parent view directly at boot (for testing; Back then goes to the map).
- The parent view is not reachable from levels, the picker, the win screen or the Input Lab. A big Back button (and Escape) returns to the map, which refreshes with any changed settings (button size is only visible in levels; unlock-all and reset visible on the map immediately).

### 3. The parent view scene (`core/parent/ParentScene`, generic, English text is fine here)
Rows, each with a short label and large controls (at least 80 px, with 24 px spacing):
1. **Sound:** On / Off switch.
2. **Button size:** four steps (Small, Normal, Large, Extra large). A live preview shows the real layout for a level with all four buttons (Left, Right, Jump, Power), drawn with `buttonLayout.ts` at the chosen scale, so the parent sees what Athiran will see; the preview updates at once.
3. **Main button (Grass 6):** Jump or Power (which is the larger, corner one); the preview reflects it.
4. **Look:** Robot or Ball (the picker for colours stays where it is).
5. **Unlock all levels:** On / Off switch.
6. **Watch-me demos:** a "Show again" button that clears the in-session "demo already played" memory, so every level's demo plays again this session. It confirms with a small tick.
7. **Reset progress:** a button held for 3 seconds (visible ring) that clears stars, best coins and the unlock record for all levels. It keeps the colour choice, the look and all settings. After it succeeds show a tick and the map will show a fresh start. A short tap only wobbles it. Nothing else can clear progress.
- Landscape layouts must work at 844x390, 1280x800, 1024x768, 1366x512 and 2400x1000: if the rows do not fit in one column at 844x390, use two columns or a vertically scrolling list (drag/swipe) with big rows; the preview, Back and the held reset button must stay reachable and tappable. Pure layout function with tests, as for the picker (`pickerLayout.ts`).
- Changes apply immediately and are saved at once (the store flushes as for results). If storage is blocked the settings still apply for the visit and nothing errors.
- Use code-drawn icons and the existing colours; keep it calm, not another game screen. No new fonts or dependencies.

### 4. Tests and docs
- Unit tests: settings precedence (URL, saved, default) for every key; clamping; invalid stored values; the record keeps working with and without `buttonsPrimary`; reset clears levels and keeps choice, look and settings; the hold-gate logic with a 3 s duration (a 2.9 s hold fails, 3 s passes, a release resets, mashing never passes); the parent layout at the five sizes and a scroll-position clamp if scrolling is used; unlock-all through the settings (not only the URL).
- ARCHITECTURE.md (settings module, parent view, precedence, flow), PROGRESS.md (Task 010 done, plan complete; update the roadmap table and "Next"; add a tablet/parent checklist: can the parent open it, does the 3 s hold stop him, does the button-size preview match the real buttons, do the saved settings survive a reload and an offline start). Fill in this file's Result.
- One commit: `task-010: parent view`. No attribution lines (D-016). Do not push (the parent pushes, as always; do not offer to push). Include any uncommitted architect doc edits (DECISIONS.md, ARCHITECT_HANDOFF.md, IDEAS.md, this task file) in the commit. Leave `.claude/launch.json` and `.claude/settings.local.json` uncommitted.

## Out of scope
Passcodes or maths gates, accounts, cloud sync, export or import of progress, usage statistics or play-time limits, per-level settings, language or accessibility options beyond button size, volume sliders, changing the colour choice here (the picker stays where it is), new levels or worlds, replay variety (parked in docs/IDEAS.md), new runtime dependencies, changes to physics, hit boxes or animation.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; the banned-names test still passes.
- On the map a quick tap on the gear only wobbles it and a 3 s hold opens the parent view; mashing the gear or the map does not open it; `?parent=1` opens it directly; it is not reachable from a level.
- Each setting works and persists: sound off silences everything including the first tap sound and survives reload; button sizes visibly change the real buttons in Grass 3 and Grass 6 (check measured radii against the preview's geometry at two sizes); Main button swaps Jump and Power in Grass 6 and persists; Look changes the avatar; Unlock all opens all six dots; "Show again" makes a demo play again in the same session; reset after a 3 s hold clears stars and unlocks and keeps colour, look and settings.
- Precedence: with a saved value set, the matching URL parameter still overrides it for that visit (`?buttonScale=`, `?buttons=`, `?unlock=all`, `?look=`), and removing the parameter returns to the saved value.
- Storage blocked (IndexedDB and localStorage): settings apply for the visit, no errors. An older saved record without the new field loads and plays as before (progress untouched).
- Layouts at all five sizes: every control visible or reachable and tappable, the preview matches the real layout, nothing overlaps the insets; screenshots of the parent view at each size plus the gear on the map saved to `_sources/review/010/` (not committed).
- 58+ fps where measurable (report the headless baseline; Task 009 measured 51.8 blank and 58.0 mashing); no console errors.

## How to verify
Playwright with touch and keyboard plus `?debug=1` (extend the test hook with the settings state, the hold progress and the parent view state); unit tests; screenshots as above. List what could not be checked (a real tablet, the gear hold with a real child, iOS Safari).

## Result
- What changed: settings module with URL/saved/default precedence and a live binding; `buttonsPrimary` in the record; `updateSettings`, `resetProgress`;
  gear (3 s hold, `P`) on the map; `?parent=1`; `ParentScene` with a pure two-column layout (no scrolling), live preview from `placeButtons`, held Reset,
  Show again (`LevelScene.forgetDemos`), Back/Escape; mute at boot; saved unlock-all; `HoldButton` options (hold time, gear icon, corner, key); `drawActionIcon` shared.
- Files touched: `src/core/settings/*`, `src/core/parent/*`, `core/storage/{progress,store}.ts`, `core/ui/{HoldButton,hold,TouchControls}.ts` (+ test), `core/map/{MapScene,unlock}.ts`, `core/levels/LevelScene.ts`, `universes/robo/manifest.ts`, `core/ui/buttonScale.ts` (removed), docs.
- Deviations from plan (and why): added `?sound=0|1` (every key needed a URL form); the parent view shows the saved value, with a note when the URL pins it; no scrolling (two columns fit at all five sizes); `buttonScale.ts` deleted (moved into the settings module); `?parent=1` is ignored with `?level=` or `?lab=`.
- How verified: typecheck, 292 tests, build; Chrome (playwright-core from a scratch folder) at 844x390: quick tap, mashing, 2.5 s and 3 s gear holds, `P` hold, Back, persistence after reload, preview radii equal the real Grass 6 radii at 1.2/power and 0.8/jump, URL precedence, unlock all (6 open dots), Reset (2.7 s keeps, 3 s clears, keeps look and settings), Show again replays the demo, muted first tap, `?sound=1`, blocked storage (memory backend, no errors); screenshots at the five sizes and the map gear in `_sources/review/010/`; no console errors; 59.8 fps in the parent view.
- Open issues / risks: not tested on a real tablet, with real insets or iOS; a held gear/Reset with a child; tap-vs-drag tolerance on choices is 24 px.
- Suggested next: the tablet session, then replay variety (D-044) or the next world.
