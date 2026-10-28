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

/**
 * Night look (Task 016, D-060): a deep blue sky with stars, pale moonlit hills, light enough that the robot's dark joints (and a
 * dark option) stand out, bright coins, fireflies and a soft headlamp glow around the robot. Generated, no image files.
 */
export const nightTheme: LevelTheme = {
  id: 'robo-night',
  sky: { top: 0x0b1445, bottom: 0x3a3f9a },
  hills: { far: 0x8a96e8, farShade: 0x99a4ee, near: 0xa3aef2, nearShade: 0xb2bbf6 },
  cloud: 0x8f9be0,
  ground: { grass: 0x1f8f55, grassDark: 0x14663c, dirt: 0x4b3d7a, dirtDots: 0x3a2e62 },
  coin: { fill: 0xffe14d, edge: 0xffa000, shine: 0xffffff },
  goal: { rim: 0x1a1446, top: 0xffe082, ring: 0x00e5ff, glow: 0x80f4ff, beacon: 0xffee58, beaconRim: 0x1a1446, post: 0xfff3e0 },
  night: { stars: 46, fireflies: 16, lamp: 0xfff3b0, lampAlpha: 0.36, lampSize: 440, firefly: 0xd4ff6a },
};

/** Theme for a world id: `night` has its own look; every other world reuses Grass until it gets one. */
export function themeForWorld(worldId: string): LevelTheme {
  return worldId === 'night' ? nightTheme : grassTheme;
}
