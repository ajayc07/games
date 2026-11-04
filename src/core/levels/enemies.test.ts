import { describe, expect, it } from 'vitest';
import { BUG, BugBump, bugRadius, bugScale, bugSpeed, bugTouches, legMs, patrolHalf, patrolPose, periodMs, shotHitsBug } from './bugs';
import {
  BAT,
  BEETLE,
  ENEMIES,
  ENEMY_LETTER,
  batErrors,
  beetleErrors,
  enemiesFromSearch,
  enemyBeaten,
  enemyCells,
  enemyCoins,
  enemyErrors,
  enemyPose,
  enemyRadius,
  enemyScale,
  enemyTopSpeed,
  enemyTouches,
  shotHitsEnemy,
} from './enemies';
import { patrolPoseOf, patrolSpeed } from './patrol';
import { extractEntities } from './grid';
import { LEGEND, parseLevel } from './format';
import { PHYSICS } from './physics';
import { SHOT, SHOT_HEIGHT } from './shots';
import { earnsSticker } from '../rewards/stickers';
import { DEFAULT_RECIPES } from '../audio/recipes';
import { freshRecord, parseRecord, resetLevels } from '../storage/progress';

const T = 64;
/** A grid 11 rows tall: the standing row is 8 (ground rows 9 and 10). `cells` are [row, col, char]. */
function grid(cols: number, cells: Array<[number, number, string]> = []): string[] {
  const rows = Array.from({ length: 9 }, () => Array(cols).fill('.'));
  rows.push(Array(cols).fill('#'), Array(cols).fill('#'));
  rows[8][1] = 'S';
  rows[8][cols - 2] = 'F';
  for (const [r, c, ch] of cells) rows[r][c] = ch;
  return rows.map((r) => r.join(''));
}
const withGap = (g: string[], col: number) => g.map((r, i) => (i >= 9 ? r.slice(0, col) + '.' + r.slice(col + 1) : r));
const body = (x: number, feet: number) => ({ left: x - 20, right: x + 20, top: feet - 84, bottom: feet });

describe('the Bolt Bug did not change (Task 038 generalised the machinery)', () => {
  it('its table entry mirrors BUG and its pose is the old triangle wave to the pixel', () => {
    const d = ENEMIES.bug;
    expect(d.hits).toBe(BUG.hits);
    expect(d.coins).toBe(BUG.coins);
    expect(d.scales).toEqual(BUG.scales);
    expect(d.hitScale).toBe(BUG.hitScale);
    expect(d.touchScale).toBe(BUG.touchScale);
    expect(enemyRadius('bug', T)).toBe(bugRadius(T));
    expect(patrolSpeed(d.patrol!)).toBeCloseTo(bugSpeed());
    expect(patrolHalf(T)).toBe(2 * T);
    expect(legMs(T)).toBeGreaterThan(0);
    for (let t = 0; t < 2 * periodMs(T); t += 37) {
      for (const phase of [0, 0.3, 0.618]) {
        expect(enemyPose('bug', t, phase, T)).toEqual({ ...patrolPose(t, phase, T), dy: 0 });
        expect(patrolPoseOf(d.patrol!, t, phase, T)).toEqual(patrolPose(t, phase, T));
      }
    }
    for (const h of [0, 1, 2, 3, 9]) expect(enemyScale('bug', h)).toBe(bugScale(h));
    expect(enemyBeaten('bug', 2)).toBe(false);
    expect(enemyBeaten('bug', 3)).toBe(true);
  });

  it('its shot and touch tests are the same as before', () => {
    const r = bugRadius(T);
    for (const dy of [-60, -30, 0, 30, 60, 100]) for (const dx of [-50, 0, 40, 80]) {
      expect(shotHitsEnemy('bug', 100 + dx, 300 + dy, SHOT.radius, r, 100, 300)).toBe(shotHitsBug(100 + dx, 300 + dy, SHOT.radius, r, 100, 300));
    }
    for (const x of [100, 130, 150, 170]) expect(enemyTouches('bug', body(x, 500), 100, 500 - r, r)).toBe(bugTouches(body(x, 500), 100, 500 - r, r));
  });
});

