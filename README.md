# Athi's Game

A private, non-commercial browser game for a 3-year-old: a gentle Mario-style platformer that teaches
left/right, jump and power buttons. No text, no lose states. Phaser 3 + TypeScript + Vite, installable
as an offline PWA.

Live site: https://ajayc07.github.io/games/

## Develop
```sh
npm ci
npm run dev        # http://localhost:5173/games/
npm run typecheck
npm run build      # outputs dist/
npm run preview    # serves dist/ at http://localhost:4173/games/ (service worker active here)
npm test           # unit tests (Vitest)
npm run icons      # regenerates placeholder icons in public/icons/
```

## Input Lab
For now the only screen is the Input Lab: try the controls and sounds on a device before real levels exist.
- Mode icons (top right) or keys `1`-`4`: (1) tap anywhere = jump, (2) Jump only, (3) Left + Right + Jump, (4) all four.
- Lights at the top show which actions are held; the small light turns green once audio is unlocked.
- Keys: arrows/WASD move, Space/Up/W jump, X/Z/Shift power. Gamepads: d-pad/stick, A jump, X/B power.
- Button size: add `?buttonScale=1.3` (or `0.8`) to the URL, range 0.6 to 1.6.
- `?debug=1` exposes `window.__lab` for automated tests.

## Deploy
Every push to `main` runs `.github/workflows/deploy.yml`, which builds and publishes `dist/` to GitHub Pages.

**One-time setup:** in the GitHub repo go to Settings -> Pages -> Source and choose **"GitHub Actions"**.
The first deploy fails until this is set.

## Docs
Project rules are in `CLAUDE.md`; plan and status in `docs/` (PROGRESS, DECISIONS, ARCHITECTURE, tasks).
