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

### Branches and the world switch (Task 037, D-085)
A world can be a **branch** of another world's map. Data on `WorldDef` (`core/types.ts`): `branchFrom: { world, fork? }` (the map it hangs off and the level whose dot the path forks after; default the last dot) and `unlock: { afterLevel }` (open once that level, in any world, has at least one star). The Cave is `{ id: 'cave', levels: ['cave-1'], branchFrom: { world: 'grass', fork: 'grass-6' }, unlock: { afterLevel: 'grass-6' } }` in `universes/robo/worlds.ts`; nothing in `core/` mentions "grass" or "cave".
- **Pure rules** (`core/map/unlock.ts`, tested in `branch.test.ts`): `branchOpen(world, levels, { unlockAll, openedWorlds })` (no rule = open; `?unlock=all`, the parent's Unlock all, or the saved parent flag open it at once), `branchesOf(worlds, worldId)` (worlds with levels that hang off the map; a world without levels is a teaser), `forkIndex(parent, branch)`, `worldStars(world, levels)` (stars and maximum; one progress record serves every world), `worldOfLevel(worlds, levelId)`. `currentDot` and `newlyOpened` already work per world.
- **Layout** (`mapLayout.ts`): `mapGeometry(dots, teasers, { branchAfter: [dotIndex...], back })`. A mouth stands above the path at `dot.x + MAP.mouthDx` (170) at height `mouthY` 245 (picture 220 x 200, tap square `mouthHit` 180: clear of every dot, teaser and the palette button; tested on screen at all five sizes). A branch map (`back: true`) adds `backLead` 240 px before the first dot and a way-back arch `backDx` (-300) from it. `farHopMs(a, b)`: the long hop to a mouth or an arch, 420 to 1100 ms by distance.
- **MapScene** (`MapSceneData.branches: BranchSpec[]`, `onBranch(worldId)`, `onBack`, `fadeIn`, `startAt`): `makeMouth` draws a dark-grey rock arch with pastel crystals, a dark opening with a blue glow and a breathing cyan halo (open); a **locked** mouth is covered by a grey boulder (no halo) that shakes with the `bump` sound when tapped and does nothing else. After a result that opens it (`wasOpen` false, `open` true) the arrival animation rolls the boulder aside with sparkles and the `unlock` sound, then the halo comes on. Tapping an open mouth: the robot hops to its foot in one long arc, hops in, the arch pulses and the camera fades to dark blue in 420 ms (`fadeThrough`); the universe then switches the map. `makeBackArch` draws the green meadow arch with flowers and a sun at the left end of a branch map; it does the same hop and fade back, and the robot then stands on the fork dot (`startAt`). Short sandy side paths join the fork dot to the mouth and the arch to the first dot. Debug: `__map.state().branches` (`x`, `y`, `hit`, `worldId`, `open`, `locked`, `stars`) and `.back`.
- **Flow** (`manifest.ts`): `Session.mapWorld` is the world of the map to show; `openLevel` sets it from `worldOfLevel`, so Home and the result screen return to that level's own map; `openMap(s, worldId?, startAt?)` switches (a switch fades in from the dark). Teasers are the worlds that still have no levels (Sky, Castle), on every map. Cave levels always use the cave look (`themeForRun`: Day / Night does not repaint it). A direct `?level=cave-1` start works; its Home goes to the Cave map.
- **Parent view:** page 1 has a seventh row under Unlock all, "Open the Cave now" (On / Off) when the universe has a branch with an unlock rule (`ParentState.branch`, `parentLayout(..., withBranch)`); it saves `ProgressRecord.openedWorlds` through `ProgressStore.setWorldOpened` and survives Reset progress (like stickers, colour and settings); an old save loads as `[]`.
