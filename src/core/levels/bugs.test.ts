import { describe, expect, it } from 'vitest';
import { BUG, BugBump, bugBeaten, bugCells, bugErrors, bugRadius, bugScale, bugSpeed, bugTouches, bugsFromSearch, legMs, patrolHalf, patrolPose, periodMs, shotHitsBug } from './bugs';
import { PHYSICS } from './physics';
import { SHOT, SHOT_HEIGHT } from './shots';
import { extractEntities } from './grid';
import { LEGEND, parseLevel } from './format';
import { earnsSticker } from '../rewards/stickers';

const T = 64;
const flat = (n = 30, top: string[] = []) => [...Array(Math.max(0, 8 - top.length)).fill('.'.repeat(n)), ...top, '#'.repeat(n), '#'.repeat(n)];
/** A grid with a bug at column `col` on row 8 (the row above the ground), plus optional extra cells. */
function grid(cols: number, cells: Array<[number, number, string]> = [], bugCols: number[] = [15]): string[] {
  const rows = Array.from({ length: 9 }, () => Array(cols).fill('.'));
  rows.push(Array(cols).fill('#'), Array(cols).fill('#'));
  for (const c of bugCols) rows[8][c] = 'g';
  rows[8][1] = 'S';
  rows[8][cols - 2] = 'F';
  for (const [r, c, ch] of cells) rows[r][c] = ch;
  return rows.map((r) => r.join(''));
}

describe('Bolt Bug numbers (Task 035, D-079)', () => {
  it('is about a tile wide, slow (40% of his walk) and patrols 4 tiles', () => {
    expect(bugRadius(T) * 2).toBeGreaterThan(0.8 * T);
    expect(bugRadius(T) * 2).toBeLessThan(1.1 * T);
    expect(bugSpeed()).toBeCloseTo(PHYSICS.walkSpeed * 0.4);
    expect(patrolHalf(T) * 2).toBe(4 * T);
    expect(legMs(T)).toBeCloseTo((4 * T) / bugSpeed() * 1000);
    expect(BUG.coins).toBe(5);
    expect(BUG.hits).toBe(3);
  });

  it('the patrol is a triangle wave inside +-2 tiles: right, a pause and hop, left, a pause and hop', () => {
    const half = patrolHalf(T);
    let min = Infinity;
    let max = -Infinity;
    let hops = 0;
    for (let t = 0; t < 3 * periodMs(T); t += 20) {
      const p = patrolPose(t, 0, T);
      min = Math.min(min, p.dx);
      max = Math.max(max, p.dx);
      if (p.turn > 0.99) hops++;
    }
    expect(min).toBeGreaterThanOrEqual(-half - 1e-6);
    expect(max).toBeLessThanOrEqual(half + 1e-6);
    expect(max - min).toBeGreaterThan(2 * half - 4);
    expect(hops).toBeGreaterThanOrEqual(2);
    // Starts at the left end heading right, faces the way it goes, and its speed never beats 40% of a walk.
    expect(patrolPose(0, 0, T)).toMatchObject({ dx: -half, dir: 1, moving: true });
    expect(patrolPose(legMs(T) + 10, 0, T).dir).toBe(1);
    expect(patrolPose(legMs(T) + BUG.turnPauseMs + 10, 0, T).dir).toBe(-1);
    for (let t = 0; t < periodMs(T); t += 25) {
      const a = patrolPose(t, 0.3, T).dx;
      const b = patrolPose(t + 25, 0.3, T).dx;
      expect(Math.abs(b - a) / 0.025).toBeLessThanOrEqual(bugSpeed() + 1e-6);
    }
    // Two phases are never in step.
    expect(patrolPose(1000, 0, T).dx).not.toBeCloseTo(patrolPose(1000, 0.618, T).dx);
  });

  it('three shots beat it, shrinking it each time, and a shot reaches it from every muzzle height', () => {
    expect([1, 2, 3].map(bugBeaten)).toEqual([false, false, true]);
    expect([0, 1, 2].map(bugScale)).toEqual([1, 0.82, 0.66]);
    expect(bugScale(9)).toBe(0.66);
    const r = bugRadius(T);
    const cy = 5 * T - r; // standing on ground y = 5 * T
    for (const h of [SHOT_HEIGHT.standing.min, SHOT_HEIGHT.standing.max]) {
      expect(shotHitsBug(100, 5 * T - h, SHOT.radius, r, 100, cy), `muzzle ${h}`).toBe(true);
    }
    // The hit circle stays full size however much the picture shrinks (so the third shot is as easy as the first).
    expect(shotHitsBug(100, 5 * T - SHOT_HEIGHT.standing.max, SHOT.radius, r, 100, cy)).toBe(true);
    // A shot well above it (a jump peak) misses.
    expect(shotHitsBug(100, 5 * T - 200, SHOT.radius, r, 100, cy)).toBe(false);
  });

  it('a touch needs the body to overlap the bug; a jump over it does not touch', () => {
    const r = bugRadius(T);
    const ground = 500;
    const body = (x: number, feet: number) => ({ left: x - 20, right: x + 20, top: feet - 84, bottom: feet });
    expect(bugTouches(body(100, ground), 100, ground - r, r)).toBe(true);
    expect(bugTouches(body(100 + 20 + r * BUG.touchScale - 2, ground), 100, ground - r, r)).toBe(true);
    expect(bugTouches(body(100 + 20 + r + 3, ground), 100, ground - r, r)).toBe(false);
    // At the top of a jump (peak 160 px) he is above it.
    expect(bugTouches(body(100, ground - 160), 100, ground - r, r)).toBe(false);
  });
});

