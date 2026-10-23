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
Levels are plain JSON in `universes/<id>/levels/`. Format may evolve; keep a `version` field.
```json
{
  "version": 1,
  "id": "grass-1",
  "world": "grass",
  "title": "Tap to hop",
  "controls": { "enabled": ["jump"], "autoRun": true, "tapAnywhereJumps": true, "demo": true },
  "tiles": { "tileSize": 64, "grid": ["....", "####"] },
  "coins": [[10, 4]],
  "gaps": [],
  "flag": [40, 5],
  "stars": { "one": 3, "two": 6, "three": 9 }
}
```
- `controls` is the **control ladder**: each level declares which actions are enabled and whether auto-run / tap-anywhere apply. The UI only shows buttons for enabled actions.
- `demo: true` plays a short "watch me" ghost demo of the new control before the player tries.
- Falls respawn the player a short distance back. No failure state.

## Screen layout (D-013)
`core/ui/layout.ts`: logical height is always 720, logical width follows the screen (960..1680). `getLayout()` gives
`width`, `height`, `safeRect` (central 960x720 for gameplay-critical content), `insets` (device safe areas, logical units),
`anchor(corner, dx, dy)` for UI, and `bindToScene(scene, fn)` to re-layout on resize/rotation.

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
