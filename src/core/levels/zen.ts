// Zen free play (Task 020, D-063): an endless, calm level with all four buttons and all three power-ups, no flag,
// no stars and no way to lose. It is a flat ground with a segment of generated content on it; when he walks out of
// the segment's content (into a stretch of empty ground at either end) the scene quietly swaps in a fresh segment
// and moves everything back by the same distance, so he just keeps walking and never sees a seam. Pure and seeded:
// the same seed and lap number always give the same segment. The scene does the swapping (LevelScene.rebaseZen).
import type { Action } from '../types';
import type { PickupKind } from './powerups';
import { makeRng, ROW } from './practice';

const COLS = 300;

export const ZEN = {
  cols: COLS,
  rows: 11,
  tile: 64,
  /** He starts here (tiles from the left edge of a segment). */
  startCol: 30,
  /** Content starts this far in; the first segment starts a little closer to him so there is something to do at once. */
  free: 52,
  firstContent: 38,
  /** Crossing these columns swaps the segment: to the right of `rightAt` he reappears at `rightArrival`, and so on. */
  rightAt: COLS - 22,
  rightArrival: 30,
  leftAt: 22,
  /** A segment's content stops this many tiles before its right edge. */
  tail: 52,
} as const;

/** Columns he moves back (or forward) at a swap; the same both ways, and the same for every segment. */
export const ZEN_SHIFT = ZEN.rightAt - ZEN.rightArrival;

/** First column after a segment's content. */
export const ZEN_CONTENT_END = ZEN.cols - ZEN.tail;

/**
 * Does he need a fresh segment? `x` is his world x in px. Returns the direction (+1 he walked out on the right) and the
 * shift (px) to add to everything's x, or null. Walking back and forth never swaps twice in a row: the arrival column is
 * 8 tiles inside the trigger on both sides.
 */
export function zenRebase(x: number, tile: number = ZEN.tile): { dir: 1 | -1; dx: number } | null {
  const col = x / tile;
  if (col >= ZEN.rightAt) return { dir: 1, dx: -ZEN_SHIFT * tile };
  if (col <= ZEN.leftAt) return { dir: -1, dx: ZEN_SHIFT * tile };
  return null;
}

/** The seed of a segment: lap 0 is the first one; each swap counts one lap up (right) or down (left). */
export function zenSegmentSeed(seed: number, lap: number): number {
  return (seed + Math.imul(lap, 7919) + Math.imul(lap, lap)) >>> 0;
}

type Motif = 'shoot' | 'air' | 'arc' | 'pad' | 'big' | 'rest';

/** Weighted draw: shooting is the most common thing to do, then high bubbles; the rest are the occasional change. */
const MOTIFS: readonly Motif[] = ['shoot', 'shoot', 'shoot', 'shoot', 'air', 'air', 'arc', 'pad', 'big', 'rest'];

/** How long a power-up's reward stretch is (tiles): the car lasts about 43 tiles, the others about 10 s of walking. */
const SET_LEN = 34;

export interface ZenSegment {
  config: {
    version: 1;
    id: string;
    world: string;
    title: string;
    zen: true;
    controls: { enabled: Action[]; autoRun: false; tapAnywhereJumps: false; demo: false };
    tileSize: number;
    stars: { two: number; three: number };
    grid: string[];
  };
  /** What was placed, in order (for tests). */
  motifs: Array<Motif | `power-${PickupKind}`>;
}

class Cells {
  readonly map = new Map<string, string>();
  constructor(
    readonly rng: () => number,
    readonly lo: number,
    readonly hi: number,
  ) {}

