// Avatar configuration (D-032, D-033, D-037, D-038): which look, and an option's palette, size factor and antennae.
// Pure and unit-tested; no Phaser.
import { DEFAULT_PALETTE, SCALE_RANGE } from './robotSpec';

export const LOOK_NAMES = ['robot', 'ball'] as const;

/**
 * Visual size factor for every look (Task 006, D-035): `avatarScale` 1 by default, `?size=` overrides it.
 * Visual only: the 40x84 hit box never changes; feet stay on the ground, shadow and dust follow.
 */
export const AVATAR_SIZE = { avatarScale: 1, min: 0.8, max: 1.6 } as const;

/** Reads `?size=` (clamped). Missing or not a number: the default, with a warning for junk. */
export function parseSize(search: string): { size: number; warning: string | null } {
  const v = new URLSearchParams(search).get('size');
  if (v === null || v === '') return { size: AVATAR_SIZE.avatarScale, warning: null };
  const n = Number(v);
  if (!Number.isFinite(n)) return { size: AVATAR_SIZE.avatarScale, warning: `[avatar] ?size=${v} is not a number, using ${AVATAR_SIZE.avatarScale}` };
  return { size: Math.min(AVATAR_SIZE.max, Math.max(AVATAR_SIZE.min, n)), warning: null };
}
export type LookName = (typeof LOOK_NAMES)[number];
export const DEFAULT_LOOK: LookName = 'robot';

/** Colours of a code-built avatar (0xRRGGBB). */
export interface AvatarPalette {
  body: number;
  joint: number;
  accent: number;
  visor: number;
  eye: number;
}

/** Avatar attributes of an option in the manifest (AvatarOptionDef extends this). Cosmetic only. */
export interface AvatarDef {
  palette?: Partial<AvatarPalette>;
  /** Size factor for the Robot and the Ball (0.9..1.15). */
  scale?: number;
  /** Number of robot antennae (0, 1 or 2; default 2). */
  antennae?: number;
}

export interface ResolvedAvatar {
  palette: AvatarPalette;
  scale: number;
  antennae: 0 | 1 | 2;
}

/** Reads `?look=`. Unknown values fall back to the default with a warning message (for one console warning). */
export function parseLook(search: string): { look: LookName; warning: string | null } {
  const v = new URLSearchParams(search).get('look');
  if (v === null || v === '') return { look: DEFAULT_LOOK, warning: null };
  const name = v.toLowerCase();
  if ((LOOK_NAMES as readonly string[]).includes(name)) return { look: name as LookName, warning: null };
  return { look: DEFAULT_LOOK, warning: `[avatar] unknown look "${v}", using "${DEFAULT_LOOK}" (use ${LOOK_NAMES.join(', ')})` };
}

const isColor = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 0xffffff;

/** Fills palette defaults, clamps the scale into SCALE_RANGE and the antennae to 0..2. Bad values use defaults. */
export function resolveAvatar(def: AvatarDef | undefined): ResolvedAvatar {
  const palette = { ...DEFAULT_PALETTE } as AvatarPalette;
  for (const key of Object.keys(palette) as Array<keyof AvatarPalette>) {
    const v = def?.palette?.[key];
    if (isColor(v)) palette[key] = v;
  }
  const s = def?.scale;
  const scale = typeof s === 'number' && Number.isFinite(s) ? Math.min(SCALE_RANGE.max, Math.max(SCALE_RANGE.min, s)) : 1;
  const a = def?.antennae;
  const antennae = (typeof a === 'number' && Number.isFinite(a) ? Math.min(2, Math.max(0, Math.round(a))) : 2) as 0 | 1 | 2;
  return { palette, scale, antennae };
}

/** Hue of the Grass hills (degrees) and how close an accent may come before it needs a rim (Task 006, D-035). */
export const HILL_RIM = { hue: 115, range: 40, minSaturation: 0.3 } as const;

/** Hue (0..360) and saturation (0..1, HSL) of a colour. */
export function hueSat(c: number): { hue: number; sat: number } {
  const r = ((c >> 16) & 255) / 255;
  const g = ((c >> 8) & 255) / 255;
  const b = (c & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { hue: 0, sat: 0 };
  const sat = d / (1 - Math.abs(2 * l - 1));
  let hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return { hue, sat };
}

/**
 * True when an accent colour is so close to the hills' green that accent parts (and the Ball's body) would blend
 * into the background: those get a thin light rim. Every other option keeps its look unchanged.
 */
export function needsHillRim(accent: number): boolean {
  const { hue, sat } = hueSat(accent);
  const dist = Math.min(Math.abs(hue - HILL_RIM.hue), 360 - Math.abs(hue - HILL_RIM.hue));
  return sat >= HILL_RIM.minSaturation && dist <= HILL_RIM.range;
}