describe('the Rock Beetle (Task 038)', () => {
  const d = ENEMIES.beetle;
  it('is about 1.4 tiles wide, patrols 6 tiles at 55% of his walk, takes 5 shots and pops into 8 coins', () => {
    expect(enemyRadius('beetle', T) * 2).toBeGreaterThan(1.3 * T);
    expect(enemyRadius('beetle', T) * 2).toBeLessThan(1.5 * T);
    expect(patrolSpeed(d.patrol!)).toBeCloseTo(PHYSICS.walkSpeed * 0.55);
    expect(d.patrol!.patrolTiles).toBe(6);
    expect(BEETLE.hits).toBe(5);
    expect([1, 2, 3, 4, 5].map((h) => enemyBeaten('beetle', h))).toEqual([false, false, false, false, true]);
    expect(BEETLE.coins).toBe(8);
    expect(enemyCoins([{ kind: 'beetle' }, { kind: 'beetle' }])).toBe(16);
  });

  it('shrinks a little with each hit and never below about three quarters', () => {
    const s = [0, 1, 2, 3, 4].map((h) => enemyScale('beetle', h));
    expect(s[0]).toBe(1);
    for (let i = 1; i < s.length; i++) expect(s[i]).toBeLessThan(s[i - 1]);
    expect(s[4]).toBeGreaterThanOrEqual(0.7);
    expect(enemyScale('beetle', 99)).toBe(s[4]);
  });

  it('peeks for a whole second at each end of its patrol and the patrol stays inside +-3 tiles', () => {
    expect(d.patrol!.turnPauseMs).toBe(1000);
    const half = 3 * T;
    let min = Infinity;
    let max = -Infinity;
    let peekMs = 0;
    for (let t = 0; t < 3 * 2 * ((6 * T) / patrolSpeed(d.patrol!) * 1000 + 1000); t += 10) {
      const p = enemyPose('beetle', t, 0, T);
      min = Math.min(min, p.dx);
      max = Math.max(max, p.dx);
      if (!p.moving) peekMs += 10;
      expect(Math.abs(p.dx)).toBeLessThanOrEqual(half + 1e-6);
    }
    expect(max - min).toBeGreaterThan(2 * half - 4);
    expect(peekMs).toBeGreaterThan(5 * 1000); // three periods = six peeks of 1 s
  });

  it('a shot reaches it from both standing muzzle heights, at the jump peak and with every picture size', () => {
    const r = enemyRadius('beetle', T);
    const cy = 5 * T - r;
    for (const h of [SHOT_HEIGHT.standing.min, SHOT_HEIGHT.standing.max]) {
      for (let hits = 0; hits < BEETLE.hits; hits++) expect(shotHitsEnemy('beetle', 100, 5 * T - h, SHOT.radius, r, 100, cy), `muzzle ${h}, ${hits} hits`).toBe(true);
    }
    // From a jump peak (muzzle 177+) a shot flies over it.
    expect(shotHitsEnemy('beetle', 100, 5 * T - SHOT_HEIGHT.jumpPeak.min, SHOT.radius, r, 100, cy)).toBe(false);
  });

  it('a jump over it (peak 160 px) never touches it, walking into it does', () => {
    const r = enemyRadius('beetle', T);
    const ground = 500;
    expect(enemyTouches('beetle', body(100, ground), 100, ground - r, r)).toBe(true);
    expect(enemyTouches('beetle', body(100, ground - 150), 100, ground - r, r)).toBe(false);
  });

  it('beetle rules: 6 flat clear tiles plus 3 each side, nothing inside', () => {
    expect(beetleErrors(grid(40, [[8, 20, 'k']]))).toEqual([]);
    expect(beetleErrors(withGap(grid(40, [[8, 20, 'k']]), 27))).toEqual([]); // 7 columns away is fine (6 = 3 patrol + 3 clear)
    expect(beetleErrors(withGap(grid(40, [[8, 20, 'k']]), 26)).length).toBeGreaterThan(0);
    expect(beetleErrors(withGap(grid(40, [[8, 20, 'k']]), 14)).length).toBeGreaterThan(0);
    expect(beetleErrors(withGap(grid(40, [[8, 20, 'k']]), 13))).toEqual([]);
    expect(beetleErrors(grid(40, [[8, 4, 'k']])).length).toBeGreaterThan(0); // no room at the level edge
    for (const [r, c, ch] of [[8, 25, 'B'], [8, 15, '^'], [8, 26, 'P'], [8, 14, 'L'], [7, 26, 'B'], [8, 24, 'S']] as const) {
      expect(beetleErrors(grid(40, [[8, 20, 'k'], [r, c, ch]])).length, `${ch} at ${r},${c}`).toBeGreaterThan(0);
    }
    for (const [r, c, ch] of [[8, 18, 'c'], [7, 20, 'c'], [6, 22, 'c'], [8, 23, 'o'], [7, 17, 'h'], [8, 21, 'r']] as const) {
      expect(beetleErrors(grid(40, [[8, 20, 'k'], [r, c, ch]])).length, `${ch} inside at ${r},${c}`).toBeGreaterThan(0);
    }
    // Coins and bubbles just outside the patrol (its cells are columns 17-23) are fine.
    expect(beetleErrors(grid(40, [[8, 20, 'k'], [7, 24, 'c'], [8, 25, 'o']]))).toEqual([]);
  });
});

