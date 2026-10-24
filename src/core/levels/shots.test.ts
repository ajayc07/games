// Task 007: shots (cooldown, hold repeat, cap, range, direction), bubbles (hit test, blocker, geometry),
// coins from pops, the pop pitch, and the level legend for `o` / `O`.
import { describe, expect, it } from 'vitest';
import { SHOT, ShotCannon, circlesTouch } from './shots';
import { BUBBLE, CoinFlow, POP_COINS, POP_PITCH, PopPitch, blockerWalls, bobOffset, bubbleSpecs, coinArc, shotHitsBubble } from './bubbles';
import { parseLevel } from './format';
import { extractEntities } from './grid';
import { POP_STEPS, popRecipe, popSoundId, recipeDuration } from '../audio/recipes';

const muzzle = { x: 100, y: 500 };
const at = () => muzzle;
const NONE = { pressed: false, held: false };
const PRESS = { pressed: true, held: true };
const HOLD = { pressed: false, held: true };

/** Runs the cannon frame by frame (16 ms) from `from` to `to`, with `input(t)` per frame. Returns fire times. */
function run(c: ShotCannon, from: number, to: number, input: (t: number) => { pressed: boolean; held: boolean }, facing: 1 | -1 = 1): number[] {
  const fired: number[] = [];
  for (let t = from; t <= to; t += 16) {
    const ev = c.update(t, 16, input(t), facing, at);
    if (ev.fired) fired.push(t);
  }
  return fired;
}

