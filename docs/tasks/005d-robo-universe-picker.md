# Task 005d: Generic "robo" universe, remove character voices, colour-card picker

## Goal
Remove everything Mario-related from the game (D-038), drop the character jump voice, rename the universe to a generic one, and keep a character selection card screen that now chooses the robot's colour, small size variation and antennae.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (especially D-037, D-038), docs/ARCHITECTURE.md, docs/IDEAS.md
- Existing: `universes/mario/*`, `core/avatar/*`, `core/audio/*` (voices.ts and friends), `core/types.ts`, `core/levels/*`, `src/config.ts`, `src/universes/registry.ts`, `vite.config.ts` (chunk naming).

## In scope

### 1. Archive and remove Nintendo assets
- Create `_sources/archive-private/` (already gitignored via `_sources/`). Move into it (do not delete from disk): every character image (`*.avif`), every voice clip (`*.mp3` in the universe assets folder) and any other Mario-related raw file. Then `git rm` them from the repo (git history keeps them; that is handled separately by the parent).
- `src/universes/<id>/assets/` keeps its README only; update it. Nothing in the bundle may reference the removed files.

### 2. Remove the jump voice and all voice clips
- Delete the voice slot machinery (`voices.ts`, per-character `sounds` file lists, the 1.5 s jump-voice limiter, related tests) except what the synthesized chimes in section 4 reuse. The generic jump sound is the only sound on jump. Keep the AudioManager's ability to play files when a registry entry provides one (future real sounds), with the synth fallback.
- Keep: pending-unlock queue, voice caps and retrigger gaps for sounds, mute/volume.

### 3. Rename the universe and strip Mario-specific content
- `git mv src/universes/mario src/universes/robo`. Universe id `robo`, title "Robo World" (one constant for each). Update `config.defaultUniverse`, the registry, chunk naming in `vite.config.ts`, imports, tests, README, ARCHITECTURE.md and comments. After this, a case-insensitive search of `src/`, `README.md`, `index.html`, the PWA manifest and `public/` for the names `mario`, `luigi`, `peach`, `toad`, `bowser`, `yoshi`, `donkey`, `nintendo` must return nothing (docs/DECISIONS.md, docs/IDEAS.md and task files keep historical mentions; do not edit those).
- Rename types/fields accordingly: the cast concept becomes generic "avatar options" (suggested names `AvatarOptionDef`, `options` in the manifest). Remove fields that only served real images: `image`, `color` (if unused), `powerAnimation` names that were character-specific (replace with a generic `power: 'bolt'` or similar if still needed).
- Level themes stay generic (hills, sky, grass, coin, flag). If any naming or visual detail clearly imitates a Nintendo design, change it to a generic one and mention it in the summary.
- Query params: `?char=` becomes `?color=<id>` (keep `?char=` as an accepted alias for one release is NOT needed; remove it).

### 4. Avatar options (cards) and sounds
- Eight options, ids and order: `red`, `orange`, `yellow`, `green`, `teal`, `blue`, `purple`, `pink`. Each has: `palette` (body is white/light grey as now; accent, joint and tip colours from the hue, keep contrast on green hills per the 006 contrast rule), `scale` (about 1.0; make `yellow` slightly smaller at 0.92 with one antenna and `purple` slightly bigger at 1.12; others 1.0 or within 0.95 to 1.08), `antennae` (1 or 2), and a `chime` setting (pitch multiplier and timbre choice).
- Two synthesized sounds per option, `pick` (short, bright, rising) and `win` (a slightly longer happy arpeggio), generated from one recipe with the option's pitch/timbre; every option must sound clearly different from the others but all pleasant. The win chime plays at the flag, the pick chime when a card is chosen. Unit-test that the recipes differ per option and stay within a safe loudness range.

