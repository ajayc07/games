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
npm run icons      # regenerates placeholder icons in public/icons/
```

## Deploy
Every push to `main` runs `.github/workflows/deploy.yml`, which builds and publishes `dist/` to GitHub Pages.

**One-time setup:** in the GitHub repo go to Settings -> Pages -> Source and choose **"GitHub Actions"**.
The first deploy fails until this is set.

## Docs
Project rules are in `CLAUDE.md`; plan and status in `docs/` (PROGRESS, DECISIONS, ARCHITECTURE, tasks).
