# Task 003: Level engine, player, and Grass 1 "Tap to hop"

## Goal
The first real playable level. A data-driven level engine, a player character with forgiving physics, and Grass 1:
auto-run, tap anywhere to jump, collect coins, reach the flag, get stars. Playable on touch and keyboard.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (especially D-002, D-013, D-017..D-021), docs/ARCHITECTURE.md
- Existing code to reuse: `core/input` (InputManager), `core/ui` (layout, TouchControls), `core/audio` (AudioManager), `universes/mario/manifest.ts` and `assets.ts`.

## In scope

### 1. Housekeeping from the Task 002 review
- Set `MAX_WIDTH` to 1920 in `src/core/ui/layoutMath.ts` and update its tests.
- High-DPI crispness: render the canvas at devicePixelRatio (cap at 2) so the character images are not soft on the tablet. Layout, input coordinates and TouchControls must remain correct. If this proves risky, make the smallest safe change, and say what you did and what you left in the summary.

### 2. Level format and loader (`core/levels/`)
- JSON `version: 1`, per D-018:
```json
{
  "version": 1,
  "id": "grass-1",
  "world": "grass",
  "title": "Tap to hop",
  "controls": { "enabled": ["jump"], "autoRun": true, "tapAnywhereJumps": true, "demo": false },
  "tileSize": 64,
  "runSpeed": 200,
  "stars": { "two": 12, "three": 20 },
  "grid": ["....", "S..F", "####"]
}
```
- Rows are equal length and top-first. The bottom ground rows sit at the bottom of the 720-high screen (12 rows of 64 = 768, so use 11 rows at 64 plus a fractional offset or choose `tileSize` and row count so the grid height is 720 or anchor the grid bottom to the screen bottom; your choice, document it).
- Pure functions (unit-tested): parse and validate (exactly one `S` and one `F`, equal row lengths, only known legend characters, `controls.enabled` only contains valid actions; return readable error messages), grid to entity lists (solid tiles, coins, start, flag), star calculation (finish = 1, `two` and `three` coin thresholds), safe-respawn spot selection (last grounded tile column at least 3 tiles behind the fall point).
- Levels live in `src/universes/mario/levels/*.json` and are loaded with `import.meta.glob`, so adding a level is a data file only. The `grass` world in the manifest lists `['grass-1']`.

### 3. Generic level scene (`core/levels/LevelScene`)
- `core/` must not import from any universe. The universe passes in a `LevelTheme` (sky colours, ground colours/textures, music later) and the chosen character (`CharacterDef` with its image URL).
- Phaser Arcade physics. Tiles are drawn from generated placeholder textures (grass-topped ground, simple coin, flag) built by the theme, so real art can replace them later by dropping files into the universe assets.
- Parallax background from simple generated shapes (soft hills, a few clouds). No text anywhere.
- Camera follows the player horizontally with a small look-ahead; world bounds match the level. The player starts inside the central 960 safe area. Re-layout correctly on resize/rotation.
- `InputManager.configure(...)` is driven by the level's `controls`. TouchControls shows only the enabled actions; with `tapAnywhereJumps` and only jump enabled, show no buttons at all (Grass 1) and any tap or key hops.

### 4. Player and feel (one shared tuning file, D-021)
- `core/levels/physics.ts` (or similar) holds run speed default, gravity, jump velocity, coyote time (~120 ms), jump buffer (~150 ms), body size. Tune so a normal jump clears a 2-tile gap with margin and peaks about 2.5 tiles high. Fixed jump height.
- Auto-run moves right at `runSpeed`. When auto-run is off (later levels), Left/Right move the player and release stops it (support it now but Grass 1 does not use it).
- Character sprite: use the character's real image (e.g. `mario.avif`) scaled to a per-character `displayHeight` (add this field to `CharacterDef`; about 96-110 px, tune per character so Toad, Bowser and Donkey Kong look similar in height to Mario; do not edit image files). Falls back to a coloured capsule if the image is missing or fails to load.
- Fake motion from one image: gentle bob while running, stretch on take-off, squash on landing, flip to face the direction of travel. Use a separate fixed hit box (about 40x84 px), not the image bounds.
- `?char=<id>` URL param selects the character for testing (default `defaultCharacterId`). The picker comes in Task 007.
- Safety: if the image is AVIF and fails to decode on some device, fall back to the capsule without errors.

