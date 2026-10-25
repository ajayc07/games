# Architect handoff (for a new Claude Desktop session)

Read this first if you are a new Claude Desktop session taking over as the **architect** of Athi's Game.
Last updated: 2026-10-25 (Task 011 written).

## Roles and workflow
- **You (Claude Desktop) = architect.** You plan, write task files, review summaries and review screenshots. You do not write the game code.
- **Claude Code = developer.** The parent (Ajay) pastes a one-line prompt into Claude Code in `D:\code\Athi's Game`; Code executes one task file in `docs/tasks/`, commits, and ends with a standard `TASK NNN SUMMARY`. The parent pastes that summary back to you.
- The repo is the shared memory: `CLAUDE.md` (rules for Code), `docs/PROGRESS.md` (state, roadmap, tablet notes), `docs/DECISIONS.md` (D-001...; do not reopen settled ones without good reason), `docs/ARCHITECTURE.md`, `docs/IDEAS.md` (parked ideas), `docs/tasks/NNN-*.md` (one per task, with a Result section Code fills in).
- Repo: https://github.com/ajayc07/games (public, GitHub Pages at https://ajayc07.github.io/games/). Local: `D:\code\Athi's Game` (needs the folder connected to your session; ask the parent to add `D:\code` if you cannot reach it). Raw/private material lives in the gitignored `_sources/` (review images in `_sources/review/`, archived Nintendo files in `_sources/archive-private/`).

## Your review routine for each summary
1. Check the repo (git log, status, PROGRESS.md) rather than trusting the summary alone; stage and look at the review sheets in `_sources/review/` for visual work.
2. Approve or reject Code's listed deviations; record outcomes as a new D-number in `docs/DECISIONS.md` (append with `cat >>`).
3. Write the next task file in the same format as the existing ones (Goal, Read first, In scope, Out of scope, Acceptance criteria, How to verify, Result) and tell the parent the exact prompt to paste:
   `Read CLAUDE.md, then docs/PROGRESS.md, DECISIONS.md and ARCHITECTURE.md, then execute docs/tasks/<file>. Finish with the standard summary.`
4. Keep replies short: what you reviewed, decisions, the next prompt. The parent is busy and works in short sessions.

## Standing rules from the parent
- No `Co-Authored-By`, `Claude-Session` or "Generated with" lines in any commit or PR (D-016; `.claude/settings.json` also sets attribution empty). Do not push on the parent's behalf; the parent pushes.
- Do not make files the parent has to paste unless asked; write directly into the repo through the device tools. Never delete the parent's files (deleting needs permission; archive into `_sources/` instead).
- The game is private, for the parent's son Athiran (3 years old, turns 4 in Feb 2027). Child-first UX: no text needed, no failure states, big touch targets, mashing must be harmless, one new control per level.
- Parent tests on the tablet (Athiran's usual device) after meaningful milestones and reports what Athiran did; use that to steer priorities.

## Product summary
A gentle platformer that teaches navigation buttons (Left/Right), Jump and Power, and hand-eye coordination. Phaser 3 + TypeScript + Vite, PWA, offline, GitHub Pages via Actions. Universe modules (lazy loaded): currently one generic universe `robo` ("Robo World"). The player is a code-drawn robot (looks: `robot` default, `ball`) in a three-quarter view when moving; colour/size/antennae come from the chosen colour card. All physics and hit boxes are identical for every option.

## Where things stand (check docs/PROGRESS.md for the truth)
- Done and accepted: 001 to 007 (setup, input/audio, level engine, Grass 1-4, lively motion, avatar rig, robot view, robo universe + picker, map + progress, shooting).
- Tablet findings (D-037): Athiran liked the robot best, loves its shooting, got bored with auto-run/tap-to-jump (Grass 1/2), liked Grass 3 (walking). Robot looked like it ran backwards: fixed in 005c (parent should confirm on tablet).
- The original plan 001-010 is complete and reviewed (D-039 to D-048): picker, map and progress, Grass 1-6 (all four buttons), parent view. Everything up to ad168f0 is pushed. Tablet feedback (D-049): he loves shooting bubbles; holding a nav button while pressing an action button is hard. 011 Combo Practice (free play with a generated level, combo stars, ghost-hand hint, optional walk assist; docs/tasks/011-combo-practice.md, design D-049) was handed to Claude Code (Opus 5.5); check whether its summary has come in. Then, as the parent asked: the docs trim (architect does it directly after 011 to avoid clashing with Claude Code's PROGRESS.md edits). Remaining post-plan list (nothing starts without the parent's say-so): tablet tests, replay variety and unique per-colour traits (docs/IDEAS.md), git-history rewrite offer, more worlds.
- Open items: the public GitHub repo history still contains the removed Nintendo files; the parent may want a clean-history restart (offer exact steps once 005d is done). The commercial idea is parked in `docs/IDEAS.md`.

## Useful facts
- Query params for testing: `?level=<id>`, `?lab=1` (Input Lab), `?look=robot|ball`, `?color=<id>`, `?picker=1`, `?demo=0|1`, `?debug=1` (test hook), `?buttonScale=`, `?unlock=all` and `?size=` (after 006).
- Do not run `npm run dev` while Code runs `npm ci` (it locks `node_modules`).
- The local folder name contains an apostrophe ("Athi's Game"); the repo/site name is `games`.
