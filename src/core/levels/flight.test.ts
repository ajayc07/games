import { describe, expect, it } from 'vitest';
import { FLY, FlightState, flyDirection, flyVelocity, plainGround, type FlightEnv } from './flight';
import { BOOTS } from './powerups';
import { CarTimer } from './car';

const env = (canLand: boolean): FlightEnv => ({ ceilTop: 56, floorY: 592, canLand: () => canLand });
const body = (top: number, vy = 0) => ({ vy, top, bottom: top + 84, left: 100, right: 140 });

describe('rocket boots flight (Task 028, D-071)', () => {
  it('Up, Down, both or neither', () => {
    expect(flyDirection(true, false)).toBe(-1);
    expect(flyDirection(false, true)).toBe(1);
    expect(flyDirection(true, true)).toBe(0);
    expect(flyDirection(false, false)).toBe(0);
  });

  it('speeds up and slows down smoothly, never past the climb speed', () => {
    let v = 0;
    for (let i = 0; i < 4; i++) v = flyVelocity(v, -1, 16);
    expect(v).toBeLessThan(0);
    expect(v).toBeGreaterThan(-FLY.climb);
    for (let i = 0; i < 60; i++) v = flyVelocity(v, -1, 16);
    expect(v).toBe(-FLY.climb);
    for (let i = 0; i < 60; i++) v = flyVelocity(v, 0, 16);
    expect(v).toBe(0);
    for (let i = 0; i < 60; i++) v = flyVelocity(v, 1, 16);
    expect(v).toBe(FLY.climb);
  });

  it('flying holds still when nothing is pressed, and never leaves the screen or touches the ground', () => {
    const s = new FlightState();
    expect(s.step(body(300), 0, 16, env(true)).vy).toBe(0);
    expect(s.step(body(56, -300), -1, 16, env(true)).vy).toBe(0);
    expect(s.step(body(300, -300), -1, 16, env(true)).vy).toBeLessThan(0);
    const low = { vy: 100, top: 592 - 84 - 2, bottom: 590, left: 0, right: 40 };
    expect(s.step(low, 1, 16, env(true)).vy).toBe(0);
    expect(s.step(low, -1, 16, env(true)).vy).toBeLessThan(100);
  });

  it('when time is up he comes down over plain ground, slowly, and touches down on the ground line', () => {
    const s = new FlightState();
    s.beginLanding();
    let vy = 0;
    let y = 200;
    let landed = false;
    for (let i = 0; i < 600 && !landed; i++) {
      const r = s.step({ vy, top: y, bottom: y + 84, left: 100, right: 140 }, 0, 16, env(true));
      vy = r.vy;
      expect(vy).toBeLessThanOrEqual(FLY.landSpeed);
      y += (vy * 16) / 1000;
      landed = r.landed;
    }
    expect(landed).toBe(true);
    expect(y + 84).toBeGreaterThanOrEqual(590);
    expect(y + 84).toBeLessThanOrEqual(600);
  });

  it('over a gap or blocks he stays up and keeps going until there is plain ground, then lands', () => {
    const s = new FlightState();
    s.beginLanding();
    let vy = 100;
    for (let i = 0; i < 60; i++) vy = s.step(body(300, vy), 1, 16, env(false)).vy;
    expect(vy).toBe(0);
    const down = s.step(body(300, 0), 0, 16, env(true));
    expect(down.vy).toBeGreaterThan(0);
    expect(down.landed).toBe(false);
  });

  it('plain ground: ground below, nothing in rows 7-8, inside the level', () => {
    const solid = (cols: string, row7 = '', row8 = ''): boolean[][] => {
      const rows = Array.from({ length: 11 }, () => Array.from({ length: cols.length }, () => false));
      [...cols].forEach((c, i) => (rows[9][i] = c === '#'));
      [...row7].forEach((c, i) => (rows[7][i] = c === 'B'));
      [...row8].forEach((c, i) => (rows[8][i] = c === 'B'));
      return rows;
    };
    expect(plainGround(solid('######'), 1, 3)).toBe(true);
    expect(plainGround(solid('##.###'), 1, 3)).toBe(false);
    expect(plainGround(solid('######', '', '..B...'), 1, 3)).toBe(false);
    expect(plainGround(solid('######', '..B...', '..B...'), 3, 4)).toBe(true);
    expect(plainGround(solid('####'), 2, 6)).toBe(false);
  });

  it('flight is long enough to enjoy and the bar needs a timer that counts down from full', () => {
    expect(BOOTS.durationMs).toBe(12_000);
    const t = new CarTimer(BOOTS.durationMs);
    expect(t.fraction(0)).toBe(0);
    t.start(1000);
    expect(t.fraction(1000)).toBe(1);
    expect(t.fraction(1000 + 6000)).toBeCloseTo(0.5, 5);
    expect(t.fraction(1000 + 12_000)).toBe(0);
    // About 47 tiles of flight, which the zen boots stretch covers.
    expect((BOOTS.durationMs / 1000) * FLY.speed / 64).toBeGreaterThan(44);
    expect((BOOTS.durationMs / 1000) * FLY.speed / 64).toBeLessThan(50);
  });
});
