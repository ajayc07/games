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
// (idle rule, Task 005). `avatar` (Task 005b): code-built looks' colours and size, by colour only
// (D-033); Bowser and DK are bigger, Toad smaller. `portrait`: the face in the main image, chosen by eye.
// Voice mapping (D-023, D-031) to confirm by ear; Yoshi and DK have no voices yet.
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
    avatar: { palette: { accent: 0xe53935, joint: 0x2f4fa8 }, scale: 1 },
    portrait: { x: 0.43, y: 0.29, radius: 0.21 },
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
    avatar: { palette: { accent: 0x2e9e44, joint: 0x2f4fa8 }, scale: 1.03 },
    portrait: { x: 0.57, y: 0.28, radius: 0.2 },
    powerAnimation: 'fireball',
  },
  {
    id: 'peach',
    name: 'Peach',
    image: asset('peach.avif'),
    displayHeight: 108,
    sounds: { pick: assets('peach-hello.mp3'), jump: assets('peach-yeah.mp3'), win: assets('peach-he-he-yeah.mp3') },
    color: 0xf06292,
    avatar: { palette: { accent: 0xf06292, joint: 0xd4a017 }, scale: 1 },
    portrait: { x: 0.62, y: 0.19, radius: 0.16 },
    powerAnimation: 'sparkle',
  },
  {
    id: 'toad',
    name: 'Toad',
    image: asset('toad.avif'),
    displayHeight: 96,
    sounds: { pick: assets('toad-2.mp3'), jump: assets('toad-0.mp3'), win: assets('toad-1.mp3') },
    color: 0xffffff,
    avatar: { palette: { accent: 0x1e88e5, joint: 0xd83a34 }, scale: 0.92, antennae: 1 },
    portrait: { x: 0.52, y: 0.42, radius: 0.27 },
    powerAnimation: 'spin',
  },
  {
    id: 'bowser',
    name: 'Bowser',
    image: asset('bowser.avif'),
    displayHeight: 112,
    sounds: { pick: assets('bowser-1.mp3'), jump: assets('bowser-0.mp3'), win: assets('bowser-he-ha-ha.mp3') },
    color: 0xff8f00,
    avatar: { palette: { accent: 0xff8f00, joint: 0x4f7d2b }, scale: 1.12 },
    portrait: { x: 0.3, y: 0.25, radius: 0.2 },
    powerAnimation: 'roar',
  },
  {
    id: 'yoshi',
    name: 'Yoshi',
    image: asset('yoshi.avif'),
    displayHeight: 104,
    color: 0x7cb342,
    avatar: { palette: { accent: 0x8bc34a, joint: 0xe2572b }, scale: 1 },
    portrait: { x: 0.53, y: 0.2, radius: 0.23 },
    powerAnimation: 'tongue',
  },
  {
    id: 'donkeykong',
    name: 'Donkey Kong',
    image: asset('donkeykong.avif'),
    displayHeight: 110,
    color: 0x8d6e63,
    avatar: { palette: { accent: 0x8d6e63, joint: 0xc62828 }, scale: 1.12 },
    portrait: { x: 0.46, y: 0.31, radius: 0.18 },
    powerAnimation: 'groundpound',
  },
];
