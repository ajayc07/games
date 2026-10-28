// Zen free play (Task 020, D-063; seamless since Task 022, D-065): an endless, calm level with all four buttons and all
// three power-ups, step blocks, bounce pads and small gaps, no flag, no stars and no way to lose (a fall is a ride back
// on a little cloud). A segment is 320 tiles of generated content. When he walks past tile 294 on the right (or 26 on
// the left) the scene builds the next segment and moves everything back by 260 tiles. The 49 tiles around the swap
// (24 each way, more than fits on any screen) are copied from the old segment into the new one, so what he sees does not
// change at all, and the new content continues beyond that window. Pure and seeded: the same seed, lap and carried
// window always give the same segment. The scene does the swapping (LevelScene.rebaseZen).
import type { Action } from '../types';
import type { PickupKind } from './powerups';
import { makeRng, ROW } from './practice';

const COLS = 320;
/** Half the width of the window copied across a swap (tiles): wider than half of any screen. */
const WINDOW = 24;

export const ZEN = {
  cols: COLS,
  rows: 11,
  tile: 64,
  window: WINDOW,
  /** The first segment: he starts here, and its content starts a few tiles ahead. */
  startCol: 34,
  firstContent: 40,
  /** Crossing these columns swaps the segment: past `rightAt` he reappears at `rightArrival`, below `leftAt` at `leftAt` + shift. */
  rightAt: COLS - WINDOW - 2,
  rightArrival: 34,
  leftAt: 26,
} as const;

/** Columns everything moves at a swap (the same both ways and for every segment). */
export const ZEN_SHIFT = ZEN.rightAt - ZEN.rightArrival;

/**
 * Does he need a fresh segment? `x` is his world x in px. Returns the direction (+1 he walked out on the right) and the
 * shift (px) to add to everything's x, or null. The arrival is 8 tiles inside the trigger on both sides, so turning round
 * at once never swaps twice in a row.
 */
export function zenRebase(x: number, tile: number = ZEN.tile): { dir: 1 | -1; dx: number } | null {
  const col = x / tile;
  if (col >= ZEN.rightAt) return { dir: 1, dx: -ZEN_SHIFT * tile };
  if (col <= ZEN.leftAt) return { dir: -1, dx: ZEN_SHIFT * tile };
  return null;
}

/** The window copied at a swap: columns `from`..`from + 2 * window` of the old segment land at `to`.. of the new one. */
export function zenWindow(dir: 1 | -1): { from: number; to: number; width: number } {
  const width = 2 * WINDOW + 1;
  if (dir === 1) return { from: ZEN.rightAt - WINDOW, to: ZEN.rightArrival - WINDOW, width };
  return { from: ZEN.leftAt - WINDOW, to: ZEN.leftAt + ZEN_SHIFT - WINDOW, width };
}

/** The seed of a segment: lap 0 is the first one; each swap counts one lap up (right) or down (left). */
export function zenSegmentSeed(seed: number, lap: number): number {
  return (seed + Math.imul(lap, 7919) + Math.imul(lap, lap)) >>> 0;
}

type Motif = 'shoot' | 'air' | 'arc' | 'pad' | 'big' | 'rest' | 'steps' | 'gap';

/** Weighted draw: shooting is the most common thing to do, then high bubbles; the rest are the occasional change. */
const MOTIFS: readonly Motif[] = ['shoot', 'shoot', 'shoot', 'shoot', 'air', 'air', 'arc', 'pad', 'big', 'rest', 'steps', 'steps', 'steps', 'gap', 'gap', 'gap'];
/** Motifs with no bubbles in them: bubbles always come next. */
const QUIET: readonly Motif[] = ['arc', 'pad', 'rest', 'steps', 'gap'];

/** How long a power-up's reward stretch is (tiles): the car lasts about 43 tiles, the others about 10 s of walking. */
const SET_LEN = 34;
const BOOTS_SET_LEN = 46;
/** Tiles of ground at least between two gaps (as in Practice). */
const MIN_GROUND = 7;

export interface ZenOptions {
  /** The very first segment of a visit: he starts at `startCol` and the content starts a few tiles ahead. */
  first?: boolean;
  /** The window of the segment he is leaving (its current state, with collected things taken out) and the direction he left by. */
  carry?: { grid: readonly string[]; dir: 1 | -1 };
}

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
  /** The gaps in the ground (for tests). */
  gaps: Array<{ col: number; width: 1 | 2 }>;
  /** The generated range, [from, to) in tiles. */
  range: { from: number; to: number };
}

class Cells {
  readonly map = new Map<string, string>();
  readonly gaps: Array<{ col: number; width: 1 | 2 }> = [];
  /** Last column of the last gap, or `lo` when there is none (so the first gap comes at least MIN_GROUND tiles in). */
  lastGapEnd: number;
  constructor(
    readonly rng: () => number,
    readonly lo: number,
    readonly hi: number,
    /** Columns [from, to) kept empty (the first segment's start area). */
    readonly skip: { from: number; to: number } | null = null,
  ) {
    this.lastGapEnd = lo;
  }

