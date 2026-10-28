import { describe, expect, it } from 'vitest';
import { logicalWidthFor } from '../ui/layoutMath';
import { parseLevel, parseLevelOrThrow } from './format';
import { extractEntities } from './grid';
import { generateZen, zenFromSearch, zenRebase, zenSegmentSeed, zenWindow, ZEN, ZEN_SHIFT } from './zen';
import { runBot } from './testBot';

const SEEDS = Array.from({ length: 120 }, (_, i) => i * 7919 + 3);
const cell = (grid: string[], row: number, col: number) => grid[row][col];

function find(grid: string[], chars: string): Array<{ row: number; col: number; ch: string }> {
  const out: Array<{ row: number; col: number; ch: string }> = [];
  grid.forEach((line, row) => [...line].forEach((ch, col) => chars.includes(ch) && out.push({ row, col, ch })));
  return out;
}

/** A few swaps in a row: right, right, left, left, left, right (like walking about). */
function chain(seed: number): string[][] {
  const out: string[][] = [];
  let grid = generateZen(seed, 'grass', { first: true }).config.grid;
  out.push(grid);
  let lap = 0;
  for (const dir of [1, 1, -1, -1, -1, 1] as const) {
    lap += dir;
    grid = generateZen(zenSegmentSeed(seed, lap), 'grass', { carry: { grid, dir } }).config.grid;
    out.push(grid);
  }
  return out;
}

/** Lengths of the runs of ground between gaps (row 9), ignoring the two open ends. */
function groundRuns(grid: string[]): number[] {
  const runs = grid[9].split('.').map((r) => r.length);
  return runs.slice(1, -1).filter((n) => n > 0);
}

