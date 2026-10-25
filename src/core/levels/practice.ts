// Combo Practice levels (Task 011, D-049): a pure, seeded generator that builds a normal level config (the usual
// grid legend, all four buttons, walking) for one of four focuses. Same seed = same level; Replay uses a new seed, so
// a repeat is never the same layout (D-044). The rules come from D-045 and Grass 4-6: gaps of 1 or 2 tiles only, at
// least 7 tiles of ground between gaps and between a gap and the start or the flag, no bubble inside a gap or within
// 1 tile of its edge (high bubbles 2 tiles), small bubbles in the two rows a standing shot reaches, high bubbles in the
// row only a shot from a jump reaches, no big bubbles. Universe-agnostic: the universe passes the world and theme.
import type { Action } from '../types';

export const PRACTICE_MODES = ['walk-shoot', 'jump-shoot', 'walk-jump', 'everything'] as const;
export type PracticeMode = (typeof PRACTICE_MODES)[number];

export const isPracticeMode = (v: unknown): v is PracticeMode => typeof v === 'string' && (PRACTICE_MODES as readonly string[]).includes(v);

export const PRACTICE = {
  /** Grid rows, as in Grass 6: the player stands in row 8 on two rows of ground. */
  rows: 11,
  startCol: 6,
  /** The level is about this long (tiles); chunks stop about 10 tiles before it, then the flag follows. */
  targetLength: 120,
  /** Chunk length range (tiles). */
  chunk: { min: 12, max: 20 },
  /** Tiles of ground at least between two gaps, and between a gap and the start or the flag (D-045). */
  minGround: 7,
  /** Small bubbles stay this many columns away from any gap column (so never within 1 tile of its edge). */
  smallClear: 2,
  /** High bubbles stay this many columns away from a gap edge (Grass 6), so the player can stand under them and jump. */
  highClear: 3,
  /** Ground after the flag. */
  tail: 4,
  tileSize: 64,
} as const;

/** Grid rows used by the generator (top row 0). */
export const ROW = { high: 6, up: 7, low: 8, ground: 9 } as const;

/** Which actions count as a combo in each focus (ComboTracker) and which button the coach's tapping finger shows. */
export const PRACTICE_ACTIONS: readonly Action[] = ['left', 'right', 'jump', 'power'];

/** A small, fast seeded random number generator (mulberry32): numbers in [0, 1). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh seed for a new run (Replay). Any 32-bit number works. */
export function newSeed(): number {
  return (Math.floor(Math.random() * 0x7fffffff) ^ (Date.now() & 0x7fffffff)) >>> 0;
}

type ChunkKind = 'shoot' | 'air' | 'gaps';

export interface PracticeGap {
  col: number;
  width: 1 | 2;
}

/** The raw level config (passes parseLevel) plus what the generator knows about it (for tests and the coach). */
export interface PracticeLevel {
  config: {
    version: 1;
    id: string;
    world: string;
    title: string;
    practice: true;
    controls: { enabled: Action[]; autoRun: false; tapAnywhereJumps: false; demo: false };
    tileSize: number;
    stars: { two: number; three: number };
    grid: string[];
  };
  gaps: PracticeGap[];
  /** The chunk kinds in order (for tests). */
  chunks: ChunkKind[];
}

class Builder {
  readonly cells = new Map<string, string>();
  readonly gaps: PracticeGap[] = [];
  cursor: number;
  /** Last gap column, or the start column (the first gap keeps 7 tiles from the start too). */
  lastGapEnd: number;
  /** The next gap may start at this column at the earliest (keeps bubbles clear of gaps). */
  gapFloor = 0;
  /** The flag must come after this column (all content is before it). */
  contentEnd = 0;

  constructor(readonly rng: () => number) {
    this.cursor = PRACTICE.startCol + 3;
    this.lastGapEnd = PRACTICE.startCol;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.rng() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.rng() < p;
  }

  private key(col: number, row: number): string {
    return `${row}:${col}`;
  }

  free(col: number, row: number): boolean {
    return !this.cells.has(this.key(col, row));
  }

  /** Puts a grid character in an empty cell; false (nothing changes) if the cell is taken. */
  put(col: number, row: number, ch: string): boolean {
    if (!this.free(col, row)) return false;
    this.cells.set(this.key(col, row), ch);
    this.contentEnd = Math.max(this.contentEnd, col);
    return true;
  }