describe('the Glow Bat (Task 038)', () => {
  it('is small, flies a slow 4-tile sine 1.5 tiles above the ground, takes 3 shots and pops into 6 coins', () => {
    expect(BAT.patrolTiles).toBe(4);
    expect(BAT.hits).toBe(3);
    expect(BAT.coins).toBe(6);
    expect(enemyRadius('bat', T) * 2).toBeLessThan(1.1 * T);
    // The fastest point of the sine is about half his walk (slow, never a chase).
    expect(enemyTopSpeed('bat', T)).toBeLessThan(PHYSICS.walkSpeed * 0.6);
    let min = Infinity;
    let max = -Infinity;
    let dyMax = -Infinity;
    let dyMin = Infinity;
    for (let t = 0; t < 2 * BAT.periodMs; t += 20) {
      const p = enemyPose('bat', t, 0.3, T);
      min = Math.min(min, p.dx);
      max = Math.max(max, p.dx);
      dyMax = Math.max(dyMax, p.dy);
      dyMin = Math.min(dyMin, p.dy);
      expect(p.dir).toBe(Math.cos(((t / BAT.periodMs + 0.3) % 1) * 2 * Math.PI) >= 0 ? 1 : -1);
    }
    expect(max - min).toBeGreaterThan(4 * T - 4);
    expect(max).toBeLessThanOrEqual(2 * T + 1e-6);
    // The bob only lifts it: it never dips below its cell (so a standing robot walks under it).
    expect(dyMax).toBeLessThanOrEqual(0);
    expect(dyMin).toBeGreaterThanOrEqual(-BAT.bobPx - 1e-6);
    // Speed never beats the top speed.
    for (let t = 0; t < BAT.periodMs; t += 25) {
      const a = enemyPose('bat', t, 0, T).dx;
      const b = enemyPose('bat', t + 25, 0, T).dx;
      expect(Math.abs(b - a) / 0.025).toBeLessThanOrEqual(enemyTopSpeed('bat', T) + 1e-6);
    }
    expect(enemyPose('bat', 1234, 0, T).dx).not.toBeCloseTo(enemyPose('bat', 1234, 0.618, T).dx);
  });

  it('a shot reaches it from both standing muzzle heights, all along its sine and bob, with every picture size', () => {
    const r = enemyRadius('bat', T);
    const ground = 5 * T;
    for (let t = 0; t < BAT.periodMs; t += 50) {
      const p = enemyPose('bat', t, 0, T);
      const by = ground - 1.5 * T; // hits use the middle of its cell; the bob only lifts the picture
      for (const h of [SHOT_HEIGHT.standing.min, SHOT_HEIGHT.standing.max]) {
        expect(shotHitsEnemy('bat', 200 + p.dx, ground - h, SHOT.radius, r, 200 + p.dx, by), `muzzle ${h}, t ${t}`).toBe(true);
      }
    }
    // While he jumps, the muzzle rises through the bat's height (muzzle = standing height + the jump height).
    const jumpHeights = Array.from({ length: 17 }, (_, i) => i * 10);
    expect(jumpHeights.some((j) => shotHitsEnemy('bat', 200, ground - (SHOT_HEIGHT.standing.min + j), SHOT.radius, r, 200, ground - 1.5 * T))).toBe(true);
    expect(jumpHeights.filter((j) => shotHitsEnemy('bat', 200, ground - (SHOT_HEIGHT.standing.max + j), SHOT.radius, r, 200, ground - 1.5 * T)).length).toBeGreaterThanOrEqual(4);
    // The hit circle stays full size however much the picture shrinks (the test uses the radius of the full picture).
    expect(enemyScale('bat', 2)).toBeLessThan(1);
    expect(shotHitsEnemy('bat', 200, ground - SHOT_HEIGHT.standing.min, SHOT.radius, r, 200, ground - 1.5 * T)).toBe(true);
  });

  it('he walks under it standing (never a touch at any pose), and a jump into it bumps', () => {
    const r = enemyRadius('bat', T);
    const ground = 5 * T;
    for (let t = 0; t < BAT.periodMs; t += 25) {
      const p = enemyPose('bat', t, 0, T);
      const by = ground - 1.5 * T;
      for (const dx of [-30, -10, 0, 10, 30]) {
        expect(enemyTouches('bat', body(200 + p.dx + dx, ground), 200 + p.dx, by, r, 1), `t ${t} dx ${dx}`).toBe(false);
      }
    }
    // Jumping up into it: the head reaches its height on the way up; at the peak (160 px) his feet are above it, so he passes over.
    expect(enemyTouches('bat', body(200, ground - 20), 200, ground - 1.5 * T, r, 1)).toBe(true);
    expect(enemyTouches('bat', body(200, ground - 60), 200, ground - 1.5 * T, r, 1)).toBe(true);
    expect(enemyTouches('bat', body(200, ground - 160), 200, ground - 1.5 * T, r, 1)).toBe(false);
    // Shrunk bats are smaller and still never touch a standing robot.
    expect(enemyTouches('bat', body(200, ground), 200, ground - 1.5 * T, r, enemyScale('bat', 2))).toBe(false);
  });

  it('bat rules: its cell is two rows above flat ground, clear below and around it', () => {
    const ok = grid(40, [[7, 20, 'w']]);
    expect(batErrors(ok)).toEqual([]);
    expect(batErrors(grid(40, [[6, 20, 'w']])).length).toBeGreaterThan(0); // too high
    expect(batErrors(grid(40, [[8, 20, 'w']])).length).toBeGreaterThan(0); // too low
    expect(batErrors(withGap(ok, 24))).toEqual([]); // ground must be flat from column 17 to 23 (its 2-tile sine plus 1)
    expect(batErrors(withGap(ok, 23)).length).toBeGreaterThan(0);
    expect(batErrors(withGap(ok, 17)).length).toBeGreaterThan(0);
    expect(batErrors(withGap(ok, 16))).toEqual([]);
    expect(batErrors(grid(40, [[7, 2, 'w']])).length).toBeGreaterThan(0);
    for (const [r, c, ch] of [[8, 21, 'B'], [8, 22, '^'], [7, 23, 'B'], [6, 21, 'B'], [8, 18, 'P'], [8, 17, 'O'], [8, 22, 'S'], [8, 19, 'F']] as const) {
      expect(batErrors(grid(40, [[7, 20, 'w'], [r, c, ch]])).length, `${ch} at ${r},${c}`).toBeGreaterThan(0);
    }
    for (const [r, c, ch] of [[8, 20, 'c'], [7, 19, 'c'], [6, 22, 'o'], [8, 22, 'o'], [7, 18, 'h']] as const) {
      expect(batErrors(grid(40, [[7, 20, 'w'], [r, c, ch]])).length, `${ch} under it at ${r},${c}`).toBeGreaterThan(0);
    }
    // Coins and bubbles beside its sine and a coin well above it are fine.
    expect(batErrors(grid(40, [[7, 20, 'w'], [8, 24, 'o'], [7, 16, 'c'], [5, 20, 'c']]))).toEqual([]);
  });
});

