# Task 020: Zen free play (an endless level with every button and power-up)

Design: D-063.

## Goal
One stage that is pure free play: all four buttons, all three power-ups, no end point and no way to lose, reached from the map.

## In scope
- `core/levels/zen.ts` (pure, tested): the segment generator, the swap rule, `?zen=`.
- `LevelData.zen`; `LevelScene` zen mode: no goal, `rebaseZen` / `clearContent`, background offset; `Player.shiftX`; `BubbleField.destroy`.
- The map's Zen button (`MapScene`, `mapZenSpot`, `addZenBadge`) and `openZen` in the robo manifest.
- Tests: generator rules on 120 seeds, swap maths, a bot run, the Zen button layout at five screen sizes.

## Out of scope
Step blocks and gaps in zen, a night zen, music, a score or best run, saving anything, a zen dot on the map path, tuning for the tablet.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass.
- In the browser: the map shows the button, tapping it starts the level, crossing a swap column in either direction changes nothing on screen (player screen x and background scroll identical before and after), power-ups and jump state survive a swap, display-object count stays flat over many swaps, no console errors.

## Result
- What changed: see D-063 and levels.md "Zen free play".
- Deviations from plan (and why): none. A segment is 300 tiles (not 260) so that every segment is guaranteed at least two power-up stretches.
- How verified: typecheck, 436 tests and build pass; Chromium at 1280x720: `?zen=1` starts, four swaps (three right, one left) leave the player's screen x, the background scroll, his speed and height identical, boots stay on across a mid-jump swap, object count stays at 112-139, a 60 s soak of walking, shooting and jumping gave 97 coins and no errors; the map button opens zen at 1280x720 and 844x390.
- Open issues / risks: not seen on a tablet; the swap moves the whole world 248 tiles at once, which relies on every on-screen object being rebuilt (checked for coins, pads, orbs, bubbles; a future object that stores a world x must be moved too); headless frame rate is about 6-10 fps so smoothness is unchecked.
- Suggested next: tablet check; then, if he likes it, a night version or a few more motifs.
