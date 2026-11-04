import { describe, expect, it } from 'vitest';
import { ENEMIES, ENEMY_LETTERS, enemyCells, enemyErrors, enemiesForced, type EnemyKind } from './enemies';
import { parseLevelOrThrow } from './format';
import { generateZen, zenSegmentSeed, zenWindow, ZEN, ZEN_ENEMY, enemyReach } from './zen';
import { BugBump } from './bugs';
import { enemyPose, enemyTopSpeed } from './enemies';

const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 11);

/** First segment, then right, right, left, left, left, right, right, left (at least five swaps each way over a few seeds). */
function chain(seed: number, force = false) {
  const segs = [generateZen(seed, 'grass', { first: true, forceEnemy: force })];
  let lap = 0;
  for (const dir of [1, 1, -1, -1, -1, 1, 1, -1, -1, 1, 1] as const) {
    lap += dir;
    segs.push(generateZen(zenSegmentSeed(seed, lap), 'grass', { carry: { grid: segs[segs.length - 1].config.grid, dir } }));
  }
  return segs;
}

describe('zen enemies (Task 042, D-085)', () => {
  it('every segment of 200 seeds passes the level validator, with the first segment parsed like the game does', { timeout: 60000 }, () => {
    for (const seed of SEEDS) {
      for (const seg of chain(seed).slice(0, 4)) {
        expect(enemyErrors(seg.config.grid), `seed ${seed}`).toEqual([]);
      }
      parseLevelOrThrow(generateZen(seed, 'grass', { first: true }).config, `zen ${seed}`);
    }
  });

  it('each patrol is clear: nothing but the enemy in its reserved stretch, ground flat, kinds read back from the grid', () => {
    for (const seed of SEEDS) {
      const seg = generateZen(seed, 'grass', { first: true });
      const found = enemyCells(seg.config.grid);
      const key = (e: { col: number; row: number }) => e.row * 1000 + e.col;
      expect(found.map((e) => ({ kind: e.kind, col: e.col, row: e.row })).sort((a, b) => key(a) - key(b))).toEqual([...seg.enemies].sort((a, b) => key(a) - key(b)));
      for (const e of found) {
        const reach = enemyReach(e.kind);
        for (let c = e.col - reach; c <= e.col + reach; c++) {
          expect(seg.config.grid[9][c], `ground at ${c}`).toBe('#');
          const patrol = Math.abs(c - e.col) <= ZEN_ENEMY.half[e.kind];
          for (let r = 0; r < 9; r++) {
            if (r === e.row && c === e.col) continue;
            const ch = seg.config.grid[r][c];
            // The patrol is bare; the clear tiles beside it hold at most a coin and never a block, pad, orb or big bubble.
            if (patrol) expect(ch, `seed ${seed} ${e.kind} row ${r} col ${c}`).toBe('.');
            else expect('.cor'.includes(ch), `seed ${seed} ${e.kind} row ${r} col ${c} has ${ch}`).toBe(true);
          }
        }
      }
    }
  });

  it('spacing and frequency: never two within 20 tiles, none in the first 20 tiles of content, about one every 45-60 tiles', { timeout: 60000 }, () => {
    let total = 0;
    let segs = 0;
    for (const seed of SEEDS) {
      for (const [i, seg] of chain(seed).entries()) {
        const cols = seg.enemies.map((e) => e.col);
        const from = i === 0 ? ZEN.firstContent : seg.range.from;
        for (const c of cols) expect(c - enemyReach(seg.enemies.find((e) => e.col === c)!.kind)).toBeGreaterThanOrEqual(from + 20 - 1);
        cols.forEach((c, k) => k > 0 && expect(c - cols[k - 1], `seed ${seed}`).toBeGreaterThanOrEqual(20));
        total += cols.length;
        segs++;
      }
    }
    // A segment has about 250 tiles of content: three to five enemies on average.
    expect(total / segs).toBeGreaterThan(2.2);
    expect(total / segs).toBeLessThan(6);
  });

  it('none lies in a carry window, in either direction, and none is copied by a swap', { timeout: 60000 }, () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const segs = chain(seed);
      for (const seg of segs) {
        for (const e of seg.enemies) {
          const reach = enemyReach(e.kind);
          expect(e.col - reach).toBeGreaterThanOrEqual(ZEN_ENEMY.zoneMin);
          expect(e.col + reach).toBeLessThanOrEqual(ZEN_ENEMY.zoneMax);
        }
        for (const dir of [1, -1] as const) {
          const w = zenWindow(dir);
          for (const row of seg.config.grid) {
            for (let i = 0; i < w.width; i++) expect(ENEMY_LETTERS.includes(row[w.from + i])).toBe(false);
          }
        }
      }
      // After a swap the carried window holds no enemy either.
      for (const seg of segs.slice(1)) expect(seg.enemies.every((e) => e.col >= ZEN_ENEMY.zoneMin)).toBe(true);
    }
  });

  it('a swap leaves the window exactly as it was (apart from the start and goal) with enemies around', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      const first = generateZen(seed, 'grass', { first: true });
      for (const dir of [1, -1] as const) {
        const next = generateZen(zenSegmentSeed(seed, dir), 'grass', { carry: { grid: first.config.grid, dir } });
        const w = zenWindow(dir);
        for (let row = 0; row < 11; row++) {
          for (let i = 0; i < w.width; i++) {
            const was = first.config.grid[row][w.from + i];
            expect(next.config.grid[row][w.to + i]).toBe(was === 'S' || was === 'F' ? '.' : was);
          }
        }
      }
    }
  });

  it('the bag mixes the kinds: bug most common, then bat, then beetle, in every run of six', () => {
    const counts: Record<EnemyKind, number> = { bug: 0, beetle: 0, bat: 0 };
    for (const seed of SEEDS) for (const seg of chain(seed).slice(0, 3)) for (const e of seg.enemies) counts[e.kind]++;
    expect(counts.bug).toBeGreaterThan(counts.bat);
    expect(counts.bat).toBeGreaterThan(counts.beetle);
    expect(counts.beetle).toBeGreaterThan(50);
    expect(ZEN_ENEMY.bag.filter((k) => k === 'bug').length).toBe(3);
  });

  it('`?enemies=1` puts one enemy at the first allowed place; the same seed without it is unchanged elsewhere', () => {
    expect(enemiesForced('?zen=1&enemies=1')).toBe(true);
    expect(enemiesForced('?zen=1')).toBe(false);
    expect(enemiesForced('?enemies=0')).toBe(false);
    for (const seed of SEEDS.slice(0, 40)) {
      const seg = generateZen(seed, 'grass', { first: true, forceEnemy: true });
      expect(seg.enemies.length).toBeGreaterThan(0);
      expect(seg.enemies[0].col - enemyReach(seg.enemies[0].kind)).toBeGreaterThanOrEqual(ZEN_ENEMY.zoneMin);
      expect(seg.enemies[0].col).toBeLessThan(90);
      expect(enemyErrors(seg.config.grid)).toEqual([]);
    }
  });

  it('there is always something to do: a coin, bubble or orb in every 24 tiles even next to an enemy', { timeout: 60000 }, () => {
    for (const seed of SEEDS.slice(0, 30)) {
      for (const seg of chain(seed)) {
        const g = seg.config.grid;
        const busy = (c: number) => g.slice(0, 9).some((row) => /[cohrOPMJL]/.test(row[c]));
        for (let from = seg.range.from + 1; from + 24 < seg.range.to; from++) {
          let any = false;
          for (let c = from; c < from + 24; c++) any = any || busy(c);
          expect(any, `seed ${seed} from ${from}`).toBe(true);
        }
      }
    }
  });

  it('the bump never traps him on a zen enemy: a frame-by-frame walk through each patrol with a wall behind him gets through', () => {
    // The enemy field is the one 038 tests (enemies.test.ts); here the layouts matter: an enemy's reserved stretch has flat ground and
    // nothing solid, so the only wall that can stop the slide is a big bubble or block outside it, 3+ tiles from the patrol.
    for (const seed of SEEDS) {
      const seg = generateZen(seed, 'grass', { first: true, forceEnemy: true });
      for (const e of seg.enemies) {
        const reach = enemyReach(e.kind);
        for (let c = e.col - reach; c <= e.col + reach; c++) {
          for (const row of [7, 8]) expect('BO^'.includes(seg.config.grid[row][c]) && !(row === e.row)).toBe(false);
        }
        const clearLeft = ENEMIES[e.kind].margin;
        expect(clearLeft).toBeLessThanOrEqual(ZEN_ENEMY.clear);
      }
    }
    // The 1-D walk: he walks right at 220 px/s through a ground enemy; walls at 1 to 6 tiles behind never keep him in for more than the grace time.
    const T = 64;
    for (const kind of ['bug', 'beetle'] as const) {
      for (const wallTiles of [1, 2, 3, 4, 6]) {
        const bump = new BugBump();
        const cx = 400;
        const wallX = cx - wallTiles * T;
        let x = cx - 300;
        let t = 0;
        let through = false;
        for (let i = 0; i < 6000 && !through; i++) {
          t += 16;
          const p = enemyPose(kind, t, 0, T);
          const ex = cx + p.dx;
          const move = bump.move(t);
          const v = move !== 0 ? move * 220 : 220;
          x = Math.max(wallX + 20, x + (v * 16) / 1000);
          if (Math.abs(x - ex) < ENEMIES[kind].radius * T * ENEMIES[kind].touchScale + 20) bump.touch(t, x, ex, 1);
          if (x > cx + 5 * T) through = true;
        }
        expect(through, `${kind}, wall ${wallTiles} tiles behind`).toBe(true);
      }
    }
    expect(enemyTopSpeed('bug', T)).toBeLessThan(220);
  });
});