describe('enemies together', () => {
  it('the letters are in the legend, the grid reports every kind, and none is solid', () => {
    expect(LEGEND.g).toBe('bolt bug');
    expect(LEGEND.k).toBe('rock beetle');
    expect(LEGEND.w).toBe('glow bat');
    expect(ENEMY_LETTER).toEqual({ bug: 'g', beetle: 'k', bat: 'w' });
    const g = grid(70, [[8, 15, 'g'], [8, 30, 'k'], [7, 45, 'w']]);
    expect(enemyCells(g)).toEqual([{ kind: 'bat', col: 45, row: 7 }, { kind: 'bug', col: 15, row: 8 }, { kind: 'beetle', col: 30, row: 8 }]); // reading order
    const e = extractEntities(g);
    expect(e.enemies).toEqual(enemyCells(g));
    expect(e.bugs).toEqual([{ col: 15, row: 8 }]);
    expect(e.solid[8].some(Boolean)).toBe(false);
    expect(e.solid[7].some(Boolean)).toBe(false);
    expect(enemyErrors(g)).toEqual([]);
  });

  it('enemies keep 6 columns between their middles (two bugs still 7)', () => {
    const near = (a: [number, number, string], b: [number, number, string]) => enemyErrors(grid(80, [a, b])).filter((e) => e.includes('closer than'));
    expect(near([8, 20, 'k'], [8, 36, 'k']).length).toBe(0);
    expect(enemyErrors(grid(80, [[8, 20, 'k'], [8, 25, 'g']])).length).toBeGreaterThan(0); // 5 columns: too close
    expect(near([7, 20, 'w'], [7, 25, 'w']).length).toBe(1);
    expect(near([7, 20, 'w'], [7, 26, 'w']).length).toBe(0);
    expect(near([8, 20, 'k'], [7, 25, 'w']).length).toBe(1);
    expect(near([8, 20, 'g'], [8, 27, 'g']).length).toBe(0);
    expect(near([8, 20, 'g'], [8, 26, 'g']).length).toBe(1); // the Bolt Bug's own rule
  });

  it('parseLevel reports a bad beetle or bat in readable words and accepts a good one', () => {
    const base = { version: 1, id: 'x', world: 'cave', title: 'x', controls: { enabled: ['left', 'right'], autoRun: false, tapAnywhereJumps: false, demo: false }, tileSize: 64, stars: { two: 1, three: 2 } };
    expect(parseLevel({ ...base, grid: grid(60, [[8, 25, 'k'], [7, 45, 'w']]) }).ok).toBe(true);
    const bad = parseLevel({ ...base, grid: grid(60, [[8, 25, 'k'], [8, 29, 'B']]) });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.join(' ')).toMatch(/beetle at row 9, column 26/);
    const badBat = parseLevel({ ...base, grid: grid(60, [[8, 25, 'w']]) });
    expect(badBat.ok).toBe(false);
    if (!badBat.ok) expect(badBat.errors.join(' ')).toMatch(/bat at row 9, column 26/);
  });

  it('?enemies=0 hides the beetles and bats, anything else leaves them', () => {
    expect(enemiesFromSearch('')).toBe(true);
    expect(enemiesFromSearch('?enemies=1')).toBe(true);
    expect(enemiesFromSearch('?level=cave-2&enemies=0')).toBe(false);
  });
});

