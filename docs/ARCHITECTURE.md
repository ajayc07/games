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
      avatar/            how characters are drawn: AvatarLook (robot, ball), rig, shared motion
      audio/             AudioManager: unlock on first gesture, placeholder beeps, per-option chimes
      storage/           per-universe progress record: IndexedDB -> localStorage -> memory (store.ts)
      picker/            PickerScene (colour cards), pure selection + layout
      map/               MapScene (world map), pure unlock rule + map layout
      practice/          Combo Practice (Task 011): selector scene, combo tracker, coach, run effects
      levels/            level JSON loader/runner, control-ladder rules
      ui/                reusable big buttons, cloud/lock visuals
    universes/
      registry.ts        id -> () => import('./<id>')   (lazy loading)
      robo/              "Robo World" (D-038); id and title in universe.ts
        manifest.ts      options, worlds, unlock config, routing
        options.ts       the eight colour cards
        scenes/          Phaser scenes specific to this universe (Input Lab)
        levels/          level JSON files
        assets/          images/audio (placeholders first, real files later)
  public/                PWA icons, manifest bits
  docs/                  PROGRESS, DECISIONS, ARCHITECTURE, tasks/
  .github/workflows/deploy.yml
```

## Shell vs universe
- **Shell** is always loaded and small. For now there is no launcher: `main.ts` reads `config.defaultUniverse` and opens it directly. A launcher screen is added when a second universe exists.
- **Universe module** is a dynamic import, so one universe's files are never downloaded for another. Each exports a `UniverseManifest`.

```ts
type Action = 'left' | 'right' | 'jump' | 'power';

interface UniverseManifest {
  id: string;                     // 'robo'
  title: string;                  // 'Robo World'
  options: AvatarOptionDef[];     // 8 colour cards; the first is the fallback
  worlds: WorldDef[];             // grass, cave, sky, castle; WorldDef may set finalLevelStarsRequired
  unlock: { openAtATime: number };// default 2..3 levels open at once
  start(game: Phaser.Game): void; // boots the universe's first scene
}

interface AvatarOptionDef extends AvatarDef {   // AvatarDef = { palette?, scale?, antennae? }
  id: string;                     // 'blue'; used by ?color= and storage
  chime: { semitones: number; timbre: 'bell' | 'soft' | 'pluck' | 'bright' };
}
```
All options share identical physics (jump height, speed). Differences are cosmetic. No names, no pictures, no voices (D-038).

**Removed in Task 005c (D-037):** the `sprite` look (the real pictures in levels), the `portrait` look, and everything only they
used: `poses` (`idle`/`run`/`jump`, D-023), the run flipbook (`runFrames`, `runFps`, Task 004b), the idle-pose rule (Task 005),
`displayHeight`, the `portrait` crop, `characterLook.ts`, `poses.ts`, `SpriteLook.ts`, `portrait.ts` and the run-pose images.
**Removed in Task 005d (D-038):** the character cast (names, pictures, voice clips), `CharacterDef` (`image`, `color`, `sounds`,
`powerAnimation`), `characterTexture.ts`, `makeCapsuleTexture`, the voice slots (`voices.ts`, `registerVoices`/`playVoice`, the
1.5 s jump-voice limiter, `silentFallback`) and `?char=`. The files are archived outside git in `_sources/archive-private/`.

## Topic files (read only the ones your task names)
This file is the index plus the layout and the shell/universe rules. The detail lives in `docs/architecture/`. Headings are kept as they were,
so a reference such as ARCHITECTURE "Screen layout" now means that heading inside the file shown below.

| File | Headings inside |
|---|---|
| `docs/architecture/avatar-and-motion.md` | Lively motion (Task 004b); Avatar looks (D-032, D-033, D-037); Avatar options and picker (D-038) |
| `docs/architecture/map-and-flow.md` | Map and flow (D-036, D-039, Task 006): map scene, flow, hold-to-exit |
| `docs/architecture/levels.md` | Walking (D-029); Levels (data-driven): format, legend, controls, physics, respawn; "Watch me" demo (D-024) |
| `docs/architecture/shooting-bubbles.md` | Shooting and bubbles (D-041, Task 007) |
| `docs/architecture/practice.md` | Combo Practice (D-049, Task 011): generator, combo tracker, coach, walk assist, selector |
| `docs/architecture/ui-input-audio.md` | Screen layout (D-013); Input; Button layout (Task 009); Audio |
| `docs/architecture/settings-storage-pwa.md` | Settings and the parent view (D-047); Storage (D-036, Task 006); PWA / hosting |

Original full text before the split: unchanged, only moved. If you add a section, put it in the topic file it belongs to and list it in the table.
