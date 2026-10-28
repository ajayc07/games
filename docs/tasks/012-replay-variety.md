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

## Result
- What changed: `core/levels/variety.ts` (`varyLevel`, `rainbowPick`, `useVariety`, `?variety=`/`?seed=` helpers); level format gets optional `"variety": false` and legend char `r`; rainbow bubble (kind `rainbow`, 8 coins, code-drawn sheen, `rainbow` synth recipe, colour rings, 30 sparkles); `openLevel` varies a replay of a cleared level and the win screen's Replay; `LevelScene.demoWillPlay`; `?debug=1` state exposes `grid`. Parent answers used: variety after the first clear, rainbow in, Grass 1-2 vary but keep coins within 3 columns of a demo jump. D-053.
- Files touched: `core/levels/{variety,variety.test,testBot,format,grid,bubbles,BubbleField,LevelScene,practice.test}.ts`, `core/audio/recipes.ts`, `universes/robo/manifest.ts`, docs (levels.md, shooting-bubbles.md, DECISIONS.md, PROGRESS.md, this file).
- Deviations from plan (and why): decision number is D-053 (D-052 was taken by Task 013). Coins move as rigid clusters of touching coins, because almost no coin in Grass 1-6 sits "directly above ground" (they are at head height or in arcs); arcs over gaps are coins within 2 columns of a gap. Moved items keep 3 columns from gaps (always) and from start/flag (2 if no other place, the "tight" fallback); the bubble reachability check is by construction (rows never change, D-042 rows). `?variety=1` on a first play with the demo still canonical, because the demo always runs on the written grid. The practice bot moved to `testBot.ts` (shared) and gained a `jumpForCoins` option.
- How verified: typecheck, 381+ tests and build pass (banned-names test included). Unit tests over 200 seeds per level: determinism, counts and kinds, S/F/#/O/h unchanged, arcs fixed, rows kept, spacing, Grass 2 demo zone, opt-out, rainbow rate (3000 seeds 29-38%) and eligibility, and a bot that collects every coin and bubble on 200 varied grids of Grass 3-6 (same result as the written grids). 199-200 of 200 seeds differ from the written grid in every level. Browser (Chromium, 844x390 and 1280x800): screenshots in `_sources/review/012/` (Grass 5 and 6 canonical vs varied, rainbow bubble and pop); Grass 4 first play canonical (39/39, record 3 stars), varied rainbow run seed 1 = 44/44 coins (rainbow popped, +5), record bestCoins 44; Grass 3 win then R = varied replay, a second replay differs from the first and the canonical grid; no console errors. Rainbow rate in the browser over seeds 1-60: Grass 4 26/60, Grass 6 26/60, Grass 5 0 (no small bubbles; consecutive low seeds are correlated, the 3000-seed unit test gives about 1 in 3). Not checked: a real tablet, the rainbow chime by ear, fps (headless only), how he reacts.
- Open issues / risks: the rainbow sheen is subtle at 844x390 (visible as a soft rainbow arc on the lower half). Items near a gap or the start have little room, so Grass 5 and the start of Grass 3 and 6 shuffle less than the rest. `?seed=` makes Replay repeat the same grid (test only).
- Suggested next: parent answers after a tablet session; then the optional polish bundle (Task 014).
