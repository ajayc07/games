# Parked ideas

Ideas that are not part of the current plan. Do not build these unless the parent asks. Newest first.

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
