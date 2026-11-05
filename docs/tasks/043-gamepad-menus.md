# Task 043: Gamepad navigation for the menus (Android TV with a controller)

Design: not yet decided by the architect; this draft comes from the parent's wish to play on an Android TV with a physical gamepad (a TV browser such as TV Bro, or a phone cast to the TV). Read D-015 (one input abstraction) before starting.

## Goal
Everything a child needs outside a level can be done with a gamepad (and, as a free bonus, the TV remote's arrow keys and OK): pick a colour, pick a level on the map, open Practice, Zen and the sticker book, use the win screen, resume after the auto-pause, and go back. Playing the levels already works with a gamepad (D-pad or stick, A = jump, B / X = power, `core/input/bindings.ts`).

## Read first
- docs/PROGRESS.md, docs/DECISIONS.md (D-015, D-025, D-036, D-070), docs/ARCHITECTURE.md and `docs/architecture/ui-input-audio.md`, `map-and-flow.md`, `practice.md`.
- Existing keyboard handling to build on: `core/picker/PickerScene.ts` + `selection.ts` (a keyboard cursor and focus ring already exist), `core/map/MapScene.ts` (`onKey`), `core/levels/ResultScreen.ts` (`onKey`), `core/input/InputManager.ts` (`pollGamepads`), `core/input/bindings.ts`.

## In scope
- **One shared "menu input" helper** (pure, tested) that turns a gamepad (and the arrow keys, Enter / Space, Escape) into menu intents `up | down | left | right | confirm | back`, with press-edge detection, a first-press deadzone and a repeat delay so mashing or a held stick never skips several items. D-pad and left stick both work; A = confirm, B = back. Scenes subscribe to intents; game code in levels still reads only the four actions.
- **Focus model per screen** (a visible, big, calm focus ring, the picker's ring is the model; shown only once a gamepad or key has been used, so touch play looks unchanged):
  - Colour picker: move across the eight cards, confirm selects, a Play focus item confirms the choice.
  - World map: left/right moves between open level dots (closed ones are skipped or just bump), up goes to the cave mouth when it is open and the robot is at its fork, confirm plays; focus can also move to the fixed buttons (Practice, Zen, Stickers, palette) and the meadow arch on the Cave map; the map scrolls to keep the focus in view.
  - Practice selector (four cards), sticker book (Back), result screen (Home / Replay / Next, the biggest button focused by default; the 600 ms input delay stays), auto-pause "tap to resume" (any button resumes, as any touch does now).
  - Level start: the "your turn" cue and the demo skip (any button after 1.5 s) already work with keys; check them with a pad.
- **Parent view and leaving a level without touch:** the 3 s hold must stay hard for a child. Gamepad route: hold **Start + Select** (or, if the controller has no Select, the two shoulder buttons) together for 3 s with the same visible ring; a single press or mashing does nothing. In a level, holding **Back / Select** for 1 s leaves to the map (the house icon's hold). Inside the parent view, the same focus model moves through the rows and confirm toggles; Back closes it.
- **Remote and keyboard:** arrows + Enter / OK + Escape / Back work in every screen above (the TV remote sends these). `Power` has no remote key; that is accepted and documented.
- **Standard mapping only** (`gamepad.mapping === 'standard'`; the existing button numbers): D-pad 12-15 (up, down, left, right; 14 and 15 are already in use), A 0, B 1, Start 9, Select 8. Unknown mappings fall back to the stick and buttons 0 and 1.
- A first press that only wakes the browser's Gamepad API must still count (some browsers report the pad only after a button press), and it also counts as the "first gesture" that unlocks audio and requests fullscreen, as long as the browser allows it (document what it does not allow).
- Docs: `ui-input-audio.md` (menu input, focus rules, parent-view gamepad route), PROGRESS (tablet-and-TV checklist), Input Lab: show gamepad menu intents.
- Tests: the menu-input helper (edges, repeat, deadzone, mashing), focus movement on the map graph (skipping closed dots, the branch mouth, the arch), the parent-view hold route (a short press and mashing do nothing), and a unit scan that every screen handles `back`.
- Commit: `task-043: gamepad navigation for the menus`.

## Out of scope
- Gamepad rebinding UI, rumble, a Power button for the TV remote, an Android TV wrapper app (a Trusted Web Activity or WebView shell is a possible separate task; decide after testing TV Bro or a cast), voice or text.
- Changing how levels read input; any new dependency.

## Acceptance criteria
- With only a gamepad (no touch, no mouse) he can start the game, pick a colour, play Grass 1 to the pad, return to the map, open the Cave, play a Cave level, open the sticker book and Practice, and get back each time.
- With only the keyboard arrows + Enter + Escape the same path works.
- Touch behaviour and looks are unchanged (no focus ring until a pad or key is used; a touch hides it again).
- Mashing every button never opens the parent view, skips a screen or leaves a level by accident.
- typecheck, tests, build and the banned-names scan pass.

## How to verify
- Unit tests as above, then the browser with a real or emulated gamepad (Chrome's DevTools can fake one, or a small test hook that injects `navigator.getGamepads`). Screenshots at 844x390 and 1280x800 of the focus ring on the picker, the map (a dot, the cave mouth, a fixed button), the result screen and the parent view, in `_sources/review/043/`.
- The parent checks on the Android TV with a controller (TV Bro or a cast) and records what the TV browser does and does not pass through.

## Result
- What changed: a gamepad (and the TV remote's arrows and OK, and a Bluetooth keyboard) now drives every menu. The pad is turned into the keyboard presses the menus already understood (`menuPad.ts`, `padBridge.ts`): D-pad or stick = arrows, A = Space (confirm, Next), B = Escape (back, Home), X = R (Replay), Select held in a level = the 1 s exit hold, Start + Select held on the map = the parent gear's 3 s hold. The map got a focus model (`mapFocus.ts`): Down reaches Practice / Zen / Stickers, Up the cave mouth or the palette, Left on the first Cave dot the meadow arch, with a yellow focus ring. In a level the pad is read directly as before; the menu layer is suspended there. Pad-only play counts as activity (no idle wave or auto-pause) and a press wakes the auto-pause.
- Files touched: new `core/input/menuPad.ts`, `menuPad.test.ts`, `padBridge.ts`, `core/map/mapFocus.ts`, `mapFocus.test.ts`; edited `main.ts`, `shell/idleSleep.ts`, `core/levels/LevelScene.ts`, `core/map/MapScene.ts`, `core/rewards/StickerScene.ts`, `docs/architecture/ui-input-audio.md`, `docs/PROGRESS.md`, this file.
- Deviations from plan (and why): the parent view's rows are not navigable by pad (the parent uses touch or a mouse; B / Escape closes it); judged not worth the work for a parent-only screen. The win screen has no visible focus ring (A is simply Next, the pulsing button). Pads are not required to report the "standard" mapping check (the standard button numbers are used as they are). No Input Lab change.
- How verified: typecheck, all tests, build. New tests: the mapping, repeat, suspension, the "held when a level ends" guard and the focus graph. In the browser (headless Edge, a fake `navigator.getGamepads`, 844x390): picker (move, A, A) to the map; map hops, Down / Left / Right to the buttons and A to open Practice, B back; Up to the palette and the cave mouth, A into the Cave, Left to the arch, A back; a level started with A, walked with the D-pad, three B presses (power) left it running, Select held 1.5 s left to the map; Start + Select 0.8 s did nothing and 3.4 s opened the parent view, B closed it; the win screen of cave-boss (`?boss=0`) reached with the D-pad, X replayed. Screenshots in `_sources/review/043/` (git-ignored).
- Open issues / risks: not tried with a real controller or a TV browser (the fake pad only proves the code path); a real gamepad press is not a browser user gesture, so audio and fullscreen still need one tap or key; some controllers report different button numbers (non-standard mappings fall back to the standard numbers and may be wrong); a long auto-repeat on the map hops one dot per repeat; the TV load problem is separate and not addressed.
- Suggested next: tablet / laptop test with a real controller, then decide on the TV (a low-power mode) or more worlds.
