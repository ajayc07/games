# Task 019: Polish bundle (footsteps, landing thump, idle wave)

Cosmetic only. Nothing may change gameplay, hit boxes, physics or fairness. Every extra works with both looks (robot and ball) and all eight colours.

## Goal
Make the little robot feel more alive: a footstep tap per stride, a soft landing thump with a dust puff and a tiny squash, and an idle wave.

## Read first
- CLAUDE.md, docs/PROGRESS.md, docs/DECISIONS.md (D-002, D-075), and only `docs/architecture/avatar-and-motion.md` and `docs/architecture/ui-input-audio.md`.
- Existing: `core/avatar/clips.ts`, `core/avatar/AvatarDriver.ts`, `core/levels/animation.ts` (stride timing), `core/levels/Player.ts`, `core/audio/recipes.ts` and `AudioManager.ts` (tone recipes, `megaStep` is the pattern for step sounds), the idle blink and breathing, the Volume setting (D-075), `docs/IDEAS.md` ("Polish and life suggestions").

## In scope
- **Footsteps:** a quiet tap per stride while he walks (slight random pitch variation so it never sounds mechanical), lighter and faster when he runs (hold to run or Flash). Not while flying, in the car, or as Mega Robo (Mega has its own `megaStep`). Respects the Volume setting and sound on/off. Never more than one step sound per stride, and the voice limiter must still hold.
- **Landing thump:** a soft sound, a small dust puff and a tiny squash (about 6% for 90 ms) when he lands after a jump or a fall from at least a tile high; none for a tiny hop or a pad launch landing on the pad. Not in the car or when flying.
- **Idle wave:** after about 7 s standing still (no touch, not paused) he waves one arm (robot look; the ball look does a small bounce) once or twice, then goes back to idle; any touch cancels at once. Never when the auto-pause hint (Task 027) is about to show.
- Docs: `docs/architecture/avatar-and-motion.md` (the three behaviours and their numbers), `docs/PROGRESS.md` (roadmap row, checklist: are the steps too loud or annoying, is the wave cute), `docs/DECISIONS.md` (append the next free D-number with what you decided), this file's Result.
- Unit tests for the pure parts (step pitch range, landing threshold, idle timing and cancel). One commit: `task-019: footsteps, landing thump, idle wave`. No attribution lines (D-016). Do not push. Do not start a dev server. Leave `.claude/launch.json` and `.claude/settings.local.json` uncommitted.

## Out of scope
New buttons, music, per-colour traits, any gameplay or hit box change, changing Mega Robo, new runtime dependencies.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; banned-names test passes; no image files added.
- Chromium: a screenshot of the landing puff and of the wave in each look (`_sources/review/019/`, not committed); no console errors; the sounds only played when sound is on; no change to any level's timing, scores or physics (existing tests unchanged).
- Honest list of what could not be checked (the sounds by ear, real tablet, fps).

## How to verify
Playwright (Chromium) with a scripted run (walk, run, jump, stand still 8 s), unit tests, the screenshots above.

## Result
- What changed: footsteps (one soft tap per stride, 4 walk and 3 lighter run pitch variants, never the same twice in a row, not in the car, as Mega Robo or while flying), a landing thump (after a drop of at least a tile; not for a flight, the car or a bounce pad) and an idle wave (after 7 s untouched the robot raises and waves one arm for 1.8 s, the ball bounces; any touch stops it at once; never in the last 10 s before the auto-pause). Sounds go through the normal audio path, so sound on/off, Volume and the voice limiter apply. D-081.
- Files touched: `core/audio/{steps(new),AudioManager,recipes unchanged}.ts`, `core/avatar/{polish(+test, new),AvatarDriver,RobotLook,BallLook,clips,robotSpec,types}.ts`, `core/levels/{Player,LevelScene}.ts`, `docs/{PROGRESS,DECISIONS}.md`, `docs/architecture/avatar-and-motion.md`, this file.
- Deviations from plan (and why): no extra "6% for 90 ms" squash, because every landing already has a stronger squash and dust ring (`ANIM.pulse.landing`); the wave sequence repeats after 5 s of rest while he stays untouched; the thump is skipped on a bounce pad cell by the scene (`grid.pads`).
- How verified: `npm run typecheck`, `npm test`, `npm run build`. Unit tests (`polish.test.ts`): step pitch range and variants, no repeat, quiet and short, one tap per stride within the voice limiter at walk, hold-to-run and Flash speeds, thump threshold, idle wave timing, cancel by a touch or by moving, no wave before the auto-pause, wave clip. Chromium preview build with a scripted run (walk taps, hold to run, jump, stand still): 6 walk taps counted, run steps used the run ids, exactly one `landThump` per jump, the wave started about 7 s after the last key and a key cancelled it within 120 ms, with the robot and the ball look at 844x390 and the robot at 1280x800; with `sound=0` nothing played; no console errors. Screenshots in `_sources/review/019/` (not committed): the wave and the landing puff in each look. The preview server on port 4173 is stopped.
- Open issues / risks: the sounds by ear, loudness against the other sounds, the real tablet and fps were not checked; whether the wave is cute or distracting and whether the steps annoy him are tablet questions. The landing screenshot catches the dust ring a moment after touch-down, so the squash is not clearly visible in the still.
- Suggested next: watch him play before more (play report, bugs in zen).