### 5. Picker scene (generic, in `core/picker/`)
- A scene that shows the universe's options as big cards (2 rows by 4 in landscape; adapt to 1366x512 and 844x390). Each card is a rounded panel in the option's colour with that robot standing front-on (idle breathing, antennae sway) at a clear size. No text.
- Tapping or clicking a card: the card pops, the robot waves/hops once, the pick chime plays, a ring and a star badge mark the selection and the other cards dim slightly. A large Play button (green circle with an arrow) is always visible in a corner (enabled once a card is selected; the default selection is the previously chosen option or the first one) and starts the game. Keyboard: Left/Right/Up/Down to move between cards, Enter or Space to confirm (first press selects, second press plays).
- All taps must have targets of at least 120 px (logical); respect layout/safe-area/high-DPI rules from ARCHITECTURE "Screen layout".
- Flow for now (the map arrives in Task 006): the picker shows on first launch, and whenever `?picker=1` is present. The chosen option id is stored in a tiny localStorage key (wrapped in try/catch; works without it; Task 006 migrates it into the progress record). After Play, go to Grass 1 (or the level in `?level=`). `?color=<id>` and `?lab=1` bypass the picker as before. When a stored choice exists and no `?picker=1`, skip the picker and go straight to Grass 1.
- A small icon button in a corner of the win screen (a palette/robot icon) reopens the picker (stop-gap until the map has one).

### 6. Docs, tests, commit
- Update ARCHITECTURE.md (generic universe, options, picker, sounds), README.md, `src/universes/robo/assets/README.md`, `docs/IDEAS.md` (add a dated note: Mario content removed in 005d; remaining before any commercial use: rewrite or restart git history to drop archived Nintendo files, original/licensed audio and music, store/legal items), PROGRESS.md (record D-037/D-038 findings, mark 005d done, roadmap per D-038). Fill in this file's Result.
- Unit tests: options validation (ids unique, scale clamp, palette defaults), chime recipe differences and loudness, picker selection logic (pure), `?color=` parsing with fallback to the first option, localStorage failure tolerance, the absence of removed-name strings in source (a simple test that scans `src/` for the banned names is welcome).
- One commit: `task-005d: generic robo universe and colour picker`. No `Co-Authored-By` or other attribution lines (D-016). Do not push.

## Out of scope
The map and progress storage (006), new levels, Power gameplay, parent view, new runtime dependencies, changes to physics, hit boxes or the robot's animation.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; the banned-names search of `src/`, `README.md`, `index.html`, `public/` and the built `dist/` (file names and text) returns nothing.
- `git status` shows the removed Nintendo files deleted from the repo and present in `_sources/archive-private/`; bundle size reported before and after.
- First launch shows the picker with 8 cards; selecting a card plays its chime and shows the robot in that colour; Play goes to Grass 1 with the chosen colour; a reload skips the picker; `?picker=1` shows it again; `?color=blue` works; `?lab=1` and `?level=` still bypass.
- Jumping plays only the generic jump sound; the flag plays the chosen option's win chime; the pick chime plays on card selection; all eight chimes are distinguishable.
- Layouts at 844x390, 1280x800, 1024x768, 1366x512 and 2400x1000: all cards visible and tappable, Play button visible, nothing overlapping the safe area. Screenshots reviewed and saved to `_sources/review/005d/` (not committed): the picker at each size, and a contact sheet of all 8 robot options on the Grass theme.
- 58+ fps where measurable (report the headless baseline too), no console errors.

## How to verify
Playwright with touch and keyboard plus `?debug=1`; unit tests; source and dist search; screenshots. List what could not be checked (chime pleasantness by ear, real tablet).

## Result (Code fills in at the end)
- What changed: Universe `mario` -> `robo` ("Robo World", constants in `universes/robo/universe.ts`); 7 character images and 15
  voice clips copied to `_sources/archive-private/universe-assets/` (plus the 3 raw sprite sheets moved to `archive-private/raw/`)
  and `git rm`-ed. Voice machinery removed (`voices.ts`, registerVoices/playVoice, jump-voice limiter, `silentFallback`); the
  AudioManager still plays files when an entry has one, with the synth fallback; pending queue, voice caps and mute/volume kept.
  `CharacterDef` replaced by `AvatarOptionDef` (`id`, palette, scale, antennae, `chime`), manifest field `options`; `image`, `color`,
  `name`, `sounds`, `powerAnimation`, `defaultCharacterId`, `characterTexture.ts` and `makeCapsuleTexture` removed. Eight options
  (red..pink; yellow 0.92 with one antenna, purple 1.12, teal one antenna) with dark joints for contrast on the hills. Synthesized
  pick and win chimes from one recipe (`core/audio/chimes.ts`, 4 timbres, pitch per option). Generic `core/picker/PickerScene`
  (2x4 cards, idle robots, pop + wave/hop + chime, ring + star badge + dimming, Play button, keyboard), pure `selection.ts` and
  `pickerLayout.ts`. Stored choice in `athi.robo.choice` (`core/storage/choice.ts`, try/catch). Flow: picker on first launch or
  `?picker=1`; `?color=`, `?lab=1`, `?level=` bypass; win screen palette button (key C) reopens the picker. `?char=` removed.
  Win plays the option's win chime; jump only the generic jump sound. Empty "Pipe" world renamed "Cave".
