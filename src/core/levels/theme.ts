// What a universe hands the generic LevelScene to make a level look like its world.
// Colours drive the generated placeholder textures; any texture can be replaced by an image file.

/** Textures a theme can supply as files. Missing ones are generated from the colours below. */
export const THEME_TEXTURES = [
  'ground-top', // one ground cell with grass on top (tileSize x tileSize)
  'ground-fill', // one ground cell under the surface
  'coin',
  'goal-pad', // the charging pad slab (rim, top face)
  'goal-ring', // glowing ring on the pad top
  'goal-post', // post with antenna
  'goal-beacon', // beacon ball
  'hills-far', // horizontally tileable strip, bottom-aligned
  'hills-near',
  'cloud',
] as const;

export type ThemeTexture = (typeof THEME_TEXTURES)[number];

export interface LevelTheme {
  /** Used to namespace texture keys, e.g. 'robo-grass'. */
  id: string;
  sky: { top: number; bottom: number };
  hills: { far: number; near: number; farShade: number; nearShade: number };
  cloud: number;
  ground: { grass: number; grassDark: number; dirt: number; dirtDots: number };
  coin: { fill: number; edge: number; shine: number };
  /** Charging pad: `rim` and `beaconRim` are dark enough to stand out from sky and hills (unit-tested, 3:1). */
  goal: { rim: number; top: number; ring: number; glow: number; beacon: number; beaconRim: number; post: number };
  /** Image files (URLs) that replace generated placeholders. Drop a file into the universe assets and list it here. */
  images?: Partial<Record<ThemeTexture, string>>;
}
