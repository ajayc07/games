// Mega Robo (Task 030, D-073): collect enough coins to fill the bar and he turns into a big robot for a while. The pure
// rules live here; the scene wires them (look size, bridges, bubble popping, the bar).

export const MEGA = {
  /** How long the big robot lasts. */
  durationMs: 12_000,
  /** The picture grows this many times (the hit box stays the same, so nothing can get stuck). */
  boost: 1.7,
  /** Faster than the little robot. */
  speedScale: 1.35,
  /** He steps over gaps this wide (in tiles) or narrower. */
  stepGapMax: 2,
  /** A level's bar fills after this share of its coins (about two fills per level). */
  fillShare: 0.5,
  /** The bar never needs fewer coins than this. */
  minCapacity: 8,
  /** Zen has no end, so a fixed number. */
  zenCapacity: 40,
  /** Walking into a bubble pops it: how far from his chest a bubble counts as touched, and how often it can pop. */
  popReach: 120,
  popEveryMs: 150,
} as const;

/** Coins that fill the bar once. */
export function barCapacity(totalCoins: number, zen: boolean): number {
  if (zen) return MEGA.zenCapacity;
  return Math.max(MEGA.minCapacity, Math.round(totalCoins * MEGA.fillShare));
}

export interface BarStep {
  /** Coins in the bar after this step (0..capacity-1). */
  coins: number;
  /** The bar filled up: Mega Robo starts. */
  full: boolean;
}

/** Adds coins to the bar. It never drains; when it fills, it starts again from what is left over. */
export function addToBar(coins: number, add: number, capacity: number): BarStep {
  const total = coins + Math.max(0, add);
  if (total >= capacity) return { coins: total - capacity >= capacity ? 0 : total - capacity, full: true };
  return { coins: total, full: false };
}

export interface GapRun {
  col: number;
  width: number;
}

/** The runs of missing ground in `groundRow` that are at most `maxWidth` tiles wide and have ground on both sides. */
export function narrowGaps(solid: boolean[][], groundRow = 9, maxWidth: number = MEGA.stepGapMax): GapRun[] {
  const row = solid[groundRow] ?? [];
  const out: GapRun[] = [];
  let col = 0;
  while (col < row.length) {
    if (row[col]) {
      col++;
      continue;
    }
    const from = col;
    while (col < row.length && !row[col]) col++;
    const width = col - from;
    if (from > 0 && col < row.length && width <= maxWidth) out.push({ col: from, width });
  }
  return out;
}

/** The bar as a fraction (0..1) for drawing. */
export function barFraction(coins: number, capacity: number): number {
  return capacity <= 0 ? 0 : Math.max(0, Math.min(1, coins / capacity));
}