describe('zen free play (Task 020, D-063; Task 022, D-065): the segment generator', () => {
  it('builds a valid level: 11 rows of 320 tiles, all four buttons, no demo, one S, one F far off, no saved stars', () => {
    for (const first of [true, false]) {
      const seg = generateZen(12345, 'grass', { first });
      expect(parseLevel(seg.config, 'zen').ok).toBe(true);
      const level = parseLevelOrThrow(seg.config, 'zen');
      expect(level.zen).toBe(true);
      expect(level.controls.enabled).toEqual(['left', 'right', 'jump', 'power']);
      expect(level.controls.demo).toBe(false);
      expect(level.grid.length).toBe(ZEN.rows);
      expect(level.grid.every((r) => r.length === ZEN.cols)).toBe(true);
      const e = extractEntities(level.grid);
      expect(e.start).toEqual({ col: first ? ZEN.startCol : 0, row: 8 });
      expect(e.goal).toEqual({ col: ZEN.cols - 1, row: 8 });
      // Ground in rows 9-10 (apart from small gaps), nothing else solid except toy blocks.
      expect(e.solid[10].filter((s) => !s).length).toBeLessThanOrEqual(seg.gaps.reduce((n, g) => n + g.width, 0) * 1);
      expect(e.solid.slice(0, 7).every((r) => r.every((s) => !s))).toBe(true);
    }
  });

  it('other levels are not zen', () => {
    expect(parseLevel({ ...generateZen(1).config, zen: undefined }, 'x').ok).toBe(true);
    expect(parseLevelOrThrow({ ...generateZen(1).config, zen: undefined }, 'x').zen).toBeUndefined();
    expect(parseLevel({ ...generateZen(1).config, zen: 'yes' }, 'x').ok).toBe(false);
  });

  it('is deterministic: the same seed gives the same segment, other seeds and laps differ', () => {
    expect(generateZen(99).config.grid).toEqual(generateZen(99).config.grid);
    expect(generateZen(99).config.grid).not.toEqual(generateZen(100).config.grid);
    expect(zenSegmentSeed(77, 0)).toBe(77);
    expect(new Set([-2, -1, 0, 1, 2, 3].map((n) => zenSegmentSeed(77, n))).size).toBe(6);
  });

  it('every segment has a rainbow bubble, power-up orbs of every kind, and plenty to do', () => {
    const kinds = new Set<string>();
    for (const seed of SEEDS) {
      for (const first of [false, true]) {
        const seg = generateZen(seed, 'grass', { first });
        const e = extractEntities(seg.config.grid);
        expect(e.bubbles.filter((b) => b.kind === 'rainbow').length, `seed ${seed}`).toBeGreaterThanOrEqual(1);
        expect(e.pickups.length, `seed ${seed} first=${first}`).toBeGreaterThanOrEqual(3);
        const cols = e.pickups.map((p) => p.col).sort((a, b) => a - b);
        for (let i = 1; i < cols.length; i++) expect(cols[i] - cols[i - 1], `seed ${seed}: orbs ${cols}`).toBeGreaterThanOrEqual(36);
        for (const p of e.pickups) {
          kinds.add(p.kind);
          expect(p.row).toBe(8);
        }
        expect(e.coins.length, `seed ${seed}`).toBeGreaterThanOrEqual(70);
        expect(e.bubbles.length, `seed ${seed}`).toBeGreaterThanOrEqual(12);
      }
    }
    expect([...kinds].sort()).toEqual(['boots', 'car', 'magnet']);
  });

  it('never leaves the screen empty: something to do in every 24 tiles, in every segment of a walk back and forth', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const grids = chain(seed);
      // The first segment's left end is the world's start; skip its first 2 tiles. Others: everywhere but the very ends.
      grids.forEach((grid, i) => {
        const has = new Set(find(grid.slice(0, 9), 'cohrOPMJ').map((x) => x.col));
        for (let from = 4; from + 24 <= ZEN.cols - 4; from++) {
          let any = false;
          for (let c = from; c < from + 24 && !any; c++) any = has.has(c);
          expect(any, `seed ${seed} segment ${i}: nothing in ${from}..${from + 24}`).toBe(true);
        }
      });
    }
  });

  it('the first segment has something to do close to the start, and no orb at his feet', () => {
    for (const seed of SEEDS) {
      const e = extractEntities(generateZen(seed, 'grass', { first: true }).config.grid);
      const ahead = [...e.bubbles.map((b) => b.col), ...e.coins.map((c) => c.col), ...e.pickups.map((p) => p.col)].filter((c) => c > ZEN.startCol);
      expect(Math.min(...ahead) - ZEN.startCol, `seed ${seed}`).toBeLessThanOrEqual(12);
      for (const p of e.pickups) expect(Math.abs(p.col - ZEN.startCol), `seed ${seed}`).toBeGreaterThan(6);
    }
  });

  it('keeps every coin reachable: high rows only above a pad, a block, in a magnet field or the boots stretch', () => {
    for (const seed of SEEDS) {
      const { grid } = generateZen(seed).config;
      const orbs = find(grid, 'PMJ');
      const pads = find(grid, '^');
      for (const { row, col } of find(grid, 'c')) {
        expect(row, `seed ${seed}`).toBeGreaterThanOrEqual(1);
        if (row >= 6) continue;
        const abovePad = pads.some((p) => Math.abs(p.col - col) <= 1);
        const inSet = (kind: string, minRow: number, maxRow = 9) => orbs.some((o) => o.ch === kind && col >= o.col + 4 && col <= o.col + 4 + 46 && row >= minRow && row <= maxRow);
        // Boots: a wave of coins from the ground to the sky, which only flying reaches (Task 028).
        const ok = abovePad || inSet('M', 4) || inSet('J', 1);
        expect(ok, `seed ${seed}: coin at ${col}:${row}`).toBe(true);
      }
    }
  });

  it('puts bubbles where a shot can reach them and keeps pads and orbs clear of them', () => {
    for (const seed of SEEDS) {
      const { grid } = generateZen(seed).config;
      for (const { row, ch } of find(grid, 'ohr')) {
        if (ch === 'h') expect(row).toBe(6);
        else expect([7, 8]).toContain(row);
      }
      for (const { row } of find(grid, 'O')) expect([7, 8]).toContain(row);
      const bubbles = find(grid, 'ohrO');
      for (const spot of find(grid, '^PMJ')) {
        for (const b of bubbles) expect(Math.abs(b.col - spot.col), `seed ${seed}: ${spot.ch} at ${spot.col} near bubble at ${b.col}`).toBeGreaterThanOrEqual(3);
        expect(cell(grid, spot.row, spot.col)).toBe(spot.ch);
        expect(spot.row).toBe(8);
      }
    }
  });

  it('has toy-block stairs and small gaps, built like the hand-made levels', () => {
    let steps = 0;
    let gaps = 0;
    for (const seed of SEEDS) {
      const seg = generateZen(seed);
      const { grid } = seg.config;
      gaps += seg.gaps.length;
      for (const g of seg.gaps) {
        expect([1, 2]).toContain(g.width);
        for (let i = 0; i < g.width; i++) {
          expect(grid[9][g.col + i]).toBe('.');
          expect(grid[10][g.col + i]).toBe('.');
        }
      }
      for (const r of groundRuns(grid)) expect(r, `seed ${seed}`).toBeGreaterThanOrEqual(7);
      // Blocks: a stair of heights 1-2-1 on the ground, nothing floating.
      for (const b of find(grid, 'B')) {
        expect(b.row === 8 || (b.row === 7 && grid[8][b.col] === 'B'), `seed ${seed}: floating block at ${b.col}:${b.row}`).toBe(true);
        expect(grid[9][b.col]).toBe('#');
      }
      steps += find(grid, 'B').filter((b) => b.row === 7).length;
    }
    expect(steps).toBeGreaterThan(60);
    expect(gaps).toBeGreaterThan(90);
  });

  it('a scripted bot walking a segment pops every bubble without falling (pads, orbs, blocks and gaps left out)', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      // The bot starts at the start tile and walks right: ground filled in, blocks and pads gone, content to its left gone.
      const stripped = generateZen(seed, 'grass', { first: true }).config.grid.map((r, row) =>
        row >= 9 ? r.replace(/\./g, '#') : '.'.repeat(ZEN.startCol) + r.slice(ZEN.startCol).replace(/[\^PMJB]/g, '.'),
      );
      const r = runBot(extractEntities(stripped), { jumpForCoins: true });
      expect(r.fell, `seed ${seed}`).toBe(false);
      expect(r.bubblesLeft, `seed ${seed}: bubbles left at ${r.bubblesLeftAt.join(',')}`).toBe(0);
    }
  });
});

