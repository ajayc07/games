// The Mario cast (D-004). Plain data (no Phaser), so tests can read it.
import type { CharacterDef } from '../../core/types';
import { asset, assets } from './assets';

// Files live in ./assets/ and are named after the character id (D-009).
// displayHeight is the on-screen height of the visible character (margins trimmed), tuned by eye
// so the cast reads as about the same size; the big ones are a little taller.
// Poses and voices (D-023): Mario's and Luigi's main images are jump poses, so they double as `jump`;
// the run poses are side views (Mario's faces right, Luigi's faces left). The main pictures include a
// raised arm and stretched legs, so the run poses get a smaller displayHeight: that keeps the head and
// body the same size when the pose swaps (tuned side by side). Standing still, their run picture is used
// (idle rule, Task 005). Voice mapping (D-023, D-031) to confirm by ear; Yoshi and DK have no voices yet.
export const characters: CharacterDef[] = [
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
  {
    id: 'peach',
    name: 'Peach',
    image: asset('peach.avif'),
    displayHeight: 108,
    sounds: { pick: assets('peach-hello.mp3'), jump: assets('peach-yeah.mp3'), win: assets('peach-he-he-yeah.mp3') },
    color: 0xf06292,
    powerAnimation: 'sparkle',
  },
  {
    id: 'toad',
    name: 'Toad',
    image: asset('toad.avif'),
    displayHeight: 96,
    sounds: { pick: assets('toad-2.mp3'), jump: assets('toad-0.mp3'), win: assets('toad-1.mp3') },
    color: 0xffffff,
    powerAnimation: 'spin',
  },
  {
    id: 'bowser',
    name: 'Bowser',
    image: asset('bowser.avif'),
    displayHeight: 112,
    sounds: { pick: assets('bowser-1.mp3'), jump: assets('bowser-0.mp3'), win: assets('bowser-he-ha-ha.mp3') },
    color: 0xff8f00,
    powerAnimation: 'roar',
  },
  { id: 'yoshi', name: 'Yoshi', image: asset('yoshi.avif'), displayHeight: 104, color: 0x7cb342, powerAnimation: 'tongue' },
  { id: 'donkeykong', name: 'Donkey Kong', image: asset('donkeykong.avif'), displayHeight: 110, color: 0x8d6e63, powerAnimation: 'groundpound' },
];