describe('shots (ShotCannon)', () => {
  it('a press fires at once; the ball leaves the muzzle after the spawn delay, facing the shooter', () => {
    const c = new ShotCannon();
    const ev = c.update(1000, 16, PRESS, -1, at);
    expect(ev.fired).not.toBeNull();
    expect(ev.fired!.dir).toBe(-1);
    expect(ev.launched).toEqual([]);
    expect(c.inFlight).toBe(1);
    const ev2 = c.update(1000 + SHOT.spawnDelayMs, 16, NONE, 1, at);
    expect(ev2.launched.length).toBe(1);
    expect(ev2.launched[0]).toMatchObject({ x: 100, y: 500, phase: 'flying', dir: -1 }); // facing at the press, not now
    c.update(1000 + SHOT.spawnDelayMs + 100, 100, NONE, 1, at);
    expect(c.shots[0].x).toBeCloseTo(100 - SHOT.speed * 0.1);
    expect(c.shots[0].y).toBe(500);
  });

  it('holding Power repeats at the cooldown rate', () => {
    const c = new ShotCannon();
    const fired = run(c, 0, 1300, () => HOLD);
    expect(fired.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < fired.length; i++) expect(fired[i] - fired[i - 1]).toBeGreaterThanOrEqual(SHOT.cooldownMs);
    // The first three repeat exactly at the cooldown; the 4th may wait a little for the first to finish (the cap).
    for (let i = 1; i < 3; i++) expect(fired[i] - fired[i - 1]).toBeLessThan(SHOT.cooldownMs + 17);
    for (let i = 3; i < fired.length; i++) expect(fired[i] - fired[i - 1]).toBeLessThan(SHOT.cooldownMs + 120);
  });

  it('mashing 20 presses per second never has more than 3 in flight and never fires faster than the cooldown', () => {
    const c = new ShotCannon();
    let max = 0;
    const fired: number[] = [];
    for (let t = 0; t <= 5000; t += 16) {
      const press = t % 50 < 16; // a press every 50 ms
      const ev = c.update(t, 16, { pressed: press, held: press }, t % 400 < 200 ? 1 : -1, at);
      if (ev.fired) fired.push(t);
      max = Math.max(max, c.inFlight);
    }
    expect(max).toBeLessThanOrEqual(SHOT.maxInFlight);
    for (let i = 1; i < fired.length; i++) expect(fired[i] - fired[i - 1]).toBeGreaterThanOrEqual(SHOT.cooldownMs);
    expect(fired.length).toBeGreaterThan(10); // mashing still shoots steadily
  });

  it('a quick tap during the cooldown is kept and fires when the cooldown ends', () => {
    const c = new ShotCannon();
    c.update(0, 16, PRESS, 1, at);
    c.update(100, 16, { pressed: true, held: false }, 1, at); // tap, released at once
    const fired = run(c, 116, 600, () => NONE);
    expect(fired.length).toBe(1);
    expect(fired[0]).toBeGreaterThanOrEqual(SHOT.cooldownMs);
    expect(fired[0]).toBeLessThan(SHOT.cooldownMs + 17);
  });

  it('the cap: with 3 in flight a 4th waits until one ends', () => {
    const slow = { ...SHOT, cooldownMs: 10, range: 10000 };
    const c = new ShotCannon(slow);
    const fired = run(c, 0, 400, () => HOLD);
    expect(fired.length).toBe(SHOT.maxInFlight);
    c.consume(c.shots[0]);
    expect(c.inFlight).toBe(2);
    expect(c.update(420, 16, HOLD, 1, at).fired).not.toBeNull();
  });

  it('a shot flies its range, then expires (to fade out softly)', () => {
    const c = new ShotCannon();
    c.update(0, 16, PRESS, 1, at);
    let expired = 0;
    let lastX = 0;
    for (let t = 16; t < 2000; t += 16) {
      const ev = c.update(t, 16, NONE, 1, at);
      for (const s of ev.expired) {
        expired++;
        lastX = s.x;
        expect(s.end).toBe('range');
        expect(s.travelled).toBeCloseTo(SHOT.range);
      }
    }
    expect(expired).toBe(1);
    expect(lastX).toBeCloseTo(muzzle.x + SHOT.range);
    expect(c.inFlight).toBe(0);
    // Range / speed: about 0.9 s.
    expect((SHOT.range / SHOT.speed) * 1000).toBeGreaterThan(800);
  });

  it('a consumed shot is gone at once; clear() drops everything', () => {
    const c = new ShotCannon();
    c.update(0, 16, PRESS, 1, at);
    c.update(50, 16, NONE, 1, at);
    const s = c.shots[0];
    c.consume(s);
    expect(s.end).toBe('hit');
    expect(c.inFlight).toBe(0);
    c.update(400, 16, PRESS, 1, at);
    c.clear();
    expect(c.shots.length).toBe(0);
  });

  it('circlesTouch', () => {
    expect(circlesTouch(0, 0, 5, 10, 0, 5)).toBe(true);
    expect(circlesTouch(0, 0, 5, 10.1, 0, 5)).toBe(false);
  });
});

