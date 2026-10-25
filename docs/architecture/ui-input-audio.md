# Architecture: Screen layout, input, buttons, audio

Part of the architecture docs; the index is `docs/ARCHITECTURE.md`.

## Screen layout (D-013)
`core/ui/layout.ts`: logical height is always 720, logical width follows the screen (960..1920, D-017). `getLayout()` gives
`width`, `height`, `safeRect` (central 960x720 for gameplay-critical content), `insets` (device safe areas, logical units),
`anchor(corner, dx, dy)` for UI, and `bindToScene(scene, fn)` to re-layout on resize/rotation.

High-DPI: the canvas has `renderScale` pixels per logical unit (physical pixels / 720, in quarter steps, between 1 and 2;
`renderScaleFor` in layoutMath.ts). `bindToScene` sets the scene's main camera to zoom = renderScale with origin (0, 0),
so all game code keeps using logical coordinates. InputManager converts pointer positions back to logical units.
Rules that follow: every scene must call `layout.bindToScene`; children of a screen-fixed container need
`setScrollFactor(0, 0, true)` so Phaser hit-tests them correctly; text should use `resolution: layout.renderScale`;
camera bounds/`startFollow` assume a centred origin, so scenes scroll the camera by hand.

## Input
`core/input/InputManager` (one per scene) merges DOM pointer events (touch + mouse), keyboard and gamepads (bindings in
`core/input/bindings.ts`, D-015). API: `configure({ enabled, tapAnywhereJumps })`, `isDown`, `justPressed`, `justReleased`
(one frame), `press`/`release` events and `onPress` with timestamps. The pure state logic is `core/input/actionState.ts`
(unit-tested): every device input is a "source"; the merged state is derived after tap-anywhere mapping and enabled filtering.
`core/ui/TouchControls` draws the buttons, shows only enabled actions (none in tap-anywhere mode) and provides the hit test.
Where the buttons go and which one a touch hits is decided by the pure, tested `core/ui/buttonLayout.ts` (`placeButtons`,
`pickButton`). `pulse(action, 'invite'|'nudge')`
swells the button face and spreads a ring (ignored while one is running, so mashing is harmless); `animatePress` shows a
press without input (the demo). InputManager emits `miss` for a touch that starts on no button (not in tap-anywhere mode):
LevelScene answers with a `nudge` pulse, and gives an `invite` pulse every 2.6 s until the first Jump press;
pointers are re-tested on every move, and Left/Right split their shared band at the midpoint so a sliding thumb never hits a gap.
Size comes from the short edge times `buttonScale` (`?buttonScale=` for now). Blur, visibility change and pointer cancel release everything.

### Button layout (Task 009)
Diameters are fractions of the short edge (720 logical px; physical px = x screen height / 720). `buttonLayout.ts` (`BUTTON_SIZE`):

| Situation | Left, Right | Jump | Power |
|-----------|-------------|------|-------|
| Grass 1-2 (Jump only) | - | 0.28 (solo) | - |
| Grass 3, 5 (Left, Right, Jump) | 0.18 | 0.22 | - |
| Grass 4 (Left, Right, Power) | 0.18 | - | 0.28 (solo, in Jump's corner) |
| Grass 6 (all four), `?buttons=jump` (default) | 0.18 | 0.26 (corner) | 0.22 |
| Grass 6, `?buttons=power` | 0.18 | 0.22 | 0.26 (corner) |

At 844x390 the right-hand buttons are 86-102 px across physically and Left and Right 70 px. Rules: Left and Right are bottom-left, side by side with a gap of 0.9 of their
radius, margin 28 px inside the device insets; the right-hand buttons are bottom-right inside the insets. With both Jump and Power,
the primary sits in the corner and the other beside it, 48 logical px between their edges (at least 26 physical px at 844x390; 34-67
at the other sizes) and lifted by 0.3 of its radius, a gentle arc, so one thumb reaches both. Each right-hand button is at least
0.20 of the short edge. Their enlarged hit circles (x1.1) never overlap, so no touch is ambiguous (`hitCirclesOverlap`, tested),
and `pickButton` gives a touch to the nearest button whose enlarged circle holds it; Left and Right keep their shared band with no
dead zone. If a big `?buttonScale` would make the left and right clusters meet, the scale is reduced to fit (at 960 wide that starts
at about 1.2 with four buttons). `?buttons=jump|power` (`parsePrimary`, default jump) picks which right-hand button is the larger
corner one; which is better is a tablet question (the parent view of Task 010 may expose it). Quirk: with Jump in the corner,
Power sits between the left cluster and Jump, so a thumb sliding from Right to Jump crosses Power (one harmless shot) and back;
every button is released as the thumb leaves it, never two at once, nothing stays down (touch tests, CDP touch events).
The layouts of Grass 1-5 are exactly as before (tested). The Input Lab's mode 4 (all four) uses the new layout.

## Audio
`core/audio/AudioManager` (`audio` singleton) unlocks Web Audio on the first touch/click/key. `register(id, { file?, synth?, volume? })`,
`play(id)`: plays the file if it loaded, otherwise the synth recipe (`core/audio/recipes.ts`: tap, jump, coin, win, tryAgain, whoosh, yourTurn, pick, power, bump, unlock, hop, and `pop-0`..`pop-5`
(`popRecipe(step)`, Task 007);
plus `comboRow` and `combo-0`..`combo-4` (`comboRecipe(step)`, a rising two-note, one step higher per star in the row, Task 011);
plus the per-option chimes, see "Avatar options and picker").
Never throws; a failed file logs one warning. A play request made while audio is still unlocking (the first tap both
unlocks and jumps) is queued (`pendingQueue.ts`, tested: one per id, at most 4) and played once the context runs if it is
at most 300 ms old. Per-sound cap of 3 voices and a 40 ms retrigger gap (`voiceLimiter.ts`, unit-tested);
a compressor on the master bus prevents clipping. `setMuted`, `setMasterVolume`, `state` (locked/running).
All sounds are generic synth recipes or per-option chimes; there are no voice clips (D-038). A future real sound is a file in the
universe's assets plus a `register(id, { file, synth })` entry: the synth stays the fallback.
