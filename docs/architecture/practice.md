# Architecture: Combo Practice

Part of the architecture docs; the index is `docs/ARCHITECTURE.md`.

## Combo Practice (D-049, Task 011)
Free play for the hold-and-tap coordination: always open, nothing saved, every run a new layout.
- **Generator** (`core/levels/practice.ts`, pure, tested): `generatePractice(mode, seed, world)` returns `{ config, gaps, chunks }`;
  `config` is a normal level (passes `parseLevel`): 11 rows like Grass 6, start at column 6, `controls.enabled` all four,
  `autoRun`/`tapAnywhereJumps`/`demo` false, `practice: true`, id `practice-<mode>-<seed>`. Seeded mulberry32 (`makeRng`), so
  the same seed gives the same grid; Replay uses `newSeed()`. About 120 tiles: chunks of 12-20 tiles until about 10 tiles before
  120, joined by 1-2 tiles of ground, then the flag (at column 112 or later, 7+ tiles after the last gap, after all content) and 4
  tiles. Behind the start: two small bubbles in the upper row (turn round to pop them), or three coins in walk + jump.
  Chunks: `shoot` (small bubbles 3-4 tiles apart in the two standing rows, coins between, no gaps), `air` (high `h` bubbles
  taking turns with small ones; usually one 1-tile gap with a small bubble 4 columns after its start, just past the landing),
  `gaps` (1- and 2-tile gaps 7-8 tiles apart, each with the Grass 5 coin arc, a walking coin between). Focus -> chunks:
  `walk-shoot` shoot, `jump-shoot` air, `walk-jump` gaps, `everything` shuffled bags of all three. Rules (D-045): gaps 1-2 tiles
  through both ground rows, 7+ tiles of ground between gaps and from the start and flag; small bubbles 2+ columns from any gap
  column, high bubbles 3+; no big bubbles; no head-height coin in the two columns after a 1-tile gap.
  `practiceFromSearch`: `?practice=<mode>` starts a run at boot, `?practice=1` the selector, `?seed=<n>` fixes the first seed.
  Tests (`practice.test.ts`): determinism, 200 seeds per mode parse and keep every rule, focus content (15+ small bubbles,
  6+ high, 5+ gaps), shot reach (Grass 4/6 heights), and a kinematic bot (walk ramp, gravity, jump, shots, coin pick-up) that
  finishes every seed with every coin and bubble and no fall, in about 35 s.
- **Combos** (`core/practice/combo.ts`, pure, tested): `ComboTracker(mode).step(frame)`; a combo is Power or Jump pressed (edge)
  while Left/Right is held or was held in the last `COMBO.navGraceMs` (120), or Power pressed while airborne. Per focus
  (`COMBO_KINDS`): walk-shoot nav + Power, jump-shoot Power in the air, walk-jump nav + Jump, everything all three. Counted combos
  are at least `minGapMs` (400) apart. Event `{ kind, nav, action, star, rowDone }`; the fifth star empties the row.
  The walk-assist latch counts as a held nav button.
- **Coach** (`core/practice/coach.ts`, pure, tested): `CoachTimer` shows the hint after `idleMs` (8 s) without a combo while one is
  possible (play mode, not on the cloud, not within a tile of a gap, not in the last 2 tiles before the flag), for `showMs` (2.5 s),
  then quiet for `quietMs` (20 s); a combo or the moment ending stops it at once. The clock starts with play. `coachTaps(mode, n)`:
  Power twice, Jump twice, Jump then Power (jump + shoot), everything takes turns.
- **Walk assist** (`core/levels/stickyWalk.ts`, pure, tested): `StickyWalk.step(now, left, right)`; a press released within
  `STICKY.tapMs` (250) latches that way, the same tap again stops, the other reverses; a longer press walks while held and
  cancels the latch; `cancel()` on a fall. Only when `walkAssistOn(level, setting)` (practice levels and `sticky`).
- **Run effects** (`core/practice/PracticeRun.ts`, used by LevelScene only on practice levels): `move()` (walk assist; the latched
  button shows pressed via `TouchControls.setLatched`), `update(frame)` every frame (combos in play, the coach), `cancelLatch()`
  on a fall, `finish()` at the flag (the row fades out for the win screen). Reward: sparkles and a ring on the nav button (Jump
  for Power in the air without one) and the action button (screen-fixed emitter), `combo-<star>` sound, the next star of the row
  of five (top centre, r 30, 76 apart) pops. Fifth star: `comboRow` jingle, confetti and a 16-coin shower from the row, `onRowDone`
  (LevelScene: the look's `win` pose for 1 s, then `rest`; physics untouched), the row empties after 0.9 s (at once if the next
  combo comes first). Ghost hand: two `drawFinger` fingers, one glides onto the nav button in the facing direction and stays down
  (the button shows pressed, a yellow ring fills), the other taps the action button at 0.8 and 1.55 s (press look + nudge pulse);
  hidden for any frame a finger would cover the avatar.
- **Selector** (`core/practice/PracticeScene.ts` + `practiceLayout.ts`, pure layout tested at the five sizes with insets): four
  cards in a 2x2 grid (at most 360x300, at least 150), pictograms of the real buttons (`icons.ts`: arrow + star, up + star,
  arrow + up, all four), soft colours; Back (r 70) bottom-left. Tap: pop, `pick`, then `onPick(mode)`. Keys: arrows move a cursor
  (`moveCardFocus`), Enter/Space start, Escape/Backspace back. `?debug=1`: `window.__practice.state()`.
- **Map button**: `mapPracticeSpot` (bottom-right inside the insets, inset 96, r 60, hit 132, idle bob 6 px), below every dot,
  star slot and teaser (tested at the four map sizes), far from the gear and the palette. A tap: `pick`, a pop, `onPractice`.
  Always shown, independent of `openAtATime` and `?unlock`. `__map.state().practice`.
- **Flow** (`universes/robo/manifest.ts`): map -> selector (`openPracticeSelect`, cursor on the last focus) -> `openPractice(mode,
  seed)`: a normal LevelScene run with `practice: { mode, walkAssist, onPractice }` and `onReplay` (a new seed, same mode); no
  `onResult`, no Next, no picker. LevelScene also guards with `resultHandlerFor(level, onResult)` so a practice level never records.
  Falls float back as always (D-019), popped bubbles stay popped, no demo. Win screen (`ResultScreen` with a `PracticeResult`):
  the run's combo stars (`practiceStars`: 5 slots, 10 for more than five combos, one filled per combo, no numbers), Home, Practice
  (the badge, back to the selector), Replay (big, pulsing). Keys add P = Practice.
- `?debug=1`: `__level.state().practice` (mode, walkAssist, combos, stars, rows, celebrations, ignored, lastCombo, latch, hint with
  finger boxes, avatar box), `resultStars`; `__progress.session()` adds `practiceMode` and `walkAssist`.
