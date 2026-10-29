// Stickers (Task 031, D-074): the reward collection. He earns the next sticker when the coin bar fills (Mega Robo) and the
// first time he finishes a level (and the first time he gets all three stars there). Pure rules: the catalogue, which one
// comes next and how a saved list is cleaned. The drawing is in stickerArt.ts. Wordless on purpose.

export const STICKER_SHAPES = ['star', 'heart', 'rocket', 'moon', 'sun', 'flower', 'car', 'robot', 'gear', 'crown', 'rainbow', 'bolt'] as const;
export type StickerShape = (typeof STICKER_SHAPES)[number];

export interface StickerDef {
  id: string;
  shape: StickerShape;
  color: number;
}

const COLORS_A = [0xf9a825, 0xe91e63, 0x1e88e5, 0x5c6bc0, 0xff7043, 0x43a047, 0xe53935, 0x00acc1, 0x757575, 0xab47bc, 0x26a69a, 0xfb8c00];
const COLORS_B = [0xe91e63, 0x8e24aa, 0x43a047, 0x1565c0, 0x039be5, 0xd81b60, 0x00897b, 0xef6c00, 0x3949ab, 0xf4511e, 0x7cb342, 0xc62828];

/** All stickers, in the order they are earned: a first round of the twelve shapes, then a second round in new colours. */
export const STICKERS: readonly StickerDef[] = Array.from({ length: STICKER_SHAPES.length * 2 }, (_, i) => ({
  id: `s${String(i + 1).padStart(2, '0')}`,
  shape: STICKER_SHAPES[i % STICKER_SHAPES.length],
  color: (i < STICKER_SHAPES.length ? COLORS_A : COLORS_B)[i % STICKER_SHAPES.length],
}));

export const STICKER_COUNT = STICKERS.length;

const byId = new Map(STICKERS.map((s) => [s.id, s]));

export const stickerById = (id: string): StickerDef | undefined => byId.get(id);

/** The next sticker to give, or null when he has them all. */
export function nextSticker(owned: readonly string[]): string | null {
  const have = new Set(owned);
  return STICKERS.find((s) => !have.has(s.id))?.id ?? null;
}

/** A saved list cleaned up: only known ids, each once, in catalogue order. */
export function cleanStickers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const have = new Set(raw.filter((x): x is string => typeof x === 'string'));
  return STICKERS.filter((s) => have.has(s.id)).map((s) => s.id);
}

export type StickerReason = 'mega' | 'finish';

/** Does this event earn a sticker? A finish earns one the first time a level is cleared and the first time it gets 3 stars. */
export function earnsSticker(reason: StickerReason, before: { stars: number } | null, stars: number): boolean {
  if (reason === 'mega') return true;
  const was = before?.stars ?? 0;
  return stars >= 1 && (was === 0 || (stars >= 3 && was < 3));
}
