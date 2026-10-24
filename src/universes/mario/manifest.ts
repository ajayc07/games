import type Phaser from 'phaser';
import type { UniverseManifest } from '../../core/types';
import { LevelScene, type LevelSceneData } from '../../core/levels/LevelScene';
import { nextLevelId } from '../../core/levels/progression';
import { characters } from './characters';
import { levels } from './levels';
import { themeForWorld } from './themes';
import { worlds } from './worlds';
import { InputLabScene } from './scenes/InputLabScene';

const DEFAULT_CHARACTER = 'mario';

export const manifest: UniverseManifest = {
  id: 'mario',
  title: 'Mario',
  characters,
  defaultCharacterId: DEFAULT_CHARACTER,
  worlds,
  unlock: { openAtATime: 3 },
  start(game) {
    // Until the world map exists (Task 006): open a level directly. Test params:
    // ?lab=1 Input Lab, ?level=<id> any level, ?char=<id> any character.
    const params = new URLSearchParams(window.location.search);
    if (params.has('lab') && params.get('lab') !== '0') openLab(game);
    else openLevel(game, params.get('level'), params.get('char'));
  },
};

function openLevel(game: Phaser.Game, levelId: string | null, charId: string | null): void {
  const firstId = manifest.worlds.find((w) => w.levels.length > 0)?.levels[0];
  let level = levelId ? levels.get(levelId) : undefined;
  if (levelId && !level) console.warn(`[mario] unknown level "${levelId}", opening ${firstId}`);
  level ??= levels.get(firstId ?? '');
  if (!level) throw new Error('[mario] no levels found');

  const character =
    characters.find((c) => c.id === charId) ?? characters.find((c) => c.id === manifest.defaultCharacterId)!;
  const nextId = nextLevelId(manifest.worlds, level.id);
  const data: LevelSceneData = {
    level,
    theme: themeForWorld(level.world),
    character,
    onHome: () => openLab(game), // Home goes to the Input Lab until the world map exists.
    // Next (D-025) until the map replaces it in Task 006. Keeps the chosen character.
    onNext: nextId && levels.has(nextId) ? () => openLevel(game, nextId, character.id) : undefined,
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
