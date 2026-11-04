# Task 041: Zen day/night cycle

Design: D-085 (addendum). Independent of 037-040; can be done first. Read D-068 (day/night setting), D-063, D-065 and D-076 first.

## Goal
In zen, when the parent's Day / Night setting is **Random**, the world changes between day and night while he plays: every 60 to 120 seconds (random each time), with a smooth cross-fade. It makes endless zen feel alive.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md, `docs/architecture/levels.md` (zen sections) and `docs/architecture/settings-storage-pwa.md`.
- `core/settings/settings.ts` (`pickLook`, `resolveDayNight`), `universes/robo/manifest.ts` (`themeForRun`, `openZen`), `universes/robo/themes.ts`, `core/levels/LevelScene.ts` (theme use, `ParallaxBackground`, zen `rebaseZen` which rebuilds ground strips and step blocks with theme texture keys, night effects at `theme.night`).

## In scope
- **Rule (pure, tested, in `settings/`):** `zenLookPlan(mode, rng)` returns the next change delay (60 000 to 120 000 ms, uniform) only when `mode === 'random'`; with `day` or `night` (setting or `?look`-style URL pin) the look never changes. The first look of a zen visit is rolled as today.
- **Switch:** `LevelScene` gets a `data.zen.cycle` hook: a timer that counts only while playing (paused with the auto-pause, the rest screen and the zen-time-up screen; not counted while a power transformation is running is NOT needed). At each tick it swaps the look to the other one with a **3 s cross-fade** (new background layers fade in over the old, ground and blocks fade, night effects like stars and fireflies fade in or out). Gameplay, physics, coins, bubbles, power-ups, the car, the Mega bar, the avatar and the camera are not touched, and nothing may flash, jump or hitch.
- **Seam safety:** a zen segment swap (`rebaseZen`) during or after a change must use the current look's texture keys everywhere (ground strips, blocks, coins, orbs, bubbles). Add a test or a scripted check that a swap in the middle of a cross-fade shows no wrong-look tiles.
- **Textures:** both themes' textures may be built up front on entering zen with cycle on (generated shapes, fast); say in the Result how long that takes.
- **The `night` world** (night-1) is not part of zen and not affected.
- Test hook `?cycle=<seconds>` sets a fixed interval (for example `?zen=1&cycle=8`) and `?cycle=0` turns the cycle off; it works only in zen. Document it with the other hooks.
- Docs: `levels.md` (a "Zen day/night cycle" section with the numbers), PROGRESS (roadmap row, hook, tablet checklist: is the change noticed and liked, is a 3 s fade calm, any hitch), Result.
- One commit: `task-041: zen day and night cycle`. No attribution lines. Do not push.

## Out of scope
Cycles in normal levels or Practice, a new setting row (the existing Random option is the switch), sunrise or sunset colours, weather, changing sounds, new dependencies.

## Acceptance criteria
- typecheck, tests, build, banned-names pass; no image files.
- Unit tests for the delay range and for "never changes in day or night mode".
- Scripted Chromium run with `?zen=1&cycle=8`: at least three changes (day to night to day) with screenshots before, mid-fade and after (`_sources/review/041/`, 844x390 and 1280x800); a zen segment swap crossing a change shows consistent tiles; no console errors; the player's position, speed and power-up timers are unaffected by a change (compare before and after in `__level.state()`).
- With the setting on Day or Night (and with `?cycle=0`), nothing ever changes over a long run.

## Result
- What changed: in zen, with the Day / Night setting on Random, the look now changes between day and night every 60-120 s of play (random each time) with a 3 s cross-fade. `Day` and `Night` never change. New pure rule `zenCycleDelayMs` and `ZEN_CYCLE` in `settings.ts`; `?cycle=<seconds>` fixes the interval and `?cycle=0` turns it off. `ParallaxBackground` got `setAlpha` and `destroy`. `LevelScene` has a mutable `theme` and a fade (new background fades in over the old, ground clones, coin swap at half-way, headlamp and fireflies in or out) that never touches gameplay; a zen segment swap during a fade rebuilds the ground with its clones.
- Files touched: `core/settings/{settings,settings.test}.ts`, `core/levels/{LevelScene,background}.ts`, `universes/robo/manifest.ts`, `docs/{PROGRESS,DECISIONS}.md`, `docs/architecture/levels.md`, this file.
- Deviations from plan (and why): none in behaviour. The fade is driven by play time in `tickZen` (not Phaser tweens), so it pauses with the rest screen. The new look's textures are built when the change starts (generated, no visible hitch in the headless run), not on entering zen. The day look's real image files (none exist yet) would only be preloaded when a visit starts in day.
- How verified: `npm run typecheck`, `npm test` (540 pass, 3 new for the delay rule), `npm run build`. Chromium preview build, `?zen=1&cycle=6` at 844x390 and 1280x800: 3 changes in 30 s (day, night, day, night), screenshots before, mid-fade and after in `_sources/review/041/` (not committed); a run that pushed the player past the swap threshold during a fade (lap 0 to 1, 4 changes): ground and coin texture keys matched the look after every change, no console errors; with `?time=day` and `?time=night` plus `?cycle=3` the look never changed in 12 s. The preview server is stopped.
- Open issues / risks: not seen on a real tablet (is the change liked, is 3 s calm); fps on the headless machine is low, so the smoothness of the fade was checked by state, not by eye. The headlamp glow keeps following the player during a fade in or out.
- Suggested next: Task 037 (Cave world and the map branch).
