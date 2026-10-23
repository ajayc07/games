# Task 001: Project setup, universe loader, PWA, Pages deploy

## Goal
Create the runnable skeleton: Vite + TypeScript + Phaser 3 app that boots the default universe (Mario) through a
lazy-loaded universe module, shows a placeholder screen, works offline as an installable landscape PWA, and
auto-deploys to GitHub Pages at https://ajayc07.github.io/games/.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md, docs/ARCHITECTURE.md

## In scope
1. `package.json` with scripts `dev`, `build`, `preview`, `typecheck`. Dependencies: `phaser`, `vite`, `typescript`, `vite-plugin-pwa`. Pin versions. TypeScript `strict: true`.
2. `vite.config.ts` with `base: '/games/'`, PWA plugin (autoUpdate, precache shell, runtime-cache universe chunks and assets so a visited universe works offline).
3. Folder structure exactly as in docs/ARCHITECTURE.md (create empty folders with a short `README.md` or `.gitkeep` where needed): `src/shell`, `src/core/{input,audio,storage,levels,ui}`, `src/universes/{registry.ts,mario/...}`.
4. `src/config.ts` with `defaultUniverse = 'mario'`.
5. `src/universes/registry.ts`: map of universe id -> `() => import('./mario')`. `main.ts` loads the default universe via the registry (dynamic import, so Mario is a separate chunk; confirm in the build output).
6. `UniverseManifest` and `Action` types in `src/core/types.ts` as in ARCHITECTURE.md. Mario manifest with the 7 characters (ids: mario, luigi, peach, toad, bowser, yoshi, donkeykong) and no images yet; `start()` opens a placeholder scene.
7. Placeholder scene: full-screen sky-blue background, a green ground strip, and a big coloured circle that bounces/changes colour when tapped anywhere or when any key is pressed. On the first gesture, unlock Web Audio and play a generated beep (WebAudio oscillator, no audio file). This proves touch, keyboard and audio unlock work.
8. Phaser config: `Scale.FIT` with auto-centering, resolution about 1280x720 logical, transparent-safe, `input.touch` multi-touch enabled (at least 3 pointers).
9. `index.html`: viewport with `user-scalable=no, viewport-fit=cover`; CSS to disable scroll, overscroll, text selection, tap highlight, `touch-action: none`, and long-press context menu; `body` background matching the sky colour; `theme-color`.
10. PWA manifest: name "Athi's Game", short_name "Athi", `display: fullscreen`, `orientation: landscape`, `start_url` and `scope` `/games/`, simple generated icons (192, 512, maskable) created by a small script or SVG-to-PNG step committed to `public/` (placeholder design: coloured square with a star). If landscape portrait handling is needed, show a friendly "rotate" icon overlay (no text) when the screen is portrait.
11. Best-effort screen wake lock while playing (ignore failures silently).
12. `.github/workflows/deploy.yml`: on push to `main`, `npm ci`, `npm run build`, upload `dist` and deploy with the official `actions/deploy-pages`. Use current stable action versions.
13. `README.md` (short): what the project is, `npm run dev`, build, how deploy works, and the note that the parent must set Pages source to "GitHub Actions" once.
14. Update `docs/PROGRESS.md` and fill in this file's Result section. One commit: `task-001: project setup`. Do not push.

## Out of scope
Real game levels, physics, the on-screen D-pad, the map, character picker, parent view, real assets, launcher screen. Do not build the input or audio managers beyond the minimal placeholder behaviour in item 7 (Task 002 does that properly).

## Acceptance criteria
- `npm ci && npm run typecheck && npm run build` succeed with no errors.
- Build output shows the Mario universe as a separate lazy chunk.
- `npm run dev` shows the placeholder scene; tapping/clicking/pressing a key reacts and plays a beep after the first gesture.
- `npm run preview` at `/games/` works; after one load, going offline (DevTools offline mode) still loads and runs the page.
- Lighthouse-style PWA check passes the installability basics (manifest, icons, service worker) or Code states honestly what could not be checked.
- Layout is correct in a landscape phone viewport (e.g. 844x390) and tablet viewport (e.g. 1280x800); no scrollbars, no zoom on double-tap.
- Workflow file is valid YAML and references the correct Pages actions.

