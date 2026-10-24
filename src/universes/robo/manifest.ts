import type Phaser from 'phaser';
import type { AvatarOptionDef, UniverseManifest } from '../../core/types';
import { LevelScene, type LevelSceneData } from '../../core/levels/LevelScene';
import { nextLevelId } from '../../core/levels/progression';
import { PickerScene, type PickerSceneData } from '../../core/picker/PickerScene';
import { colorFromSearch, findOption, validateOptions } from '../../core/avatar/options';
import { loadChoice, saveChoice } from '../../core/storage/choice';
import { options } from './options';
import { levels } from './levels';
import { themeForWorld } from './themes';
import { worlds } from './worlds';
import { InputLabScene } from './scenes/InputLabScene';
import { UNIVERSE_ID, UNIVERSE_TITLE } from './universe';

const TAG = `[${UNIVERSE_ID}]`;

export const manifest: UniverseManifest = {
  id: UNIVERSE_ID,
  title: UNIVERSE_TITLE,
  options,
  worlds,
  unlock: { openAtATime: 3 },
  start(game) {
    for (const e of validateOptions(options)) console.warn(`${TAG} ${e}`);
    // Until the world map exists (Task 006). Test params: ?lab=1 Input Lab, ?level=<id> any level,
    // ?color=<id> any option (skips the picker), ?picker=1 shows the picker again.
    const params = new URLSearchParams(window.location.search);
    const levelId = params.get('level');
    if (params.has('lab') && params.get('lab') !== '0') return openLab(game);
    const color = colorFromSearch(window.location.search, options);
    if (color.warning) console.warn(color.warning);
    if (color.requested) return openLevel(game, levelId, color.option);
    const stored = findOption(options, loadChoice(UNIVERSE_ID));
    const forcePicker = params.has('picker') && params.get('picker') !== '0';
    // First launch shows the picker; a stored choice or ?level= goes straight to the level.
    if (forcePicker || (!stored && !levelId)) openPicker(game, levelId);
    else openLevel(game, levelId, stored ?? options[0]);
  },
};

/** The picker; Play stores the choice and opens `levelId` (or the first level). */
function openPicker(game: Phaser.Game, levelId: string | null): void {
  const data: PickerSceneData = {
    options,
    selectedId: loadChoice(UNIVERSE_ID),
    onPlay: (id) => {
      saveChoice(UNIVERSE_ID, id);
      openLevel(game, levelId, findOption(options, id) ?? options[0]);
    },
  };
  startOnly(game, PickerScene.KEY, PickerScene, data);
}

function openLevel(game: Phaser.Game, levelId: string | null, option: AvatarOptionDef): void {
  const firstId = manifest.worlds.find((w) => w.levels.length > 0)?.levels[0];
  let level = levelId ? levels.get(levelId) : undefined;
  if (levelId && !level) console.warn(`${TAG} unknown level "${levelId}", opening ${firstId}`);
  level ??= levels.get(firstId ?? '');
  if (!level) throw new Error(`${TAG} no levels found`);

  const nextId = nextLevelId(manifest.worlds, level.id);
  const here = level.id;
  const data: LevelSceneData = {
    level,
    theme: themeForWorld(level.world),
    option,
    onHome: () => openLab(game), // Home goes to the Input Lab until the world map exists.
    // Next (D-025) until the map replaces it in Task 006. Keeps the chosen option.
    onNext: nextId && levels.has(nextId) ? () => openLevel(game, nextId, option) : undefined,
    // The win screen's palette button: pick again, then replay this level with the new colour.
    onPicker: () => openPicker(game, here),
  };
  startOnly(game, LevelScene.KEY, LevelScene, data);
}

function openLab(game: Phaser.Game): void {
  startOnly(game, InputLabScene.KEY, InputLabScene);
}

/** Stops every running scene, then starts `key` (adding it on first use). */
function startOnly(game: Phaser.Game, key: string, scene: typeof Phaser.Scene, data?: object): void {
  for (const s of game.scene.getScenes(true)) if (s.scene.key !== key) game.scene.stop(s.scene.key);
  if (game.scene.getScene(key)) game.scene.start(key, data);
  else game.scene.add(key, scene, true, data);
}