describe('the gentle bump never traps him', () => {
  it('a touch slides him away for 300 ms, then there is a grace time with no bump at all', () => {
    const b = new BugBump();
    expect(b.move(0)).toBe(0);
    expect(b.touch(1000, 90, 100, 1)).toBe(true);
    expect(b.move(1000)).toBe(-1); // he is left of the bug: away is left
    expect(b.move(1000 + BUG.bump.slideMs - 1)).toBe(-1);
    expect(b.move(1000 + BUG.bump.slideMs)).toBe(0);
    // Touching again during the slide and the grace time does nothing.
    expect(b.touch(1100, 90, 100, 1)).toBe(false);
    expect(b.touch(1000 + BUG.bump.slideMs + BUG.bump.graceMs - 1, 90, 100, 1)).toBe(false);
    // After the grace time a new touch bumps again.
    expect(b.touch(1000 + BUG.bump.slideMs + BUG.bump.graceMs, 110, 100, 1)).toBe(true);
    expect(b.move(1000 + BUG.bump.slideMs + BUG.bump.graceMs)).toBe(1);
    // Exactly on top: away from where he faces.
    const c = new BugBump();
    c.touch(0, 100, 100, 1);
    expect(c.move(0)).toBe(-1);
    c.reset();
    expect(c.move(0)).toBe(0);
  });

  it('walking into a bug with a wall right behind him, he still gets through it (simulated frame by frame)', () => {
    // A 1-D world: he holds Right at walk speed; the bug stands still (worst case) at x = 300; a wall at `wallAt` stops the slide.
    for (const wallAt of [200, 240, 252, 256]) {
      let x = wallAt;
      const bump = new BugBump();
      let passed = false;
      let bumps = 0;
      for (let t = 0; t < 6000; t += 16) {
        let move: -1 | 0 | 1 = 1;
        if (Math.abs(x - 300) < 20 + bugRadius(T) * BUG.touchScale && bump.touch(t, x, 300, 1)) bumps++;
        const forced = bump.move(t);
        if (forced !== 0) move = forced;
        x = Math.max(wallAt, x + move * PHYSICS.walkSpeed * 0.016);
        if (x > 300 + 20 + bugRadius(T)) passed = true;
      }
      expect(passed, `wall at ${wallAt}`).toBe(true);
      expect(bumps, `wall at ${wallAt}`).toBeLessThanOrEqual(1);
    }
  });

  it('mashing the other way cannot hold him: even a bump every grace time leaves him free to jump away or walk on', () => {
    const b = new BugBump();
    let bumps = 0;
    for (let t = 0; t < 10_000; t += 16) if (b.touch(t, 90, 100, 1)) bumps++;
    // One bump per (slide + grace), so the bug is never a wall that holds him.
    expect(bumps).toBeLessThanOrEqual(Math.ceil(10_000 / (BUG.bump.slideMs + BUG.bump.graceMs)));
    expect(BUG.bump.graceMs).toBeGreaterThan(BUG.bump.slideMs);
  });
});

