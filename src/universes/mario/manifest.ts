import type Phaser from 'phaser';
import type { CharacterDef, UniverseManifest } from '../../core/types';
import { LevelScene, type LevelSceneData } from '../../core/levels/LevelScene';
import { nextLevelId } from '../../core/levels/progression';
import { asset, assets } from './assets';
import { levels } from './levels';
import { themeForWorld } from './themes';
import { worlds } from './worlds';
import { InputLabScene } from './scenes/InputLabScene';

// Files live in ./assets/ and are named after the character id (D-009).
// displayHeight is the on-screen height of the visible character (margins trimmed), tuned by eye
// so the cast reads as about the same size; the big ones are a little taller.
// Poses and voices (D-023): Mario's and Luigi's main images are jump poses, so they double as `jump`;
// the run poses are side views (Mario's faces right, Luigi's faces left). The main pictures include a
// raised arm and stretched legs, so the run poses get a smaller displayHeight: that keeps the head and
// body the same size when the pose swaps (tuned side by side). Voice mapping to confirm by ear.
const characters: CharacterDef[] = [
  {
    id: 'mario',
    name: 'Mario',
    image: asset('mario.avif'),
    displayHeight: 104,
    poses: {
      run: { image: asset('mario-run.png'), facing: 'right', displayHeight: 86 },
      jump: { image: asset('mario.avif') },
    },
    sounds: {
      pick: assets('mario-yeah-ho.mp3'),
      jump: assets('mario-ha-ha.mp3'),
      win: assets('mario-yipee.mp3'),
    },
    color: 0xe53935,
    powerAnimation: 'fireball',
  },
  {
    id: 'luigi',
    name: 'Luigi',
    image: asset('luigi.avif'),
    displayHeight: 108,
    poses: {
      run: { image: asset('luigi-run.png'), facing: 'left', displayHeight: 90 },
      jump: { image: asset('luigi.avif') },
    },
    sounds: {
      pick: assets('luigi-oh-yeah.mp3'),
      jump: assets('luigi-haha.mp3'),
      win: assets('luigi-yeah-ha-ha.mp3'),
    },
    color: 0x43a047,
    powerAnimation: 'fireball',
  },
  { id: 'peach', name: 'Peach', image: asset('peach.avif'), displayHeight: 108, color: 0xf06292, powerAnimation: 'sparkle' },
  { id: 'toad', name: 'Toad', image: asset('toad.avif'), displayHeight: 96, color: 0xffffff, powerAnimation: 'spin' },
  { id: 'bowser', name: 'Bowser', image: asset('bowser.avif'), displayHeight: 112, color: 0xff8f00, powerAnimation: 'roar' },
  { id: 'yoshi', name: 'Yoshi', image: asset('yoshi.avif'), displayHeight: 104, color: 0x7cb342, powerAnimation: 'tongue' },
  { id: 'donkeykong', name: 'Donkey Kong', image: asset('donkeykong.avif'), displayHeight: 110, color: 0x8d6e63, powerAnimation: 'groundpound' },
];

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
