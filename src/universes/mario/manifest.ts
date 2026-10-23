import type { CharacterDef, UniverseManifest } from '../../core/types';
import { PlaceholderScene } from './scenes/PlaceholderScene';

// No images or sounds yet (placeholders first, D-009). Real files will be named after the id,
// e.g. assets/mario.png, assets/donkeykong.png.
const characters: CharacterDef[] = [
  { id: 'mario', name: 'Mario', powerAnimation: 'fireball' },
  { id: 'luigi', name: 'Luigi', powerAnimation: 'fireball' },
  { id: 'peach', name: 'Peach', powerAnimation: 'sparkle' },
  { id: 'toad', name: 'Toad', powerAnimation: 'spin' },
  { id: 'bowser', name: 'Bowser', powerAnimation: 'roar' },
  { id: 'yoshi', name: 'Yoshi', powerAnimation: 'tongue' },
  { id: 'donkeykong', name: 'Donkey Kong', powerAnimation: 'groundpound' },
];

export const manifest: UniverseManifest = {
  id: 'mario',
  title: 'Mario',
  characters,
  defaultCharacterId: 'mario',
  worlds: [
    { id: 'grass', name: 'Grass', levels: [] },
    { id: 'pipe', name: 'Pipe', levels: [] },
    { id: 'sky', name: 'Sky', levels: [] },
    { id: 'castle', name: 'Castle', levels: [] },
  ],
  unlock: { openAtATime: 3 },
  start(game) {
    game.scene.add(PlaceholderScene.KEY, PlaceholderScene, true);
  },
};