### 5. Gameplay
- **Coins:** collect on touch; play `coin`; a small sparkle. HUD: coin icon plus a big numeral (numbers are fine; they are not text), top corner, inside the safe area.
- **Jump:** play `jump`; dust puff on landing.
- **Falling (D-019):** the player falling below the world triggers a soft whoosh, a small cloud floats them back to the chosen respawn spot, then play resumes. Pure logic for the spot lives in the unit-tested module.
- **First-tap hint:** until the first tap/press, show a big pulsing tap icon (a finger or circle with a ripple) near the character; hide it for good after the first jump. Icon only.
- **Flag and win:** touching the flag stops the run, plays `win`, character does a happy hop with confetti, then show 1-3 big stars filling one by one (D-020), then two large icon buttons: Replay (circular arrow) and Home (house, goes to the Input Lab for now). Buttons must be big (like game buttons) and usable by tap or keys (Space = Replay, Escape or Enter = Home).
- Mashing is harmless: tapping constantly never breaks anything and does not stack sounds beyond the existing caps.

### 6. Grass 1 level data
- About 140 tiles long (roughly 45-60 s at `runSpeed` 200). Flat ground, no walls, no enemies.
- Coins in lines and gentle arcs at jump height so random tapping collects some and well-timed taps collect more; about 24 coins total. `stars`: two = 12, three = 20.
- One or two very small gaps (1 tile wide) in the second half only, each preceded by a coin arc that invites a hop. Flag at the end on flat ground.
- Opening the app now starts Grass 1 directly. The Input Lab moves behind `?lab=1`. `?level=<id>` opens any level by id for testing.

### 7. Docs and commit
- Update ARCHITECTURE.md (level format per D-018, LevelScene/theme split, physics tuning file) and PROGRESS.md (Task 003 done, Task 004 next, a short tablet-test checklist for Grass 1: does he hop? does he understand taps do something? is the speed right, too slow or fast? any frustration at the gaps?). Fill in this file's Result.
- One commit: `task-003: level engine and grass 1`. Do not push. No `Co-Authored-By` or other attribution lines (CLAUDE.md, D-016). Include the architect's uncommitted doc edits.

## Out of scope
World map, unlocking, persistence, character picker, on-screen buttons gameplay (Task 004), demo ghost, Left/Right levels (Task 005), power effects in levels, real sounds/art, music, enemies, new runtime dependencies.

## Acceptance criteria
- `npm ci && npm run typecheck && npm test && npm run build` pass.
- Opening `/games/` starts Grass 1; no buttons are visible; tap, click or any key hops; the flag ends the level and shows stars and the two buttons; Replay restarts cleanly and Home opens the Input Lab; `?lab=1` and `?level=grass-1` work.
- Viewports 844x390, 1280x800, 1024x768 and 2400x1000-style ultra-wide: no bars or scroll, the HUD stays inside the safe area, the character is at a sensible size, nothing is cropped. Rotation re-lays out.
- Scripted run in headless Chrome (use the `?debug=1` hook): a bot that taps at random intervals finishes the level, and a bot that never taps falls into the first gap, is floated back and continues (it will keep falling at the same gap; it just must not hang or crash; verify the respawn loop is smooth). Screenshots of start, mid-level, a coin pickup, the cloud respawn and the win screen reviewed.
- Mashing at 20 taps/s: stable at about 60 fps, sounds within caps, no errors.
- Missing or undecodable character image falls back to the capsule with no console error spam.
- Unit tests cover parsing/validation (good and bad grids), entity extraction, star thresholds and respawn spot selection.

## How to verify
Run the commands, drive the game with Playwright (touch and keyboard), review screenshots, and list in the summary what you could not check (real tablet, audibility, iOS Safari, AVIF decode on old browsers).

## Result (Code fills in at the end)
- What changed:
  - Housekeeping: `MAX_WIDTH` 1920 (tests updated). High-DPI: the canvas now has `renderScale` px per logical unit (physical px / 720 in quarter steps, 1..2); `layout.bindToScene` zooms each scene's camera with origin (0,0), InputManager maps pointers back to logical units. Game code is unchanged in units.
  - `core/levels/`: `format.ts` (v1 types + validation with readable errors), `grid.ts` (entities, merged collision rects, surface, respawn spot, stars), `physics.ts` (shared tuning: gravity 1800, jump 760 = 2.5-tile peak, coyote 120 ms, buffer 150 ms, body 40x84), `LevelScene.ts` (generic Arcade scene), `theme.ts`, `placeholders.ts` (2x generated textures), `characterTexture.ts` (silent decode, trim, pre-scale), `background.ts` (parallax), `ResultScreen.ts` (stars + Replay/Home). 20 new unit tests (43 total).
  - Gameplay: auto-run, tap/click/any key hops, coin pickup with sparkle and HUD count, dust on landing, bob/stretch/squash/flip, first-tap hint (pulsing circle + finger, gone after the first hop for the session), cloud respawn (D-019), flag -> win sound, hop, confetti, character centred between the buttons, 1-3 stars filling one by one, Replay (Space) and Home (Escape/Enter) that only arm 600 ms after appearing.
  - Mario: `levels/grass-1.json` (140 x 11, 26 coins, gaps at columns 83 and 113, flag at 136) loaded via `levels/index.ts` (`import.meta.glob`), `themes.ts` (grass colours, file hooks for real tile art), manifest routing (`?lab=1`, `?level=`, `?char=`), `displayHeight` and placeholder `color` per character. New `whoosh` synth recipe.
