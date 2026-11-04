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
- What changed:
- Files touched:
- Deviations from plan (and why):
- How verified:
- Open issues / risks:
- Suggested next:
