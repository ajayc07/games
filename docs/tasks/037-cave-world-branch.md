# Task 037: Cave world, the map branch and the first Cave level

Design: D-085. Read D-002, D-036, D-039, D-060, D-080, D-082 and D-085 first. Lifts the feature freeze (D-077) for Tasks 037-040 only.

## Goal
A second world, **Cave**, that he reaches from a clearly visible **branch** on the Grass map, with its own look (dark-blue rock, glowing crystals) and first level `cave-1`. He has outgrown Grass 1-3; the Cave is the next stage.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md, docs/architecture/map-and-flow.md, docs/architecture/levels.md.
- `universes/robo/{manifest.ts,worlds.ts,themes.ts}`, `core/map/{MapScene,mapLayout,unlock}.ts`, `core/levels/placeholders.ts`, `ParallaxBackground` (the night theme is the template for a second theme).

## In scope
- **World data:** a `cave` world in `worlds.ts` (levels `cave-1` ..., more added by 038-040) and a `caveTheme` in `themes.ts`: rock ground, dark-teal backdrop with parallax stalactites and cave arches, glowing crystals, a few drifting glow-motes. Avatar, bubbles, coins and orbs must stay readable; all eight robot colours visible. Code-drawn only. Nothing may be hidden by darkness.
- **The branch (the main design point):** on the Grass map the path forks at the end of Grass 6: one branch runs on to Grass 7 and the other levels as now, the second goes into a big glowing **cave mouth** (a rock arch with crystals, about 2x a dot, hit target 170 px or more). It is visible from the start of the map's right end so he sees it coming. Tapping it hops the robot in and opens the Cave map (a fade through the dark). The Cave map has a matching meadow arch at its left end that goes back. While locked the mouth is covered by a boulder that shakes with a soft bump when tapped; it opens after Grass 6 is cleared (data: `unlock: { afterLevel: 'grass-6' }`). `?unlock=all` opens it.
- **Parent view:** a row "Open the Cave now" (page 1, next to Unlock all) that sets a saved flag so he can go in at once. Kept on a progress reset (like colour and settings).
- **Generality:** map, unlock rule and branch come from world data, not from "grass" or "cave" strings in `core/`. `currentDot` and the arrival animation must work across two worlds; one progress record, per-world star totals.
- **Level `cave-1` "Cave Walk":** gentle intro, no enemies, about 70 tiles, all four buttons, crystal-look coins, a few small bubbles, two small gaps. Stars by coins. No demo.
- Teasers after the Cave: Sky and Castle.
- Docs: `map-and-flow.md` (branch, world switch), `levels.md`, `PROGRESS.md` (roadmap, hooks, tablet checklist: does he see and tap the mouth, understand the way back, is the cave readable), this file's Result.
- One commit: `task-037: cave world, map branch and cave-1`. No attribution. Do not push. No dev server left running.

## Out of scope
Enemies (038), later levels, the boss, new buttons or dependencies, changing Grass levels, zen.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; banned-names test passes; no image files.
- Unit tests: branch unlock (locked, open after grass-6, `unlockAll`, parent flag); map layout with the branch at all five screen sizes; world switch round trip keeps progress; `cave-1` validates and a bot finishes it.
- Screenshots (844x390 and 1280x800, `_sources/review/037/`, not committed): Grass map with the mouth locked and open, the Cave map, `cave-1` in play in at least three robot colours, the way back.
- Honest list of what is unchecked (tablet, his reaction, fps).

## Result
- What changed:
- Files touched:
- Deviations from plan (and why):
- How verified:
- Open issues / risks:
- Suggested next: Task 038