## How to verify
Run the commands above; use Playwright/Chromium or a browser to take a screenshot at the two viewport sizes and test offline mode if possible. State in the summary exactly what was and was not verified.

## Result (Code fills in at the end)
- What changed: Runnable skeleton. Vite 8 + TS 5.9 (strict) + Phaser 3.90 + vite-plugin-pwa 2.0, all pinned. `main.ts` boots Phaser (1280x720, Scale.FIT, centred, 4 pointers) and loads `config.defaultUniverse` through `universes/registry.ts` (dynamic import). Mario manifest with the 7 characters and 4 empty worlds; `start()` opens a placeholder scene (sky, ground, big circle that bounces and changes colour on tap/click/key, plays a WebAudio beep, audio unlocked on first gesture; mashing safe). Shell: browser guards (pinch/double-tap/long-press/scroll), best-effort wake lock, SW registration. CSS no-scroll/no-select/touch-action none, rotate-picture overlay in portrait. Installable landscape fullscreen PWA with generated star icons (192, 512, maskable). Service worker precaches the shell; universe chunks (`assets/universe-*`) are cached on first use. GitHub Pages workflow. README.
- Files touched: package.json, package-lock.json, tsconfig.json, tsconfig.sw.json, vite.config.ts, index.html, README.md, scripts/make-icons.mjs, public/icons/*.png, .github/workflows/deploy.yml, src/main.ts, src/config.ts, src/sw.ts, src/core/types.ts, src/core/audio/beep.ts, src/shell/{browserGuards,wakeLock,pwa}.ts, src/universes/registry.ts, src/universes/mario/{index,manifest}.ts, src/universes/mario/scenes/PlaceholderScene.ts, folder READMEs, docs/PROGRESS.md, this file.
- Deviations from plan (and why):
  1. PWA uses `strategies: 'injectManifest'` with a small hand-written `src/sw.ts` instead of the generated SW: workbox's generated template pastes absolute module paths into string literals, and the apostrophe in the local folder "Athi's Game" broke the build. Needed the workbox-* modules (already pulled in by vite-plugin-pwa, same 7.4.1) as explicit devDependencies; they are bundled only into sw.js.
  2. TypeScript 5.9.3 rather than the new 7.0 line (stable, widely supported); Phaser 3.90.0 (latest 3.x) although Phaser 4 exists, per D-006.
  3. Universe chunks are named `assets/universe-<id>-<hash>.js` so the SW can skip them in the precache.
  4. `build` script runs typecheck first (app + SW configs).
  5. Placeholder beep lives in `core/audio/beep.ts` (tiny) so Task 002 can replace it in place.
- How verified: clean `npm ci && npm run typecheck && npm run build` pass; build shows `universe-mario-*.js` (2.3 kB) separate from the 1.2 MB entry chunk. Headless Chrome (Playwright, outside the repo) against `npm run preview` at /games/: 844x390 phone (touch), 1280x800 tablet (touch), 1366x768 desktop (mouse + Space): no scrollbars, canvas fits and centres, tap/click/key changes the scene, AudioContext state "running" with oscillator created after first gesture, Mario chunk requested lazily, no console errors. 390x844 portrait shows the rotate overlay. Offline: after one load + reload the SW controls the page, precache holds the shell, runtime cache holds the Mario chunk; with the browser set offline, reload still renders and reacts. Chrome's `Page.getInstallabilityErrors` returns none; manifest has no errors. `npm run dev` also renders and reacts. Workflow YAML parsed; action versions checked against GitHub's latest releases (checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5).
- Open issues / risks: not tested on a real device (iOS Safari fullscreen/audio/double-tap behaviour in particular); actual sound output not heard (only verified the audio graph runs). Double-tap zoom block relies on viewport + touch-action; verified via CSS only. Scale.FIT letterboxes on non-16:9 screens (sky-coloured bars, ground does not reach edges). Pages deploy untested until the parent pushes and sets Source to "GitHub Actions". Vite warns about a deprecated `inlineDynamicImports` option coming from vite-plugin-pwa's SW build (harmless).
- Suggested next: Task 002 (InputManager + AudioManager). Decide letterbox handling (FIT vs EXPAND) before Task 003 lays out levels.
