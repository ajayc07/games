# Athi's Game

A private, non-commercial browser game for a 3-year-old: a gentle robot platformer ("Robo World") that teaches
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

## Playing
The first visit opens the picker: eight colour cards, each with its own little robot (colour, size, antennae and
chime). Tap a card, then the green Play button (keys: arrows, then Enter/Space twice). The choice is remembered, so
later visits go straight to Grass 1 ("Tap to hop": the robot runs by itself; any tap, click or key hops). The palette
button on the win screen opens the picker again.
- `?picker=1` shows the picker again; `?color=<id>` plays with that colour and skips the picker
  (red, orange, yellow, green, teal, blue, purple, pink).
- `?level=<id>` opens any level (skips the picker; with `?picker=1` the picker comes first, then that level).
- `?look=ball` shows a rolling ball instead of the robot.
- `?debug=1` exposes `window.__level` for automated tests.

## Input Lab
Open with `?lab=1` (or the Home button after a level): try the controls and sounds on a device.
- Mode icons (top right) or keys `1`-`4`: (1) tap anywhere = jump, (2) Jump only, (3) Left + Right + Jump, (4) all four.
- Lights at the top show which actions are held; the small light turns green once audio is unlocked.
- Keys: arrows/WASD move, Space/Up/W jump, X/Z/Shift power. Gamepads: d-pad/stick, A jump, X/B power.
- In mode 4 the Power button makes the robot shoot a harmless energy ball (`&look=ball` and `&color=` work here too).
- Button size: add `?buttonScale=1.3` (or `0.8`) to the URL, range 0.6 to 1.6.
- `?debug=1` exposes `window.__lab` for automated tests.

## Deploy
Every push to `main` runs `.github/workflows/deploy.yml`, which builds and publishes `dist/` to GitHub Pages.

**One-time setup:** in the GitHub repo go to Settings -> Pages -> Source and choose **"GitHub Actions"**.
The first deploy fails until this is set.

## Docs
Project rules are in `CLAUDE.md`; plan and status in `docs/` (PROGRESS, DECISIONS, ARCHITECTURE, tasks).
