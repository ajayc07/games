# Task 045: Flight Up/Down inputs, gamepad rumble, rarer Mega Robo in zen, zen difficulty ramp

Requested by the parent after playing with a USB controller (four requests in one go, done as one commit).

## Goal
1. In rocket-boots flight the Up / Down arrows (and W / S, the d-pad and the left stick) steer up and down; before only the Left / Right buttons (and Up via Jump) did.
2. A connected gamepad rumbles for the sounds the child already hears (jump, coins, pops, power-ups, Mega Robo, enemies, win), gently, behind the parent's vibration switch.
3. Mega Robo no longer comes again and again in zen.
4. Zen gets harder step by step after 300 coins, adding one combo at a time.

## In scope
- `InputManager.flyUpHeld / flyDownHeld` (not actions; D-015 still holds for walking, jumping and power); `LevelScene` flight reads them.
- `core/ui/padRumble.ts` (table: sound id to rumble; hooked in `AudioManager.play`, and `vibrate()` also rumbles pads).
- Mega zen pacing (`core/levels/mega.ts`): capacity 60, 80, 100 ... up to 200 (was 50 x3, 75 x3 ...), plus a quiet time after each Mega ends: 100 s, 125 s, 150 s ... up to 240 s. In the quiet time the bar waits one coin short of full and fills on the first coin afterwards. Zen only; stages unchanged.
- Zen ramp (`core/levels/zen.ts`, `zenTier(coins)`): tier 0 below 300 coins (exactly the old mix); then a tier per 150 coins up to 4. Tier 1 adds `gapShoot` (shoot while walking to a gap and jumping it), tier 2 `stairShoot`, tier 3 `padShoot` (bounce pad plus high bubble), tier 4 `gauntlet` (two gap combos in a row). From tier 1 the resting motif is dropped; from tier 2 enemies come every 35-50 tiles instead of 45-60.

## Out of scope
- Rumble intensity setting (only the existing vibration on/off switch), a rumble test button, rebinding.

## Result
- What changed: as above.
- Files touched: `core/input/InputManager.ts`, `bindings.ts`, `core/levels/LevelScene.ts`, `mega.ts`, `zen.ts`, `core/ui/padRumble.ts`, `haptics.ts`, `core/audio/AudioManager.ts`, tests (`mega.test.ts`, `zenRamp.test.ts`, `padRumble.test.ts`), docs.
- Deviations from plan (and why): four requests in one commit (they share `LevelScene.ts`). "Robo coming again and again" was read as Mega Robo; if the parent meant enemies, tune `ZEN_ENEMY.every`.
- How verified: `tsc` clean, related unit tests green (heavy bot tests need `--testTimeout=60000` on this loaded machine), `npm run build`. Rumble, flight keys and the ramp not yet felt on the real controller.
- Open issues / risks: the tier is read when a segment is generated, so a new tier shows up one segment (about 260 tiles) after the coin count crosses it. Rumble strength is a first guess (Mega Robo is full strength). Mega timing numbers are first guesses. `?cooldown` test hook not added.
- Suggested next: parent plays zen past 300 coins and the Mega gap; tune `MEGA.zen*`, `ZEN_RAMP`, the rumble table.
