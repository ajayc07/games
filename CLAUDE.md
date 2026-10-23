# Athi's Game

A private, non-commercial browser game for a 3-year-old (turns 4 in Feb 2027). Goal: teach navigation
buttons (left/right), jump and power buttons, and hand-eye coordination through a gentle Mario-style
platformer. Mario is the default (and for now only) universe; other universes (Ben 10, Marvel, ...)
will be added later as lazy-loaded modules.

Repo: https://github.com/ajayc07/games (public). Deployed to GitHub Pages at https://ajayc07.github.io/games/
Local folder name is "Athi's Game"; the repo/site name is `games`.

## How we work (two-Claude loop)
- **Claude Desktop = architect.** Writes task prompts, reviews summaries, owns the plan.
- **Claude Code = developer (you, if you are reading this in Code).** Implements one task at a time.
- The repo is the shared memory. A fresh session on either side must be able to continue by reading the files below.

## Read these first, every session
1. `docs/PROGRESS.md`: where we are, what is next, device-test notes from the parent.
2. `docs/DECISIONS.md`: settled decisions. Do not reopen them. If you think one is wrong, say so in your summary.
3. `docs/ARCHITECTURE.md`: module structure, data formats, input/audio/storage design.
4. The task file you were given in `docs/tasks/`.

## Stack
Phaser 3 + TypeScript (strict) + Vite. PWA via vite-plugin-pwa. GitHub Actions deploys to Pages.
Vite `base` is `/games/`. No backend, no analytics, no external network calls at runtime.

## Hard rules
- **Data-driven.** Characters, levels, worlds, unlock rules, sounds live in data/manifests per universe. No hardcoded character or level logic in `core/` or `shell/`.
- **Universe isolation.** Code in `src/universes/<id>/` may import from `core/`; `core/` and `shell/` must never import from a specific universe except through the loader (dynamic `import()`), so each universe is its own lazy chunk.
- **Child-first UX (age 3).** No text required to play. No lose states, lives, timers or game-over screens: a fall bounces the player back. Big, well-spaced touch targets. Mashing must be harmless. Each level introduces at most one new control.
- **One input abstraction.** Touch buttons, keyboard and gamepad all produce the same actions: `left`, `right`, `jump`, `power`. Game code only reads actions, never raw devices.
- **Mobile browser safety.** Block pinch-zoom, scroll, long-press menus and double-tap zoom. Support multi-touch. Unlock audio on first user gesture. Landscape layout.
- **Placeholders first.** Real art/sounds arrive later in `src/universes/<id>/assets/`. Everything must run with generated placeholder shapes and beeps, and swapping in real files must need only file drops plus manifest entries.
- Keep dependencies minimal. Ask (in your summary) before adding a new runtime dependency.

## Task protocol
- One task = one commit on `main`, message `task-NNN: <title>`. Do not push; the parent pushes.
- Verify before finishing: `npm run build` passes, and run the app if the task is visual.
- At the end of a task, in this order:
  1. Update `docs/PROGRESS.md` (move the task to Done, set Next, add open issues).
  2. Fill in the "Result" section of the task file.
  3. Commit.
  4. Reply with the **summary** in exactly this format:

```
TASK NNN SUMMARY
- What changed: ...
- Files touched: ...
- Deviations from plan (and why): ... (or "none")
- How verified: ...
- Open issues / risks: ...
- Suggested next: ...
```