describe('the gentle bump never traps him, for every patrol (Task 038)', () => {
  /**
   * A 1-D world frame by frame: he holds Right at walk speed with a wall `wallAt` behind him; the enemy walks its real patrol (the
   * beetle or the bug) around x = 600. He must always get through to the other side within a few seconds.
   */
  for (const kind of ['bug', 'beetle'] as const) {
    it(`${kind}: walking right through its patrol always gets through, with a wall behind him`, () => {
      const r = enemyRadius(kind, T);
      const reach = 20 + r * ENEMIES[kind].touchScale;
      const half = (ENEMIES[kind].patrol!.patrolTiles * T) / 2;
      for (const phase of [0, 0.25, 0.5, 0.75]) {
        for (const wallAt of [100, 300, 450, 520]) {
          let x = wallAt + 20;
          const bump = new BugBump();
          let passed = false;
          let bumps = 0;
          for (let t = 0; t < 40_000; t += 16) {
            const ex = 600 + enemyPose(kind, t, phase, T).dx;
            if (Math.abs(x - ex) < reach && bump.touch(t, x, ex, 1)) bumps++;
            const forced = bump.move(t);
            const move = forced !== 0 ? forced : 1;
            x = Math.max(wallAt, x + move * PHYSICS.walkSpeed * 0.016);
            if (x > 600 + half + reach + 5) {
              passed = true;
              break;
            }
          }
          expect(passed, `${kind} phase ${phase} wall ${wallAt}`).toBe(true);
          expect(bumps).toBeLessThan(40);
        }
      }
    });

    it(`${kind}: walking left through its patrol also gets through`, () => {
      const r = enemyRadius(kind, T);
      const reach = 20 + r * ENEMIES[kind].touchScale;
      const half = (ENEMIES[kind].patrol!.patrolTiles * T) / 2;
      for (const phase of [0, 0.4, 0.8]) {
        let x = 600 + half + 200;
        const bump = new BugBump();
        let passed = false;
        for (let t = 0; t < 40_000; t += 16) {
          const ex = 600 + enemyPose(kind, t, phase, T).dx;
          if (Math.abs(x - ex) < reach) bump.touch(t, x, ex, -1);
          const forced = bump.move(t);
          x += (forced !== 0 ? forced : -1) * PHYSICS.walkSpeed * 0.016;
          if (x < 600 - half - reach - 5) {
            passed = true;
            break;
          }
        }
        expect(passed, `${kind} phase ${phase}`).toBe(true);
      }
    });
  }

  it('the bump numbers are the same for every kind (a 300 ms slide, then an 800 ms grace)', () => {
    expect(BUG.bump).toEqual({ slideMs: 300, graceMs: 800 });
  });
});

