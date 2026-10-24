import type Phaser from 'phaser';
import type { AvatarOptionDef, UniverseManifest, WorldDef } from '../../core/types';
import { LevelScene, type LevelSceneData } from '../../core/levels/LevelScene';
import { nextLevelId } from '../../core/levels/progression';
import { PickerScene, type PickerSceneData } from '../../core/picker/PickerScene';
import { MapScene, type MapSceneData, type TeaserIcon } from '../../core/map/MapScene';
import { unlockFromSearch, worldDots, type UnlockOptions } from '../../core/map/unlock';
import { colorFromSearch, findOption, validateOptions } from '../../core/avatar/options';
import { DEFAULT_LOOK, LOOK_NAMES, parseLook, type LookName } from '../../core/avatar/config';
import { loadLegacyChoice } from '../../core/storage/choice';
import { ProgressStore } from '../../core/storage/store';
import type { ProgressRecord } from '../../core/storage/progress';
import { options } from './options';
import { levels } from './levels';
import { themeForWorld } from './themes';
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
  unlock: UnlockOptions;
  /** `?color=` for this visit only (not saved, D-039); cleared when the child picks in the picker. */
  visitOption: AvatarOptionDef | null;
  look: LookName;
  /** Set when a level was finished; the map plays its arrival animation once. */
  arrival: { levelId: string; before: ProgressRecord } | null;
}

const isLook = (v: unknown): v is LookName => typeof v === 'string' && (LOOK_NAMES as readonly string[]).includes(v);

async function boot(game: Phaser.Game): Promise<void> {
  for (const e of validateOptions(options)) console.warn(`${TAG} ${e}`);
  const search = window.location.search;
  const params = new URLSearchParams(search);
  // Progress first (IndexedDB -> localStorage -> memory; never throws). The 005d choice key is migrated in.
  const store = await ProgressStore.open(UNIVERSE_ID, { legacyChoice: loadLegacyChoice(UNIVERSE_ID) });
  store.flushOnHide();
  // ?look= overrides and is saved (the tablet remembers the last comparison); else the saved look.
  let look: LookName = isLook(store.record.look) ? store.record.look : DEFAULT_LOOK;
  if (params.has('look')) {
    const parsed = parseLook(search);
    if (parsed.warning) console.warn(parsed.warning);
    else {
      look = parsed.look;
      store.setLook(look);
    }
  }
  const color = colorFromSearch(search, options);
  if (color.warning) console.warn(color.warning);
  const s: Session = {
    game,
    store,
    unlock: unlockFromSearch(search, manifest.unlock.openAtATime),
    visitOption: color.requested ? color.option : null,
    look,
    arrival: null,
  };
  exposeDebug(s);

  // Start order (Task 006): ?lab=1 and ?level= bypass the map as before; else picker on first launch, else the map.
  const levelId = params.get('level');
  if (params.has('lab') && params.get('lab') !== '0') return openLab(s);
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

function dotsFor(s: Session, world: WorldDef, record: ProgressRecord = s.store.record) {
  return worldDots(world, record.levels, s.unlock);
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
  };
  startOnly(s.game, MapScene.KEY, MapScene, data);
}

function openLevel(s: Session, levelId: string): void {
  const firstId = worlds.find((w) => w.levels.length > 0)?.levels[0];
  let level = levels.get(levelId);
  if (!level) console.warn(`${TAG} unknown level "${levelId}", opening ${firstId}`);
  level ??= levels.get(firstId ?? '');
  if (!level) throw new Error(`${TAG} no levels found`);
  s.arrival = null;
  const here = level.id;
  const nextId = nextLevelId(worlds, here);
  const data: LevelSceneData = {
    level,
    theme: themeForWorld(level.world),
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
    session: () => ({ option: currentOption(s).id, look: s.look, unlock: s.unlock, visitOption: s.visitOption?.id ?? null }),
  };
}

/** Stops every running scene, then starts `key` (adding it on first use). */
function startOnly(game: Phaser.Game, key: string, scene: typeof Phaser.Scene, data?: object): void {
  for (const sc of game.scene.getScenes(true)) if (sc.scene.key !== key) game.scene.stop(sc.scene.key);
  if (game.scene.getScene(key)) game.scene.start(key, data);
  else game.scene.add(key, scene, true, data);
}