- Files touched: src/main.ts; src/core/types.ts; src/core/ui/{layout,layoutMath,layoutMath.test}.ts; src/core/input/InputManager.ts; src/core/audio/recipes.ts; src/core/levels/{format,grid,physics,theme,placeholders,characterTexture,background,ResultScreen,LevelScene,levels.test}.ts + README.md; src/universes/mario/{manifest,themes}.ts; src/universes/mario/levels/{index.ts,grass-1.json,README.md}; README.md; docs/{ARCHITECTURE,PROGRESS,DECISIONS}.md (DECISIONS = architect's edit); this file.
- Deviations from plan (and why):
  1. Grid vertical placement: the grid bottom is anchored to the screen bottom (11 rows x 64 = 704, top 16 px is sky). Works for any row count.
  2. The character image is loaded with `Image.decode()` instead of Phaser's loader: Phaser logs a console error on a failed decode, and the task asked for no error spam. It is trimmed and pre-scaled on a canvas, which also stops the 600x844 picture shimmering at ~100 px. Until it is decoded (a few ms) the capsule shows.
  3. `displayHeight` is the height of the visible character after trimming transparent margins, not of the whole 600x844 canvas, so the values are comparable across characters.
  4. The camera is scrolled by hand (not `startFollow`/bounds): Phaser's camera bounds assume a centred origin, which the high-DPI zoom changes. Scenery ground continues past both level ends so wide screens never show an edge.
  5. Grass 1 has 26 coins (task said about 24): 3 "free" coins at head height teach the coin sound before the first jump is needed.
  6. On the result screen the camera centres the character and the buttons sit either side, so the celebrating character is not hidden behind a button.
- How verified: `npm run typecheck`, `npm test` (43 tests), `npm run build` pass. `npm ci` could not run in the working folder because a running `npm run dev` (not mine) locks the rolldown binary; it was run in a fresh clone of the commit instead (see summary). Playwright + headless Chrome against `vite preview`:
  - 844x390 (dpr 3), 1280x800 (dpr 2), 1024x768 (dpr 2), 2400x1000, 1366x512: canvas fills the viewport, no scroll or bars, canvas pixels = logical x renderScale (e.g. 2304x1440 on the tablet), HUD inside the safe area, character 104 px tall, no console messages. Rotation 844x390 -> portrait -> 1280x800 -> 2400x1000 -> back re-lays out (portrait shows the rotate picture).
  - Random tapper (taps every 150-1050 ms): finished in 43-49 s with 23-25 coins and 3 stars, including 2 cloud respawns in one run. Space after the result screen arms -> replay restarts cleanly (coins 0, hint stays hidden).
  - Never-tapping bot: falls into the first gap, cloud carries it back to x 5088 (3 tiles behind), repeats; 3 respawns in a row, min fps 59, no errors.
  - Mashing 20 taps/s (touch + Space) for 8 s in-page: 60 fps, worst frame 21 ms, at most 2 voices of a sound, 10 jumps, no errors.
  - Home via Escape and via tapping the house both open the Input Lab; `?lab=1` works and its touch buttons register at high DPI; `?level=nope` warns and opens grass-1.
  - Corrupt AVIF (garbage bytes) -> capsule, no console output. 404 image -> capsule (only the browser's own 404 network line).
  - All 7 characters render from their AVIF files at similar heights. Screenshots of start, coin pickup, cloud respawn, win screen and lab reviewed.
  - Not checked: a real tablet/phone, iOS Safari, audibility of sounds, AVIF decode on old browsers (falls back to the capsule by design), real gamepad.
- Open issues / risks: see PROGRESS.md open questions (camera/scroll-factor rules for high DPI, six new voice clips left uncommitted, tuning to confirm with Athi). The first jump sound after a cold start can be lost while the audio context is still resuming (same as Task 002).
- Suggested next: Task 004 (Grass 2: big Jump button + "watch me" demo). Grass 2 can reuse LevelScene with `tapAnywhereJumps: false`; the demo can drive the same player code with scripted presses.
