import { describe, expect, it } from 'vitest';
import { logicalWidthFor } from '../ui/layoutMath';
import { parseLevel, parseLevelOrThrow } from './format';
import { extractEntities } from './grid';
import { generateZen, zenFromSearch, zenRebase, zenSegmentSeed, ZEN, ZEN_CONTENT_END, ZEN_SHIFT } from './zen';
import { runBot } from './testBot';

const SEEDS = Array.from({ length: 120 }, (_, i) => i * 7919 + 3);
const cell = (grid: string[], row: number, col: number) => grid[row][col];

function find(grid: string[], chars: string): Array<{ row: number; col: number; ch: string }> {
  const out: Array<{ row: number; col: number; ch: string }> = [];
  grid.forEach((line, row) => [...line].forEach((ch, col) => chars.includes(ch) && out.push({ row, col, ch })));
  return out;
}

describe('zen free play (Task 020, D-063): the segment generator', () => {
  it('builds a valid level: 11 rows of 260 tiles, all four buttons, no demo, one S, one F far off, no saved stars', () => {
    for (const first of [true, false]) {
      const seg = generateZen(12345, 'grass', first);
      const res = parseLevel(seg.config, 'zen');
      expect(res.ok).toBe(true);
      const level = parseLevelOrThrow(seg.config, 'zen');
      expect(level.zen).toBe(true);
      expect(level.controls.enabled).toEqual(['left', 'right', 'jump', 'power']);
      expect(level.controls.demo).toBe(false);
      expect(level.grid.length).toBe(ZEN.rows);
      expect(level.grid.every((r) => r.length === ZEN.cols)).toBe(true);
      const e = extractEntities(level.grid);
      expect(e.start).toEqual({ col: ZEN.startCol, row: 8 });
      expect(e.goal).toEqual({ col: ZEN.cols - 1, row: 8 });
      // Flat ground everywhere: nothing to fall into, nothing solid but the ground.
      expect(e.solid[9].every(Boolean)).toBe(true);
      expect(e.solid[10].every(Boolean)).toBe(true);
      expect(e.solid.slice(0, 9).every((r) => r.every((s) => !s))).toBe(true);
      expect(e.blocks.length).toBe(0);
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
    const laps = new Set([-2, -1, 0, 1, 2, 3].map((n) => zenSegmentSeed(77, n)));
    expect(laps.size).toBe(6);
  });

  it('keeps both ends empty: no content in the first 52 tiles (38 for the very first segment) or the last 52', () => {
    for (const seed of SEEDS) {
      for (const first of [false, true]) {
        const lo = first ? ZEN.firstContent : ZEN.free;
        const { grid } = generateZen(seed, 'grass', first).config;
        for (const { row, col, ch } of find(grid.slice(0, 9), 'cohrOP^MJ')) {
          expect(col >= lo && col < ZEN_CONTENT_END, `seed ${seed} first=${first}: ${ch} at ${col}:${row}`).toBe(true);
        }
      }
    }
  });

  it('every segment has a rainbow bubble, a few power-up orbs spaced far apart, and plenty to do', () => {
    const kinds = new Set<string>();
    for (const seed of SEEDS) {
      for (const first of [false, true]) {
        const seg = generateZen(seed, 'grass', first);
        const e = extractEntities(seg.config.grid);
        expect(e.bubbles.filter((b) => b.kind === 'rainbow').length, `seed ${seed}`).toBeGreaterThanOrEqual(1);
        expect(e.pickups.length, `seed ${seed} first=${first}`).toBeGreaterThanOrEqual(first ? 1 : 2);
        const cols = e.pickups.map((p) => p.col).sort((a, b) => a - b);
        for (let i = 1; i < cols.length; i++) expect(cols[i] - cols[i - 1], `seed ${seed}: orbs ${cols}`).toBeGreaterThanOrEqual(36);
        for (const p of e.pickups) {
          kinds.add(p.kind);
          expect(p.row).toBe(8);
        }
        expect(e.coins.length, `seed ${seed}`).toBeGreaterThanOrEqual(40);
        expect(e.bubbles.length, `seed ${seed}`).toBeGreaterThanOrEqual(6);
      }
    }
    expect([...kinds].sort()).toEqual(['boots', 'car', 'magnet']);
  });

  it('the first segment has something to do close to the start, and the first orb is not right at his feet', () => {
    for (const seed of SEEDS) {
      const e = extractEntities(generateZen(seed, 'grass', true).config.grid);
      const firstThing = Math.min(...e.bubbles.map((b) => b.col), ...e.coins.map((c) => c.col), ...e.pickups.map((p) => p.col));
      expect(firstThing - ZEN.startCol, `seed ${seed}`).toBeLessThanOrEqual(12);
      expect(firstThing, `seed ${seed}`).toBeGreaterThan(ZEN.startCol);
      for (const p of e.pickups) expect(p.col).toBeGreaterThan(ZEN.startCol + 6);
    }
  });

  it('keeps every coin reachable: high rows only above a pad, in a magnet field or the boots stretch', () => {
    for (const seed of SEEDS) {
      const { grid } = generateZen(seed).config;
      const orbs = find(grid, 'PMJ');
      const pads = find(grid, '^');
      for (const { row, col } of find(grid, 'c')) {
        expect(row, `seed ${seed}`).toBeGreaterThanOrEqual(3);
        if (row >= 6) continue;
        const abovePad = pads.some((p) => Math.abs(p.col - col) <= 1);
        const inSet = (kind: string, minRow: number) => orbs.some((o) => o.ch === kind && col >= o.col + 4 && col <= o.col + 4 + 34 && row >= minRow);
        const ok = abovePad || inSet('M', 4) || (row === 4 && inSet('J', 4));
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
      // Big bubbles are whole 2x2 blocks in rows 7 and 8 (parseLevel checks the shape); never anywhere else.
      for (const { row } of find(grid, 'O')) expect([7, 8]).toContain(row);
      const bubbles = find(grid, 'ohrO');
      for (const spot of find(grid, '^PMJ')) {
        for (const b of bubbles) expect(Math.abs(b.col - spot.col), `seed ${seed}: ${spot.ch} at ${spot.col} near bubble at ${b.col}`).toBeGreaterThanOrEqual(3);
        expect(cell(grid, spot.row, spot.col)).toBe(spot.ch);
        expect(spot.row).toBe(8);
      }
    }
  });

  it('a scripted bot walking the segment pops every bubble without falling (pads and orbs left out)', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const stripped = generateZen(seed, 'grass', true).config.grid.map((r) => r.replace(/[\^PMJ]/g, '.'));
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
    // 8 tiles of margin either way (no flicker if he turns round at once).
    expect(ZEN.rightArrival - ZEN.leftAt).toBeGreaterThanOrEqual(8);
    expect(ZEN.rightAt - (ZEN.leftAt + ZEN_SHIFT)).toBeGreaterThanOrEqual(8);
  });

  it('a swap is invisible: old content ends 20+ tiles behind him and the new content starts 20+ tiles ahead, both ways', () => {
    // Walking right: leaves content at ZEN_CONTENT_END, swaps at rightAt, arrives at rightArrival, new content from `free`.
    expect(ZEN.rightAt - ZEN_CONTENT_END).toBeGreaterThanOrEqual(20);
    expect(ZEN.free - ZEN.rightArrival).toBeGreaterThanOrEqual(20);
    // Walking left: leaves content at `free`, swaps at leftAt, arrives at leftAt + shift, the new content ends at ZEN_CONTENT_END.
    expect(ZEN.free - ZEN.leftAt).toBeGreaterThanOrEqual(20);
    expect(ZEN.leftAt + ZEN_SHIFT - ZEN_CONTENT_END).toBeGreaterThanOrEqual(20);
    // And the screen is never wider than the clear stretch: at most 0.65 of the widest logical screen on one side.
    for (const [w, h] of [[844, 390], [1280, 800], [1024, 768], [1366, 512], [2400, 1000]] as const) {
      const tiles = (logicalWidthFor(w, h) * 0.65) / T;
      expect(tiles, `${w}x${h}`).toBeLessThan(20);
    }
  });

  it('the ground matches everywhere: every segment has the same flat ground, so only the content changes', () => {
    const a = generateZen(1).config.grid;
    const b = generateZen(2, 'grass', true).config.grid;
    expect(a[9]).toBe(b[9]);
    expect(a[10]).toBe(b[10]);
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
