# Parked ideas

Ideas that are not part of the current plan. Do not build these unless the parent asks. Newest first.

## 2026-10-25: Polish and life suggestions (parked, none approved)
Already in the game: idle breathing and a blink every 3-5 s. Not in the game (as far as a quick look showed): footstep sounds and a landing sound.
Suggested first bundle, a cheap cosmetic task ("Polish: sounds and idle life", would be Task 013): footsteps, landing thump with a dust puff, idle wave.
- **Idle fidgets:** after about 6-8 s standing still the robot waves, then random fidgets (antenna wiggle, look around, stretch, small dance); any press cancels at once; could differ per colour (see per-colour traits below).
- **Footsteps:** quiet taps per stride with slight pitch variation; a faster, lighter patter when auto-running; later a distinct timbre per colour.
- **Landing thump:** soft sound, dust puff and a tiny squash when landing after a jump.
- **Happy reactions:** a hop or sparkle on a run of coins; a "wheee" sweep on a long jump; a small robot dance after a combo row or five stars.
- **Music:** very quiet background music per world, on/off in the parent view.
- **Map life:** the robot looks around or hops on the spot, drifting clouds.
- **Parent view "today's play" summary:** levels played and combos made, icons only.
Rule: nothing may change gameplay, hit boxes or fairness; every extra works with both looks (robot and ball).

## 2026-10-24: Mario content removed (Task 005d, D-038)
The game is now the generic "Robo World" universe: no franchise names, pictures or voice clips in `src/`, the bundle or the
built site (a unit test scans for the names). The removed files are archived locally in `_sources/archive-private/` (gitignored).
Still needed before any commercial use:
- **Git history:** the public repo history still contains the archived character images and voice clips. Rewrite it
  (e.g. `git filter-repo` and a force push) or restart from a fresh repo with only original or licensed content.
- **Audio:** original or licensed sound effects and music (the current sounds are code-generated placeholders and chimes).
- **Store and legal items:** packaging, listing, kids' privacy rules and legal advice, as listed below.

## 2026-10-24: Possible commercial version (parked by the parent)
Question raised: how far is this from something sellable? Answer for now: the engine is reusable, the content is not.

**Reusable:** engine, input layer, level system, demo system, avatar rig (ball/portrait/robot), PWA and deploy pipeline, and the teaching design (control ladder, demos, no-fail play).

**Must be replaced for any commercial release:**
- The 7 Nintendo character images, names, voice clips and the picker built around them.
- Mario-flavoured details: the `mario` universe name, flag/coin look, world and level styling.
- Anything ripped or taken from official sites (sprite sheets, voice clips).
- The public repo history, which still contains those files even after deletion. Use a fresh repo with only original or licensed content.

**Route:** add a new universe (for example robots and other friendly characters) with an original cast, names, art, voices and music. Keep the Mario universe in a private repo/build only for Athiran. The universe module system already supports this.

**Commercial extras to plan later:** licensed or original audio and voices, store packaging (Capacitor for Android/iOS, icon, listing, screenshots), kids' privacy rules (Google Play Families, COPPA, India's data protection law; the offline, no-tracking design helps), a business model (one-time price is typical), and a market check. Get legal advice before launching.

**Status:** parked. Finish the private Athiran version first; keep code universe-agnostic so an original universe can be added later.

## 2026-10-24: Replay variety (D-044)
He got bored replaying the same level. Ideas, simplest first: (1) on replay, shuffle bubble and coin positions inside safe zones (seeded per play) so each run differs; (2) a free-play level with endless bubbles to pop and no flag; (3) more bubble types (bigger, smaller, different coin counts, a rare rainbow bubble); (4) a daily/random "surprise" dot on the map. Build only after Task 009 and with the parent's say-so. **Update 2026-10-25:** ideas 1 and 3 (shuffle plus a rainbow bubble) are drafted as Task 012; ideas 2 and 4 stay parked.

## 2026-10-24: Unique traits per colour option (parent's idea, parked)
Today the eight colour options differ only in colour, small size (0.92-1.12), antenna count (1 or 2) and chimes; physics, hit boxes and abilities are identical (D-038). Possible cosmetic-only extras, to design after the current plan (Tasks 009 and 010) is done and with the parent's say-so:
- A different shot shape per colour (star, heart, ring, drop) in the option's accent colour.
- A different pop sparkle or coin burst per colour when a bubble pops.
- A small unique win dance or antenna wiggle per colour.
- A trail or dust colour per colour while running.
Rule: nothing may change gameplay, fairness or hit boxes (levels stay identical for every option), and every extra must work with both looks (robot and ball) and be unit-tested like the existing option data.
