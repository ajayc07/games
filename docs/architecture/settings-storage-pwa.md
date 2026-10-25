# Architecture: Settings, storage, PWA

Part of the architecture docs; the index is `docs/ARCHITECTURE.md`.

## Settings and the parent view (D-047, Task 010)
- **Settings module** (`core/settings/settings.ts`, pure, tested). Each setting resolves as URL parameter, then the saved value
  (the record's `settings`; `look` is the record's own field), then the default: `buttonScale` (`?buttonScale=`, default 1, clamped
  0.6-1.6, parent steps 0.8/1/1.2/1.4), `buttonsPrimary` (`?buttons=`, `jump`), `soundOn` (`?sound=0|1|off|on`, on),
  `unlockAll` (`?unlock=all`, off), `look` (`?look=`, robot), `walkAssist` (`?assist=sticky|off`, off; Task 011, practice levels only). A bad URL value is ignored (falls to the saved one). The URL value is
  never written to the saved settings (the old `?look=` saving rule is unchanged). `bindSettings(read, search)` is called once at boot
  with the store, so `settings.buttonScale()` etc. read live; TouchControls, the unlock rule (`unlockFromSearch(search, n, savedUnlockAll)`),
  AudioManager mute (`audio.setMuted(!settings.soundOn())` at boot, before any sound) and the look all go through it.
  `urlOverrides(search)` says which settings the URL pins this visit (the parent view prints a note).
- **Record**: `settings.buttonsPrimary` added (optional, additive, no version bump; invalid values dropped). `ProgressStore.updateSettings(patch)`,
  `resetProgress()` (`resetLevels`: levels only; colour, look and settings stay; flushed at once). An unknown-version record is still never overwritten.
- **Access**: the map shows a grey gear top-left (`HoldButton` with `icon: 'gear'`, `holdMs: PARENT_HOLD_MS` 3000, key `P`; hit 110 px). A tap only wobbles it.
  `?parent=1` opens the view at boot (not with `?level=` or `?lab=`). Nothing in levels, picker, win screen or lab opens it.
- **ParentScene** (`core/parent/`, generic; data `ParentSceneData` of read/set callbacks). `parentLayout.ts` (pure, tested at the five sizes, with and
  without insets): two columns, no scrolling. Left: Sound, Look, Main button, Unlock all, Walk assist in Practice (Off/Sticky, Task 011),
  Demos (label + two controls, rows 84 px, 24 px gaps; the gap would close up to 12 px if a screen were too short). The preview
  caption mentions the assist when it is Sticky.
  Right: button size steps, the preview, Reset (held `RESET_HOLD_MS` 3 s, fill bar) and Back (also Escape). The preview draws the real
  `placeButtons` result for all four buttons at the chosen scale and main button on a mini screen of the real aspect (`previewFit`). A change calls the
  universe (which saves) and the scene redraws from the saved state. Demos "Show again" calls `LevelScene.forgetDemos()`.
  The universe wires it in `manifest.ts` `openParent`. `?debug=1`: `window.__parent` (`layout()`, `state()` with reset hold progress, preview geometry), `__map.state().gear`.

## Storage (D-036, Task 006)
`core/storage/progress.ts` (pure, tested): one record per universe, key `athi.<universe>.progress`:
`{ version: 1, chosenCharacterId (a colour id or null), look (or null), levels: { [id]: { stars 0-3, bestCoins } }, settings }`
(`settings`: soundOn, buttonScale, buttonsPrimary, unlockAll, walkAssist; see "Settings and the parent view"). `parseRecord` repairs bad fields and reports
`empty`, `corrupt` or `unknown-version`; `mergeResult` keeps the best stars and coins (never lowers them).
`core/storage/backends.ts`: `IndexedDbBackend` (database `athi-games`, store `kv`, every call with a 1.5 s timeout so a stuck
private mode never hangs the game), `LocalStorageBackend`, `MemoryBackend`.
`core/storage/store.ts` `ProgressStore.open(universeId, { backends?, legacyChoice? })`: reads the backends in order; the first
one that works is the write target, and if it has no record the later ones are checked too (a visit with IndexedDB blocked
saved to localStorage). A throwing backend is skipped silently; a failing write moves on to the next backend (memory last).
Unknown version: play with a fresh record in memory and never write over the stored one. Migration: no choice in the record
and the 005d key exists -> copied in (the old key stays). API: `record`, `level(id)`, `recordResult(id, { stars, coins })`
(returns before/after), `setChosenCharacter`, `setLook`; writes are coalesced (250 ms) and flushed on `pagehide` and when the
page is hidden; `flush()` never rejects. `?debug=1`: `window.__progress` (record, backend, status, flush, session).

## PWA / hosting
- GitHub Pages project site, Vite `base: '/games/'`. No router needed yet (scene-based navigation); if URLs are added later, use hash routing since Pages has no SPA fallback.
- Service worker precaches the shell and caches each universe chunk + assets on first use, so the game works offline after the first visit. Bump version to update.
- Web app manifest: `display: fullscreen`, `orientation: landscape`, installable to the home screen.
- Deploy via GitHub Actions on push to `main`.
- Asset budget: keep each universe under about 15-20 MB.
