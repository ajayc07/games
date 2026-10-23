import type { CharacterDef, UniverseManifest } from '../../core/types';
import { asset } from './assets';
import { InputLabScene } from './scenes/InputLabScene';

// Files live in ./assets/ and are named after the character id (D-009). No sounds yet.
const characters: CharacterDef[] = [
  { id: 'mario', name: 'Mario', image: asset('mario.avif'), powerAnimation: 'fireball' },
  { id: 'luigi', name: 'Luigi', image: asset('luigi.avif'), powerAnimation: 'fireball' },
  { id: 'peach', name: 'Peach', image: asset('peach.avif'), powerAnimation: 'sparkle' },
  { id: 'toad', name: 'Toad', image: asset('toad.avif'), powerAnimation: 'spin' },
  { id: 'bowser', name: 'Bowser', image: asset('bowser.avif'), powerAnimation: 'roar' },
  { id: 'yoshi', name: 'Yoshi', image: asset('yoshi.avif'), powerAnimation: 'tongue' },
  { id: 'donkeykong', name: 'Donkey Kong', image: asset('donkeykong.avif'), powerAnimation: 'groundpound' },
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
    // Input Lab is the only screen for now; later it moves behind ?lab=1.
    game.scene.add(InputLabScene.KEY, InputLabScene, true);
  },
};
