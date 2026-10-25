# Architecture: Map and flow

Part of the architecture docs; the index is `docs/ARCHITECTURE.md`.

### Map and flow (D-036, D-039, Task 006)
- **Unlock rule** (`core/map/unlock.ts`, pure, tested): `worldDots(world, record.levels, { openAtATime, unlockAll })` gives each
  level's `{ id, index, stars, cleared, open }`. Level i is open if `i < clearedCount + openAtATime` (cleared = at least 1 star,
  counted anywhere in the world); with `finalLevelStarsRequired` the world's last level also needs that many stars in the world;
  `unlockAll` opens everything. `currentDot`: the first open level not yet cleared, else the furthest cleared one.
  `newlyOpened(before, after)` drives the cloud-clearing animation; `stepOpen` the keyboard hops. `unlockFromSearch`: `?unlock=all`,
  and only with `?debug=1` an `?open=N` override of `openAtATime` (to see the unlock animation with Grass 1-3).
- **MapScene** (`core/map/`, generic; data `{ theme, dots, teasers, option, look, arrival?, onPlay, onPicker }`): one world as a
  horizontal map (`mapLayout.ts`, pure, tested): dots 300 px apart on a wavy line (y 320-440), three teaser signposts after the
  last dot; with six Grass levels the map is 2785 px wide (scrolls on every screen, the avatar's dot stays in view; tested
  with 3, 4 and 5 levels at all five screen sizes). A map narrower than the screen is centred; a wider one scrolls (drag with a finger, 14 px
  threshold so taps stay taps) and eases to keep the avatar at 42% of the screen. Sky, clouds and hills reuse
  `ParallaxBackground` and the theme textures; the path is a sandy spline, then stepping stones toward the teasers. Each dot is
  a round pad (orange open, green cleared, grey locked) with 3 star slots; a locked pad is under a theme cloud. Teaser clouds are fully opaque (Task 007), so the
  stepping stones and posts no longer show through. Tap targets:
  dots 150 px, teasers 170 px, palette button r 56 (hit 123 px, top-right). The avatar (`AvatarDriver` + `createLook` with the
  chosen option, look and `?size=`) stands on the current dot; hops are 420 ms arcs (70 px) using the driver's take-off/land.
  Tap an open dot (or Enter/Space): hop there, a green play icon pops, `pick`, then `onPlay(levelId)`. Tap a locked dot or a
  teaser: a soft shake and the `bump` sound. Left/Right: hop between open dots (`hop` sound). Arrival (back from a win): new
  stars pop in one by one (`coin`), the pad turns green, each newly opened cloud lifts away with sparkles (`unlock`), then the
  avatar hops to the new current dot. Input is ignored while it plays. `?debug=1`: `window.__map.state()`.
- **Flow** (`universes/robo/manifest.ts`): `boot` awaits `ProgressStore.open` (with the migrated 005d choice), then:
  `?lab=1` Input Lab; `?level=<id>` that level directly (with `?picker=1`: the picker first); `?picker=1`, or no saved choice
  and no `?color=`, the picker, whose Play saves the choice and opens the map; otherwise the map. `?color=<id>` is for this
  visit only (not saved; a real pick in the picker replaces it). `?look=` is saved in the record and used on later visits.
  In a level: `onResult` records the result (best values) and flushes before the win screen appears; Home (win screen) and the
  hold-to-exit icon go to the map, which then plays the arrival animation once; Next is shown only when the next level exists
  and is open after this result (`LevelSceneData.nextAvailable`); Replay restarts; the palette button opens the picker and
  then replays the level. The map's palette button opens the picker and returns to the map.
  The demo still plays once per session (in memory), not from the record.
- **Hold-to-exit** (`core/ui/hold.ts` pure + `HoldButton.ts`): a small home icon (r 40, hit 110 px) top-right in a level. Held
  1 s (a yellow ring fills) it leaves to the map; a shorter press only wobbles it; sliding off cancels. Escape held 1 s does the
  same on desktop. Hidden during the demo and the "your turn" cue and on the win screen. The level's InputManager ignores
  pointers on it (`ignorePointer`), so on tap-anywhere levels touching it never jumps.
