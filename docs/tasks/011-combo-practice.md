# Task 011: Combo Practice (free play for hold-and-tap coordination)

Design is fixed in D-049; read it first. Context: Athiran loves shooting bubbles but finds it hard to hold a navigation button while pressing an action button, and combos in general. This task adds a pressure-free practice mode that trains exactly that, using what already exists (the level engine, bubbles, gaps, buttons).

## Goal
A Practice mode, always open, reached from the map. He picks one of four focuses (walk + shoot, jump + shoot, walk + jump, everything), then plays a short generated level with all four buttons where every combo he performs is celebrated and filling a row of five stars. Nothing can go wrong, nothing is saved, and every replay is a new layout.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-002, D-015, D-019, D-029, D-041, D-044, D-045, D-046, D-047, D-049), docs/ARCHITECTURE.md (Levels, Walking, Shooting/bubbles, TouchControls and button layout, Map, Settings and parent view, ResultScreen)
- Existing: `core/levels/{format,grid,LevelScene,Player,walk,shots,Blaster,bubbles,BubbleField,ResultScreen,demo}.ts`, `core/input/*` (actions, InputManager), `core/ui/{TouchControls,buttonLayout,HoldButton}.ts`, `core/picker/PickerScene.ts` and `pickerLayout.ts` (pattern for a small icon-card scene), `core/map/MapScene.ts`, `core/settings/settings.ts`, `core/parent/ParentScene.ts`, `universes/robo/{manifest,worlds}.ts`, `universes/robo/levels/grass-6.json`.

## In scope

### 1. Level generator (pure, seeded, unit-tested): `core/levels/practice.ts`
- `generatePractice(mode, seed)` returns a normal level config that passes `parseLevel` (grid with the existing legend `# . c S F o O h`, `controls.enabled: ["left","right","jump","power"]`, `autoRun: false`, `tapAnywhereJumps: false`, `demo: false`, a `practice: true` flag added to the format and validated). Same seed gives the same level; different seeds give different layouts. A small seeded RNG in the same file (no dependency).
- Length about 120 tiles (about 35-45 s of walking). Rules reused from D-045: gaps of 1 or 2 tiles only; at least 7 tiles of solid ground between gaps and between any gap and the start/flag; every gap crossable from a standing start at its edge; a bubble never sits inside a gap or within 1 tile of a gap edge; no big bubble `O` in practice; bubbles at the heights used in Grass 4-6 (small half a tile low, high `h` at 2.75 tiles); every bubble reachable by a shot from where the player can stand or jump.
- Modes and their chunk mix (a "chunk" is a 12-20 tile piece; the generator joins chunks with safe ground):
  - `walk-shoot`: long rows of small bubbles spaced 3-4 tiles apart along the path (so walking while tapping Power pops them one after another without stopping), occasional pairs behind the player's direction of travel (to reward turning), coins between.
  - `jump-shoot`: high bubbles `h` over safe ground (reachable only from the air, as in Grass 6) alternating with small bubbles, a few 1-tile gaps with a bubble just ahead of the landing.
  - `walk-jump`: gaps of 1 and 2 tiles with a coin arc each, spaced 7-8 tiles apart.
  - `everything`: a shuffled mix of the three chunk kinds.
- Tests: determinism, different seeds differ, parse validity for 200 seeds per mode, the D-045 spacing rules for every generated gap, reachability of every bubble (reuse the Grass 6 height check: shot height standing vs from a jump peak), length bounds, and that each mode contains its focus content (walk-shoot at least 15 small bubbles, jump-shoot at least 6 high bubbles, walk-jump at least 5 gaps).

