# Task 013: Browser fullscreen

Context: only the installed PWA is fullscreen (`display: fullscreen`, manifest). In a normal browser tab the address bar and tabs eat screen space, which matters on a phone or tablet in landscape. Queued by the parent on 2026-10-25 (PROGRESS.md "Open issues": Fullscreen). Numbered 013 because 012 is drafted first; the polish bundle (footsteps, landing thump, idle wave) moves to 014 if it is drafted.
Suggested model: Sonnet 5.5 (small, shell-level, well specified).

## Goal
When the game is played in a browser tab, the first tap (the same gesture that unlocks audio) asks the browser for fullscreen and, where supported, locks landscape. A parent-view row lets the parent turn this off or on. The game never depends on fullscreen succeeding.

## Read first
- CLAUDE.md, docs/PROGRESS.md (Open issues: Fullscreen), docs/DECISIONS.md (D-002, D-013, D-017, D-047), docs/ARCHITECTURE.md (shell rules), docs/architecture/ui-input-audio.md (audio unlock gesture, input), docs/architecture/settings-storage-pwa.md (settings precedence, manifest).
- Existing: `src/shell/{browserGuards,pwa,wakeLock}.ts` (follow `wakeLock.ts` for style: feature-detect, never throw), `core/settings/settings.ts`, `core/parent/*` (parent view rows), `core/audio/AudioManager` (first-gesture unlock), where Phaser's scale/resize is configured (layout is already responsive, D-013/D-017).

## In scope

### 1. `src/shell/fullscreen.ts` (feature-detected, never throws)
- `isFullscreenSupported()`: standard `document.fullscreenEnabled` / `documentElement.requestFullscreen`, with webkit-prefixed fallback (`webkitRequestFullscreen`, `webkitExitFullscreen`, `webkitFullscreenElement`). False on iPhone Safari (no page Fullscreen API) and when already running as an installed PWA (`display-mode: fullscreen|standalone`, or `navigator.standalone`), since there is nothing to gain.
- `enterFullscreen()`: calls request on `document.documentElement` (navigationUI hidden), then best-effort `screen.orientation.lock('landscape')`. Both wrapped in try/catch and promise `.catch`; a refusal or missing API is silent (at most one `console.debug`), never an error toast, never blocks play.
- `exitFullscreen()` and `isFullscreen()` for the parent-view toggle and tests.
- Tolerate the user (or browser) leaving fullscreen: no re-request loop, no nagging. The next first-tap-after-exit is NOT re-requested either; re-entry happens only via the parent-view toggle or a fresh page load. (A toddler hitting Esc or a swipe must not be fought.)
- Pure helper `shouldAutoEnter({ supported, setting, urlParam, alreadyFullscreen, installed })` is unit-tested.

### 2. When it enters
- On the first real user gesture (`pointerdown`/`touchend`/`keydown`; the same one that unlocks audio; request must run synchronously inside the gesture handler or browsers refuse it). Do not request on page load. Ignore non-activating gestures.
- Only if the setting is on (default on), supported, not already fullscreen, not installed.
- Hook it from the shell next to the audio unlock, not from `core/` game code (shell rules); one listener, removed after the first gesture.
- Layout: the existing resize handling must re-fit on enter and exit without a page reload. Verify nothing is cut off or mis-scaled, and that button positions stay inside device insets.

### 3. Setting and parent view
- New setting `fullscreen: boolean` (default `true`) in `core/settings/settings.ts`, with precedence as in D-047: `?fullscreen=0|1` URL parameter, then saved setting, then default. `?fullscreen=0` also keeps the test bot out of fullscreen.
- Parent view (`core/parent`): one row "Full screen" with an on/off switch, plus a clear button style consistent with the other rows. Turning it on when supported and not fullscreen enters fullscreen immediately (it is a user gesture); turning it off exits. Hide the row (not grey it) when fullscreen is unsupported or the app is installed. Parent view may use text (D-047); the child never sees it.
- No fullscreen control anywhere in the map, picker, levels or win screen (a toddler must not be able to toggle it).

### 4. Docs and tests
- Update `docs/architecture/settings-storage-pwa.md` (fullscreen module, setting, precedence, iPhone limitation) and `ui-input-audio.md` (first-gesture hook), PROGRESS.md (Task 013 done, remove the Fullscreen item from Open issues and the pending list, add real-device checklist: Android Chrome tablet and phone, iPad Safari, iPhone Safari shows no change, desktop Chrome/Edge/Firefox). Write D-052 (or the next free number; check DECISIONS.md first, Task 012 also wants D-052) at the bottom of DECISIONS.md: auto-enter on first gesture, no re-request after exit, parent-only toggle, never blocks play. Fill in this file's Result.
- Unit tests: `shouldAutoEnter` truth table; `fullscreen.ts` with a stubbed `document`/`screen` (supported, unsupported, request rejects, request throws, orientation lock missing or rejects: none throws); setting precedence (URL, saved, default); parent-view row hidden when unsupported/installed.
- One commit: `task-013: browser fullscreen`. No attribution lines (D-016). Do not push. Leave `.claude/launch.json` and `.claude/settings.local.json` uncommitted.

## Out of scope
A fullscreen button reachable by the child, re-requesting fullscreen after exit, a "tap to go fullscreen" overlay or any text outside the parent view, keyboard-only fullscreen shortcut (`F11` stays the browser's), pointer lock, iPhone Safari workarounds (fake fullscreen via scrolling tricks), changes to the manifest or PWA install flow, new runtime dependencies.

## Acceptance criteria
- `npm run typecheck && npm test && npm run build` pass; the banned-names test still passes.
- Desktop Chromium via Playwright: first click enters fullscreen with default settings; `?fullscreen=0` does not; with the setting off in the parent view a reload does not; leaving fullscreen (Esc) is not undone by later taps; layout re-fits on enter and exit at 844x390 and 1280x800 with no console errors.
- A refused request (simulate by stubbing `requestFullscreen` to reject, and by calling from a non-gesture) leaves the game fully playable with no uncaught errors.
- The parent-view row appears only when supported and not installed, toggles correctly, and persists. No fullscreen control exists outside the parent view.
- Audio unlock and the first-tap jump/action still work exactly as before (the first tap both unlocks audio and acts; fullscreen adds nothing the child notices except the browser chrome disappearing).
- Regression: map, picker, parent view, Practice, demo, touch multi-touch and browser guards unchanged; 58+ fps where measurable.

## How to verify
Unit tests plus a short Playwright run (`?fullscreen=1` and `?fullscreen=0`, sizes 844x390 and 1280x800; screenshots only if layout looks off; none required to commit). Per CLAUDE.md sizing this is a small shell task: two sizes, short run. State plainly what could not be checked: real Android/iPad/iPhone behaviour, the orientation lock on devices (Playwright headless often refuses it), how the child reacts.

## Result (Code fills in at the end)
- What changed:
- Files touched:
- Deviations from plan (and why):
- How verified:
- Open issues / risks:
- Suggested next:
