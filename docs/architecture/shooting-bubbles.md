# Architecture: Shooting and bubbles

Part of the architecture docs; the index is `docs/ARCHITECTURE.md`.

### Shooting and bubbles (D-041, Task 007)
- **`shots.ts`** (pure, tested): all numbers in `SHOT` (cooldown 300 ms, at most 3 in flight, 700 px/s, range 640 px, spawn delay
  40 ms so the ball leaves once the arm points forward, hit radius 14, press buffer 300 ms). `ShotCannon.update(now, dt, { pressed,
  held }, facing, muzzle)`: a press fires at once if the cooldown is over and fewer than 3 are on their way; holding repeats at the
  cooldown; a press during the cooldown (or at the cap) is kept for 300 ms, so mashing fires steadily and never loses a shot it could
  fire. The direction is the facing at the press; the ball starts at `muzzle()` and flies straight. Events: `fired` (play `shoot` +
  the `power` sound), `launched`, `expired` (end of range: fade). `consume(shot)` = it hit something. With the cap, holding fires 3
  shots 300 ms apart and the 4th about 70 ms later (when the first ends).
- **`Blaster.ts`** (Phaser): one per shooter. Draws each shot as `shotOrb` (`avatar/parts.ts`: 40 px with its halo, solid core 20 px,
  accent colour; a light rim for green accents, like the robot's) with a 3-copy fading trail that never reaches back past the muzzle;
  a shot that hits nothing fades out at the end of its range (180 ms), one that pops something puffs out. `Shooter` = `{ facing,
  muzzle(), shoot(now) }`, so levels (a `Player`) and the Input Lab (its hero) use it the same way.
- **`bubbles.ts`** (pure, tested): `BUBBLE` (picture radius 0.47 tile small / 1 tile big, 3 / 6 coins, hit circle x1.3, bob 4 px /
  2 px over 2.2 s with golden-ratio phases, pop 220 ms). `bubbleSpecs`: a big bubble is centred in its 2x2 block (bottom on the
  ground); a small one floats `smallDrop` (half a tile) below its cell centre but rests on the ground at the lowest, so the row on the
  ground gives a centre 30 px up and the row above 64 px up. Why: the shot leaves 26-78 px above the feet (both looks, every option,
  `?size=` 0.8-1.6); a bubble centred in the second row (96 px) would be out of reach for the ball and the small robots.
  `shotHitsBubble` (circle vs circle), `blockerWalls` (a big bubble's soft wall on the side the body comes from, only while they
  overlap vertically), `coinArc`, `CoinFlow` (coins appear in an arc, wait 400 ms, leave 70 ms apart, fly 380 ms to the player's
  chest, count on arrival; the coin sound at most every 140 ms; `flushAll` at the flag; demo coins `counted: false`), `PopPitch`
  (each pop within 1 s goes one step up `POP_STEPS` (pentatonic), capped at the top, then starts again).
- **`BubbleField.ts`** (Phaser): bubbles drawn once per size with Canvas 2D (translucent soft blue/white, white rim, a pink soap-film
  sheen, highlight streak and dot, no faces), behind the player. `tryHit` pops the first unpopped bubble a shot touches (scale-up and
  fade, a white ring, sparkles, `pop-<step>` sound), then its coins. `walls(body)` gives the player's extra soft walls.
- **LevelScene**: `Player.step` takes `walls` (the big bubble's soft wall, same `edgeLimit` stop as the level ends). `updateShots`
  runs every frame in every mode, so shots in flight finish their path; Power is read only in play; pops count in play and during
  the cloud ride. At the flag every coin still flying lands (`flushCoins`) before the stars are worked out. Coins from bubbles count
  for stars and `bestCoins` like grid coins (`totalCoins` = grid coins + bubble coins).
- **High bubbles** (`h`, Task 009): a small bubble worth 4 coins that is only reachable by shooting from the air. It floats
  `BUBBLE.highRise` (a quarter tile) above its cell centre; in the row 2.5 tiles over the ground its centre is 176 px up. Shot
  heights, measured in the browser at size 1 for both looks and all eight options (`SHOT_HEIGHT` in `shots.ts`): leaving the
  muzzle standing 32-49 px up; pressing Power at the top of a jump 177-205 px up (211 at the true peak). With the hit circle
  (bubble 30 x 1.3 = 39 px, shot 14 px, bob 4 px) the bubble is hit by a shot fired from the top half of a jump and never by a
  standing shot, even at `?size=1.6` (78 px). A bubble 160 px up was 1 px from missing for the biggest option at the peak, hence
  the raise. The unit test and the bot (`?level=grass-6`, 16 option/look combinations) both check this.
- **Rainbow bubble** (`r`, Task 012, D-053): a small bubble (same size, drop, hit circle, bob) with a strong rainbow look drawn in code (Task 014, D-054: six thick saturated bands round the whole bubble and a slow sparkle twinkle every 1.5 s; size, hit circle, value and sound unchanged)
  (`bubble-rainbow-<r>` texture), worth 8 coins (`BUBBLE.coins.rainbow`) instead of 3. Never written in the level JSON: replay variety
  turns exactly one small bubble `o` into `r` (see levels.md "Replay variety"). The pop plays the `rainbow` synth recipe (a rising
  three-note chime, instead of the stepping `pop-<n>` sound), 30 sparkles and five coloured rings after the white one, then the 8 coins
  fly in like any others. The extra 5 coins only help the stars.
  Test hook `?rainbow=1` (Task 014b, `withRainbowHook` in `variety.ts`): forces exactly one `o` to `r` (picked from the seed) on a varied run only (a replay of a cleared level, or `?variety=1`;
  a Practice run counts as varied), so a first canonical play never changes; a level without small bubbles, or one that already has a rainbow bubble, is unchanged. Use with `?level=grass-4&rainbow=1&variety=1&demo=0&seed=5`
  or `?practice=walk-shoot&rainbow=1`. Task 014b only strengthened the twinkle (sparkle scale 0.5-1.8 instead of 0.3-1.2) and closed a small notch in the bands at 3 o'clock; size, hit circle, value and sound are unchanged.
- **Power button**: `TouchControls` shows Power only when enabled. Without Jump it takes Jump's bottom-right slot at the solo size
  (0.28 of the screen height), purple with a yellow star; with Jump see "Input" (four-button layout).
- `?debug=1`: `__level.state()` adds `shots` (`inFlight`, `fired`, `visible`, `flying`), `ghostShots`, `bubbles` (kind, x, y, r,
  popped, coins), `pops`, `coinsFlying`, `gridCoins`, `muzzle`; `__lab.shots()`.

Robo World routing: see "Map and flow"; test params `?level=<id>`, `?color=<id>`, `?look=`, `?size=`, `?picker=1`,
`?unlock=all`, `?demo=0|1`, `?lab=1`, `?debug=1` (plus `?open=N`). The world list is plain data in `universes/robo/worlds.ts` (Grass: grass-1 .. grass-6; then Cave, Sky,
Castle, empty), and so are the options (`universes/robo/options.ts`), so tests can read both without Phaser.

Grass levels (re-paced in Task 005c, D-037: about 60% of their old length, same coin density):
Grass 1 "Tap to hop": 85 tiles, tap anywhere, no demo, 16 coins (3 at head height, two five-coin arcs, one five-coin arc over the
1-tile gap at 50 and a three-coin arc over the 1-tile gap at 66), flag at 80, stars 7/12 (was 140 tiles, 26 coins, 12/20).
Grass 2 "Big Jump button": 90 tiles, only the Jump button (taps elsewhere never jump), demo `{ tiles: 20, jumpsAtTiles: [8, 15] }`,
18 coins (3 at head height, 5 three-coin arcs that need a timed press: pressing on entering column k-1 collects the arc centred on
k), gaps at 42, 60-61 and 76-77, each with an arc 5 tiles before it, flag at 85, stars 9/15 (was 150 tiles, 30 coins, 15/25). Grass 3 "Left and Right": 70 tiles, flat, no gaps, no auto-run,
Left/Right/Jump buttons, start at column 6, 22 coins (4 to the LEFT of the start, 14 in four short trails to the right, all 18 at
head height: collected by walking and always above the buttons, Task 005b; 4 lone coins 2.5 tiles up that need a standing jump),
flag at column 64, stars 10/16 (16 needs some left or overhead coins), demo script:
right 1.5 s, left 0.9 s, one jump.
Grass 4 "Shoot" (Task 007): 80 tiles, flat, no gaps, Left/Right/Power (no Jump), start at column 6, no grid coins. 11 small bubbles
(1 behind the start, 2 just ahead, 5 about 6 tiles apart, 3 after the big one; low ones resting on the ground, high ones 1 tile up)
and one big bubble at columns 48-49 (60%), flag at column 74: 39 coins, stars 22/34 (3 stars need 10 of the 11 small bubbles and the
big one; the big one alone gives 1 star). Demo script (about 7 s): right 0.5 s, Power, right 0.9 s, Power, left 0.9 s, Power (the
bubble behind the start), right 0.3 s.
Grass 6 "Everything" (Task 009): 80 tiles, walking, all four buttons, start at column 6, flag at column 76. Five gaps of 1, 2,
1, 2, 2 tiles at columns 20, 28-29, 37, 58-59, 67-68 with 7 or more tiles of ground between (and after the last), an opening stretch of
14 tiles with no gap (1 small bubble behind the start, 3 ahead, 3 coins to the left). 13 small bubbles (3 coins each, the low ones
resting on the ground and the upper ones 1 tile up, as in Grass 4), 3 high bubbles (4 coins each, columns 25, 33, 54, over safe
ground 3+ tiles from any gap), one big bubble at columns 48-49 (60%, 10 and 8 tiles from the nearest gaps; never within 3). Coins:
18 in gap arcs (a coin before each gap, one or two above it, one after: 3 columns after a 1-tile gap, 1 after a 2-tile gap), 3 left of
the start, 39 + 12 + 6 from bubbles = 78 in all. Stars 38 (about half) and 62 (about 80%); three stars never need the high bubbles
(66 coins without them), a run that skips every small bubble and the high ones gets 24 coins = 1 star. Popped bubbles stay popped
after a float-back (the bubble field does not depend on the player). Demo script (about 9 s plus the 0.6 s tail and the "your turn"
cue, 10 s in all): right, Power (pops the first bubble), right to the edge with a Power on the way, Jump over the first gap, Power,
right, Power.
Grass 5 "Move and Jump" (Task 008): 75 tiles, walking, Left/Right/Jump laid out exactly as in Grass 3, no Power, no bubbles, start
at column 6, flag at column 71. Six gaps of 1, 1, 2, 1, 2, 2 tiles at columns 14, 23, 32-33, 42, 51-52, 61-62, always 8 or more tiles
of ground between them (6 is the tested minimum), 14 tiles of ground before the first gap. 28 coins: 4 to
the LEFT of the start (head height), a coin arc over every gap (a coin before it, one or two above it, one after), 3 at the very end;
stars 14/22 (the bot gets all 28). The coin after a 1-tile gap sits 3 columns after the gap starts (where a jump from the edge lands):
a coin 1-2 columns after it is flown over at the apex and cannot be collected without walking back (found by the bot, tested).
Demo script (about 8.2 s): right 2.2 s to the first gap's edge, Jump + right 1 s, right 1.5 s, Jump + right 1 s over the second gap.

**Walking over gaps (Task 008, measured in the browser).** Air time 2 x 760 / 1800 = 0.844 s. A jump carries 186 px at walk speed 220
(running) and about 179-189 px from a standing start (the ramp loses about 7 px; measured 178-189). The body centre must travel
`gap - 20 px` when it starts on the edge (the far side of the 40 px body has to reach the far edge), so 1 tile needs 44 px, 2 tiles
108 px (margin 71 px, about 0.3 s of walking) and 3 tiles 172 px (margin 7 px: too tight, so gaps are 1 or 2 tiles). A body supported
by the ground overhangs by up to 20 px, so a standing player can be 20 px past the edge, which only makes a jump easier. A 1-tile gap
(64 px) is wider than the 40 px body: a stationary player with the centre between 16 and 44 px past the near edge falls in, and
walking over without a jump falls too. All six gaps were crossed from a standing start at the edge (centre 0 and 19 px past it)
with Right and Jump pressed together. Holding Right only: he falls at the first gap, floats back (about 160 px behind the gap),
walks on and falls again, in a loop (7 falls in 24 s) that is never a soft lock: a Jump at the edge crosses it at any time.