describe('bubbles', () => {
  const T = 64;
  // 4 rows: row 3 ground; a small bubble in the row on the ground (col 1) and one row higher (col 3); a big one at cols 5-6.
  const grid = ['......', '...o.OO', '.o...OO', '#######'].map((r) => r.padEnd(7, '.'));
  const e = extractEntities(grid);

  it('extractEntities finds small bubbles and one entry per 2x2 big bubble', () => {
    expect(e.bubbles).toEqual([
      { kind: 'small', col: 3, row: 1 },
      { kind: 'big', col: 5, row: 1 },
      { kind: 'small', col: 1, row: 2 },
    ]);
    expect(e.solid[1][5]).toBe(false); // bubbles are not ground
  });

  it('geometry: big centred in its block on the ground, small ones float half a tile low and rest on the ground', () => {
    const specs = bubbleSpecs(e.bubbles, T, 0, e.solid);
    const ground = 3 * T;
    const [high, big, low] = specs;
    expect(big).toMatchObject({ kind: 'big', x: 6 * T, y: 2 * T, r: T, coins: 6 });
    expect(ground - (big.y + big.r)).toBe(0); // sits on the ground
    expect(low.r).toBeCloseTo(BUBBLE.radius.small * T);
    expect(ground - low.y).toBeCloseTo(low.r); // resting on the ground
    expect(ground - high.y).toBeCloseTo(T); // one row up, dropped half a tile: 1 tile above the ground
    expect(high.x).toBe(3.5 * T);
    expect(high.coins).toBe(3);
    expect(new Set(specs.map((s) => s.phase)).size).toBe(3); // own bob phases
  });

  it('high bubbles (h, Task 009): worth 4 coins, a small picture, raised a quarter tile above their cell, not dropped, never solid', () => {
    const g = extractEntities(['.....', '..h..', '.....', '.....', '#####']);
    expect(g.bubbles).toEqual([{ kind: 'high', col: 2, row: 1 }]);
    expect(g.solid[1][2]).toBe(false);
    const [h] = bubbleSpecs(g.bubbles, T, 0, g.solid);
    expect(h).toMatchObject({ kind: 'high', coins: 4, x: 2.5 * T });
    expect(h.r).toBeCloseTo(BUBBLE.radius.small * T);
    expect(h.y).toBeCloseTo(1.5 * T - BUBBLE.highRise * T); // cell centre, raised
    expect(BUBBLE.coins.high).toBeGreaterThan(BUBBLE.coins.small);
    expect(BUBBLE.coins.high).toBeLessThan(BUBBLE.coins.big);
  });

  it('bobs gently: a few px, never more', () => {
    for (let t = 0; t < 5000; t += 50) {
      expect(Math.abs(bobOffset({ kind: 'small', phase: 0.3 }, t))).toBeLessThanOrEqual(BUBBLE.bobPx.small);
      expect(Math.abs(bobOffset({ kind: 'big', phase: 0.3 }, t))).toBeLessThanOrEqual(BUBBLE.bobPx.big);
    }
    expect(BUBBLE.bobPx.small).toBeLessThanOrEqual(6);
  });

  it('hit test uses the generous circle (radius x 1.3) plus the shot radius', () => {
    const b = { r: 30 };
    const reach = 30 * BUBBLE.hitScale + SHOT.radius;
    expect(shotHitsBubble(100 - reach + 0.5, 200, SHOT.radius, b, 100, 200)).toBe(true);
    expect(shotHitsBubble(100 - reach - 0.5, 200, SHOT.radius, b, 100, 200)).toBe(false);
    expect(shotHitsBubble(100, 200 + 30 * 1.29, 0, b, 100, 200)).toBe(true); // beyond the picture, inside the hit circle
  });

  it('blocker: a soft wall on the side the body comes from, only while it overlaps vertically', () => {
    const b = { x: 1000, y: 500, r: 64 };
    const body = { top: 480, bottom: 564, halfWidth: 20 };
    expect(blockerWalls(b, { ...body, x: 800 })).toEqual({ maxX: 1000 - 64 - 20 });
    expect(blockerWalls(b, { ...body, x: 1200 })).toEqual({ minX: 1000 + 64 + 20 });
    expect(blockerWalls(b, { ...body, x: 800, top: 300, bottom: 384 })).toEqual({}); // above it (a jump in a future level)
  });

  it('coins appear in an arc above the bubble, spread evenly left to right', () => {
    const arc = coinArc(0, 0, 6);
    expect(arc.length).toBe(6);
    for (const p of arc) expect(p.y).toBeLessThan(0);
    for (let i = 1; i < arc.length; i++) expect(arc[i].x).toBeGreaterThan(arc[i - 1].x);
    expect(coinArc(0, 0, 1)[0].x).toBeCloseTo(0);
    expect(coinArc(0, 0, 0)).toEqual([]);
  });
});