describe('zen free play: swapping the segment (the endless part)', () => {
  const T = ZEN.tile;

  it('swaps only past the two triggers, and the arrival is inside both, so it never swaps twice in a row', () => {
    expect(zenRebase(ZEN.startCol * T)).toBeNull();
    expect(zenRebase((ZEN.rightAt - 0.01) * T)).toBeNull();
    expect(zenRebase((ZEN.leftAt + 0.01) * T)).toBeNull();
    const right = zenRebase((ZEN.rightAt + 0.25) * T)!;
    expect(right.dir).toBe(1);
    const arrivalRight = (ZEN.rightAt + 0.25) * T + right.dx;
    expect(arrivalRight / T).toBeCloseTo(ZEN.rightArrival + 0.25);
    expect(zenRebase(arrivalRight)).toBeNull();
    const left = zenRebase((ZEN.leftAt - 0.25) * T)!;
    expect(left.dir).toBe(-1);
    const arrivalLeft = (ZEN.leftAt - 0.25) * T + left.dx;
    expect(arrivalLeft / T).toBeCloseTo(ZEN.leftAt - 0.25 + ZEN_SHIFT);
    expect(zenRebase(arrivalLeft)).toBeNull();
    expect(ZEN.rightArrival - ZEN.leftAt).toBeGreaterThanOrEqual(8);
    expect(ZEN.rightAt - (ZEN.leftAt + ZEN_SHIFT)).toBeGreaterThanOrEqual(8);
  });

  it('the window copied across a swap is the same place before and after, and wider than any screen', () => {
    for (const dir of [1, -1] as const) {
      const w = zenWindow(dir);
      const trigger = dir === 1 ? ZEN.rightAt : ZEN.leftAt;
      const arrival = dir === 1 ? ZEN.rightArrival : ZEN.leftAt + ZEN_SHIFT;
      // The window is centred on the trigger in the old segment and on the arrival in the new one.
      expect(w.from + ZEN.window).toBe(trigger);
      expect(w.to + ZEN.window).toBe(arrival);
      expect(w.to - w.from).toBe(arrival - trigger);
      expect(w.from).toBeGreaterThanOrEqual(0);
      expect(w.from + w.width).toBeLessThanOrEqual(ZEN.cols);
      expect(w.to).toBeGreaterThanOrEqual(0);
      expect(w.to + w.width).toBeLessThanOrEqual(ZEN.cols);
    }
    for (const [w, h] of [[844, 390], [1280, 800], [1024, 768], [1366, 512], [2400, 1000]] as const) {
      const half = logicalWidthFor(w, h) / 2 / T;
      expect(half + 2, `${w}x${h}`).toBeLessThan(ZEN.window);
    }
  });

  it('copies the window as it is: ground, gaps, blocks, coins, bubbles (except a cut big bubble and the old start and flag)', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      for (const dir of [1, -1] as const) {
        const oldGrid = generateZen(seed, 'grass', { first: true }).config.grid;
        const next = generateZen(zenSegmentSeed(seed, dir), 'grass', { carry: { grid: oldGrid, dir } }).config.grid;
        const w = zenWindow(dir);
        for (let row = 0; row < ZEN.rows; row++) {
          for (let i = 0; i < w.width; i++) {
            const a = oldGrid[row][w.from + i];
            const b = next[row][w.to + i];
            if (a === 'S' || a === 'F') expect(b).toBe('.');
            else if (a === 'O') expect(['O', '.']).toContain(b);
            else expect(b, `seed ${seed} dir ${dir} row ${row} col ${i}`).toBe(a);
          }
        }
      }
    }
  });

  it('keeps the rules across swaps: valid levels, 7+ tiles of ground between gaps, full big bubbles, a segment start and flag, no new content in the margin', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      chain(seed).forEach((grid, i) => {
        const cfg = { ...generateZen(1).config, grid };
        expect(parseLevel(cfg, 'zen').ok, `seed ${seed} segment ${i}`).toBe(true);
        for (const r of groundRuns(grid)) expect(r, `seed ${seed} segment ${i}`).toBeGreaterThanOrEqual(7);
        // Nothing but plain ground (no gap, block or pad) in the 8 tiles beside each window... checked on the right-hand window.
        expect(extractEntities(grid).goal.col).toBe(ZEN.cols - 1);
      });
    }
  });

  it('a taken coin stays taken across the swap (the scene clears it from the carried grid)', () => {
    const grid = generateZen(5, 'grass', { first: true }).config.grid;
    const w = zenWindow(1);
    const coin = find(grid, 'c').find((c) => c.col >= w.from && c.col < w.from + w.width)!;
    const cleared = grid.map((r, row) => (row === coin.row ? r.slice(0, coin.col) + '.' + r.slice(coin.col + 1) : r));
    const next = generateZen(zenSegmentSeed(5, 1), 'grass', { carry: { grid: cleared, dir: 1 } }).config.grid;
    expect(next[coin.row][w.to + (coin.col - w.from)]).toBe('.');
  });
});

describe('zen free play: ?zen=1', () => {
  it('opens at once for any value but 0, with an optional seed', () => {
    expect(zenFromSearch('')).toEqual({ open: false, seed: null });
    expect(zenFromSearch('?zen=0')).toEqual({ open: false, seed: null });
    expect(zenFromSearch('?zen=1')).toEqual({ open: true, seed: null });
    expect(zenFromSearch('?zen=1&seed=42')).toEqual({ open: true, seed: 42 });
    expect(zenFromSearch('?zen=&seed=-1')).toEqual({ open: true, seed: null });
  });
});
