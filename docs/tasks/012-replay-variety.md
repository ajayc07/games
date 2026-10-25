# Task 012: Replay variety (same level, a little different each time)

Context: on the tablet (D-044) he got bored when the same level repeated. Practice already gives a new layout on every Replay (D-049), but Grass 1-6 are fixed grids. This task makes replays of the story levels feel fresh without changing what each level teaches. Idea 1 and 3 from `docs/IDEAS.md` ("Replay variety"); ideas 2 (endless free-play level) and 4 (surprise map dot) stay parked.
Suggested model: Opus 5.5 (shared core, level loading, bot verification).

## Goal
Every replay of a cleared level shuffles where the coins and small bubbles sit (inside safe zones, same counts, same teaching content) and may add one rare rainbow bubble as a surprise. The first visit to a level is always the canonical grid, so the demo, the teaching and the star thresholds are unchanged.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-002, D-018, D-019, D-020, D-024, D-041, D-042, D-044, D-045, D-046, D-049), docs/architecture/levels.md, docs/architecture/shooting-bubbles.md, docs/architecture/practice.md (seeded RNG and chunk rules), docs/architecture/map-and-flow.md (where a level run starts and where `recordResult` is called).
- Existing: `core/levels/{format,grid,practice,bubbles,BubbleField,LevelScene,ResultScreen}.ts`, `core/levels/practice.ts` (seeded RNG, reachability helper), `universes/robo/levels/*.json`, `universes/robo/{manifest,worlds}.ts`, the progress store (`levels[id].stars`), `core/audio` (synth recipes), `?seed=` handling.

## In scope

### 1. Pure variation function (tested): `core/levels/variety.ts`
- `varyLevel(level, seed)` returns a new level config (same `id`, controls, stars, demo; only `grid` rows change). Same seed gives the same grid; different seeds differ in most levels. Reuse the seeded RNG from `practice.ts` (move it to a shared file if needed, no new dependency).
- What may move (only along the same ground run, never off it, never into the air):
  - Loose ground coins `c` (a coin whose cell is directly above ground) shift horizontally within their run.
  - Small bubbles `o` shift horizontally within their run, keeping their row (half a tile low, D-042).
- What never moves: `S`, `F`, `#`, big bubbles `O`, high bubbles `h`, and coin arcs over gaps (any coin not directly above ground). Gaps never change. This keeps the teaching shape of every level identical.
- Safety rules for any moved item: at least 2 tiles from a gap edge and from the start and flag columns (Grass 1-3 are tighter; use 1 where a level has no room and say so in the Result); at least 1 tile from another bubble; a bubble stays reachable by a shot from where the player stands or jumps (reuse the Grass 6 height check); coin and bubble counts and kinds per level are preserved exactly, so `stars` thresholds stay valid and every coin is still collectable.
- A level may opt out with `"variety": false` in its JSON (new optional field, validated, default true). Grass 1 and 2 (tap and Jump, auto-run with demo tile positions) opt out of moving coins that sit within 3 tiles of a `jumpsAtTiles` column; the demo script must still look right (verify with the demo on a varied grid).
- Tests: determinism, different seeds differ, 200 seeds per level parse, counts and kinds preserved, every moved item respects the spacing rules, no item enters a gap or the air, `S`/`F`/`#`/`O`/`h` rows unchanged, and a scripted bot (reuse the Task 011 bot) still collects every coin and pops every bubble on 200 varied grids of Grass 3-6.

### 2. When variety applies
- First play of a level (stars absent in the progress record) and any play with `?seed=` absent and `?variety=0`: the canonical grid. Replay of a cleared level (record has at least 1 star), and Replay from the result screen: varied, with a fresh random seed each play (stored only in memory, nothing saved). `?variety=1` forces varied, `?variety=0` forces canonical, `?seed=` fixes the seed for tests.
- The demo still plays on the first visit only (D-024) and always on the canonical grid.
- Falls, float-back (D-019), star rules (D-020) and progress recording are unchanged. Practice is unaffected (already generated).

### 3. Rainbow bubble (rare surprise)
- New legend char `r` in `core/levels/format.ts` is NOT used in the JSON files; the variety step may turn exactly one small bubble `o` into a rainbow bubble in a varied run, with a 1 in 3 chance per play and only in levels with at least 4 small bubbles (Grass 4, 5, 6). Same hit area and behaviour as a small bubble, never moves, never blocks.
- Look: the small bubble picture with a soft rainbow sheen (code-drawn placeholder texture, no text, no faces). Pop: a bigger sparkle and a rainbow burst of 8 coins (flying to the robot like the others), plus a new synth recipe `rainbow` (a rising three-note chime). The extra coins count toward the stars (they only help); nothing is ever lost.
- Pure and unit-tested: chance and eligibility from the seed; the rainbow never replaces a bubble the demo uses on first play (demo is always canonical anyway).

### 4. Docs and tests
- Update `docs/architecture/levels.md` (variety, when it applies, opt-out, rainbow), `shooting-bubbles.md` (rainbow bubble), PROGRESS.md (Task 012 done, roadmap, tablet checklist: does a replay feel different to him, does he notice the rainbow bubble, any level that feels unfair or too empty or too crowded after shuffling). Write D-052 at the bottom of DECISIONS.md summarizing the rules above. Fill in this file's Result.
- One commit: `task-012: replay variety`. No attribution lines (D-016). Do not push. Leave `.claude/launch.json` and `.claude/settings.local.json` uncommitted.

## Out of scope
A free-play endless level, a surprise map dot, new worlds, per-colour traits (parked in IDEAS.md), moving or timed objects, changes to gaps, heights, physics, hit boxes, star thresholds, the demos, or the first-play grid; new runtime dependencies; any text in the game.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; the banned-names test still passes.
- First play of every level is byte-identical to today's grid (a test compares against the JSON); Replay of a cleared level differs in most levels, and two Replays in a row differ.
- Grass 1-6 verified on varied grids: a bot finishes each, every coin and bubble is collectable, star thresholds are reachable (3 stars possible), no console errors.
- The rainbow bubble appears in roughly one in three varied runs of Grass 4-6 (report the observed rate over 60 seeds), pops with the new sound and 8 coins, and never appears on first play or in Grass 1-3 or Practice.
- Progress records, unlock rules and the map are unaffected (verify the record before and after a varied run).
- Regression: map, picker, parent view, Practice and the demo still work. 58+ fps where measurable (report the headless baseline), no console errors.

## How to verify
Unit tests and a Playwright bot with `?level=grass-N&variety=1&seed=...` at 844x390 and 1280x800 (screenshot of a canonical and a varied Grass 5 and Grass 6 side by side, plus a rainbow bubble mid-pop, in `_sources/review/012/`, not committed). Per CLAUDE.md sizing: this changes shared core, so use the full size set for the screenshots but keep bot runs short (a few seeds per level in the browser, the many-seed checks in unit tests). List what could not be checked (a real tablet, the rainbow chime by ear, how he reacts).

## Result (Code fills in at the end)
- What changed:
- Files touched:
- Deviations from plan (and why):
- How verified:
- Open issues / risks:
- Suggested next:
