import type Phaser from 'phaser';
import type { AvatarOptionDef, UniverseManifest, WorldDef } from '../../core/types';
import { LevelScene, type LevelSceneData } from '../../core/levels/LevelScene';
import { nextLevelId } from '../../core/levels/progression';
import { PickerScene, type PickerSceneData } from '../../core/picker/PickerScene';
import { MapScene, type MapSceneData, type TeaserIcon } from '../../core/map/MapScene';
import { unlockFromSearch, worldDots, type UnlockOptions } from '../../core/map/unlock';
import { ParentScene, type ParentSceneData } from '../../core/parent/ParentScene';
import { PracticeScene, type PracticeSceneData } from '../../core/practice/PracticeScene';
import { generatePractice, newSeed, practiceFromSearch, type PracticeMode } from '../../core/levels/practice';
import { generateZen, zenFromSearch } from '../../core/levels/zen';
import { parseLevelOrThrow, type LevelData } from '../../core/levels/format';
import { useVariety, varietyModeFrom, varietySeedFrom, varyLevel, withRainbowBubble, withRainbowHook } from '../../core/levels/variety';
import { audio } from '../../core/audio/AudioManager';
import {
  bindSettings,
  resolveButtonScale,
  resolveButtonsPrimary,
  resolveSoundOn,
  resolveUnlockAll,
  resolveWalkAssist,
  resolveFullscreen,
  pickLook,
  resolveDayNight,
  resolveVibration,
  settings,
  urlOverrides,
} from '../../core/settings/settings';
import { colorFromSearch, findOption, validateOptions } from '../../core/avatar/options';
import { parseLook, type LookName } from '../../core/avatar/config';
import { loadLegacyChoice } from '../../core/storage/choice';
import { ProgressStore } from '../../core/storage/store';
import { starsOf, type ProgressRecord } from '../../core/storage/progress';
import { options } from './options';
import { FALL_BUZZ, vibrate, vibrationSupported } from '../../core/ui/haptics';
import { enterFullscreen, exitFullscreen, fullscreenAvailable } from '../../core/ui/fullscreen';
import { levels } from './levels';
import { nightTheme, themeForWorld } from './themes';
import type { LevelTheme } from '../../core/levels/theme';
import { worlds } from './worlds';
import { InputLabScene, type InputLabData } from './scenes/InputLabScene';
import { UNIVERSE_ID, UNIVERSE_TITLE } from './universe';

const TAG = `[${UNIVERSE_ID}]`;
/** Icons of the signposts for the worlds after Grass (cloud-covered teasers on the map). */
const TEASER_ICONS: Record<string, TeaserIcon> = { cave: 'cave', sky: 'sky', castle: 'castle' };

export const manifest: UniverseManifest = {
  id: UNIVERSE_ID,
  title: UNIVERSE_TITLE,
  options,
  worlds,
  unlock: { openAtATime: 3 },
  start(game) {
    void boot(game);
  },
};

/** Session state: the saved record plus this visit's overrides. */
interface Session {
  game: Phaser.Game;
  store: ProgressStore;
  /** `?color=` for this visit only (not saved, D-039); cleared when the child picks in the picker. */
  visitOption: AvatarOptionDef | null;
  look: LookName;
  /** Set when a level was finished; the map plays its arrival animation once. */
  arrival: { levelId: string; before: ProgressRecord } | null;
  /** The last practice focus (the selector's cursor starts there). */
  practiceMode: PracticeMode | null;
}

async function boot(game: Phaser.Game): Promise<void> {
  for (const e of validateOptions(options)) console.warn(`${TAG} ${e}`);
  const search = window.location.search;
  const params = new URLSearchParams(search);
  // Progress first (IndexedDB -> localStorage -> memory; never throws). The 005d choice key is migrated in.
  const store = await ProgressStore.open(UNIVERSE_ID, { legacyChoice: loadLegacyChoice(UNIVERSE_ID) });
  store.flushOnHide();
  // Settings (Task 010): URL parameter, then the saved value, then the default; everything reads them through the module.
  bindSettings(() => ({ saved: store.record.settings, savedLook: store.record.look }), search);
  audio.setMuted(!settings.soundOn()); // before the first sound, including the first tap
  // ?look= overrides and is saved (the tablet remembers the last comparison); else the saved look.
  if (params.has('look')) {
    const parsed = parseLook(search);
    if (parsed.warning) console.warn(parsed.warning);
    else store.setLook(parsed.look);
  }
  const look: LookName = settings.look();
  const color = colorFromSearch(search, options);
  if (color.warning) console.warn(color.warning);
  const s: Session = {
    game,
    store,
    visitOption: color.requested ? color.option : null,
    look,
    arrival: null,
    practiceMode: null,
  };
  exposeDebug(s);

  // Start order (Task 006): ?lab=1 and ?level= bypass the map as before; else picker on first launch, else the map.
  const levelId = params.get('level');
  if (params.has('lab') && params.get('lab') !== '0') return openLab(s);
  if (params.get('parent') === '1' && !levelId) return openParent(s);
  // ?practice=<mode> starts a run at once, ?practice=1 opens the selector (Task 011); ?level= wins.
  const practice = practiceFromSearch(search);
  if (practice.warning) console.warn(`${TAG} ${practice.warning}`);
  if (practice.open && !levelId) {
    if (practice.mode) return openPractice(s, practice.mode, practice.seed ?? newSeed());
    return openPracticeSelect(s);
  }
  // ?zen=1 starts the endless zen level at once (Task 020); ?level= wins.
  const zen = zenFromSearch(search);
  if (zen.open && !levelId) return openZen(s, zen.seed ?? newSeed());
  const forcePicker = params.has('picker') && params.get('picker') !== '0';
  if (levelId && !forcePicker) return openLevel(s, levelId);
  if (forcePicker || (!store.record.chosenCharacterId && !s.visitOption)) {
    return openPicker(s, levelId ? () => openLevel(s, levelId) : () => openMap(s));
  }
  openMap(s);
}

/** The option to play with: this visit's `?color=`, else the saved choice, else the first card. */
function currentOption(s: Session): AvatarOptionDef {
  return s.visitOption ?? findOption(options, s.store.record.chosenCharacterId) ?? options[0];
}

function worldOf(levelId: string): WorldDef | undefined {
  return worlds.find((w) => w.levels.includes(levelId));
}

/** `?unlock=all` or the parent view's switch, and the debug-only `?open=N`; read fresh, since the parent view changes it. */
function unlockOptions(s: Session): UnlockOptions {
  return unlockFromSearch(window.location.search, manifest.unlock.openAtATime, s.store.record.settings.unlockAll === true);
}

function dotsFor(s: Session, world: WorldDef, record: ProgressRecord = s.store.record) {
  return worldDots(world, record.levels, unlockOptions(s));
}

/** The picker; Play saves the choice and continues with `then` (the map, or a level). */
function openPicker(s: Session, then: () => void): void {
  const data: PickerSceneData = {
    options,
    selectedId: currentOption(s).id,
    onPlay: (id) => {
      s.store.setChosenCharacter(id);
      s.visitOption = null; // a real pick wins over this visit's ?color=
      then();
    },
  };
  startOnly(s.game, PickerScene.KEY, PickerScene, data);
}

/** The look of a level at this start (Task 025): bright or dark, by the parent's setting (random by default). */
function themeForRun(worldId: string, varied: boolean): LevelTheme {
  const look = pickLook(settings.dayNight(), { nightLevel: worldId === 'night', varied, roll: Math.random() });
  return look === 'night' ? nightTheme : themeForWorld(worldId);
}

function openMap(s: Session): void {
  const world = worlds.find((w) => w.levels.length > 0);
  if (!world) throw new Error(`${TAG} no world with levels`);
  const dots = dotsFor(s, world);
  const arrival = s.arrival;
  s.arrival = null;
  const from = arrival ? world.levels.indexOf(arrival.levelId) : -1;
  const data: MapSceneData = {
    theme: themeForWorld(world.id),
    dots,
    teasers: worlds.filter((w) => w !== world && TEASER_ICONS[w.id]).map((w) => TEASER_ICONS[w.id]),
    option: currentOption(s),
    look: s.look,
    arrival: arrival && from >= 0 ? { before: dotsFor(s, world, arrival.before), from } : undefined,
    onPlay: (id) => openLevel(s, id),
    onPicker: () => openPicker(s, () => openMap(s)),
    onParent: () => openParent(s),
    onPractice: () => openPracticeSelect(s),
    onZen: () => openZen(s, newSeed()),
  };
  startOnly(s.game, MapScene.KEY, MapScene, data);
}

