# Task 040: The Cave Guardian (final boss) and the world-cleared celebration

Design: D-085. Depends on 039. Read D-002, D-058, D-074 and D-080 first.

## Goal
A big friendly-grumpy **Cave Guardian** at the end of the Cave. He beats it by shooting; it never hurts him. Beating it opens the gate, gives a big sticker and a celebration.

## In scope
- **Guardian:** a large rock golem drawn in code (about 4 tiles tall, glowing crystal on its chest as the target, original design, big round eyes and a sleepy grumpy mouth, never scary). It stands in a flat arena of about 30 tiles with walls at both ends and no gaps, and **walks slowly toward and away** over about 10 tiles at 35% of his walk. No projectiles. A touch bumps him gently back like the other enemies (same grace rule), so he can always shoot from a distance.
- **Beating it:** **10 power shots** on the chest crystal. Each hit lights the crystal brighter, wobbles the golem and drops 2 coins. A touch as Mega, car or Flash counts as one hit (never a one-touch kill). The arena holds one Flash or car orb and one magnet orb so he can mix powers. Standing and jumping shots both reach the crystal (test).
- **Finish:** the golem crumbles into a shower of crystal coins (20), the gate opens with a rumble and the charging pad appears. Longer win chime and crystal confetti. A new big **Cave Guardian sticker** and a saved "world cleared" flag that puts a crown on the Cave mouth (Grass map) and on the Cave map.
- Level `cave-boss` "Cave Guardian", `variety: false`, no demo. Never in zen or Practice. `?boss=0` opens the gate without a fight (testing).
- No lose state, no time limit, no falls. If he leaves and returns, the hit count resets.
- Sounds as recipes (`golemStep` quiet, `golemHit`, `golemCrumble`, `gateOpen`) through the normal audio path.
- Docs (`levels.md` Boss section with all numbers), PROGRESS (tablet checklist: scared or proud, 10 shots too many, is the arena fun), Result.
- Commit: `task-040: cave guardian boss`.

## Out of scope
Phases, damage, lives, enemy shots, more worlds (Sky, Castle), new buttons or dependencies.

## Acceptance criteria
- typecheck, tests, build, banned-names pass. A bot beats the boss by shooting (never stuck against it) and with powers.
- Screenshots (`_sources/review/040/`, 844x390 and 1280x800): arena, a hit, the crumble, the open gate, the sticker, the crowned Cave mouth.
- The Guardian reads as cute-grumpy, never frightening for a 3-year-old.

## Result
- What changed: the Cave Guardian. A new level `cave-boss` (36-tile flat arena, a car orb and a magnet orb, the pad behind the golem) with a code-drawn rock golem (about 4 tiles tall, big sleepy eyes, a socket with a glowing crystal on its chest) that walks 10 tiles at 35% of his walk. 10 power shots on the crystal beat it (2 coins a hit); a touch as Mega, car or Flash is one hit, spaced by the usual bump grace; a plain touch is the gentle bump. At the 10th hit it crumbles (rubble, rings, 20 coins), the rock gate rolls up with a rumble and the charging pad fades in. Longer win tune and a second confetti shower. New big crystal sticker (`g01`, once) and a saved "Cave cleared" flag that puts a gold crown on the Cave mouth (Grass map) and over the last dot of the Cave map. The Cave's last level needs 10 Cave stars. `?boss=0` opens the gate without a fight.
- Files touched: new `core/levels/boss.ts`, `boss.test.ts`, `BossField.ts`, `universes/robo/levels/cave-boss.json`; edited `LevelScene.ts`, `format.ts`, `grid.ts`, `placeholders.ts`, `audio/recipes.ts`, `rewards/stickers.ts`, `stickerArt.ts`, `StickerScene.ts`, `storage/progress.ts`, `store.ts`, `map/MapScene.ts`, `universes/robo/manifest.ts`, `worlds.ts`, tests (`levels.test.ts`, `progress.test.ts`, `stickers.test.ts`), `docs/PROGRESS.md`, `docs/architecture/levels.md`, this file.
- Deviations from plan (and why): the Guardian is not an `EnemyField` kind but its own small system (`boss.ts` / `BossField.ts`), because it has a hit circle on a crystal, a walk of 10 tiles, no shrinking and a very different finish; the grid letter is `G`. The arena walls are the level's own soft end limits plus a decorative rock wall and gate. The sticker is a 25th, special sticker (not the next one in the sequence), so the book grows a slot once he has it. A boss win is always 3 stars (its 40 coins). The hit count resets only because the level restarts (nothing is saved).
- How verified: typecheck and build, all tests pass (new: 12 boss tests incl. the kinematic bots, plus level, sticker, store and progress tests; the banned-names scan is in the suite). In the browser (headless Edge driven by a scratch puppeteer script kept outside the repo, 844x390 and 1280x800): walked up, shot it 10 times (10 hits counted, the crystal brighter each time), crumble, sticker pop, the gate opening, the pad, the win screen, then the Grass map with the crowned mouth and the Cave map with the crowned last dot; `?boss=0` skips the fight and reaches the pad. Screenshots in `_sources/review/040/` (arena, hit-3/8/9, crumble-a/b, gate-opening, gate-open, win, result, crowned-mouth, crowned-cave-map at both sizes; git-ignored).
- Open issues / risks: not seen on a tablet (scared or proud, is 10 shots too many, does he use the orbs); the headless machine runs at about 10 fps so animation timing was judged from frames, not by eye; the left rock wall is a plain decorative pillar; the Guardian's sticker pop is large (radius 150); the 25th sticker slot only shows after he has earned it. Sounds are placeholders, not heard by ear. Mega Robo is not available in this level (it has orbs, so no coin bar); a power orb is the way to use touches.
- Suggested next: tablet test of the Cave (Tasks 037-040), then decide on more worlds (Sky, Castle).
