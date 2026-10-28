// Replay variety (Task 012, D-053): a replay of a cleared level shuffles where its loose coins and small bubbles sit and
// may turn one small bubble into a rainbow one. Pure, seeded and tested. The gaps, start, flag, big and high bubbles,
// coin arcs over gaps and the counts never change, so a level teaches the same thing every time.
import type { LevelData } from './format';
import { isScriptDemo } from './format';
import { makeRng, newSeed } from './practice';

export const VARIETY = {
  /** A coin whose column is this close to a gap column belongs to a coin arc over the gap and never moves. */
  arcReach: 2,
  /** Coin clusters within this many columns of a demo jump column stay put (tile demos only: Grass 1-2). */
  demoReach: 3,
  /** A moved item keeps this many columns from the nearest gap column, the start and the flag (2 tiles in between). */
  clear: 3,
  /** Fallback for the distance to the start and the flag when an item has no other place at `clear` (a tight level): 1 tile in between. */
  tightClear: 2,
  /** Chance of a rainbow bubble in a varied run, and how many small bubbles a level needs for one. */
  rainbowChance: 1 / 3,
  rainbowMinBubbles: 4,
} as const;

type Cell = { row: number; col: number };

const isBubbleChar = (ch: string) => ch === 'o' || ch === 'O' || ch === 'h' || ch === 'r';

/** The varied level. Same level + same seed = same grid. Levels that opt out (and practice levels) come back unchanged. */
export function varyLevel(level: LevelData, seed: number): LevelData {
  if (level.variety === false || level.practice) return level;
  const rng = makeRng(seed);
  const g = new Grid(level.grid);

  const demoCols = level.controls.demo && !isScriptDemo(level.controls.demo) ? level.controls.demo.jumpsAtTiles : [];
  const gapCols = g.gapColumns();
  const ends = [g.start.col, g.flag.col];

  // What moves: coin clusters (rigid, so arcs keep their shape) and small bubbles, in a seeded random order.
  type Unit = { cells: Cell[]; ch: string };
  const units: Unit[] = [];
  for (const cells of g.coinClusters()) {
    const cols = cells.map((c) => c.col);
    const nearGap = cols.some((c) => gapCols.some((gc) => Math.abs(c - gc) <= VARIETY.arcReach));
    const nearDemo = cols.some((c) => demoCols.some((d) => Math.abs(c - d) <= VARIETY.demoReach));
    if (!nearGap && !nearDemo) units.push({ cells, ch: 'c' });
  }
  for (const cell of g.find('o')) units.push({ cells: [cell], ch: 'o' });
  shuffle(units, rng);

  for (const u of units) {
    g.clear(u.cells);
    const pick = (clear: number) => {
      const options: number[] = [];
      const lo = Math.min(...u.cells.map((c) => c.col));
      const hi = Math.max(...u.cells.map((c) => c.col));
      const [first, last] = bounds(gapCols, ends, clear, lo, hi, g.width);
      for (let dx = first - lo; hi + dx <= last; dx++) {
        const moved = u.cells.map((c) => ({ row: c.row, col: c.col + dx }));
        if (u.ch === 'c' ? g.coinFits(moved) : g.bubbleFits(moved[0])) options.push(dx);
      }
      return options;
    };
    let options = pick(VARIETY.clear);
    if (options.length <= 1) options = pick(VARIETY.tightClear);
    if (options.length === 0) options = [0];
    const dx = options[Math.floor(rng() * options.length)];
    g.put(
      u.cells.map((c) => ({ row: c.row, col: c.col + dx })),
      u.ch,
    );
  }

  const rainbow = rainbowPick(g.find('o').length, seed);
  if (rainbow !== null) {
    const cell = g.find('o')[rainbow];
    g.put([cell], 'r');
  }
  return { ...level, grid: g.rows() };
}

/**
 * Whether a varied run of a level with `smallBubbles` small bubbles gets a rainbow one (1 in 3, only with at least 4
 * small bubbles) and which one (an index into the small bubbles in grid order), or null. From the seed alone.
 */
export function rainbowPick(smallBubbles: number, seed: number): number | null {
  if (smallBubbles < VARIETY.rainbowMinBubbles) return null;
  const rng = makeRng((seed ^ 0x9e3779b9) >>> 0);
  rng(); // the first number of a seeded stream is weakly mixed
  if (rng() >= VARIETY.rainbowChance) return null;
  return Math.floor(rng() * smallBubbles);
}

function shuffle<T>(a: T[], rng: () => number): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