  /** Would something `len` tiles long starting at `col` touch the kept-empty columns? */
  hitsSkip(col: number, len: number): boolean {
    return !!this.skip && col + len > this.skip.from && col < this.skip.to;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.rng() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.rng() < p;
  }

  /** Puts a character in an empty cell inside the generated range; false if it does not fit. */
  put(col: number, row: number, ch: string): boolean {
    if (col < this.lo || col >= this.hi) return false;
    if (this.skip && col >= this.skip.from && col < this.skip.to) return false;
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

/** Toy blocks to climb: one high, two high, one high again, with a coin on top of each (as the stairs in Grass 7). */
function steps(c: Cells, from: number): number {
  const x = from + 2;
  c.put(x, 8, 'B');
  c.put(x + 1, 8, 'B');
  c.put(x + 1, 7, 'B');
  c.put(x + 2, 8, 'B');
  c.put(x, 7, 'c');
  c.put(x + 1, 6, 'c');
  c.put(x + 2, 7, 'c');
  return from + 8;
}

/** A gap of 1 or 2 tiles with a coin arc over it, as in Practice; a plain `rest` if there is no room for the ground rule. */
function gap(c: Cells, from: number): number {
  const width: 1 | 2 = c.chance(0.5) ? 1 : 2;
  const g = Math.max(from + 4, c.lastGapEnd + 1 + MIN_GROUND);
  if (g + width + MIN_GROUND > c.hi) return rest(c, from);
  c.gaps.push({ col: g, width });
  c.put(g - 1, ROW.up, 'c');
  for (let i = 0; i < width; i++) c.put(g + i, ROW.high, 'c');
  c.put(width === 1 ? g + 3 : g + 2, ROW.up, 'c');
  c.lastGapEnd = g + width - 1;
  return g + width + 3;
}

const PICKUP_CHAR: Record<PickupKind, string> = { car: 'P', magnet: 'M', boots: 'J' };

/** A power-up orb at walking height, then the stretch that rewards it (no bubbles in it). */
function powerSet(c: Cells, from: number, kind: PickupKind): number {
  c.put(from + 1, 8, PICKUP_CHAR[kind]);
  const start = from + 5;
  // The boots stretch is longer: 12 s of flight is about 47 tiles.
  const end = Math.min(start + (kind === 'boots' ? BOOTS_SET_LEN : SET_LEN), c.hi);
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
    // A flight path (Task 028): the boots fly him forward for 12 s (about 47 tiles); a wave of coins from the ground to the sky.
    let i = 0;
    for (let x = start; x < end; x += 2) c.put(x, Math.max(1, Math.min(7, Math.round(4 + 3 * Math.sin(i++ / 2)))), 'c');
  }
  return end;
}

/** Keeps only whole 2x2 big bubbles (a window edge may have cut one in half). */
function fixBigBubbles(grid: string[][]): void {
  const keep = new Set<string>();
  for (let col = 0; col + 1 < grid[7].length; col++) {
    if (grid[7][col] === 'O' && grid[7][col + 1] === 'O' && grid[8][col] === 'O' && grid[8][col + 1] === 'O') {
      for (const [r, cc] of [[7, col], [7, col + 1], [8, col], [8, col + 1]]) keep.add(`${r}:${cc}`);
      col++;
    }
  }
  for (let r = 0; r < grid.length; r++) {
    for (let col = 0; col < grid[r].length; col++) if (grid[r][col] === 'O' && !keep.has(`${r}:${col}`)) grid[r][col] = '.';
  }
}

/** A segment of the zen world. */
export function generateZen(seed: number, world = 'grass', options: ZenOptions = {}): ZenSegment {
  const rng = makeRng(seed);
  const win = options.carry ? zenWindow(options.carry.dir) : null;
  // The generated range: everything except the carried window.
  let lo = 2;
  let hi = COLS - 2;
  if (win && options.carry) {
    if (options.carry.dir === 1) lo = win.to + win.width;
    else hi = win.to;
  }
  // The very first segment keeps the area around his start clear (he starts in the middle, content to both sides).
  const c = new Cells(rng, lo, hi, options.first ? { from: ZEN.startCol - 6, to: ZEN.firstContent } : null);
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
  // Power-ups come by position, not by luck: the first stretch is due 30-50 tiles in, the next 24-44 tiles after the last.
  let setDue = lo + c.int(30, 50);
  let last: Motif | null = null;
  // After a power-up stretch (no bubbles in it) or a quiet motif, the next thing is always bubbles to shoot.
  let needBubbles = false;
  while (hi - col >= 8) {
    if (col >= setDue && hi - col >= SET_LEN + 8 && !c.hitsSkip(col, SET_LEN + 8)) {
      const kind = nextKind();
      // The boots stretch is longer: if it will not fit here, the orb waits for the next segment.
      if (kind === 'boots' && (hi - col < BOOTS_SET_LEN + 8 || c.hitsSkip(col, BOOTS_SET_LEN + 8))) {
        kinds.push(kind);
        col = Math.min(col + 6, hi - 8);
        continue;
      }
      motifs.push(`power-${kind}`);
      col = powerSet(c, col, kind) + c.int(2, 4);
      setDue = col + c.int(24, 44);
      needBubbles = true;
      continue;
    }
    if (c.hitsSkip(col, 20)) {
      // Not enough room before the kept-empty start area: a short filler, or jump over it.
      if (col + 6 <= c.skip!.from) {
        rest(c, col);
        col += 8;
      } else col = c.skip!.to;
      continue;
    }
    let m: Motif;
    do m = needBubbles ? (c.chance(0.65) ? 'shoot' : 'air') : MOTIFS[c.int(0, MOTIFS.length - 1)];
    while (m === last && m !== 'shoot');
    last = m;
    needBubbles = QUIET.includes(m);
    motifs.push(m);
    if (m === 'shoot') col = shoot(c, col, c.int(12, 18));
    else if (m === 'air') col = air(c, col, c.int(12, 16));
    else if (m === 'arc') col = arc(c, col);
    else if (m === 'pad') col = pad(c, col);
    else if (m === 'big') col = big(c, col);
    else if (m === 'steps') col = steps(c, col);
    else if (m === 'gap') col = gap(c, col);
    else col = rest(c, col);
    col += c.int(2, 3);
  }

  // Every segment has a rainbow bubble: turn one small bubble into one if the dice gave none.
  const cells = [...c.map.entries()];
  if (!cells.some(([, ch]) => ch === 'r')) {
    const smalls = cells.filter(([, ch]) => ch === 'o');
    if (smalls.length > 0) c.map.set(smalls[c.int(0, smalls.length - 1)][0], 'r');
  }
  // No long empty stretch: a coin every 8 tiles through any gap in the content longer than 16 tiles.
  {
    const used = [...new Set([...c.map.keys()].map((k) => Number(k.split(':')[1])))].sort((a, b) => a - b);
    // The carried window's content counts too (it sits at hi..hi+width or just before lo).
    const carried: number[] = [];
    if (win && options.carry) {
      for (let i = 0; i < win.width; i++) {
        for (let row = 0; row < ROW.ground; row++) if (/[cohrOPMJ]/.test(options.carry.grid[row][win.from + i])) carried.push(win.to + i);
      }
    }
    // Content right at the edges of the range keeps the carried window from leaving a hole beside it.
    const inRange = used.filter((x) => x >= lo && x < hi);
    const lastIn = inRange.length ? inRange[inRange.length - 1] : lo - 1;
    const firstIn = inRange.length ? inRange[0] : hi;
    for (const x of [hi - 1, lo]) {
      const near = Math.abs(x - (x === hi - 1 ? lastIn : firstIn));
      if (near > 0 && !c.gaps.some((g) => x >= g.col - 1 && x <= g.col + g.width)) c.put(x, ROW.up, 'c');
    }
    const marks = [lo - 1, ...used, hi, ...carried.filter((x) => x < lo || x >= hi)].sort((a, b) => a - b);
    for (let i = 1; i < marks.length; i++) {
      for (let x = marks[i - 1] + 8; marks[i] - x >= 8 && marks[i] - marks[i - 1] > 16; x += 8) {
        if (!c.gaps.some((g) => x >= g.col - 1 && x <= g.col + g.width)) c.put(x, ROW.up, 'c');
      }
    }
  }
  // A jump from the edge of a 1-tile gap flies over the next two columns at head height: no walking coin there (Practice).
  for (const g of c.gaps) if (g.width === 1) for (const dc of [1, 2]) if (c.map.get(`${ROW.up}:${g.col + dc}`) === 'c') c.map.delete(`${ROW.up}:${g.col + dc}`);

  const grid: string[][] = [];
  for (let row = 0; row < ZEN.rows; row++) {
    const line: string[] = [];
    for (let x = 0; x < COLS; x++) {
      if (row >= ROW.ground) line.push(c.gaps.some((g) => x >= g.col && x < g.col + g.width) ? '.' : '#');
      else line.push(c.map.get(`${row}:${x}`) ?? '.');
    }
    grid.push(line);
  }
  // The carried window: copied as it is (ground and all), without the old start and flag.
  if (win && options.carry) {
    for (let row = 0; row < ZEN.rows; row++) {
      for (let i = 0; i < win.width; i++) {
        const ch = options.carry.grid[row][win.from + i];
        grid[row][win.to + i] = ch === 'S' || ch === 'F' ? '.' : ch;
      }
    }
  }
  fixBigBubbles(grid);
  // The start matters only for the first segment; later ones keep a harmless one in the empty far corner.
  grid[ROW.low][options.first ? ZEN.startCol : 0] = 'S';
  grid[ROW.low][COLS - 1] = 'F';

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
      grid: grid.map((r) => r.join('')),
    },
    motifs,
    gaps: c.gaps,
    range: { from: lo, to: hi },
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
