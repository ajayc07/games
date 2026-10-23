# Task 002: Input layer, audio manager, edge-to-edge scaling, "Input Lab"

## Goal
Build the two shared services every level will rely on (InputManager, AudioManager), switch to height-locked
edge-to-edge scaling (D-013), and add an "Input Lab" scene so the parent can test controls and button sizes on
the tablet before any real level exists.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (especially D-012..D-015), docs/ARCHITECTURE.md
- Note: the architect added D-012..D-015 to docs/DECISIONS.md and this task file, uncommitted. Include them in your commit.

## In scope

### 1. Scaling (D-013)
- Replace `Scale.FIT` with a setup where logical height is 720 and logical width flexes from 960 to 1680 based on the screen aspect ratio; the scene fills the whole screen (sky and ground reach the edges).
- Provide `core/ui/layout.ts`: exposes current `width`, `height`, `safeRect` (central 960x720 region), device safe-area insets (from CSS `env(safe-area-inset-*)`), helpers to anchor objects to corners/edges, and an `onResize` subscription. Scenes must re-layout on resize/rotation.
- Keep the portrait "rotate" overlay behaviour.

### 2. InputManager (`core/input/`)
- Actions: `left | right | jump | power` (type already in `core/types.ts`).
- Sources merged into one state: touch buttons, keyboard, gamepad (key and pad mappings in D-015).
- API (adjust names if you have better ones, but keep this shape): `isDown(action)`, `justPressed(action)`, `justReleased(action)` (valid for one frame), event emitter (`press`, `release` with action and timestamp), `update()` called per frame, `destroy()`.
- `configure({ enabled: Action[], tapAnywhereJumps: boolean })`: actions not in `enabled` are ignored from every source and their on-screen buttons are hidden. With `tapAnywhereJumps`, any tap/click/key anywhere counts as a `jump` press (used by Grass 1).
- Pure state logic (per-source down sets merged into action state, edge detection, enabled filtering) lives in a framework-free module that has unit tests (Vitest, D-014).
- Optional hook: `onPress` listener that receives `{ action, time }` so a later task can log reaction times. No storage in this task.

### 3. Touch buttons (`core/ui/TouchControls`)
- Round, high-contrast, icon-only (arrow, up-arrow/jump, star-or-bolt for power; draw with Phaser graphics, no text). Pressed state is clearly visible (scale down + brighter).
- Layout: Left and Right as a pair at bottom-left with a generous gap between them; Jump large at bottom-right; Power above or beside Jump. Respect safe-area insets.
- Size derives from the screen short edge; default roughly 22% of the short edge for Jump and about 18% for Left/Right/Power. A `buttonScale` multiplier (default 1) is supported; for now read it from the URL query `?buttonScale=1.3` (the real parent setting comes in Task 008).
- Multi-touch: handle at least 4 simultaneous pointers. Each pointer is hit-tested continuously (down, move, up, cancel), so a thumb sliding from Left to Right releases one and presses the other without lifting (D-015). A button is down while at least one pointer is on it. Pointer cancel/blur/visibilitychange must release everything (no stuck buttons).
- Hit areas slightly larger than the drawn circle (about 10%).

### 4. AudioManager (`core/audio/`)
- Single unlock on the first user gesture (touch, click, key); reuse/replace the beep helper from Task 001 instead of keeping two audio paths.
- Sound registry: `register(id, { file?: string, synth?: SynthRecipe, volume? })`; `play(id)` uses the file if it exists and loads, otherwise falls back to the generated placeholder. Missing files must never throw or log errors in the console beyond one quiet warning.
- Placeholder synth recipes for: `coin`, `jump`, `win`, `tryAgain` (gentle, never harsh), `pick`, `power`, `tap`.
- Mashing safety: per-sound voice cap (e.g. max 3 overlapping instances) and a minimum retrigger gap of about 40 ms.
- `setMuted`, `setMasterVolume`. No persistence yet.
- Expose a read-only `state` (`locked | running`) for the lab's indicator.

