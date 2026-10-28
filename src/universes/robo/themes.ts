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
  goal: { rim: 0x8e1b4b, top: 0xffe082, ring: 0x00e5ff, glow: 0x80f4ff, beacon: 0xffee58, beaconRim: 0x8e1b4b, post: 0xfff3e0 },
  images: {
    'ground-top': asset('grass-ground-top.png'),
    'ground-fill': asset('grass-ground-fill.png'),
    coin: asset('coin.png'),
    'goal-pad': asset('goal-pad.png'),
    'goal-ring': asset('goal-ring.png'),
    'goal-post': asset('goal-post.png'),
    'goal-beacon': asset('goal-beacon.png'),
    'hills-far': asset('grass-hills-far.png'),
    'hills-near': asset('grass-hills-near.png'),
    cloud: asset('cloud.png'),
  },
};

/** Theme for a world id. Only Grass exists so far; the others reuse it until they get their own look. */
export function themeForWorld(_worldId: string): LevelTheme {
  return grassTheme;
}
