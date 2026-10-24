# Architecture

## Layout
```
games/
  src/
    main.ts              entry: boots Phaser, loads default universe
    config.ts            defaultUniverse, base settings
    shell/               launcher (later), settings, parent view
    core/
      input/             InputManager: touch buttons + keyboard + gamepad -> actions
      audio/             AudioManager: unlock on first gesture, placeholder beeps, voice clips
      storage/           per-universe progress + settings (IndexedDB or localStorage wrapper)
      levels/            level JSON loader/runner, control-ladder rules
      ui/                reusable big buttons, cloud/lock visuals
    universes/
      registry.ts        id -> () => import('./<id>')   (lazy loading)
      mario/
        manifest.ts      characters, worlds, unlock config
        scenes/          Phaser scenes specific to Mario universe
        levels/          level JSON files
        assets/          images/audio (placeholders first, real files later)
  public/                PWA icons, manifest bits
  docs/                  PROGRESS, DECISIONS, ARCHITECTURE, tasks/
  .github/workflows/deploy.yml
```

## Shell vs universe
- **Shell** is always loaded and small. For now there is no launcher: `main.ts` reads `config.defaultUniverse` and opens it directly. A launcher screen is added when a second universe exists.
- **Universe module** is a dynamic import, so Ben 10 files are never downloaded for Mario. Each exports a `UniverseManifest`.

```ts
type Action = 'left' | 'right' | 'jump' | 'power';

interface UniverseManifest {
  id: string;                     // 'mario'
  title: string;
  characters: CharacterDef[];     // 7 for Mario
  defaultCharacterId: string;
  worlds: WorldDef[];             // grass, pipe, sky, castle
  unlock: { openAtATime: number };// default 2..3 levels open at once
  start(game: Phaser.Game): void; // boots the universe's first scene
}

interface CharacterDef {
  id: string; name: string;
  image: string;                  // path under assets/, optional (placeholder if missing)
  poses?: { run?: string; jump?: string };
  sounds?: { pick?: string; jump?: string; win?: string };
  powerAnimation: string;         // key of a power animation; cosmetic only
}
```
All characters share identical physics (jump height, speed). Differences are cosmetic.