### 5. Input Lab scene (Mario universe, replaces PlaceholderScene as the default screen)
- Shows the touch controls, a simple character circle (no real physics): Left/Right move it, Jump makes it hop, Power plays a burst effect. Each action also plays its sound.
- A visible row of indicator lights, one per action, showing the merged `isDown` state, plus a small audio-state light (locked/running).
- Mode switcher to emulate the control ladder: keys `1`-`4` and four small tappable icons in a top corner (icons only) set: (1) tap anywhere = jump; (2) Jump only; (3) Left+Right+Jump; (4) all four. Default mode 3.
- Reachable in all builds at `/games/` for now (it is the only screen), and keep the scene as `scenes/InputLabScene.ts` so it can be hidden behind `?lab=1` later without code churn.
- Keep PlaceholderScene only if still useful; otherwise delete it.

### 6. Housekeeping
- README: short section on Input Lab and `?buttonScale=`.
- Update docs/PROGRESS.md (Task 002 done, Task 003 next, device-test instructions for the parent: what to try on the tablet, see below) and fill in this file's Result.
- One commit: `task-002: input, audio, edge-to-edge scaling, input lab`. Do not push. No `Co-Authored-By` or other attribution lines (see CLAUDE.md). Include the new `.claude/settings.json` and CLAUDE.md change in this commit.

## Out of scope
Levels, real physics, player character art, world map, character picker, parent view, persistence/storage, real sound files, gamepad rumble, any new runtime dependency.

## Acceptance criteria
- `npm ci && npm run typecheck && npm test && npm run build` all succeed (add an `npm test` script for Vitest).
- At 844x390, 1280x800 and 1366x512 viewports: no letterbox bars, ground and sky reach every edge, controls are fully on screen, nothing overlaps the safe area. Rotation or resize re-lays out correctly.
- Keyboard: arrows/WASD move, Space/Up/W jump, X/Z/Shift power. Gamepad (if testable) maps as in D-015.
- Touch simulation (Playwright with multi-touch): holding Left and pressing Jump at the same time works; sliding a pointer from Left to Right switches without a gap; pointercancel and page blur leave no stuck button.
- Mode 1: a tap anywhere hops and no buttons are shown. Mode 2: only Jump is shown. Mode 3 and 4 show the matching buttons. Disabled actions never fire from keyboard either.
- Mashing: hammering Jump 20 times per second does not stack more than the voice cap and does not freeze or distort.
- Missing sound files do not throw.
- Unit tests cover input state merging, enabled-action filtering, edge detection and tap-anywhere.

## How to verify
Run the commands above. Use Playwright/Chromium for viewports, touch and keyboard checks. In the summary, list exactly what you could not check (sound audibility, real device, gamepad hardware).

## What the parent will try on the tablet afterwards (copy into PROGRESS.md)
- Open the site, add to home screen, run in landscape.
- Modes 1 to 4: are the buttons comfortably big for small hands? Try `?buttonScale=1.3` and `?buttonScale=0.8`.
- Does a thumb slide from Left to Right feel natural? Any stuck buttons? Any audio problem on first tap?