  int(min: number, max: number): number {
    return min + Math.floor(this.rng() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.rng() < p;
  }

  /** Puts a character in an empty cell inside the content stretch; false if it does not fit. */
  put(col: number, row: number, ch: string): boolean {
    if (col < this.lo || col >= this.hi) return false;
    const key = `${row}:${col}`;
    if (this.map.has(key)) return false;
    this.map.set(key, ch);
    return true;
  }
}

/** A row of small bubbles 3-4 tiles apart (walk and shoot), coins in between, now and then a rainbow one. */
function shoot(c: Cells, from: number, len: number): number {
  const end = Math.min(from + len, c.hi);
  let col = from;
  let rainbow = c.chance(0.4);
  while (col < end - 1) {
    const row = c.chance(0.5) ? ROW.low : ROW.up;
    const ch = rainbow && col > from ? 'r' : 'o';
    if (ch === 'r') rainbow = false;
    c.put(col, row, ch);
    const next = col + c.int(3, 4);
    if (c.chance(0.7)) c.put(col + Math.floor((next - col) / 2), ROW.up, 'c');
    col = next;
  }
  return Math.max(end, col);
}

/** High bubbles (a shot from a jump reaches them) taking turns with small ones. */
function air(c: Cells, from: number, len: number): number {
  const end = Math.min(from + len, c.hi);
  let col = from + 1;
  let high = true;
  while (col < end - 1) {
    if (high) c.put(col, ROW.high, 'h');
    else c.put(col, c.chance(0.5) ? ROW.low : ROW.up, 'o');
    high = !high;
    col += c.int(3, 4);
  }
  return Math.max(end, col);
}

/** A little hill of coins to jump through (row 6 needs a jump; the ends are at walking height). */
function arc(c: Cells, from: number): number {
  const rows = [ROW.up, ROW.high, ROW.high, ROW.high, ROW.up];
  rows.forEach((row, i) => c.put(from + 1 + i, row, 'c'));
  return from + 8;
}

/** A bounce pad with a plus of coins high above it (as in Grass 7). */
function pad(c: Cells, from: number): number {
  const x = from + 3;
  c.put(x, 8, '^');
  c.put(x, 5, 'c');
  for (const d of [-1, 0, 1]) c.put(x + d, 4, 'c');
  c.put(x, 3, 'c');
  return from + 8;
}

/** A big bubble (three shots). */
function big(c: Cells, from: number): number {
  const x = from + 2;
  for (const [dc, row] of [[0, 7], [1, 7], [0, 8], [1, 8]] as const) c.put(x + dc, row, 'O');
  return from + 6;
}

/** Three coins to walk through. */
function rest(c: Cells, from: number): number {
  for (let i = 0; i < 3; i++) c.put(from + 1 + i, ROW.up, 'c');
  return from + 6;
}

const PICKUP_CHAR: Record<PickupKind, string> = { car: 'P', magnet: 'M', boots: 'J' };

/** A power-up orb at walking height, then the stretch that rewards it (no bubbles in it). */
function powerSet(c: Cells, from: number, kind: PickupKind): number {
  c.put(from + 1, 8, PICKUP_CHAR[kind]);
  const start = from + 5;
  const end = Math.min(start + SET_LEN, c.hi);
  if (kind === 'car') {
    // A head-height trail to drive along, with a few higher coins.
    for (let x = start; x < end; x += 2) c.put(x, ROW.up, 'c');
    for (let x = start + 7; x < end - 3; x += 9) c.put(x, ROW.high, 'c');
  } else if (kind === 'magnet') {
    // A field of coins at many heights: the magnet draws them in as he passes.
    const rows = [7, 5, 6, 4, 6, 5, 7];
    let i = 0;
    for (let x = start; x < end; x += 2) c.put(x, rows[i++ % rows.length], 'c');
  } else {
    // Low coins on the way and high ones only the boots reach (row 4, like Rocket Boots).
    for (let x = start; x < end; x += 2) c.put(x, ROW.up, 'c');
    for (let x = start + 1; x < end - 1; x += 4) c.put(x, 4, 'c');
  }
  return end;
}

/** A segment of the zen world. `first` makes content start closer to him (the very first one). */
export function generateZen(seed: number, world = 'grass', first = false): ZenSegment {
  const rng = makeRng(seed);
  const lo = first ? ZEN.firstContent : ZEN.free;
  const hi = ZEN_CONTENT_END;
  const c = new Cells(rng, lo, hi);
  const motifs: ZenSegment['motifs'] = [];

  const kinds: PickupKind[] = [];
  const nextKind = (): PickupKind => {
    if (kinds.length === 0) {
      kinds.push('car', 'magnet', 'boots');
      for (let i = kinds.length - 1; i > 0; i--) {
        const j = c.int(0, i);
        [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
      }
    }
    return kinds.pop()!;
  };

  let col: number = lo;
  // Power-ups come by position, not by luck: the first stretch is due 24-36 tiles in, the next 6-20 tiles after the last.
  let setDue = lo + c.int(24, 36);
  let last: Motif | null = null;
  // After a power-up stretch (no bubbles in it) or a coin-only motif, the next thing is always bubbles to shoot.
  let needBubbles = false;
  while (hi - col >= 12) {
    if (col >= setDue && hi - col >= SET_LEN + 8) {
      const kind = nextKind();
      motifs.push(`power-${kind}`);
      col = powerSet(c, col, kind) + c.int(2, 4);
      setDue = col + c.int(6, 20);
      needBubbles = true;
      continue;
    }
    let m: Motif;
    do m = needBubbles ? (c.chance(0.65) ? 'shoot' : 'air') : MOTIFS[c.int(0, MOTIFS.length - 1)];
    while (m === last && m !== 'shoot');
    last = m;
    needBubbles = m === 'arc' || m === 'pad' || m === 'rest';
    motifs.push(m);
    if (m === 'shoot') col = shoot(c, col, c.int(12, 18));
    else if (m === 'air') col = air(c, col, c.int(12, 16));
    else if (m === 'arc') col = arc(c, col);
    else if (m === 'pad') col = pad(c, col);
    else if (m === 'big') col = big(c, col);
    else col = rest(c, col);
    col += c.int(2, 3);
  }

  // Every segment has a rainbow bubble: turn one small bubble into one if the dice gave none.
  const cells = [...c.map.entries()];
  if (!cells.some(([, ch]) => ch === 'r')) {
    const smalls = cells.filter(([, ch]) => ch === 'o');
    if (smalls.length > 0) c.map.set(smalls[c.int(0, smalls.length - 1)][0], 'r');
  }

  const grid: string[] = [];
  for (let row = 0; row < ZEN.rows; row++) {
    let line = '';
    for (let x = 0; x < ZEN.cols; x++) {
      if (row >= ROW.ground) line += '#';
      else if (row === ROW.low && x === ZEN.startCol) line += 'S';
      else if (row === ROW.low && x === ZEN.cols - 1) line += 'F';
      else line += c.map.get(`${row}:${x}`) ?? '.';
    }
    grid.push(line);
  }
  return {
    config: {
      version: 1,
      id: `zen-${seed >>> 0}`,
      world,
      title: 'Zen',
      zen: true,
      controls: { enabled: ['left', 'right', 'jump', 'power'], autoRun: false, tapAnywhereJumps: false, demo: false },
      tileSize: ZEN.tile,
      // Never shown (no result screen) but the format needs them.
      stars: { two: 0, three: 0 },
      grid,
    },
    motifs,
  };
}

/** `?zen=1` (or any value but 0) opens the zen level at once; `?seed=<n>` fixes its first seed. */
export function zenFromSearch(search: string): { open: boolean; seed: number | null } {
  const p = new URLSearchParams(search);
  const raw = p.get('zen');
  const seedRaw = p.get('seed');
  const seedNum = seedRaw === null ? NaN : Number(seedRaw);
  const seed = Number.isInteger(seedNum) && seedNum >= 0 ? seedNum >>> 0 : null;
  return { open: raw !== null && raw !== '0', seed };
}