## Levels (data-driven)
Levels are plain JSON in `universes/<id>/levels/`, loaded by that folder's `index.ts` with `import.meta.glob`
(adding a level = a data file plus its id in a world's `levels` list). Format v1 (D-018):
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
- `grid`: equal-length rows, top row first. Legend: `#` ground, `.` empty, `c` coin, `S` start, `F` flag (pole stands in
  that cell). Gaps are missing ground. New tile kinds get new legend entries in `core/levels/format.ts`.
- **Vertical placement:** the grid's bottom row sits on the bottom of the 720-high screen; rows above the top of the grid
  are sky. Grass 1 uses 11 rows of 64 (704 px), so the top 16 px are sky. Grids taller than 720 extend above the screen.
- `controls` is the **control ladder**: `InputManager.configure` follows it, and TouchControls only shows enabled
  actions (none with `tapAnywhereJumps`). `autoRun` runs right at `runSpeed`; otherwise Left/Right move and release stops.
- `stars` (D-020): finishing = 1, `two` and `three` are coin thresholds. `runSpeed` is optional (default in physics.ts).
- `demo` is reserved for the "watch me" demo (Task 004).

`core/levels/` (all universe-agnostic):
- `format.ts`: types, `parseLevel` (readable errors: row lengths, unknown characters with position, exactly one S/F,
  valid actions, star thresholds), `parseLevelOrThrow`.
- `grid.ts`: `extractEntities` (solid map, coins, start, flag), `mergeSolids` (few collision rectangles, no seams),
  `surfaceRow`, `findRespawn` (D-019: nearest standable column at least 3 behind the last grounded column, preferring
  ground on both sides), `starsFor`. Pure and unit-tested (`levels.test.ts`).
- `physics.ts`: the one shared tuning file (D-021): run speed 200, gravity 1800, jump velocity 760 (peak 160 px = 2.5
  tiles, ~2.6 tiles carried at 200 px/s), max fall 1100, coyote 120 ms, jump buffer 150 ms, body 40x84. Fixed jump height.
- `LevelScene.ts`: the generic Phaser scene (Arcade physics). Started with `LevelSceneData { level, theme, character,
  onHome }` from the universe, so core never imports a universe. Player = invisible 40x84 physics zone + a separate
  sprite (bob while running, stretch on take-off, squash on landing, flip by direction). Camera follows by hand with the
  player ~36% across the safe area (look-ahead to the right); scenery ground extends past both level ends.
  Falls: whoosh, a cloud carries the player to the respawn spot. Flag: stop, win sound, hop, confetti, `ResultScreen`.
  `?debug=1` exposes `window.__level` (state, scene, input, layout, audio) for tests.
- `theme.ts`: `LevelTheme` = colours for sky, hills, clouds, ground, coin, flag plus optional image files per texture
  (`ground-top`, `ground-fill`, `coin`, `flag-pole`, `flag-cloth`, `hills-far`, `hills-near`, `cloud`).
- `placeholders.ts`: generates the theme textures (and effect/capsule textures) at 2x resolution for any texture without
  a file. Real art: drop the file into the universe assets; the Mario theme already looks up `grass-ground-top.png` etc.
- `characterTexture.ts`: decodes the character image with `Image.decode()` (failure = silent capsule fallback, no console
  errors), trims transparent margins and pre-scales it to `displayHeight` x 2 for a crisp, non-shimmering sprite.
- `background.ts`: parallax sky gradient, wrapping clouds and two tiling hill strips, all screen-fixed and scrolled by hand.
- `ResultScreen.ts`: 3 star slots filling one by one, then Replay (Space) and Home (Escape/Enter) buttons that only
  accept input 600 ms after appearing, so leftover mashing does not press them.

Mario routing (`universes/mario/manifest.ts`, until the world map exists): `/games/` opens the first Grass level;
`?level=<id>` any level, `?char=<id>` any character, `?lab=1` the Input Lab. Home goes to the Input Lab for now.

## Screen layout (D-013)
`core/ui/layout.ts`: logical height is always 720, logical width follows the screen (960..1920, D-017). `getLayout()` gives
`width`, `height`, `safeRect` (central 960x720 for gameplay-critical content), `insets` (device safe areas, logical units),
`anchor(corner, dx, dy)` for UI, and `bindToScene(scene, fn)` to re-layout on resize/rotation.

High-DPI: the canvas has `renderScale` pixels per logical unit (physical pixels / 720, in quarter steps, between 1 and 2;
`renderScaleFor` in layoutMath.ts). `bindToScene` sets the scene's main camera to zoom = renderScale with origin (0, 0),
so all game code keeps using logical coordinates. InputManager converts pointer positions back to logical units.
Rules that follow: every scene must call `layout.bindToScene`; children of a screen-fixed container need
`setScrollFactor(0, 0, true)` so Phaser hit-tests them correctly; text should use `resolution: layout.renderScale`;
camera bounds/`startFollow` assume a centred origin, so scenes scroll the camera by hand.

## Input
`core/input/InputManager` (one per scene) merges DOM pointer events (touch + mouse), keyboard and gamepads (bindings in
`core/input/bindings.ts`, D-015). API: `configure({ enabled, tapAnywhereJumps })`, `isDown`, `justPressed`, `justReleased`
(one frame), `press`/`release` events and `onPress` with timestamps. The pure state logic is `core/input/actionState.ts`
(unit-tested): every device input is a "source"; the merged state is derived after tap-anywhere mapping and enabled filtering.
`core/ui/TouchControls` draws the buttons, shows only enabled actions (none in tap-anywhere mode) and provides the hit test;
pointers are re-tested on every move, and Left/Right split their shared band at the midpoint so a sliding thumb never hits a gap.
Size comes from the short edge times `buttonScale` (`?buttonScale=` for now). Blur, visibility change and pointer cancel release everything.

## Audio
`core/audio/AudioManager` (`audio` singleton) unlocks Web Audio on the first touch/click/key. `register(id, { file?, synth?, volume? })`,
`play(id)`: plays the file if it loaded, otherwise the synth recipe (`core/audio/recipes.ts`: tap, jump, coin, win, tryAgain, pick, power).
Never throws; a failed file logs one warning. Per-sound cap of 3 voices and a 40 ms retrigger gap (`voiceLimiter.ts`, unit-tested);
a compressor on the master bus prevents clipping. `setMuted`, `setMasterVolume`, `state` (locked/running).
Shared sounds are generic; per-character sounds (pick / jump / win) will be registered from the universe manifest.

## Storage
Per-universe keys: `{ chosenCharacterId, levelStars: Record<levelId, 0..3>, settings }`. Progress is shared across characters within a universe. Parent settings: sound on/off, button size, unlock-all.

## PWA / hosting
- GitHub Pages project site, Vite `base: '/games/'`. No router needed yet (scene-based navigation); if URLs are added later, use hash routing since Pages has no SPA fallback.
- Service worker precaches the shell and caches each universe chunk + assets on first use, so the game works offline after the first visit. Bump version to update.
- Web app manifest: `display: fullscreen`, `orientation: landscape`, installable to the home screen.
- Deploy via GitHub Actions on push to `main`.
- Asset budget: keep each universe under about 15-20 MB.

## Map and unlocking (later tasks)
World map with winding path and level dots; locked levels behind clouds; 2-3 levels open at a time (config `unlock.openAtATime`); stars gate each world's final level. Evolves to a walkable map later.