### 2. Combo detection and reward (pure core plus scene effects)
- `ComboTracker` (pure, tested): input per frame `{ left, right, jump, power, airborne, jumpPressed, powerPressed }` and the mode; emits a combo event when `power` or `jump` is pressed (edge) while a navigation button is held (held at the press frame or within the previous 120 ms, to forgive thumb timing), or when `power` is pressed while `airborne`. A mode may restrict which events count (`walk-shoot`: nav + Power; `jump-shoot`: Power while airborne; `walk-jump`: nav + Jump; `everything`: all). A minimum gap of about 400 ms between counted combos so mashing cannot fill the row instantly.
- Reward when a combo counts: sparkle burst on the two buttons involved (the held nav button and the action button), a short happy sound (new synth recipe `combo`, rising two-note, a little higher for each combo in the current row), the next star in a row of five at the top of the screen fills with a pop. When the fifth star fills: a small celebration (coin shower or confetti, a happy jingle, the avatar's win pose for about a second, the walk is not interrupted) and the row empties to start again. No numbers, no text, nothing is ever lost or reduced.
- Gentle coaching: if no combo has counted for about 8 s while the player is in a stretch where one is possible, show the ghost-hand hint: a finger holds on the nav button in the direction of travel (the button shows its pressed look and a ring fills) and a second finger taps the action button twice (button pulse); icons only, about 2.5 s, then quiet for at least 20 s (and quiet while the avatar is moving through a gap or the level has not started). Stops at once when a combo happens. Never covers the avatar.

### 3. Walk assist (practice only)
- Setting `walkAssist` (`off` default | `sticky`), saved in the record's `settings` like the other settings (validated on load; optional field, no version bump; precedence URL `?assist=sticky|off`, then saved, then default). Add a row to the parent view ("Walk assist in Practice": Off / Sticky), reflected in the preview text only.
- Behaviour when `sticky` and the level is a practice level: a quick press on Left or Right (released within about 250 ms) latches walking in that direction; tapping the same button again stops; tapping the other button reverses; a longer hold behaves as normal (walks while held and stops on release; a hold also cancels any latch). Falls and the float-back cancel the latch. Implemented in pure logic (e.g. `core/levels/stickyWalk.ts`) between the InputManager state and `Player.step`; normal levels never use it. Tests for every transition.

### 4. Flow and UI
- Map: a fixed icon button (a simple pictogram of two buttons pressed together, at least 96 px hit area, away from the gear, the palette and the dots, inside the insets, with a gentle idle bob) that opens the mode selector. Always open, ignores `openAtATime` and `?unlock`.
- Mode selector (`core/practice/PracticeScene`, generic, icon-only, in the style of the picker): four big cards with a pictogram of the buttons involved (arrow + star, up arrow + star, arrow + up arrow, all four), each tappable with a pop and the existing `pick` sound; a big Back button. Layout is a pure function tested at the five sizes; keyboard (arrows/Enter) and `?practice=<mode>` start a run directly (testing). Modes in the URL: `walk-shoot`, `jump-shoot`, `walk-jump`, `everything`.
- A practice run is a normal LevelScene run of the generated level with the usual hold-to-exit icon, coin counter, button pulses (Jump and Power take turns as in Grass 6, the nav pair as before) and the same four-button layout/size settings. The flag at the end opens the result screen: it shows the combo stars of the run (icon row, no numbers) instead of the 1-3 stars, with Replay (a new seed, same mode), Practice (back to the selector) and Home (the map). Nothing is recorded: `recordResult` is skipped for practice levels, no stars or coins in the progress record, no unlock effects.
- No demo in practice (the coach hint replaces it). Falls follow D-019 unchanged (float-back); popped bubbles stay popped.

### 5. Docs and tests
- Unit tests as listed in sections 1-3, plus: practice levels never write progress (store untouched), result screen data for practice, `?practice=` parsing, selector layout, settings precedence for `walkAssist`.
- ARCHITECTURE.md (practice generator, combo tracker, coaching, walk assist, selector, flow, settings), PROGRESS.md (Task 011 done; roadmap; open issues; a tablet checklist: does he find the Practice button, does he understand the four cards, does he make combos, does the ghost-hand hint help, is walk assist needed, is a run too long or too short, does he enjoy the star row and celebration). Fill in this file's Result.
- One commit: `task-011: combo practice`. No attribution lines (D-016). Do not push (the parent pushes; do not offer). Include any uncommitted architect doc edits (DECISIONS.md, ARCHITECT_HANDOFF.md, IDEAS.md, this task file). Leave `.claude/launch.json` and `.claude/settings.local.json` uncommitted.

## Out of scope
Timers, numeric scores, failure or penalties, leaderboards, saving practice results, a new world or art, big bubbles or new bubble kinds, enemies, moving platforms, changes to the normal levels, to physics numbers, hit boxes or animation clips, volume sliders, new runtime dependencies.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; the banned-names test still passes.
- Map shows the Practice button at all four map sizes (844x390, 1280x800, 1024x768, 2400x1000) without overlapping the gear, palette, dots or insets; it opens the selector; the four cards run the four modes (`?practice=<mode>` too); selector layout at all five sizes (adds 1366x512); screenshots in `_sources/review/011/` (not committed).
- Generator: for 200 seeds per mode every level parses, obeys the spacing and reachability rules, and a scripted bot finishes it (walk, shoot and jump as needed) with all coins collectable; two different seeds produce different grids; the same seed the same grid.
- Combos: in each mode a bot that does the focus combo gets combo events and fills the star row, with the celebration at five; a bot that only mashes one action button without holding a nav button gets none (except Power in the air); mashing all four buttons cannot fill the row faster than the minimum gap allows; no console errors.
- Coaching: the hint appears after about 8 s without a combo, stops at once on a combo, never reappears within 20 s, and never shows during the intro or when no combo is possible (verify in tests and with frames saved to the review folder).
- Walk assist: with `?assist=sticky`, a tap latches walking and a second tap stops it; a long hold behaves normally; a fall cancels the latch; normal levels (Grass 1-6) behave exactly as before with assist on (tested); the parent view row works and persists.
- Practice never changes saved progress (verify the record before and after a run, including reaching the flag) and the result screen shows combo stars; Replay gives a different layout in the same mode.
- Regression: Grass 1-6, the map, picker and parent view still work (the existing tests and a bot pass through Grass 6 and the map).
- 58+ fps where measurable (report the headless baseline; Task 010 measured 59.8 in the parent view, Task 009 measured 51.8 blank on a busy machine), including a practice run mashing all four buttons; no console errors.

## How to verify
Playwright with touch (multi-touch: one finger holding a nav button while another taps an action button) and keyboard plus `?debug=1` (extend the test hook with the practice state: mode, seed, combo count, star row, hint state, latch). Unit tests. Screenshots of the map button, the selector, each mode mid-run, a combo sparkle, the five-star celebration, the ghost-hand hint, the result screen, the parent view row. List what could not be checked (a real tablet, his real thumbs and timing, combo sounds by ear).

## Result (Code fills in at the end)
- What changed: Combo Practice. A seeded, pure generator (`core/levels/practice.ts`) builds a normal level config (all four buttons,
  walking, `practice: true`, about 120 tiles) from 12-20-tile chunks per focus: walk + shoot (small bubbles 3-4 tiles apart, coins
  between), jump + shoot (high bubbles taking turns with small ones, a 1-tile gap with a bubble just past the landing), walk + jump
  (1-2-tile gaps 7-8 tiles apart with coin arcs), everything (shuffled mix). D-045 spacing, bubble clearances and Grass 4/6 heights hold
  for 200 seeds per mode. `ComboTracker` (120 ms nav grace, 400 ms minimum gap, per-focus kinds), `CoachTimer` (8 s / 2.5 s / 20 s),
  `StickyWalk` (250 ms tap latch) are pure and tested. `PracticeRun` draws the star row, sparkles on the two buttons, the rising
  `combo-<n>` sound, the five-star celebration (coin shower, confetti, `comboRow` jingle, win pose for 1 s while walking on) and the
  two-finger ghost hand. New selector scene (2x2 icon cards, Back, keyboard), a bobbing teal Practice button bottom-right on the map,
  a practice win screen (combo stars, Home / Practice / Replay with a new seed), `walkAssist` setting (`?assist=`, parent row
  "Walk assist in Practice" Off/Sticky), `?practice=<mode>|1` and `?seed=`. Practice never records progress (no `onResult`, plus a
  guard in LevelScene).
- Files touched: new `src/core/levels/practice.ts`, `practice.test.ts`, `stickyWalk.ts`; new `src/core/practice/` (`combo.ts`,
  `coach.ts`, `PracticeRun.ts`, `PracticeScene.ts`, `practiceLayout.ts`, `practiceResult.ts`, `icons.ts`, `practice.test.ts`,
  `layout.test.ts`); new `src/core/audio/recipes.test.ts`; changed `core/levels/{format,LevelScene,ResultScreen}.ts`,
  `core/map/MapScene.ts`, `core/ui/TouchControls.ts` (`setLatched`), `core/audio/{recipes,AudioManager}.ts`,
  `core/settings/settings.ts` (+test), `core/storage/progress.ts`, `core/parent/{ParentScene,parentLayout}.ts` (+test),
  `universes/robo/manifest.ts`; docs ARCHITECTURE, PROGRESS, this file (plus the architect's DECISIONS and ARCHITECT_HANDOFF edits).
- Deviations from plan (and why):
  1. "Occasional pairs behind the player's direction of travel": the generated levels only go right, so the turn-round reward is the
     pair of bubbles behind the start (upper row, clear of the buttons) in every mode with shooting; walk + jump has three coins there.
     Bubbles inside the run are not placed "behind" (a bubble he walks past without popping becomes one anyway).
  2. Coach "possible" is judged by place (play mode, not within a tile of a gap, not on the cloud, not in the last 2 tiles), not by a
     bubble being in reach. The hand is hidden for any frame a finger would cover the avatar (never happened in tests).
  3. Practice win screen shows one star per combo, 5 slots (10, in two rows, when more than five), no numbers; with no combos the
     5 slots stay empty. Replay is the big pulsing button (practice has no Next); key P = Practice.
  4. The in-browser bot misses only the pair behind the start (it never turns round); the unit-test bot (a kinematic copy of the
     physics) turns round and collects every coin and bubble on 800 levels.
  5. The parent row label is two lines ("Walk assist" / "in Practice"); the preview caption gains a note when Sticky.
  6. Added `walkAssistOn(level, setting)` (pure) so "Grass 1-6 never use the assist" is a unit test as well as a browser check.
  No new dependencies.
- How verified: `npm run typecheck && npm test && npm run build` pass (358 tests, banned-names test included). Playwright
  (playwright-core in a scratch folder, headless Chrome, CDP multi-touch): map button at 844x390, 1280x800, 1024x768, 2400x1000; a tap
  opens the selector; selector at the five sizes; each card / `?practice=<mode>` / keyboard starts its mode; one finger holding Right
  while another taps Power: combos count (Power alone: none; Jump with Right held in walk + shoot: not counted), 41 combos, 8
  celebrations; each mode to the flag with a bot (about 35 s, no falls, all forward coins); the record identical before and after
  (including the flag) and no practice id in storage; the win screen shows the combo stars with Home / Practice / Replay; Replay gives a
  new seed, same mode; Practice returns to the selector with the cursor on the last focus; the coach appeared 7.8 s after play started,
  stopped on a combo, next hint not before 22.5 s, no new hint in the next 12 s, fingers never over the avatar (4 frames saved);
  `?assist=sticky`: a tap latches, a second tap stops, a 600 ms hold walks and stops on release, a fall drops the latch; Grass 6 with
  `?assist=sticky` does not latch; the parent row saves Sticky and survives a reload. fps (844x390 dpr 3): blank 60.3, map 59.1,
  practice runs 60.0-60.3 average, mashing all four buttons 10 s 59.2 average (lowest 57.3, 20 combos counted, 68 turned away by the
  gap); no console errors. Screens in `_sources/review/011/` (map button, selector, mid-run per mode, combo sparkle, five-star
  celebration, ghost hand frames, result, walk assist latched, parent row). Not checked: a real tablet, his real thumbs and timing,
  the combo sounds and jingle by ear, iOS Safari, real insets (layout unit tests only).
- Open issues / risks: tuning numbers are first guesses (`COMBO`, `COACH`, `STICKY`, `PRACTICE`); the coach may show in walk + jump
  between gaps where only a nav + Jump combo makes sense (that is what it shows); one batch measured 46-57 fps while the machine was
  busy (60.3 when rerun alone). Universe chunk 156,583 -> 182,729 bytes.
- Suggested next: the docs trim (D-049), then the tablet session with the Task 011 checklist in PROGRESS.md; depending on what he
  does, tune the coach timing and decide whether walk assist should stay a parent setting.
