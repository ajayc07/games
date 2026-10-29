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
  /** In a stage the bar fills after this share of the level's coins, so it fills late and only once (Task 033). */
  fillShare: 0.7,
  /** The bar never needs fewer coins than this. */
  minCapacity: 12,
  /** Zen: the first fills need this many coins, and every `zenTierFills` fills the need grows by `zenStep`, up to `zenMax`. */
  zenBase: 50,
  zenStep: 25,
  zenTierFills: 3,
  zenMax: 200,
  /** Walking into a bubble pops it: how far from his chest a bubble counts as touched, and how often it can pop. */
  popReach: 120,
  popEveryMs: 150,
} as const;

/** Coins the zen bar needs for its next fill, after `fills` fills so far: 50, 50, 50, then 75 x3, then 100 x3, and so on. */
export function zenCapacity(fills: number): number {
  const tier = Math.floor(Math.max(0, fills) / MEGA.zenTierFills);
  return Math.min(MEGA.zenMax, MEGA.zenBase + MEGA.zenStep * tier);
}

export interface MegaPlan {
  /** Does this level have a coin bar at all? */
  enabled: boolean;
  /** Coins for the next fill after `fills` fills so far. */
  capacity(fills: number): number;
  /** No more fills after this many (Infinity in zen). */
  maxFills: number;
}

/**
 * Where Mega Robo can appear (Task 033, D-076). Not in the early stages: only in a level with all four buttons and no power-up
 * orbs of its own, and then the bar fills once, late (70% of the level's coins). Never in Practice. In zen it is a treat that
 * gets harder to earn as he plays on.
 */
export function megaPlan(o: { zen: boolean; practice: boolean; buttons: readonly string[]; hasPickups: boolean; totalCoins: number }): MegaPlan {
  if (o.practice) return { enabled: false, capacity: () => Infinity, maxFills: 0 };
  if (o.zen) return { enabled: true, capacity: zenCapacity, maxFills: Number.POSITIVE_INFINITY };
  const allFour = ['left', 'right', 'jump', 'power'].every((b) => o.buttons.includes(b));
  const cap = Math.max(MEGA.minCapacity, Math.round(o.totalCoins * MEGA.fillShare));
  return { enabled: allFour && !o.hasPickups, capacity: () => cap, maxFills: 1 };
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
