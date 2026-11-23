# Task 047: Zen gets exciting after 500 coins

Parent: "after 500 points the game becomes boring, the same thing again and again, we need to bump up the game with excitement". Read as zen (the endless mode).

## Result
- What changed: from 500 coins (`ZEN_FLAIR_COINS`) zen segments add four set-pieces (`frenzy`: ten small bubbles two tiles apart; `padChain`: three bounce pads with a coin trail; `rainbowRun`: four rainbow bubbles; `treasure`: a big bubble, a high one and a coin arch) and power-up stretches come every 16-32 tiles instead of 24-44. Every 100 coins in zen a celebration: confetti, sparkles, the sticker jingle (with its rumble) and a big counter pop.
- Files touched: `core/levels/zen.ts`, `LevelScene.ts`, `zenRamp.test.ts`, this file, `docs/PROGRESS.md`.
- Deviations from plan (and why): none; the request had no detail, so the ideas are mine. Guessed it meant zen.
- How verified: `tsc` clean; zen and Mega tests green (segments valid with set-pieces at every tier). Not played on a device.
- Open issues / risks: like the tiers, flair shows up one segment after crossing 500. Set-piece frequency (two pool entries each) and the milestone size are first guesses.
- Suggested next: parent plays zen past 500 and says what is still dull; candidates are enemy groups, speed zones, a coin storm event.