/** The Combo Practice selector (Task 011): always open, reached from the map's Practice button. */
function openPracticeSelect(s: Session): void {
  s.arrival = null;
  const data: PracticeSceneData = {
    focus: s.practiceMode ?? undefined,
    onPick: (mode) => openPractice(s, mode, newSeed()),
    onBack: () => openMap(s),
  };
  startOnly(s.game, PracticeScene.KEY, PracticeScene, data);
}

/**
 * A practice run (Task 011, D-049): a generated level of the focus, played in the normal LevelScene. Nothing is recorded
 * (no onResult); Replay builds a new layout of the same focus; Practice goes back to the selector, Home to the map.
 */
function openPractice(s: Session, mode: PracticeMode, seed: number): void {
  s.arrival = null;
  s.practiceMode = mode;
  const level = withRainbowHook(withRainbowBubble(parseLevelOrThrow(generatePractice(mode, seed, 'grass').config, `practice ${mode} ${seed}`), seed), {
    search: location.search,
    varied: true,
    seed,
  });
  const data: LevelSceneData = {
    level,
    theme: themeForRun(level.world, true),
    option: currentOption(s),
    look: s.look,
    onHome: () => openMap(s),
    onReplay: () => openPractice(s, mode, newSeed()),
    practice: { mode, walkAssist: settings.walkAssist() === 'sticky', onPractice: () => openPracticeSelect(s) },
  };
  startOnly(s.game, LevelScene.KEY, LevelScene, data);
}

/**
 * The zen level (Task 020, D-063): an endless, calm free-play world with all four buttons and all power-ups. No flag, no
 * stars, nothing is recorded; Home (hold) goes back to the map. A new seed each time, so every visit is different.
 */
function openZen(s: Session, seed: number): void {
  s.arrival = null;
  const level = parseLevelOrThrow(generateZen(seed, 'grass', { first: true }).config, `zen ${seed}`);
  const data: LevelSceneData = {
    level,
    theme: themeForRun(level.world, true),
    option: currentOption(s),
    look: s.look,
    onHome: () => openMap(s),
    zen: { seed },
  };
  startOnly(s.game, LevelScene.KEY, LevelScene, data);
}

/** The parent view (D-047): reached only from the map's gear or `?parent=1`; Back returns to the map. */
function openParent(s: Session): void {
  const store = s.store;
  const data: ParentSceneData = {
    // The saved choice is shown (so a tapped button lights up even when the URL pins the value for this visit);
    // the scene adds a note for pinned settings. Values never saved show what a level would use.
    read: () => {
      const input = { search: window.location.search, saved: store.record.settings, savedLook: store.record.look };
      const saved = store.record.settings;
      return {
        soundOn: saved.soundOn ?? resolveSoundOn(input),
        buttonScale: saved.buttonScale ?? resolveButtonScale(input),
        buttonsPrimary: saved.buttonsPrimary ?? resolveButtonsPrimary(input),
        look: s.look,
        unlockAll: saved.unlockAll ?? resolveUnlockAll(input),
        walkAssist: saved.walkAssist ?? resolveWalkAssist(input),
        fullscreen: saved.fullscreen ?? resolveFullscreen(input),
        fullscreenAvailable: fullscreenAvailable(),
        dayNight: saved.dayNight ?? resolveDayNight(input),
        vibration: saved.vibration ?? resolveVibration(input),
        vibrationSupported: vibrationSupported(),
        pinned: urlOverrides(input.search),
      };
    },
    setSound: (on) => {
      store.updateSettings({ soundOn: on });
      audio.setMuted(!settings.soundOn());
      if (on) audio.play('pick'); // one short chime so the parent hears that it is on
    },
    setButtonScale: (v) => store.updateSettings({ buttonScale: v }),
    setButtonsPrimary: (p) => store.updateSettings({ buttonsPrimary: p }),
    setLook: (l) => {
      store.setLook(l);
      s.look = l;
    },
    setUnlockAll: (on) => store.updateSettings({ unlockAll: on }),
    setWalkAssist: (v) => store.updateSettings({ walkAssist: v }),
    setFullscreen: (on) => {
      store.updateSettings({ fullscreen: on });
      if (on) enterFullscreen();
      else exitFullscreen();
    },
    setDayNight: (v) => store.updateSettings({ dayNight: v }),
    setVibration: (on) => {
      store.updateSettings({ vibration: on });
      if (on) vibrate(FALL_BUZZ, true); // a buzz right away, so the parent feels that it is on
    },
    testBuzz: () => vibrate(FALL_BUZZ, true),
    showDemosAgain: () => LevelScene.forgetDemos(),
    resetProgress: async () => {
      s.arrival = null;
      await store.resetProgress();
    },
    onBack: () => openMap(s),
  };
  void store.flush();
  startOnly(s.game, ParentScene.KEY, ParentScene, data);
}

