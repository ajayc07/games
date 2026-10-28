import { describe, expect, it } from 'vitest';
import { parseLevel } from './format';
import { extractEntities } from './grid';
import { PHYSICS } from './physics';
import { BUBBLE, bubbleSpecs, shotHitsBubble } from './bubbles';
import { SHOT, SHOT_HEIGHT } from './shots';
import { GRID_TOP, GROUND_Y, gapsOf, runBot, T } from './testBot';
import { generatePractice, makeRng, PRACTICE, PRACTICE_MODES, practiceFromSearch, ROW, type PracticeMode } from './practice';

const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 13);
function level(mode: PracticeMode, seed: number) {
  const p = generatePractice(mode, seed);
  const r = parseLevel(p.config);
  if (!r.ok) throw new Error(r.errors.join('; '));
  return { p, level: r.level, e: extractEntities(r.level.grid) };
}

describe('practice generator (Task 011)', () => {
  it('the random numbers are seeded: same seed, same sequence; different seeds differ', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const c = makeRng(43);
    const sa = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(sa);
    expect(Array.from({ length: 5 }, c)).not.toEqual(sa);
    for (const v of sa) expect(v >= 0 && v < 1).toBe(true);
  });

  for (const mode of PRACTICE_MODES) {
    it(`${mode}: deterministic, and different seeds give different layouts`, () => {
      expect(generatePractice(mode, 1234).config.grid).toEqual(generatePractice(mode, 1234).config.grid);
      const grids = new Set(SEEDS.slice(0, 40).map((s) => generatePractice(mode, s).config.grid.join('\n')));
      expect(grids.size).toBe(40);
      expect(generatePractice(mode, 1).config.grid).not.toEqual(generatePractice(mode, 2).config.grid);
    });

    it(`${mode}: 200 seeds parse, are practice levels with all four buttons, about 120 tiles, and keep the D-045 rules`, () => {
      for (const seed of SEEDS) {
        const { p, level: lv, e } = level(mode, seed);
        const at = `${mode} seed ${seed}`;
        expect(lv.practice, at).toBe(true);
        expect(lv.controls, at).toEqual({ enabled: ['left', 'right', 'jump', 'power'], autoRun: false, tapAnywhereJumps: false, demo: false });
        expect(e.cols, at).toBeGreaterThanOrEqual(110);
        expect(e.cols, at).toBeLessThanOrEqual(135);
        expect(e.start.col).toBe(PRACTICE.startCol);
        expect(e.goal.row).toBe(e.start.row);
        expect(e.solid[e.start.row + 1][e.goal.col], at).toBe(true);
        expect(e.bubbles.some((b) => b.kind === 'big'), `${at}: no big bubbles`).toBe(false);

        const gaps = gapsOf(e);
        expect(gaps.map((g) => ({ col: g[0], width: g.length })), at).toEqual(p.gaps);
        let prevEnd = e.start.col;
        for (const g of gaps) {
          expect([1, 2], at).toContain(g.length);
          expect(g[0] - prevEnd - 1, `${at}: ground before gap ${g[0]}`).toBeGreaterThanOrEqual(PRACTICE.minGround);
          for (let row = e.start.row + 1; row < e.rows; row++) for (const c of g) expect(e.solid[row][c]).toBe(false);
          prevEnd = g[g.length - 1];
        }
        expect(e.goal.col - prevEnd - 1, `${at}: ground before the flag`).toBeGreaterThanOrEqual(PRACTICE.minGround);

        // Every gap can be crossed from a standing start at its edge (D-045: 1 tile needs 44 px, 2 tiles 108 px; a standing jump carries 179+).
        const air = (2 * PHYSICS.jumpVelocity) / PHYSICS.gravity;
        const standing = air * PHYSICS.walkSpeed - (PHYSICS.walkSpeed * PHYSICS.walkRampUpMs) / 2000;
        for (const g of gaps) expect(standing, at).toBeGreaterThanOrEqual(g.length * T - PHYSICS.body.width / 2 + 40);

        // Bubbles: none in a gap or within 1 tile of a gap edge (high ones 2 tiles), all over ground, in the right rows.
        const gapCols = gaps.flat();
        for (const b of e.bubbles) {
          const near = Math.min(Infinity, ...gapCols.map((c) => Math.abs(c - b.col)));
          expect(near, `${at}: bubble at ${b.col}`).toBeGreaterThanOrEqual(b.kind === 'high' ? PRACTICE.highClear : PRACTICE.smallClear);
          expect(e.solid[e.start.row + 1][b.col]).toBe(true);
          expect(b.col).toBeLessThan(e.goal.col);
          if (b.kind === 'high') expect(b.row).toBe(ROW.high);
          else expect([ROW.up, ROW.low]).toContain(b.row);
        }
        // Coins: only in the head-height row or the arc row; never over the start or flag; none right behind a 1-tile gap.
        for (const c of e.coins) {
          expect([ROW.up, ROW.high]).toContain(c.row);
          if (c.row === ROW.high) expect(gapCols, `${at}: arc coin at ${c.col} is over a gap`).toContain(c.col);
        }
        for (const g of gaps.filter((x) => x.length === 1)) {
          expect(e.coins.filter((c) => c.row === ROW.up && c.col > g[0] && c.col <= g[0] + 2), at).toEqual([]);
        }
      }
    });
  }

  it('each focus has its content: walk-shoot 15+ small bubbles, jump-shoot 6+ high bubbles, walk-jump 5+ gaps; everything mixes all three', () => {
    for (const seed of SEEDS) {
      const ws = level('walk-shoot', seed).e;
      expect(ws.bubbles.filter((b) => b.kind === 'small').length, `seed ${seed}`).toBeGreaterThanOrEqual(15);
      expect(gapsOf(ws)).toEqual([]); // walking and shooting only
      expect(level('jump-shoot', seed).e.bubbles.filter((b) => b.kind === 'high').length, `seed ${seed}`).toBeGreaterThanOrEqual(6);
      const wj = level('walk-jump', seed);
      expect(gapsOf(wj.e).length, `seed ${seed}`).toBeGreaterThanOrEqual(5);
      expect(wj.e.bubbles.filter((b) => b.col > PRACTICE.startCol)).toEqual([]); // no bubbles ahead: jumping is the focus
      const ev = generatePractice('everything', seed);
      expect(new Set(ev.chunks), `seed ${seed}`).toEqual(new Set(['shoot', 'air', 'gaps']));
    }
  });

  it('walk-shoot bubbles come 3-4 tiles apart inside a stretch, so walking while tapping Power pops one after another', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const cols = level('walk-shoot', seed).e.bubbles.filter((b) => b.col > PRACTICE.startCol).map((b) => b.col).sort((a, b) => a - b);
      const steps = cols.slice(1).map((c, i) => c - cols[i]);
      const inChunk = steps.filter((s) => s >= 3 && s <= 4).length;
      expect(inChunk / steps.length, `seed ${seed}`).toBeGreaterThan(0.6);
    }
  });

  it('jump-shoot: a 1-tile gap is followed by a small bubble just ahead of the landing', () => {
    let seen = 0;
    for (const seed of SEEDS) {
      const { e, p } = level('jump-shoot', seed);
      for (const g of p.gaps) {
        expect(g.width).toBe(1);
        if (e.bubbles.some((b) => b.kind === 'small' && b.col === g.col + 4)) seen++;
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('every bubble is in reach: small ones from a standing shot, high ones only from the top of a jump (Grass 6 check)', () => {
    for (const mode of PRACTICE_MODES) {
      for (const seed of SEEDS.slice(0, 60)) {
        const { e } = level(mode, seed);
        for (const s of bubbleSpecs(e.bubbles, T, GRID_TOP, e.solid)) {
          const above = GROUND_Y - s.y;
          for (const bob of [-BUBBLE.bobPx[s.kind], 0, BUBBLE.bobPx[s.kind]]) {
            const hit = (h: number) => shotHitsBubble(s.x, GROUND_Y - h, SHOT.radius, s, s.x, s.y + bob);
            if (s.kind === 'high') {
              expect(above).toBeGreaterThan(165);
              for (const h of [SHOT_HEIGHT.standing.min, SHOT_HEIGHT.standing.max, 78]) expect(hit(h), `${mode} ${seed} standing ${h}`).toBe(false);
              for (const h of [SHOT_HEIGHT.jumpPeak.min, SHOT_HEIGHT.jumpPeak.max]) expect(hit(h), `${mode} ${seed} peak ${h}`).toBe(true);
            } else {
              // Shots leave 26-78 px above the feet (both looks, every option, ?size= 0.8-1.6; Grass 4 rule).
              for (const h of [26, SHOT_HEIGHT.standing.min, SHOT_HEIGHT.standing.max, 78]) expect(hit(h), `${mode} ${seed} small at ${above}, shot ${h}`).toBe(true);
            }
          }
        }
      }
    }
  });

  for (const mode of PRACTICE_MODES) {
    it(`${mode}: a scripted bot (walk, shoot, jump at the edges and under high bubbles) finishes 200 seeds with every coin and bubble`, () => {
      for (const seed of SEEDS) {
        const r = runBot(level(mode, seed).e);
        expect(r.fell, `${mode} seed ${seed}: fell at x ${r.x}`).toBe(false);
        expect(r.finished, `${mode} seed ${seed}: stopped at x ${r.x}`).toBe(true);
        expect(r.coinsLeft, `${mode} seed ${seed}: coins left at ${r.coinsLeftAt.join(',')}`).toBe(0);
        expect(r.bubblesLeft, `${mode} seed ${seed}: bubbles left at ${r.bubblesLeftAt.join(',')}`).toBe(0);
        expect(r.seconds, `${mode} seed ${seed}`).toBeLessThan(60);
      }
    });
  }

  it('a run is about 35-45 s of walking for a child who walks on purpose', () => {
    for (const mode of PRACTICE_MODES) {
      const secs = SEEDS.slice(0, 30).map((s) => runBot(level(mode, s).e).seconds);
      const avg = secs.reduce((a, b) => a + b, 0) / secs.length;
      expect(avg, mode).toBeGreaterThan(30);
      expect(avg, mode).toBeLessThan(48);
    }
  });

  it('?practice=<mode> starts that focus, ?practice=1 opens the selector, unknown values warn; ?seed= is read', () => {
    expect(practiceFromSearch('')).toEqual({ open: false, mode: null, seed: null });
    expect(practiceFromSearch('?practice=walk-shoot')).toEqual({ open: true, mode: 'walk-shoot', seed: null });
    expect(practiceFromSearch('?practice=Jump-Shoot&seed=77').mode).toBe('jump-shoot');
    expect(practiceFromSearch('?practice=everything&seed=77').seed).toBe(77);
    expect(practiceFromSearch('?practice=walk-jump').mode).toBe('walk-jump');
    expect(practiceFromSearch('?practice=1')).toEqual({ open: true, mode: null, seed: null, warning: undefined });
    expect(practiceFromSearch('?practice=0').open).toBe(false);
    const bad = practiceFromSearch('?practice=fly&seed=-3');
    expect(bad.open).toBe(true);
    expect(bad.mode).toBeNull();
    expect(bad.seed).toBeNull();
    expect(bad.warning).toMatch(/fly/);
  });
});