describe('level rules for bugs', () => {
  it('the letter g is in the legend and the grid reports bugs (not solid)', () => {
    expect(LEGEND.g).toBe('bolt bug');
    const g = grid(40, [], [15, 30]);
    expect(bugCells(g)).toEqual([{ col: 15, row: 8 }, { col: 30, row: 8 }]);
    const e = extractEntities(g);
    expect(e.bugs).toEqual([{ col: 15, row: 8 }, { col: 30, row: 8 }]);
    expect(e.solid[8].some(Boolean)).toBe(false);
  });

  it('a flat, clear patrol is accepted', () => {
    expect(bugErrors(grid(40))).toEqual([]);
    expect(bugErrors(grid(40, [], [15, 30]))).toEqual([]);
    // Coins and bubbles beyond the patrol (3 tiles away) are fine.
    expect(bugErrors(grid(40, [[7, 21, 'c'], [8, 10, 'o'], [8, 20, 'o']]))).toEqual([]);
  });

  it('rejects a gap within 3 columns of the patrol, near the room to the level edge, or a gap under it', () => {
    const gap = (col: number) => grid(40).map((r, i) => (i >= 9 ? r.slice(0, col) + '.' + r.slice(col + 1) : r));
    expect(bugErrors(gap(20)).length).toBeGreaterThan(0); // 5 columns right: inside the margin (ends at 20)
    expect(bugErrors(gap(10)).length).toBeGreaterThan(0);
    expect(bugErrors(gap(21))).toEqual([]);
    expect(bugErrors(gap(9))).toEqual([]);
    expect(bugErrors(gap(15)).length).toBeGreaterThan(0);
    expect(bugErrors(grid(40, [], [3])).length).toBeGreaterThan(0);
    expect(bugErrors(grid(40, [], [37])).length).toBeGreaterThan(0);
  });

  it('rejects blocks, pads, orbs, big bubbles, the start or the goal near the patrol, and anything inside it', () => {
    for (const [r, c, ch] of [[8, 19, 'B'], [8, 11, '^'], [8, 12, 'P'], [8, 18, 'L'], [7, 20, 'B'], [8, 13, 'S'], [8, 17, 'F']] as const) {
      expect(bugErrors(grid(40, [[r, c, ch]])).length, `${ch} at ${r},${c}`).toBeGreaterThan(0);
    }
    for (const [r, c, ch] of [[8, 14, 'c'], [7, 16, 'c'], [6, 15, 'c'], [8, 17, 'o'], [7, 13, 'h'], [8, 14, 'r']] as const) {
      expect(bugErrors(grid(40, [[r, c, ch]])).length, `${ch} inside the patrol at ${r},${c}`).toBeGreaterThan(0);
    }
    // A big bubble 2x2 close by.
    expect(bugErrors(grid(40, [[7, 19, 'O'], [7, 20, 'O'], [8, 19, 'O'], [8, 20, 'O']])).length).toBeGreaterThan(0);
  });

  it('two bugs need 7 columns between their middles', () => {
    expect(bugErrors(grid(60, [], [15, 22])).filter((e) => e.includes('closer than')).length).toBe(0);
    expect(bugErrors(grid(60, [], [15, 21])).filter((e) => e.includes('closer than')).length).toBe(1);
  });

  it('parseLevel reports a bad bug in readable words and accepts a good level', () => {
    const base = {
      version: 1,
      id: 'bug-x',
      world: 'grass',
      title: 'x',
      controls: { enabled: ['left', 'right'], autoRun: false, tapAnywhereJumps: false, demo: false },
      tileSize: 64,
      stars: { two: 1, three: 2 },
    };
    expect(parseLevel({ ...base, grid: grid(40) }).ok).toBe(true);
    const bad = parseLevel({ ...base, grid: grid(40, [[8, 19, 'B']]) });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.join(' ')).toMatch(/bug at row 9, column 16/);
  });

  it('flat helper is a sane grid (the test helper itself)', () => {
    expect(flat(5).length).toBe(10);
  });
});

describe('beating a bug', () => {
  it('?bugs=0 hides the bugs, anything else leaves them', () => {
    expect(bugsFromSearch('')).toBe(true);
    expect(bugsFromSearch('?bugs=1')).toBe(true);
    expect(bugsFromSearch('?level=bug-1&bugs=0')).toBe(false);
  });

  it('the first bug earns a sticker through the sticker rules (the universe checks it is the first)', () => {
    expect(earnsSticker('bug', null, 0)).toBe(true);
    expect(earnsSticker('mega', null, 0)).toBe(true);
    expect(earnsSticker('finish', null, 0)).toBe(false);
  });
});