- Files touched: src/config.ts, src/core/types.ts, src/core/audio/{AudioManager.ts, chimes.ts, chimes.test.ts, chimePlayer.ts,
  pendingQueue.test.ts, README.md; voices.ts and voices.test.ts deleted}, src/core/avatar/{BallLook.ts, RobotLook.ts, createLook.ts,
  config.ts, types.ts, options.ts, options.test.ts, README.md}, src/core/levels/{LevelScene.ts, ResultScreen.ts, placeholders.ts,
  theme.ts, README.md; characterTexture.ts deleted}, src/core/picker/{PickerScene.ts, selection.ts, pickerLayout.ts, picker.test.ts},
  src/core/storage/{choice.ts, choice.test.ts, README.md}, src/universes/registry.ts, src/universes/robo/* (moved from mario/;
  characters.ts -> options.ts, new universe.ts; assets/*.avif and *.mp3 deleted), src/no-franchise-names.test.ts, README.md,
  package.json, docs/{ARCHITECTURE.md, PROGRESS.md, IDEAS.md, DECISIONS.md (architect's D-038, committed as given)}, this file.
- Deviations from plan (and why): (1) `git mv` of the folder failed (Windows "Permission denied", the folder was held open), so the
  files were moved one by one with `git mv`; same result. (2) `?level=` skips the picker even on a first launch (acceptance
  criteria), and with `?picker=1` the picker comes first and Play opens that level. (3) The win-screen palette button returns to
  the same level after Play (not Grass 1), so a child on Grass 3 is not sent back. (4) Added an `AvatarEvent` `rest` (ends a win
  pose) so the card robot waves once; no clip or animation numbers changed. (5) Teal also has one antenna for variety.
  (6) Removed the now-unused picture helpers. (7) The names test reads files with `import.meta.glob` (no Node types in the project).
  (8) Fixed a picker bug found in testing: Phaser re-sends queued key events when several keys arrive in one frame, so the picker
  ignores events it has already handled.
- How verified: `npm run typecheck && npm test && npm run build` pass (172 tests). Case-insensitive search for the banned names in
  `src/`, `README.md`, `index.html`, `public/` (unit test) and in `dist/` file names and text: nothing. `git status`: 22 media files
  deleted, present in `_sources/archive-private/`. Bundle: `dist/` 1,895,904 -> 1,358,453 bytes (precache 1204.5 -> 1203.6 KiB;
  universe chunk 91,940 -> 101,868 bytes, 22 media files gone). Playwright (headless Chrome, preview build, touch and keyboard,
  `?debug=1`): first launch shows 8 cards; tap selects + plays `chime:<id>:pick` + dims others; mashing harmless; Play -> Grass 1
  with that colour; choice stored; reload skips the picker; `?picker=1` shows it with the stored choice; `?color=blue` works;
  unknown colour -> red with one warning; `?lab=1` and `?level=` bypass; keyboard arrows/Enter/Enter; jumps play only `jump`;
  the flag plays `chime:teal:win` (not the generic win); the palette button opens the picker and Play returns to the level;
  blocked localStorage still works. All 8 cards tappable and inside the screen at 844x390 (dpr 3), 1280x800, 1024x768, 1366x512,
  2400x1000; no console errors anywhere. fps: blank-page baseline 56.1 on this machine, picker with 8 robots and tapping 56.4,
  Grass 3 walk 56.4 (58+ cannot be shown here; the picker costs nothing measurable). Screenshots in `_sources/review/005d/`
  (picker per size, selected and keyboard-focus states, win screen, `options-on-grass.png` contact sheet standing and walking).
- Open issues / risks: chime pleasantness not checked by ear, and no real tablet test. The public git history still has the
  archived files (parent action, docs/IDEAS.md). CLAUDE.md still describes the game as "Mario-style" with Mario as the default
  universe (not in the task's search list; the parent/architect may want to update it). Picker has no gamepad support yet.
  The green option's accent is green on green hills (joints are dark, so the shape reads).
- Suggested next: Task 006 (map, stars, unlocking, storage), migrating `athi.robo.choice` and giving the map a picker button.