/** `replay`: a Replay from the win screen (a cleared level by definition, even if the record could not be saved). */
/** A varied run: shuffled by the seed, plus the `?rainbow=1` test hook (Task 014b). */
const varyForRun = (level: LevelData, seed: number): LevelData =>
  withRainbowHook(varyLevel(level, seed), { search: location.search, varied: true, seed });

function openLevel(s: Session, levelId: string, replay = false): void {
  const firstId = worlds.find((w) => w.levels.length > 0)?.levels[0];
  let level = levels.get(levelId);
  if (!level) console.warn(`${TAG} unknown level "${levelId}", opening ${firstId}`);
  level ??= levels.get(firstId ?? '');
  if (!level) throw new Error(`${TAG} no levels found`);
  s.arrival = null;
  const here = level.id;
  const nextId = nextLevelId(worlds, here);
  // Replay variety (Task 012, D-053): the first play and any play with a demo use the level as written; a replay of a
  // cleared level gets its coins and small bubbles shuffled (and maybe a rainbow bubble) with a fresh seed, kept in memory only.
  const varied = useVariety({
    mode: varietyModeFrom(location.search),
    cleared: replay || starsOf(s.store.record, here) >= 1,
    demoPlays: LevelScene.demoWillPlay(level),
  });
  const data: LevelSceneData = {
    level: withRainbowBubble(varied ? varyForRun(level, varietySeedFrom(location.search)) : level),
    onReplay: () => openLevel(s, here, true),
    theme: themeForRun(level.world, varied),
    option: currentOption(s),
    look: s.look,
    onHome: () => openMap(s),
    onResult: (r) => {
      const { before } = s.store.recordResult(here, r);
      void s.store.flush(); // keep it even if the tablet is closed on the win screen
      s.arrival = { levelId: here, before };
    },
    // Next (D-025) only when the next level exists and is open after this result.
    onNext: nextId && levels.has(nextId) ? () => openLevel(s, nextId) : undefined,
    nextAvailable: () => {
      const w = nextId ? worldOf(nextId) : undefined;
      return !!w && !!dotsFor(s, w).find((d) => d.id === nextId)?.open;
    },
    // The win screen's palette button: pick again, then replay this level (D-039).
    onPicker: () => openPicker(s, () => openLevel(s, here)),
  };
  startOnly(s.game, LevelScene.KEY, LevelScene, data);
}

function openLab(s: Session): void {
  const data: InputLabData = { option: currentOption(s), look: s.look };
  startOnly(s.game, InputLabScene.KEY, InputLabScene, data);
}

/** `?debug=1`: the progress store and session for tests. */
function exposeDebug(s: Session): void {
  if (!new URLSearchParams(location.search).has('debug')) return;
  (window as unknown as { __progress: unknown }).__progress = {
    store: s.store,
    record: () => s.store.record,
    backend: () => s.store.backendName,
    status: s.store.status,
    flush: () => s.store.flush(),
    session: () => ({
      option: currentOption(s).id,
      look: s.look,
      unlock: unlockOptions(s),
      visitOption: s.visitOption?.id ?? null,
      practiceMode: s.practiceMode,
      walkAssist: settings.walkAssist(),
    }),
  };
}

/** Stops every running scene, then starts `key` (adding it on first use). */
function startOnly(game: Phaser.Game, key: string, scene: typeof Phaser.Scene, data?: object): void {
  for (const sc of game.scene.getScenes(true)) if (sc.scene.key !== key) game.scene.stop(sc.scene.key);
  if (game.scene.getScene(key)) game.scene.start(key, data);
  else game.scene.add(key, scene, true, data);
}
