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
- What changed:
- Files touched:
- Deviations from plan (and why):
- How verified:
- Open issues / risks:
- Suggested next:
