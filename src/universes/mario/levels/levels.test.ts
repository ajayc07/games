import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../../core/levels/format';
import { extractEntities } from '../../../core/levels/grid';
import { nextLevelId } from '../../../core/levels/progression';
import { worlds } from '../worlds';
import grass1 from './grass-1.json';
import grass2 from './grass-2.json';

describe('Mario level files', () => {
  it('grass-1 keeps demo: false', () => {
    const r = parseLevel(grass1);
    expect(r.ok && r.level.controls.demo).toBe(false);
  });

  it('grass-2 is a Jump-button level with a demo, about 30 coins and 3-4 gaps in the last two thirds', () => {
    const r = parseLevel(grass2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { controls, stars, grid } = r.level;
    expect(controls).toEqual({ enabled: ['jump'], autoRun: true, tapAnywhereJumps: false, demo: { tiles: 20, jumpsAtTiles: [8, 15] } });
    expect(stars).toEqual({ two: 15, three: 25 });
    const e = extractEntities(grid);
    expect(e.cols).toBe(150);
    expect(e.coins.length).toBe(30);
    const ground = e.solid[e.start.row + 1];
    const gapCols = ground.map((s, c) => (s ? -1 : c)).filter((c) => c >= 0);
    const gaps = gapCols.reduce<number[][]>((acc, c) => {
      const last = acc[acc.length - 1];
      if (last && last[last.length - 1] === c - 1) last.push(c);
      else acc.push([c]);
      return acc;
    }, []);
    expect(gaps.length).toBeGreaterThanOrEqual(3);
    expect(gaps.length).toBeLessThanOrEqual(4);
    for (const g of gaps) {
      expect(g.length).toBeLessThanOrEqual(2);
      expect(g[0]).toBeGreaterThan(e.cols / 3);
      // A coin arc shortly before every gap.
      expect(e.coins.some((c) => c.col < g[0] && c.col >= g[0] - 8)).toBe(true);
    }
  });

  it('the grass world lists grass-1 then grass-2, so Next goes 1 -> 2 and is hidden on 2', () => {
    expect(nextLevelId(worlds, 'grass-1')).toBe('grass-2');
    expect(nextLevelId(worlds, 'grass-2')).toBeNull();
  });
});
