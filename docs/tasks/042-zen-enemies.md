# Task 042: Enemies in zen

Design: D-085 (addendum). Depends on Task 038 (Rock Beetle, Glow Bat and the generalised enemy code). Read D-002, D-063, D-065, D-080, D-082 and D-085 first. This replaces the "no enemies in zen yet" rule of D-080.

## Goal
He loves the enemies, so zen gets them: now and then a Bolt Bug, Rock Beetle or Glow Bat is on the path, gentle as ever (D-002), with the same shots, bump, coins and stickers as in the levels.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md, `docs/architecture/levels.md` (Zen sections, "Bolt Bug" and the Task 038 "Enemies" section).
- `core/levels/zen.ts` (motifs, `generateZen`, `zenWindow`, carry rules), `LevelScene.zenCarryGrid` and `rebaseZen`, the enemy field and validator from 038, `core/levels/mega.ts` and `megaPlan` (Task 033).

## In scope
- **A new zen motif `enemy`:** one enemy on a flat stretch, picked from a bag so that kinds are mixed and the Bolt Bug is the most common (suggested weights: bug 3, bat 2, beetle 1; tune and document). The motif reserves the enemy's patrol plus 3 clear tiles on each side (no gap, step, pad, orb or big bubble inside; coins and bubbles outside the patrol only), using the same validator rules as the levels.
- **Frequency:** about one enemy every 45 to 60 tiles of content, never two enemies within 20 tiles, never in the first segment's first 20 tiles of content, and never in the 49-tile carry window. So there is usually one enemy in sight at most. Document the numbers in a `ZEN.enemy` block.
- **Seam safety:** an enemy is never cut by a segment swap. The carry logic (`zenCarryGrid`) must either carry a live enemy with its patrol intact, or the motif never lies in the carry window. A popped enemy stays gone when carried. Test both directions of the swap.
- **Behaviour:** identical to the levels: shots (3 for a bug, 5 for a beetle, 3 for a bat), the gentle bump with 800 ms grace, one-touch pop as Mega, car or Flash, enemy coins fly to him and count in the coin bar (so enemies feed Mega Robo; check Task 030/033 gating so Mega stays rare: say in the Result how it changed), stickers by the existing first-beaten rules. The bug's and the beetle's patrol, never the bat's low pass, must not trap him against a stair or a gap (extend the 1-D bump test to zen layouts).
- **Zen time:** unchanged. **Practice and normal levels:** unchanged (Grass 1-7 stay enemy-free; bug-1 and the cave levels keep their own enemies).
- `?enemies=0` also hides zen enemies; `?enemies=1` forces one early (the first segment from tile 40) for testing. Document with the hooks.
- Docs: `levels.md` (Zen enemies section with numbers), PROGRESS (roadmap row, checklist: does he go for them in zen, too many or too few, does the bump annoy him in the flow of play), Result.
- One commit: `task-042: enemies in zen`. No attribution lines. Do not push.

## Out of scope
New enemy kinds, the boss in zen, enemy attacks, scary visuals, changes to Practice or Grass levels, new buttons or dependencies.

## Acceptance criteria
- typecheck, tests, build, banned-names pass; no image files; existing zen, bug and enemy tests unchanged and green.
- Generator tests over 200 seeds: each enemy's patrol is clear, spacing and frequency rules hold, none in a carry window, the bag mixes kinds.
- A long scripted zen run (at least 5 swaps in each direction) with enemies: no stuck state, no enemy cut or duplicated at a seam, no console errors; the bot gets past enemies by ignoring, shooting and with a power.
- Screenshots (`_sources/review/042/`, 844x390 and 1280x800): each kind in zen, a seam with an enemy nearby, an enemy popping into coins.

## Result
- What changed: zen has a new `enemy` motif (Bolt Bug, Rock Beetle, Glow Bat from a shuffled bag 3/2/1) on a reserved flat stretch (patrol + 3 clear tiles each side, one small bubble beside it each side), about 2.5 per segment. Enemies only lie in columns 52-262, outside both swap windows, so a swap never cuts or carries one; `rebaseZen` rebuilds the `EnemyField` (new `EnemyField.destroy`). Behaviour, shots, bump, coins and stickers are the levels' own. `?enemies=0` hides them, `?enemies=1` forces an early one.
- Files touched: `core/levels/zen.ts`, `EnemyField.ts`, `enemies.ts` (`enemiesForced`), `LevelScene.ts`, `universes/robo/manifest.ts`, new `zenEnemies.test.ts`, `docs/architecture/levels.md`, `docs/PROGRESS.md`, this file.
- Deviations from plan (and why): the zone rule replaces "carry a live enemy" (position-based safety, no carry code); density is one per 70-80 tiles in practice, not 45-60 (due is 45-60 tiles from the last enemy's middle, but motifs step the cursor); the enemy's stretch is taken off the power-up clock and one extra `gap` was added to `MOTIFS`, because enemies otherwise pushed the old zen tests' orb, bubble and gap minimums below their limits (those tests are unchanged); `?enemies=1` puts the enemy near tile 52-65, not 40, because tiles 2-50 are a swap window; a small bubble sits each side of an enemy so its stretch never reads as empty.
- How verified: typecheck, 592 tests and the build pass. Chromium (headless, system Chrome): each kind in zen at 844x390 and 1280x800; a bug shot 3 times pops into 7-8 coins; 14 swaps (6 right, 6 left, then both) rebuilt the enemies each time and matched the grid with no console errors; a 160-step walk-shoot-jump bot crossed a swap with no stuck state (2 of 2 enemies beaten, 219 coins). Screenshots in `_sources/review/042/` (kinds, pop, seam). Not shown: a car or Mega touch-pop in zen (same code as the levels); the bump walk-through is the 1-D test.
- Open issues / risks: Mega comes a little sooner (about 15-20 enemy coins per segment against the 50-coin first fills; gating unchanged); not tried by him; the zen density and the two bubbles beside each enemy are first guesses (`ZEN_ENEMY`).
- Suggested next: Task 039 (Cave levels 4-5), then 040 (boss).