describe('stickers, saved flags and sounds', () => {
  it('each enemy kind earns a sticker through the sticker rules (the universe checks it is the first of that kind)', () => {
    for (const k of ['bug', 'beetle', 'bat'] as const) expect(earnsSticker(k, null, 0)).toBe(true);
    expect(earnsSticker('finish', null, 0)).toBe(false);
  });

  it('the beaten kinds are saved, cleaned on load and kept when progress is reset', () => {
    expect(freshRecord().enemiesBeaten).toEqual([]);
    const rec = { ...freshRecord(), enemiesBeaten: ['beetle', 'bat'], bugBeaten: true };
    const back = parseRecord(JSON.stringify(rec)).record;
    expect(back.enemiesBeaten).toEqual(['beetle', 'bat']);
    expect(resetLevels(back).enemiesBeaten).toEqual(['beetle', 'bat']);
    expect(parseRecord(JSON.stringify({ version: 1 })).record.enemiesBeaten).toEqual([]);
    expect(parseRecord(JSON.stringify({ version: 1, enemiesBeaten: 'bat' })).record.enemiesBeaten).toEqual([]);
    expect(parseRecord(JSON.stringify({ version: 1, enemiesBeaten: ['bat', 'bat', 5, ''] })).record.enemiesBeaten).toEqual(['bat']);
  });

  it('every enemy sound exists as a tone recipe, the flap is quiet and the pops are rewarding', () => {
    for (const id of ['beetleHit', 'beetlePop', 'batFlap', 'batPop'] as const) expect(DEFAULT_RECIPES[id].tones.length).toBeGreaterThan(0);
    for (const k of ['beetle', 'bat'] as const) {
      expect(DEFAULT_RECIPES[ENEMIES[k].popSound as 'beetlePop']).toBeDefined();
    }
    expect(DEFAULT_RECIPES[ENEMIES.beetle.hitSound as 'beetleHit']).toBeDefined();
    for (const t of DEFAULT_RECIPES.batFlap.tones) expect(t.gain ?? 1).toBeLessThanOrEqual(0.1);
    // Different from each other and from the Bolt Bug pop.
    expect(DEFAULT_RECIPES.beetlePop).not.toEqual(DEFAULT_RECIPES.bugPop);
    expect(DEFAULT_RECIPES.batPop).not.toEqual(DEFAULT_RECIPES.bugPop);
    expect(DEFAULT_RECIPES.beetleHit).not.toEqual(DEFAULT_RECIPES.batFlap);
  });
});
