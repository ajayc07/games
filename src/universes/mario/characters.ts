// The Mario cast (D-004). Plain data (no Phaser), so tests can read it.
import type { CharacterDef } from '../../core/types';
import { asset, assets } from './assets';

// Files live in ./assets/ and are named after the character id (D-009). The pictures are not drawn in
// levels any more (D-037: the avatar is code-built); they stay for the character picker.
// `avatar` (Task 005b): the code-built looks' colours and size, by colour only (D-033); Bowser and DK are
// bigger, Toad smaller. Voice mapping (D-023, D-031) to confirm by ear; Yoshi and DK have no voices yet.
export const characters: CharacterDef[] = [
  {
    id: 'mario',
    name: 'Mario',
    image: asset('mario.avif'),
    sounds: {
      pick: assets('mario-yeah-ho.mp3'),
      jump: assets('mario-ha-ha.mp3'),
      win: assets('mario-yipee.mp3'),
    },
    color: 0xe53935,
    avatar: { palette: { accent: 0xe53935, joint: 0x2f4fa8 }, scale: 1 },
    powerAnimation: 'fireball',
  },
  {
    id: 'luigi',
    name: 'Luigi',
    image: asset('luigi.avif'),
    sounds: {
      pick: assets('luigi-oh-yeah.mp3'),
      jump: assets('luigi-haha.mp3'),
      win: assets('luigi-yeah-ha-ha.mp3'),
    },
    color: 0x43a047,
    avatar: { palette: { accent: 0x2e9e44, joint: 0x2f4fa8 }, scale: 1.03 },
    powerAnimation: 'fireball',
  },
  {
    id: 'peach',
    name: 'Peach',
    image: asset('peach.avif'),
    sounds: { pick: assets('peach-hello.mp3'), jump: assets('peach-yeah.mp3'), win: assets('peach-he-he-yeah.mp3') },
    color: 0xf06292,
    avatar: { palette: { accent: 0xf06292, joint: 0xd4a017 }, scale: 1 },
    powerAnimation: 'sparkle',
  },
  {
    id: 'toad',
    name: 'Toad',
    image: asset('toad.avif'),
    sounds: { pick: assets('toad-2.mp3'), jump: assets('toad-0.mp3'), win: assets('toad-1.mp3') },
    color: 0xffffff,
    avatar: { palette: { accent: 0x1e88e5, joint: 0xd83a34 }, scale: 0.92, antennae: 1 },
    powerAnimation: 'spin',
  },
  {
    id: 'bowser',
    name: 'Bowser',
    image: asset('bowser.avif'),
    sounds: { pick: assets('bowser-1.mp3'), jump: assets('bowser-0.mp3'), win: assets('bowser-he-ha-ha.mp3') },
    color: 0xff8f00,
    avatar: { palette: { accent: 0xff8f00, joint: 0x4f7d2b }, scale: 1.12 },
    powerAnimation: 'roar',
  },
  {
    id: 'yoshi',
    name: 'Yoshi',
    image: asset('yoshi.avif'),
    color: 0x7cb342,
    avatar: { palette: { accent: 0x8bc34a, joint: 0xe2572b }, scale: 1 },
    powerAnimation: 'tongue',
  },
  {
    id: 'donkeykong',
    name: 'Donkey Kong',
    image: asset('donkeykong.avif'),
    color: 0x8d6e63,
    avatar: { palette: { accent: 0x8d6e63, joint: 0xc62828 }, scale: 1.12 },
    powerAnimation: 'groundpound',
  },
];
