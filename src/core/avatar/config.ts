// Avatar configuration (D-032, D-033): which look, the character's palette and size factor, and the
// portrait crop. Pure and unit-tested; no Phaser.
import { DEFAULT_PALETTE, SCALE_RANGE } from './robotSpec';

export const LOOK_NAMES = ['sprite', 'ball', 'portrait', 'robot'] as const;
export type LookName = (typeof LOOK_NAMES)[number];
export const DEFAULT_LOOK: LookName = 'sprite';

/** Colours of a code-built avatar (0xRRGGBB). */
export interface AvatarPalette {
  body: number;
  joint: number;
  accent: number;
  visor: number;
  eye: number;
}

/** Per-character avatar attributes in the manifest. Cosmetic only. */
export interface AvatarDef {
  palette?: Partial<AvatarPalette>;
  /** Size factor for Ball, Portrait and Robot (0.9..1.15). */
  scale?: number;
  /** Number of robot antennae (0, 1 or 2; default 2). */
  antennae?: number;
}

/** The character's face in its main image, for the Portrait look: centre and radius, normalised to the image width/height. */
export interface PortraitRect {
  /** Centre, 0..1 of the image width. */
  x: number;
  /** Centre, 0..1 of the image height. */
  y: number;
  /** Radius as a fraction of the image width. */
  radius: number;
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

/**
 * Checks a portrait crop against the image size: centre inside the image, radius above 0, and the whole
 * disc inside the image. Returns readable problems (empty = fine).
 */
export function portraitProblems(rect: PortraitRect, imageW: number, imageH: number): string[] {
  const errors: string[] = [];
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (!num(rect.x) || rect.x < 0 || rect.x > 1) errors.push(`portrait.x must be between 0 and 1 (got ${rect.x})`);
  if (!num(rect.y) || rect.y < 0 || rect.y > 1) errors.push(`portrait.y must be between 0 and 1 (got ${rect.y})`);
  if (!num(rect.radius) || rect.radius <= 0 || rect.radius > 0.5) errors.push(`portrait.radius must be above 0 and at most 0.5 (got ${rect.radius})`);
  if (errors.length === 0 && imageW > 0 && imageH > 0) {
    const r = rect.radius * imageW;
    const cx = rect.x * imageW;
    const cy = rect.y * imageH;
    if (cx - r < 0 || cx + r > imageW || cy - r < 0 || cy + r > imageH) errors.push('portrait disc must lie inside the image');
  }
  return errors;
}

/** The portrait disc in image pixels, or null if the rect is not usable for this image. */
export function portraitPixels(rect: PortraitRect | undefined, imageW: number, imageH: number): { cx: number; cy: number; r: number } | null {
  if (!rect || portraitProblems(rect, imageW, imageH).length > 0) return null;
  return { cx: rect.x * imageW, cy: rect.y * imageH, r: rect.radius * imageW };
}
