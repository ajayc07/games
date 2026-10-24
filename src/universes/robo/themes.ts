import type { LevelTheme } from '../../core/levels/theme';
import { asset } from './assets';

/**
 * Grass world look. Colours drive the generated placeholders. To use real art, drop e.g.
 * `grass-ground-top.png` into ./assets/ (one cell, any resolution); it is picked up automatically.
 */
export const grassTheme: LevelTheme = {
  id: 'robo-grass',
  sky: { top: 0x4fb3ff, bottom: 0xb8e6ff },
  hills: { far: 0x8fd18f, farShade: 0xa8dfa8, near: 0x5cb85c, nearShade: 0x74c774 },
  cloud: 0xffffff,
  ground: { grass: 0x7cd34a, grassDark: 0x4e9a2a, dirt: 0xc68642, dirtDots: 0xa86b32 },
  coin: { fill: 0xffd600, edge: 0xf9a825, shine: 0xffffff },
  flag: { pole: 0xeeeeee, cloth: 0x43a047, knob: 0xffd600 },
  images: {
    'ground-top': asset('grass-ground-top.png'),
    'ground-fill': asset('grass-ground-fill.png'),
    coin: asset('coin.png'),
    'flag-pole': asset('flag-pole.png'),
    'flag-cloth': asset('flag-cloth.png'),
    'hills-far': asset('grass-hills-far.png'),
    'hills-near': asset('grass-hills-near.png'),
    cloud: asset('cloud.png'),
  },
};

/** Theme for a world id. Only Grass exists so far; the others reuse it until they get their own look. */
export function themeForWorld(_worldId: string): LevelTheme {
  return grassTheme;
}