/**
 * The first and last column the item (spanning `lo`..`hi`) may occupy: this far from the nearest gap column on each side
 * (always `VARIETY.clear`, so a moved coin is never in the arc zone of a gap), and `endClear` from the start and the flag
 * (which also keeps it on the same side of them), or the level edges.
 */
function bounds(gaps: readonly number[], ends: readonly number[], endClear: number, lo: number, hi: number, width: number): [number, number] {
  let first = 0;
  let last = width - 1;
  for (const [stops, clear] of [[gaps, VARIETY.clear], [ends, endClear]] as const) {
    for (const s of stops) {
      if (s < lo) first = Math.max(first, s + clear);
      else if (s > hi) last = Math.min(last, s - clear);
    }
  }
  return [first, last];
}

/** A mutable character grid with the checks the variation needs. */
class Grid {
  private readonly cells: string[][];
  readonly width: number;
  readonly start: Cell;
  readonly flag: Cell;

  constructor(rows: readonly string[]) {
    this.cells = rows.map((r) => [...r]);
    this.width = rows[0].length;
    this.start = this.find('S')[0];
    this.flag = this.find('F')[0];
  }

  rows(): string[] {
    return this.cells.map((r) => r.join(''));
  }

  find(ch: string): Cell[] {
    const out: Cell[] = [];
    this.cells.forEach((r, row) => r.forEach((c, col) => c === ch && out.push({ row, col })));
    return out;
  }

  /** Columns with no ground in the bottom row. */
  gapColumns(): number[] {
    const bottom = this.cells[this.cells.length - 1];
    return bottom.flatMap((ch, col) => (ch === '#' ? [] : [col]));
  }

  /** Coins joined side to side or diagonally (an arc or a row of coins moves as one). */
  coinClusters(): Cell[][] {
    const seen = new Set<string>();
    const out: Cell[][] = [];
    for (const start of this.find('c')) {
      if (seen.has(key(start))) continue;
      const cluster: Cell[] = [];
      const stack = [start];
      seen.add(key(start));
      while (stack.length > 0) {
        const cur = stack.pop()!;
        cluster.push(cur);
        for (const n of this.around(cur)) {
          if (this.at(n) === 'c' && !seen.has(key(n))) {
            seen.add(key(n));
            stack.push(n);
          }
        }
      }
      out.push(cluster);
    }
    return out;
  }

  clear(cells: readonly Cell[]): void {
    for (const c of cells) this.cells[c.row][c.col] = '.';
  }

  put(cells: readonly Cell[], ch: string): void {
    for (const c of cells) this.cells[c.row][c.col] = ch;
  }

  /** Every cell empty, and no cell touching a bubble or another coin (even diagonally). */
  coinFits(cells: readonly Cell[]): boolean {
    return cells.every((c) => this.at(c) === '.' && this.around(c).every((n) => this.at(n) !== 'c' && !isBubbleChar(this.at(n))));
  }

  /** The cell is empty and no other bubble is within 1 tile (a whole empty cell between them, in every direction). */
  bubbleFits(c: Cell): boolean {
    if (this.at(c) !== '.') return false;
    return this.around(c).every((n) => !isBubbleChar(this.at(n)));
  }

  private at(c: Cell): string {
    return this.cells[c.row]?.[c.col] ?? '#';
  }

  private around(c: Cell): Cell[] {
    const out: Cell[] = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) out.push({ row: c.row + dr, col: c.col + dc });
    return out;
  }
}

const key = (c: Cell) => `${c.row}:${c.col}`;

/** `?variety=1` forces a varied grid, `?variety=0` the canonical one; otherwise 'auto' (varied only after a first clear). */
export function varietyModeFrom(search: string): 'auto' | 'on' | 'off' {
  const v = new URLSearchParams(search).get('variety');
  return v === '1' ? 'on' : v === '0' ? 'off' : 'auto';
}

/**
 * Should this play use a varied grid? Never when the "watch me" demo is about to play (it always runs on the canonical
 * grid, D-024) or when the URL says `?variety=0`; always with `?variety=1`; otherwise only when the level was cleared before
 * (or this is a Replay from the win screen).
 */
export function useVariety(opts: { mode: 'auto' | 'on' | 'off'; cleared: boolean; demoPlays: boolean }): boolean {
  if (opts.demoPlays || opts.mode === 'off') return false;
  return opts.mode === 'on' || opts.cleared;
}

/** The seed for a varied run: `?seed=<n>` (tests) or a fresh one. Kept in memory only. */
export function varietySeedFrom(search: string): number {
  const raw = new URLSearchParams(search).get('seed');
  const n = raw === null ? NaN : Number(raw);
  return Number.isInteger(n) && n >= 0 ? n >>> 0 : newSeed();
}