## Result (Code fills in at the end)
- What changed:
  - Scaling (D-013): `core/ui/layout.ts` keeps logical height 720 and sets width from the screen (960..1680) through `scale.setGameSize`, re-applied by a ResizeObserver. Exposes width/height/safeRect/insets (from CSS env()), `anchor()`, `onResize`/`bindToScene`. Canvas is edge to edge (safe-area padding removed from #game). The rotate overlay is unchanged.
  - Input: pure `core/input/actionState.ts` (sources -> merged state, tap-anywhere mapping, enabled filtering, one-frame edges that also catch sub-frame taps), `bindings.ts` (D-015), `InputManager` (DOM pointer events with continuous hit-testing, keyboard, gamepad polling, `configure`, `isDown`/`justPressed`/`justReleased`, `press`/`release`/`configure` events, `onPress` with timestamps, releases everything on blur/visibilitychange/pointercancel, `reservedKeys` and `ignorePointer` options). It hooks the scene's pre-update and shutdown automatically.
  - `core/ui/TouchControls`: round icon-only buttons (orange arrows, red jump, purple star), pressed = 0.9 scale + brighter. Left/Right sit bottom-left with a 0.9r gap, Jump bottom-right, Power above Jump. Sizes are 22%/18% of the short edge times `?buttonScale=` (clamped 0.6..1.6). Hit circles are 10% larger, nearest wins, and Left/Right share one band split at the midpoint. Only enabled actions are shown, none in tap-anywhere mode.
  - Audio: `core/audio/AudioManager` (`audio` singleton): unlock on first gesture (plus a silent buffer for iOS), `register`/`play` with file-or-synth fallback, synth recipes (tap, jump, coin, win, tryAgain, pick, power), a pure `voiceLimiter` (3 voices, 40 ms gap), master gain + compressor, `setMuted`, `setMasterVolume`, `state`. Phaser's own audio is disabled (`noAudio`) so there is one audio path. `beep.ts` removed.
  - `InputLabScene` replaces PlaceholderScene (deleted): character circle with left/right movement, hand-rolled hop, power burst, a sound per action, 4 action lights plus an audio light, and 4 dot-icons top right / keys 1-4 for the ladder modes (default 3). `?debug=1` exposes `window.__lab` for tests.
  - Vitest (D-014) with `npm test`; 23 tests (input merging, enabled filtering, edges, tap-anywhere, voice limiter, width maths). README and ARCHITECTURE updated.
- Files touched: package.json, package-lock.json, vitest.config.ts, index.html, README.md, src/main.ts, src/config.ts, src/core/input/{actionState,actionState.test,bindings,InputManager}.ts, src/core/audio/{AudioManager,recipes,voiceLimiter,voiceLimiter.test}.ts (beep.ts deleted), src/core/ui/{layout,layoutMath,layoutMath.test,TouchControls,buttonScale}.ts, src/universes/mario/manifest.ts, src/universes/mario/scenes/InputLabScene.ts (PlaceholderScene.ts deleted), docs/ARCHITECTURE.md, docs/PROGRESS.md, this file; plus the architect's CLAUDE.md, docs/DECISIONS.md, .claude/settings.json.
- Deviations from plan (and why):
  1. 1366x512 shows thin side bars: that screen is 2.67:1, past D-013's 1680 cap (2.33:1), so I followed the decision rather than the acceptance line. One constant (`MAX_WIDTH` in layoutMath.ts) changes it.
  2. Left/Right hit areas meet at the midpoint instead of being plain 1.1x circles, so a sliding thumb never lands in a dead zone between them (stricter reading of "switches without a gap").
  3. Pointers are read from DOM Pointer Events rather than Phaser's input, to get pointercancel and exact per-pointer ids. Phaser input is only used for the lab's mode icons.
  4. A `?debug=1` test hook (`window.__lab`) was added; it does nothing without the query.
- How verified: clean `npm ci && npm run typecheck && npm test && npm run build` pass (23 tests). Headless Chrome via Playwright (outside the repo) against `npm run preview`:
  - Canvas fills the screen with no bars and no scroll at 844x390, 1280x800 and 1024x768. 1366x512 has bars (see deviation 1). All 4 buttons are on screen without overlap in every viewport.
  - Resizing 844x390 -> portrait -> 1280x800 re-lays out the scene and buttons.
  - All 11 key bindings map correctly. The hero moves. In mode 2, Left/X do nothing. Blur and visibilitychange release held keys.
  - Multi-touch via CDP: holding Left + Jump works, and 4 simultaneous touches work. A 12-step slide from Left to Right had no gap and no double press. Lifting the Jump finger keeps Left held (checked with synthetic PointerEvents). touchcancel and blur leave nothing stuck.
  - Modes 1-4 show the right buttons. In mode 1 a tap anywhere hops, and tapping a mode icon does not jump.
  - Audio is "locked" before the first tap and "running" after it. Mashing Jump at 20/s for 2 s peaked at 2 voices with fps 60. Missing or undecodable files and unregistered ids do not throw (one console warning).
  - Fake gamepad: d-pad, A, B, X and the stick map correctly and release.
  - `buttonScale` 0.8/1/1.3 resizes the buttons. Offline reload and Chrome installability (no errors) still pass.
  - Screenshots reviewed.
  - Not checked: sound audibility, a real device, real gamepad hardware, iOS Safari.
- Open issues / risks: side bars past 2.33:1 (deviation 1). Phaser logs "Ignored attempt to cancel a touchcancel event" on touch cancel (harmless). Canvas renders at logical resolution, so it is slightly soft on high-DPI screens. One gamepad test run in headless Chrome missed a release within 80 ms; three repeat runs were clean (frame-timing hiccup). The touch layout is untested with real small thumbs.
- Suggested next: Task 003 (level engine + Grass 1, using `configure({ enabled: ['jump'], tapAnywhereJumps: true })`). Decide on MAX_WIDTH first.
