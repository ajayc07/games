// Avatar configuration (D-032, D-033, D-037): which look, and the character's palette and size factor.
// Pure and unit-tested; no Phaser.
import { DEFAULT_PALETTE, SCALE_RANGE } from './robotSpec';

export const LOOK_NAMES = ['robot', 'ball'] as const;
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

/** Per-character avatar attributes in the manifest. Cosmetic only. */
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