  /** Earliest column a bubble of this kind may sit in after the last gap. */
  bubbleMin(kind: 'small' | 'high'): number {
    return this.lastGapEnd + (kind === 'high' ? PRACTICE.highClear : PRACTICE.smallClear);
  }

  bubble(col: number, row: number, kind: 'small' | 'high'): boolean {
    if (col < this.bubbleMin(kind)) return false;
    if (!this.put(col, row, kind === 'high' ? 'h' : 'o')) return false;
    this.gapFloor = Math.max(this.gapFloor, col + (kind === 'high' ? PRACTICE.highClear : PRACTICE.smallClear));
    return true;
  }

  coin(col: number, row: number): boolean {
    // A jump from the edge of a 1-tile gap flies over the next two columns at head height (Grass 5): no coin there.
    if (row === ROW.up && this.gaps.some((g) => g.width === 1 && col > g.col && col <= g.col + 2)) return false;
    return this.put(col, row, 'c');
  }

  /** Earliest column for a gap with `ground` tiles of ground after the previous one. */
  gapStart(ground: number = PRACTICE.minGround): number {
    return Math.max(this.cursor, this.lastGapEnd + 1 + ground, this.gapFloor);
  }

  /** A gap at column `g` with its coin arc (a coin before it, one over each gap column, one where the jump lands). */
  gap(g: number, width: 1 | 2): void {
    this.gaps.push({ col: g, width });
    this.coin(g - 1, ROW.up);
    for (let i = 0; i < width; i++) this.coin(g + i, ROW.high);
    this.coin(width === 1 ? g + 3 : g + 2, ROW.up);
    this.lastGapEnd = g + width - 1;
    this.contentEnd = Math.max(this.contentEnd, g + width);
    this.cursor = this.lastGapEnd + 3;
  }
}

/** Walk + shoot: a long row of small bubbles 3-4 tiles apart (walk and tap Power), coins between them. */
function shootChunk(b: Builder, length: number): void {
  const end = b.cursor + length;
  let col = Math.max(b.cursor + b.int(0, 1), b.bubbleMin('small'));
  while (col < end - 1) {
    const row = b.chance(0.5) ? ROW.low : ROW.up;
    b.bubble(col, row, 'small');
    const next = col + b.int(3, 4);
    if (b.chance(0.7)) b.coin(col + Math.floor((next - col) / 2), ROW.up);
    col = next;
  }
  b.cursor = Math.max(b.cursor, end);
}

/**
 * Jump + shoot: high bubbles (only a shot from a jump reaches them) over safe ground, taking turns with small ones,
 * and sometimes a 1-tile gap with a small bubble just ahead of where the jump lands.
 */
function airChunk(b: Builder, length: number): void {
  const end = b.cursor + length;
  const withGap = length >= 14 && b.chance(0.75);
  const gapAt = withGap ? b.cursor + Math.floor(length / 2) - 1 : Infinity;
  let col = Math.max(b.cursor + 1, b.bubbleMin('high'));
  let high = true;
  let gapDone = !withGap;
  while (col < end - 1) {
    if (!gapDone && col + 3 >= gapAt) {
      const g = b.gapStart();
      b.gap(g, 1);
      gapDone = true;
      // A small bubble just ahead of the landing (the jump lands about 3 columns after the gap starts).
      const land = g + 4;
      b.bubble(land, ROW.up, 'small');
      col = Math.max(land + 3, b.bubbleMin('high'));
      high = true;
      continue;
    }
    if (high) b.bubble(col, ROW.high, 'high');
    else b.bubble(col, b.chance(0.5) ? ROW.low : ROW.up, 'small');
    high = !high;
    col += b.int(3, 4);
  }
  b.cursor = Math.max(b.cursor, end);
}

/** Walk + jump: gaps of 1 and 2 tiles, 7-8 tiles of ground apart, each with a coin arc; a walking coin between. */
function gapsChunk(b: Builder, length: number): void {
  const end = b.cursor + length;
  let placed = 0;
  for (;;) {
    const width: 1 | 2 = b.chance(0.5) ? 1 : 2;
    const g = b.gapStart(PRACTICE.minGround + b.int(0, 1));
    if (placed > 0 && g + width > end) break;
    // A walking coin in the middle of the ground before the gap.
    const mid = Math.floor((b.lastGapEnd + g) / 2);
    if (mid > b.cursor && b.chance(0.6)) b.coin(mid, ROW.up);
    b.gap(g, width);
    placed++;
  }
  b.cursor = Math.max(b.cursor, end);
}

