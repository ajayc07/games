// Where the Combo Practice selector's cards and Back button go (Task 011), and where the map's Practice button sits.
// Pure and unit-tested. Four big icon-only cards in a 2x2 grid, centred, pushed right of the Back button when they
// would meet it; Back in the bottom-left corner inside the device insets.
import { PRACTICE_MODES, type PracticeMode } from '../levels/practice';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PracticeSelectLayout {
  cards: Array<Rect & { mode: PracticeMode }>;
  back: { x: number; y: number; r: number };
}

export const SELECT = {
  margin: 28,
  gap: 28,
  backR: 70,
  card: { maxW: 360, maxH: 300, minSide: 150 },
} as const;

/** The modes in card order (reading order in the 2x2 grid). */
export const CARD_ORDER: readonly PracticeMode[] = PRACTICE_MODES;

export function practiceSelectLayout(width: number, height: number, insets: Insets): PracticeSelectLayout {
  const S = SELECT;
  const left = insets.left + S.margin;
  const top = insets.top + S.margin;
  const right = width - insets.right - S.margin;
  const bottom = height - insets.bottom - S.margin;
  const back = { x: left + S.backR, y: bottom - S.backR, r: S.backR };
  const cardsLeft = back.x + S.backR + S.gap;
  const availW = right - cardsLeft;
  const availH = bottom - top;
  const cardW = Math.max(S.card.minSide, Math.floor(Math.min(S.card.maxW, (availW - S.gap) / 2)));
  const cardH = Math.max(S.card.minSide, Math.floor(Math.min(S.card.maxH, (availH - S.gap) / 2)));
  const gridW = cardW * 2 + S.gap;
  const gridH = cardH * 2 + S.gap;
  // Centred on the screen when that keeps it clear of Back, else just right of Back.
  const gx = Math.max(cardsLeft, Math.min(width / 2 - gridW / 2, right - gridW));
  const gy = top + (availH - gridH) / 2;
  const cards = CARD_ORDER.map((mode, i) => ({
    mode,
    x: gx + (i % 2) * (cardW + S.gap),
    y: gy + Math.floor(i / 2) * (cardH + S.gap),
    width: cardW,
    height: cardH,
  }));
  return { cards, back };
}

/** Grid keyboard focus: arrows move in the 2x2 grid (Left/Right wrap through the cards, Up/Down change the row). */
export function moveCardFocus(focus: number, dir: 'left' | 'right' | 'up' | 'down', count = CARD_ORDER.length): number {
  if (dir === 'left') return (focus + count - 1) % count;
  if (dir === 'right') return (focus + 1) % count;
  if (dir === 'up') return focus >= 2 ? focus - 2 : focus;
  return focus + 2 < count ? focus + 2 : focus;
}

/** The map's Practice button (Task 011): bottom-right corner inside the insets, below the dots and their stars. */
export const MAP_PRACTICE = {
  r: 60,
  /** Square hit area side (at least 96 px). */
  hit: 132,
  /** Distance of the centre from the bottom and right edges of the UI area. */
  inset: 96,
  /** Idle bob (px up and down) and its period (ms). */
  bob: 6,
  bobMs: 1500,
} as const;

/** The map's Zen button (Task 020): the same size as Practice, directly to its left on the same line. */
export function mapZenSpot(width: number, height: number, insets: Insets): { x: number; y: number; r: number; hit: number } {
  const p = mapPracticeSpot(width, height, insets);
  return { ...p, x: p.x - (MAP_PRACTICE.hit + 24) };
}

/** The map's Sticker button (Task 031): the same size, left of Zen on the same line. */
export function mapStickerSpot(width: number, height: number, insets: Insets): { x: number; y: number; r: number; hit: number } {
  const z = mapZenSpot(width, height, insets);
  return { ...z, x: z.x - (MAP_PRACTICE.hit + 24) };
}

export function mapPracticeSpot(width: number, height: number, insets: Insets): { x: number; y: number; r: number; hit: number } {
  return {
    x: width - insets.right - MAP_PRACTICE.inset,
    y: height - insets.bottom - MAP_PRACTICE.inset,
    r: MAP_PRACTICE.r,
    hit: MAP_PRACTICE.hit,
  };
}
