import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../../core/levels/format';
import { extractEntities } from '../../../core/levels/grid';
import { nextLevelId } from '../../../core/levels/progression';
import { jumpPeak, PHYSICS } from '../../../core/levels/physics';
import { asset, assets } from '../assets';
import { characters } from '../characters';
import { worlds } from '../worlds';
import grass1 from './grass-1.json';
import grass2 from './grass-2.json';
import grass3 from './grass-3.json';

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

  it('grass-3 is a Left/Right level: no auto-run, a script demo, flat ground, about 22 coins', () => {
    const r = parseLevel(grass3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { controls, stars, grid, tileSize } = r.level;
    expect(controls.enabled).toEqual(['left', 'right', 'jump']);
    expect(controls.autoRun).toBe(false);
    expect(controls.tapAnywhereJumps).toBe(false);
    expect(controls.demo && 'script' in controls.demo && controls.demo.script.map((s) => s.action)).toEqual(['right', 'left', 'jump']);
    expect(stars).toEqual({ two: 10, three: 16 });
    const e = extractEntities(grid);
    expect(e.cols).toBeGreaterThanOrEqual(65);
    expect(e.cols).toBeLessThanOrEqual(75);
    expect(e.solid[e.start.row + 1].every(Boolean)).toBe(true); // no gaps
    expect(e.start.col).toBe(6);
    expect(e.flag.col).toBeGreaterThan(e.cols - 8);
    expect(e.flag.row).toBe(e.start.row);
    expect(e.coins.length).toBeGreaterThanOrEqual(20);
    expect(e.coins.length).toBeLessThanOrEqual(24);

    // Walkable coins: ground level or head height (the body is 84 px tall). Overhead coins need a jump.
    const ground = e.coins.filter((c) => c.row >= e.start.row - 1);
    const overhead = e.coins.filter((c) => c.row < e.start.row - 1);
    const left = e.coins.filter((c) => c.col < e.start.col);
    expect(left.length).toBeGreaterThanOrEqual(3);
    expect(left.length).toBeLessThanOrEqual(4);
    // Walking coins sit at head height (Task 005b section 0): above the Left/Right and Jump buttons, so none is
    // ever hidden behind a button, yet still collected by walking.
    for (const c of ground) {
      expect(c.row).toBe(e.start.row - 1);
      const above = (e.start.row + 1 - c.row - 0.5) * tileSize;
      expect(above).toBeLessThan(PHYSICS.body.height + 18);
    }
    expect(overhead.length).toBe(4);
    expect(ground.length + overhead.length).toBe(e.coins.length);
    // Overhead coins: out of reach walking (body 84 px tall), in reach of a standing jump.
    for (const c of overhead) {
      const above = (e.start.row + 1 - c.row - 0.5) * tileSize;
      expect(above).toBeGreaterThan(PHYSICS.body.height + 18);
      expect(above).toBeLessThanOrEqual(PHYSICS.body.height + jumpPeak(PHYSICS.jumpVelocity, PHYSICS.gravity) + 18);
    }
    // 3 stars needs more than the ground trails to the right: some left or overhead coins too.
    const rightGround = ground.filter((c) => c.col > e.start.col).length;
    expect(rightGround).toBeLessThan(stars.three);
    expect(rightGround).toBeGreaterThanOrEqual(stars.two);
  });

  it('the grass world lists grass-1, grass-2, grass-3: Next goes 1 -> 2 -> 3 and is hidden on 3', () => {
    expect(worlds.find((w) => w.id === 'grass')?.levels).toEqual(['grass-1', 'grass-2', 'grass-3']);
    expect(nextLevelId(worlds, 'grass-1')).toBe('grass-2');
    expect(nextLevelId(worlds, 'grass-2')).toBe('grass-3');
    expect(nextLevelId(worlds, 'grass-3')).toBeNull();
  });
});

describe('Mario voices (D-023, D-031)', () => {
  const voice = (id: string) => characters.find((c) => c.id === id)?.sounds;
  const expected: Record<string, Record<'pick' | 'jump' | 'win', string>> = {
    peach: { pick: 'peach-hello.mp3', jump: 'peach-yeah.mp3', win: 'peach-he-he-yeah.mp3' },
    toad: { pick: 'toad-2.mp3', jump: 'toad-0.mp3', win: 'toad-1.mp3' },
    bowser: { pick: 'bowser-1.mp3', jump: 'bowser-0.mp3', win: 'bowser-he-ha-ha.mp3' },
  };

  it('every new clip file is present and resolves to its slot', () => {
    for (const [id, slots] of Object.entries(expected)) {
      for (const [slot, file] of Object.entries(slots) as Array<['pick' | 'jump' | 'win', string]>) {
        const url = asset(file);
        expect(url, `${id} ${slot}: ${file}`).toBeTruthy();
        expect(voice(id)?.[slot]).toEqual([url]);
      }
    }
  });

  it('a missing file is left out instead of throwing', () => {
    expect(asset('nope.mp3')).toBeUndefined();
    expect(assets('nope.mp3', 'toad-0.mp3')).toEqual([asset('toad-0.mp3')]);
    expect(assets('nope.mp3')).toEqual([]);
  });

  it('Yoshi and Donkey Kong still have no voices', () => {
    expect(voice('yoshi')).toBeUndefined();
    expect(voice('donkeykong')).toBeUndefined();
  });
});
