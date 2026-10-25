import { describe, expect, it } from 'vitest';
import { parseLevel } from './format';
import { extractEntities } from './grid';
import { PHYSICS } from './physics';
import { bubbleSpecs, BUBBLE, shotHitsBubble } from './bubbles';
import { SHOT, SHOT_HEIGHT } from './shots';
import { edgeLimit, rampSpeed } from './walk';
import { generatePractice, makeRng, PRACTICE, PRACTICE_MODES, practiceFromSearch, ROW, type PracticeMode } from './practice';

const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 13);
const T = PRACTICE.tileSize;
const GRID_TOP = 720 - PRACTICE.rows * T;
const GROUND_Y = GRID_TOP + ROW.ground * T;

/** Runs of missing ground in the row under the start. */
function gapsOf(e: ReturnType<typeof extractEntities>): number[][] {
  const out: number[][] = [];
  e.solid[e.start.row + 1].forEach((s, c) => {
    if (s) return;
    const last = out[out.length - 1];
    if (last && last[last.length - 1] === c - 1) last.push(c);
    else out.push([c]);
  });
  return out;
}

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
        expect(e.flag.row).toBe(e.start.row);
        expect(e.solid[e.start.row + 1][e.flag.col], at).toBe(true);
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
        expect(e.flag.col - prevEnd - 1, `${at}: ground before the flag`).toBeGreaterThanOrEqual(PRACTICE.minGround);

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
          expect(b.col).toBeLessThan(e.flag.col);
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

/**
 * A tiny kinematic copy of the level physics (walk ramp, gravity, fixed jump, shots, coin pick-up) and a bot that plays
 * like a child who knows what to do: turn round and pop the pair behind the start, then walk right tapping Power, jump at
 * each gap edge, and jump under each high bubble pressing Power at the top. It checks what the generator promises: the
 * flag is reachable and every coin and bubble can be collected without a fall.
 */
function runBot(e: ReturnType<typeof extractEntities>) {
  const W = e.cols * T;
  const dtMs = 1000 / 60;
  const dt = dtMs / 1000;
  const half = PHYSICS.body.width / 2;
  const solidAt = (x: number) => {
    const c = Math.floor(x / T);
    return c < 0 || c >= e.cols ? true : e.solid[ROW.ground][c];
  };
  const supported = (x: number) => solidAt(x - half) || solidAt(x + half - 0.001);
  const gaps = gapsOf(e);
  const specs = bubbleSpecs(e.bubbles, T, GRID_TOP, e.solid).map((s) => ({ ...s, popped: false }));
  const coins = e.coins.map((c) => ({ x: c.col * T + T / 2, h: (ROW.ground - c.row) * T - T / 2, col: c.col, taken: false }));
  const shots: Array<{ x: number; h: number; dir: 1 | -1; travelled: number }> = [];
  let x = e.start.col * T + T / 2;
  let h = 0;
  let vy = 0;
  let v = 0;
  let grounded = true;
  let facing: 1 | -1 = 1;
  let lastShot = -1e9;
  let t = 0;
  let fell = false;
  let peakShotPending = false;
  const flagX = e.flag.col * T + T / 2;
  const fire = (shotH: number) => {
    if (t - lastShot < SHOT.cooldownMs || shots.length >= SHOT.maxInFlight) return false;
    lastShot = t;
    shots.push({ x: x + facing * 30, h: shotH, dir: facing, travelled: 0 });
    return true;
  };
  const behind = () => specs.some((s) => !s.popped && s.x < x);
  while (t < 90000) {
    t += dtMs;
    // Decide.
    let move: -1 | 0 | 1 = 1;
    let jump = false;
    const coinBehind = coins.find((c) => !c.taken && c.col < e.start.col);
    if (t < 6000 && coinBehind) {
      move = -1; // walk back for the coins behind the start
    } else if (t < 6000 && behind()) {
      move = facing === 1 ? -1 : 0; // turn round on the spot, then stand and shoot
      if (facing === -1) fire(h + 41);
    } else {
      if (grounded) {
        const g = gaps.find((gg) => gg[0] * T + T > x);
        if (g && x >= g[0] * T - 12 && x < g[0] * T) jump = true;
        const high = specs.find((s) => !s.popped && s.kind === 'high' && s.x > x && s.x - x <= 260);
        const landing = x + 190;
        const clear = !gaps.some((gg) => gg[gg.length - 1] * T + T > x - half && gg[0] * T < landing + half + 20);
        if (!jump && high && clear) {
          jump = true;
          peakShotPending = true;
        }
      }
      if (!peakShotPending) fire(h + 41);
    }
    // Move (walk ramp and soft level ends as in Player.step).
    v = rampSpeed(v, move * PHYSICS.walkSpeed, dtMs, PHYSICS.walkSpeed, PHYSICS.walkRampUpMs, PHYSICS.walkRampDownMs);
    if (move !== 0) facing = move;
    x += edgeLimit(x, v, half, W - half) * dt;
    if (grounded && jump) {
      vy = PHYSICS.jumpVelocity;
      grounded = false;
    }
    if (grounded && !supported(x)) grounded = false;
    if (!grounded) {
      const before = vy;
      vy -= PHYSICS.gravity * dt;
      h += vy * dt;
      if (peakShotPending && before > 0 && vy <= 0) peakShotPending = !fire(h + 41);
      if (h <= 0 && vy < 0) {
        if (supported(x)) {
          h = 0;
          vy = 0;
          grounded = true;
          peakShotPending = false;
        } else if (h < -60) {
          fell = true;
          break;
        }
      }
    }
    // Shots.
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      const step = SHOT.speed * dt;
      s.x += s.dir * step;
      s.travelled += step;
      const hitBubble = specs.find((b) => !b.popped && shotHitsBubble(s.x, GROUND_Y - s.h, SHOT.radius, b, b.x, b.y));
      if (hitBubble) hitBubble.popped = true;
      if (hitBubble || s.travelled >= SHOT.range) shots.splice(i, 1);
    }
    // Coins (the body rectangle against the coin's circle, as LevelScene.collectCoins).
    for (const c of coins) {
      if (c.taken) continue;
      const nx = Math.max(x - half, Math.min(c.x, x + half));
      const nh = Math.max(h, Math.min(c.h, h + PHYSICS.body.height));
      if ((c.x - nx) ** 2 + (c.h - nh) ** 2 <= 18 * 18) c.taken = true;
    }
    if (x >= flagX - half) break;
  }
  return {
    finished: !fell && x >= flagX - half,
    fell,
    x: Math.round(x),
    seconds: t / 1000,
    coinsLeft: coins.filter((c) => !c.taken).length,
    coinsLeftAt: coins.filter((c) => !c.taken).map((c) => c.col),
    bubblesLeft: specs.filter((s) => !s.popped).length,
    bubblesLeftAt: specs.filter((s) => !s.popped).map((s) => Math.floor(s.x / T)),
  };
}
