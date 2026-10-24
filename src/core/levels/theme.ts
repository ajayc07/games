// What a universe hands the generic LevelScene to make a level look like its world.
// Colours drive the generated placeholder textures; any texture can be replaced by an image file.

/** Textures a theme can supply as files. Missing ones are generated from the colours below. */
export const THEME_TEXTURES = [
  'ground-top', // one ground cell with grass on top (tileSize x tileSize)
  'ground-fill', // one ground cell under the surface
  'coin',
  'flag-pole',
  'flag-cloth',
  'hills-far', // horizontally tileable strip, bottom-aligned
  'hills-near',
  'cloud',
] as const;

export type ThemeTexture = (typeof THEME_TEXTURES)[number];

export interface LevelTheme {
  /** Used to namespace texture keys, e.g. 'mario-grass'. */
  id: string;
  sky: { top: number; bottom: number };
  hills: { far: number; near: number; farShade: number; nearShade: number };
  cloud: number;
  ground: { grass: number; grassDark: number; dirt: number; dirtDots: number };
  coin: { fill: number; edge: number; shine: number };
  flag: { pole: number; cloth: number; knob: number };
  /** Image files (URLs) that replace generated placeholders. Drop a file into the universe assets and list it here. */
  images?: Partial<Record<ThemeTexture, string>>;
}