describe('coins from pops (CoinFlow)', () => {
  it('a small pop gives 3 coins, a big one 6; they arrive after the wait and fly time and count once', () => {
    const f = new CoinFlow();
    f.pop(1000, 0, 0, BUBBLE.coins.small);
    f.pop(1000, 0, 0, BUBBLE.coins.big);
    expect(f.pendingCounted).toBe(9);
    expect(f.collect(1000 + POP_COINS.delayMs).counted).toBe(0); // still waiting / flying
    let total = 0;
    for (let t = 1000; t < 3000; t += 16) total += f.collect(t).counted;
    expect(total).toBe(9);
    expect(f.pendingCounted).toBe(0);
    expect(f.collect(5000).counted).toBe(0);
  });

  it('the coin sound is throttled: 6 coins never make 6 sounds', () => {
    const f = new CoinFlow();
    f.pop(0, 0, 0, 6);
    let sounds = 0;
    for (let t = 0; t < 2000; t += 16) if (f.collect(t).sound) sounds++;
    expect(sounds).toBeGreaterThanOrEqual(2);
    expect(sounds).toBeLessThanOrEqual(4);
  });

  it('demo pops are shown but never counted; flushAll lands everything at once (the flag)', () => {
    const f = new CoinFlow();
    f.pop(0, 0, 0, 3, false);
    f.pop(0, 0, 0, 6, true);
    const r = f.flushAll();
    expect(r.arrived.length).toBe(9);
    expect(r.counted).toBe(6);
    expect(f.coins.length).toBe(0);
  });

  it('progress runs 0 -> 1 over the flight', () => {
    const f = new CoinFlow();
    const [c] = f.pop(0, 0, 0, 1);
    expect(f.progress(c, POP_COINS.delayMs - 1)).toBe(0);
    expect(f.progress(c, POP_COINS.delayMs + POP_COINS.flyMs / 2)).toBeCloseTo(0.5);
    expect(f.progress(c, 99999)).toBe(1);
  });
});

describe('pop sound', () => {
  it('rises a step for each pop within a second, capped, and starts again after a pause', () => {
    const p = new PopPitch();
    const steps = [0, 200, 400, 600, 800, 1000, 1200, 1400].map((t) => p.next(t));
    expect(steps).toEqual([0, 1, 2, 3, 4, 5, 5, 5]);
    expect(p.next(1400 + POP_PITCH.windowMs + 1)).toBe(0);
  });

  it('recipes: short, gentle, higher for each step, ids clamp', () => {
    const roots = POP_STEPS.map((_, i) => popRecipe(i).tones[0].freq);
    for (let i = 1; i < roots.length; i++) expect(roots[i]).toBeGreaterThan(roots[i - 1]);
    for (let i = 0; i < POP_STEPS.length; i++) {
      const r = popRecipe(i);
      expect(recipeDuration(r)).toBeLessThan(0.2);
      for (const t of r.tones) {
        expect(t.type).toBe('sine');
        expect(t.gain ?? 1).toBeLessThanOrEqual(0.6);
        expect(Math.max(t.freq, t.to ?? 0)).toBeLessThan(4500);
      }
    }
    expect(popSoundId(-3)).toBe('pop-0');
    expect(popSoundId(99)).toBe(`pop-${POP_STEPS.length - 1}`);
  });
});

describe('level legend: o and O', () => {
  const base = (grid: string[]) => ({
    version: 1,
    id: 'bubble-test',
    world: 'grass',
    title: 'Test',
    controls: { enabled: ['left', 'right', 'power'], autoRun: false, tapAnywhereJumps: false, demo: false },
    tileSize: 64,
    stars: { two: 1, three: 2 },
    grid,
  });

  it('accepts small bubbles and whole 2x2 big bubbles', () => {
    expect(parseLevel(base(['..o.OO..', 'S...OO.F', '########'])).ok).toBe(true);
    expect(parseLevel(base(['OOOO....', 'OOOO..o.', 'S......F', '########'])).ok).toBe(true); // two blocks side by side
  });

  it('rejects broken big bubbles with the position', () => {
    const errs = (g: string[]) => {
      const r = parseLevel(base(g));
      return r.ok ? [] : r.errors;
    };
    expect(errs(['....O...', 'S...O..F', '########'])[0]).toMatch(/grid row 1, column 5: a big bubble "O" must be a 2x2 block/);
    expect(errs(['....OO..', 'S......F', '########'])[0]).toMatch(/grid row 1, column 5: a big bubble/);
    expect(errs(['...OOO..', 'S..OOO.F', '########']).length).toBeGreaterThan(0); // 3 wide
  });
});