const CHUNK_FOR: Record<Exclude<PracticeMode, 'everything'>, ChunkKind> = {
  'walk-shoot': 'shoot',
  'jump-shoot': 'air',
  'walk-jump': 'gaps',
};

/** Shuffled bags of the three chunk kinds, so `everything` always mixes all three. */
function chunkKinds(mode: PracticeMode, b: Builder): () => ChunkKind {
  if (mode !== 'everything') return () => CHUNK_FOR[mode];
  let bag: ChunkKind[] = [];
  return () => {
    if (bag.length === 0) {
      bag = ['shoot', 'air', 'gaps'];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = b.int(0, i);
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop()!;
  };
}

/** Builds the level for a focus and a seed. Pure: the same inputs always give the same level. */
export function generatePractice(mode: PracticeMode, seed: number, world = 'grass'): PracticeLevel {
  const b = new Builder(makeRng(seed));
  const S = PRACTICE.startCol;
  // Behind the start: a pair of bubbles in the upper row (clear of the buttons) to reward turning round,
  // or, without shooting as the focus, three coins.
  if (mode === 'walk-jump') for (const c of [2, 3, 4]) b.coin(c, ROW.up);
  else for (const c of [2, 4]) b.put(c, ROW.up, 'o');
  b.contentEnd = 0;

  const next = chunkKinds(mode, b);
  const kinds: ChunkKind[] = [];
  const stopAt = PRACTICE.targetLength - 10;
  while (stopAt - b.cursor >= PRACTICE.chunk.min) {
    const length = Math.min(b.int(PRACTICE.chunk.min, PRACTICE.chunk.max), stopAt - b.cursor);
    const kind = next();
    kinds.push(kind);
    if (kind === 'shoot') shootChunk(b, length);
    else if (kind === 'air') airChunk(b, length);
    else gapsChunk(b, length);
    b.cursor += b.int(1, 2); // a little safe ground between chunks
  }

  const flag = Math.max(b.cursor + 1, b.lastGapEnd + PRACTICE.minGround + 1, b.contentEnd + 2, PRACTICE.targetLength - 8);
  const cols = flag + PRACTICE.tail + 1;
  const grid: string[] = [];
  for (let row = 0; row < PRACTICE.rows; row++) {
    let line = '';
    for (let col = 0; col < cols; col++) {
      if (row >= ROW.ground) line += b.gaps.some((g) => col >= g.col && col < g.col + g.width) ? '.' : '#';
      else if (row === ROW.low && col === S) line += 'S';
      else if (row === ROW.low && col === flag) line += 'F';
      else line += b.cells.get(`${row}:${col}`) ?? '.';
    }
    grid.push(line);
  }
  const coins = grid.join('').split('').reduce((n, ch) => n + (ch === 'c' ? 1 : ch === 'o' ? 3 : ch === 'h' ? 4 : 0), 0);
  return {
    config: {
      version: 1,
      id: `practice-${mode}-${seed >>> 0}`,
      world,
      title: 'Practice',
      practice: true,
      controls: { enabled: ['left', 'right', 'jump', 'power'], autoRun: false, tapAnywhereJumps: false, demo: false },
      tileSize: PRACTICE.tileSize,
      // Not shown (the win screen shows the combo stars) but the format needs them.
      stars: { two: Math.floor(coins * 0.5), three: Math.floor(coins * 0.8) },
      grid,
    },
    gaps: b.gaps,
    chunks: kinds,
  };
}

/**
 * `?practice=<mode>` starts a run of that focus at once (testing); `?practice=1` (or any other value) opens the selector;
 * absent = null. `?seed=<n>` fixes the first run's seed.
 */
export function practiceFromSearch(search: string): { open: boolean; mode: PracticeMode | null; seed: number | null; warning?: string } {
  const p = new URLSearchParams(search);
  const raw = p.get('practice');
  const seedRaw = p.get('seed');
  const seedNum = seedRaw === null ? NaN : Number(seedRaw);
  const seed = Number.isInteger(seedNum) && seedNum >= 0 ? seedNum >>> 0 : null;
  if (raw === null || raw === '0') return { open: false, mode: null, seed };
  const v = raw.toLowerCase();
  if (isPracticeMode(v)) return { open: true, mode: v, seed };
  const known = v === '1' || v === '' || v === 'select';
  return {
    open: true,
    mode: null,
    seed,
    warning: known ? undefined : `?practice=${raw} is not a practice mode (use ${PRACTICE_MODES.join(', ')}); opening the selector`,
  };
}
