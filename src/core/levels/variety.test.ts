import { describe, expect, it } from 'vitest';
import { parseLevelOrThrow, type LevelData } from './format';
import { extractEntities } from './grid';
import { runBot } from './testBot';
import { rainbowHookFrom, rainbowPick, useVariety, varietyModeFrom, varietySeedFrom, varyLevel, VARIETY, withRainbowHook } from './variety';

const files = import.meta.glob<unknown>('../../universes/robo/levels/grass-*.json', { eager: true, import: 'default' });
const LEVELS: LevelData[] = Object.entries(files)
  .map(([path, raw]) => parseLevelOrThrow(raw, path))
  .sort((a, b) => a.id.localeCompare(b.id));
const rawOf = (id: string) => Object.entries(files).find(([p]) => p.includes(`${id}.json`))![1] as { grid: string[] };
const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 13);

const count = (grid: string[], ch: string) => grid.join('').split(ch).length - 1;
const cellsOf = (grid: string[], chars: string) =>
  grid.flatMap((row, r) => [...row].flatMap((ch, c) => (chars.includes(ch) ? [{ r, c, ch }] : [])));
const gapCols = (grid: string[]) => [...grid[grid.length - 1]].flatMap((ch, c) => (ch === '#' ? [] : [c]));

describe('varyLevel (Task 012)', () => {
  it('there are seven levels, and the JSON files never use the rainbow character', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['grass-1', 'grass-2', 'grass-3', 'grass-4', 'grass-5', 'grass-6', 'grass-7']);
    for (const l of LEVELS) expect(count(l.grid, 'r'), l.id).toBe(0);
  });

  it('the canonical grid is the JSON as written (first play is unchanged)', () => {
    for (const l of LEVELS) expect(l.grid).toEqual(rawOf(l.id).grid);
  });

  it('same seed, same grid; different seeds differ in most levels', () => {
    for (const l of LEVELS) {
      expect(varyLevel(l, 5).grid).toEqual(varyLevel(l, 5).grid);
      if (l.variety === false) {
        // Grass 7 (blocks and pads, Task 015) keeps its coin arcs over the pads and blocks exactly where they are.
        expect(varyLevel(l, 99), l.id).toBe(l);
        continue;
      }
      const grids = new Set(SEEDS.map((s) => varyLevel(l, s).grid.join('\n')));
      expect(grids.size, l.id).toBeGreaterThan(30);
      const differing = SEEDS.filter((s) => varyLevel(l, s).grid.join('\n') !== l.grid.join('\n')).length;
      expect(differing, `${l.id} differs from the canonical grid`).toBeGreaterThan(SEEDS.length * 0.8);
    }
  });

  it('every varied grid parses, keeps the size, and keeps S, F, #, O and h exactly where they were', () => {
    for (const l of LEVELS) {
      for (const seed of SEEDS) {
        const v = varyLevel(l, seed);
        const at = `${l.id} seed ${seed}`;
        const parsed = parseLevelOrThrow({ ...l, grid: v.grid }, at);
        expect(parsed.grid, at).toHaveLength(l.grid.length);
        for (const ch of 'SF#Oh') expect(cellsOf(v.grid, ch), `${at} ${ch}`).toEqual(cellsOf(l.grid, ch));
        // Same controls, stars, demo and id; only the grid changes.
        expect({ ...v, grid: [] }).toEqual({ ...l, grid: [] });
      }
    }
  });

  it('coin counts and bubble counts are preserved (a rainbow bubble replaces one small bubble)', () => {
    for (const l of LEVELS) {
      for (const seed of SEEDS) {
        const v = varyLevel(l, seed);
        const at = `${l.id} seed ${seed}`;
        expect(count(v.grid, 'c'), at).toBe(count(l.grid, 'c'));
        expect(count(v.grid, 'o') + count(v.grid, 'r'), at).toBe(count(l.grid, 'o'));
        expect(count(v.grid, 'r'), at).toBeLessThanOrEqual(1);
        expect(extractEntities(v.grid).coins.length, at).toBe(count(l.grid, 'c'));
      }
    }
  });

  it('arcs over gaps never move; items keep their row, stay over ground in their stretch, and keep their clearance', () => {
    for (const l of LEVELS) {
      const gaps = gapCols(l.grid);
      const e0 = extractEntities(l.grid);
      const stops = [...gaps, e0.start.col, e0.goal.col];
      const stretch = (c: number) => stops.filter((s) => s < c).length;
      const rows = (g: string[], chars: string) => cellsOf(g, chars).map((x) => x.r).sort();
      const arc = (g: string[]) => cellsOf(g, 'c').filter((x) => gaps.some((gc) => Math.abs(gc - x.c) <= VARIETY.arcReach)).map((x) => `${x.r}:${x.c}`);
      const was = new Set(cellsOf(l.grid, 'orOh').map((x) => `${x.r}:${x.c}`));
      for (const seed of SEEDS.slice(0, 100)) {
        const v = varyLevel(l, seed).grid;
        const at = `${l.id} seed ${seed}`;
        expect(arc(v), `${at}: arc coins`).toEqual(arc(l.grid));
        expect(rows(v, 'c'), `${at}: coin rows`).toEqual(rows(l.grid, 'c'));
        expect(rows(v, 'or'), `${at}: bubble rows`).toEqual(rows(l.grid, 'o'));
        expect(cellsOf(v, 'or').map((x) => stretch(x.c)).sort(), `${at}: bubbles stay between the same stops`).toEqual(
          cellsOf(l.grid, 'o').map((x) => stretch(x.c)).sort(),
        );
        const arcCells = new Set(arc(l.grid));
        for (const x of cellsOf(v, 'cor')) {
          if (arcCells.has(`${x.r}:${x.c}`)) continue; // an arc coin hangs over its gap
          expect(gaps, `${at}: ${x.ch} at ${x.c} is in a gap`).not.toContain(x.c);
          expect(l.grid[l.grid.length - 1][x.c], at).toBe('#');
        }
        for (const x of cellsOf(v, 'or')) {
          if (was.has(`${x.r}:${x.c}`)) continue;
          const near = Math.min(...stops.map((s) => Math.abs(s - x.c)));
          expect(near, `${at}: moved bubble at col ${x.c}`).toBeGreaterThanOrEqual(VARIETY.tightClear);
        }
        // One whole tile between any two bubbles (the two cells of a big bubble excepted).
        const bubbles = cellsOf(v, 'oOhr');
        for (const a of bubbles) {
          for (const b of bubbles) {
            if (a === b || (a.ch === 'O' && b.ch === 'O')) continue;
            const apart = Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
            if (was.has(`${a.r}:${a.c}`) && was.has(`${b.r}:${b.c}`)) continue; // two items left where the level has them
            expect(apart, `${at}: bubbles at ${a.r}:${a.c} and ${b.r}:${b.c}`).toBeGreaterThanOrEqual(2);
          }
        }
      }
    }
  });

  it('Grass 2 keeps the coins near the demo jump columns where they are', () => {
    const g2 = LEVELS.find((l) => l.id === 'grass-2')!;
    const demo = g2.controls.demo;
    const jumps = demo && 'jumpsAtTiles' in demo ? demo.jumpsAtTiles : [];
    expect(jumps.length).toBeGreaterThan(0);
    const near = (g: string[]) => cellsOf(g, 'c').filter((x) => jumps.some((j) => Math.abs(j - x.c) <= VARIETY.demoReach)).map((x) => `${x.r}:${x.c}`);
    for (const seed of SEEDS) expect(near(varyLevel(g2, seed).grid), `seed ${seed}`).toEqual(expect.arrayContaining(near(g2.grid)));
  });

  it('a level can opt out with "variety": false, practice levels are never varied', () => {
    const l = LEVELS[3];
    const off = parseLevelOrThrow({ ...l, variety: false }, 'opt-out');
    expect(off.variety).toBe(false);
    expect(varyLevel(off, 9)).toBe(off);
    expect(varyLevel({ ...l, practice: true }, 9)).toEqual({ ...l, practice: true });
    expect(() => parseLevelOrThrow({ ...l, variety: 'no' }, 'bad')).toThrow(/variety/);
  });

  it('rainbow: every varied run, only with 4+ small bubbles, deterministic, never in Grass 1-3 or Grass 5', () => {
    expect(rainbowPick(3, 1)).toBeNull();
    expect(rainbowPick(0, 1)).toBeNull();
    expect(rainbowPick(11, 4)).toBe(rainbowPick(11, 4));
    for (const seed of SEEDS) {
      const k = rainbowPick(11, seed);
      if (k !== null) expect(k >= 0 && k < 11).toBe(true);
    }
    const many = Array.from({ length: 3000 }, (_, i) => i * 104729 + 7);
    const rate = many.filter((s) => rainbowPick(11, s) !== null).length / many.length;
    expect(rate).toBe(1);
    for (const l of LEVELS) {
      const withRainbow = SEEDS.filter((s) => count(varyLevel(l, s).grid, 'r') === 1).length;
      if (count(l.grid, 'o') < VARIETY.rainbowMinBubbles) expect(withRainbow, l.id).toBe(0);
      else {
        expect(withRainbow, l.id).toBe(SEEDS.length);
      }
    }
    const g4 = LEVELS.find((l) => l.id === 'grass-4')!;
    const seed = SEEDS.find((s) => count(varyLevel(g4, s).grid, 'r') === 1)!;
    expect(extractEntities(varyLevel(g4, seed).grid).bubbles.filter((b) => b.kind === 'rainbow')).toHaveLength(1);
  });

  it('when variety applies: first play canonical, replay varied, ?variety= forces, a demo is always on the canonical grid', () => {
    const auto = (cleared: boolean, demoPlays = false) => useVariety({ mode: 'auto', cleared, demoPlays });
    expect(auto(false)).toBe(false);
    expect(auto(true)).toBe(true);
    expect(auto(true, true)).toBe(false);
    expect(useVariety({ mode: 'on', cleared: false, demoPlays: false })).toBe(true);
    expect(useVariety({ mode: 'on', cleared: false, demoPlays: true })).toBe(false);
    expect(useVariety({ mode: 'off', cleared: true, demoPlays: false })).toBe(false);
    expect(varietyModeFrom('?variety=1')).toBe('on');
    expect(varietyModeFrom('?variety=0')).toBe('off');
    expect(varietyModeFrom('?level=grass-2')).toBe('auto');
    expect(varietySeedFrom('?seed=77')).toBe(77);
    expect(varietySeedFrom('?seed=x')).toBeGreaterThanOrEqual(0);
  });

  it('?rainbow=1 (Task 014b): forces exactly one rainbow bubble, but only on a varied run', () => {
    expect(rainbowHookFrom('?rainbow=1')).toBe(true);
    expect(rainbowHookFrom('?rainbow=0')).toBe(false);
    expect(rainbowHookFrom('?level=grass-4')).toBe(false);
    for (const id of ['grass-4', 'grass-6']) {
      const l = LEVELS.find((x) => x.id === id)!;
      for (const seed of SEEDS.slice(0, 40)) {
        const v = varyLevel(l, seed);
        const forced = withRainbowHook(v, { search: '?rainbow=1', varied: true, seed });
        expect(count(forced.grid, 'r'), `${id} ${seed}`).toBe(1);
        expect(count(forced.grid, 'o') + 1).toBe(count(v.grid, 'o') + count(v.grid, 'r'));
        expect(forced.grid.map((r) => r.replace('r', 'o'))).toEqual(v.grid.map((r) => r.replace('r', 'o')));
        // A canonical first play never changes, with or without the parameter.
        expect(withRainbowHook(l, { search: '?rainbow=1', varied: false, seed })).toBe(l);
        expect(withRainbowHook(v, { search: '', varied: true, seed })).toBe(v);
      }
    }
    // Levels without small bubbles stay as they are; a rainbow already there is kept.
    const g5 = LEVELS.find((l) => l.id === 'grass-5')!;
    expect(withRainbowHook(g5, { search: '?rainbow=1', varied: true, seed: 1 })).toBe(g5);
    const g4 = LEVELS.find((l) => l.id === 'grass-4')!;
    const seed = SEEDS.find((s) => count(varyLevel(g4, s).grid, 'r') === 1)!;
    const already = varyLevel(g4, seed);
    expect(withRainbowHook(already, { search: '?rainbow=1', varied: true, seed })).toBe(already);
  });

  it('varied grids keep coins and bubbles out of the wider pad footprint', () => {
    for (const l of LEVELS) {
      for (const seed of SEEDS) {
        const g = varyLevel(l, seed).grid;
        const goal = extractEntities(g).goal.col;
        g.forEach((row, r) =>
          [...row].forEach((ch, c) => {
            if ('coOhr'.includes(ch)) expect(Math.abs(c - goal), `${l.id} seed ${seed} ${ch} at ${r},${c}`).toBeGreaterThanOrEqual(2);
          }),
        );
      }
    }
  });

  for (const id of ['grass-3', 'grass-4', 'grass-5', 'grass-6']) {
    it(`${id}: a scripted bot collects every coin and pops every bubble on 200 varied grids`, () => {
      const l = LEVELS.find((x) => x.id === id)!;
      const canonical = runBot(extractEntities(l.grid), { jumpForCoins: true });
      expect(canonical.finished, `${id} canonical`).toBe(true);
      for (const seed of SEEDS) {
        const r = runBot(extractEntities(varyLevel(l, seed).grid), { jumpForCoins: true });
        expect(r.fell, `${id} seed ${seed}: fell at ${r.x}`).toBe(false);
        expect(r.finished, `${id} seed ${seed}: stopped at ${r.x}`).toBe(true);
        expect(r.coinsLeft, `${id} seed ${seed}: coins left at ${r.coinsLeftAt.join(',')}`).toBe(canonical.coinsLeft);
        expect(r.bubblesLeft, `${id} seed ${seed}: bubbles left at ${r.bubblesLeftAt.join(',')}`).toBe(canonical.bubblesLeft);
      }
    });
  }
});
