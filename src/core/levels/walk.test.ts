import { describe, expect, it } from 'vitest';
import { EDGE_BRAKE_PX, FACING_HOLD_MS, edgeLimit, nextFacing, rampSpeed, walkDirection, type FacingState } from './walk';

const MAX = 220;
const UP = 60;
const DOWN = 80;
const ramp = (v: number, target: number, dt: number) => rampSpeed(v, target, dt, MAX, UP, DOWN);
/** Runs frames of `dt` ms until the speed equals `target`; returns the time taken. */
const timeTo = (v: number, target: number, dt = 1000 / 60) => {
  let t = 0;
  while (v !== target && t < 2000) {
    v = ramp(v, target, dt);
    t += dt;
  }
  return t;
};

describe('walkDirection', () => {
  it('left, right, none, and both held = stand', () => {
    expect(walkDirection(true, false)).toBe(-1);
    expect(walkDirection(false, true)).toBe(1);
    expect(walkDirection(false, false)).toBe(0);
    expect(walkDirection(true, true)).toBe(0);
  });
});

describe('rampSpeed', () => {
  it('reaches walk speed in about 60 ms and stops in about 80 ms', () => {
    expect(ramp(0, MAX, 30)).toBeCloseTo(110);
    expect(ramp(0, MAX, 60)).toBe(MAX);
    expect(ramp(MAX, 0, 40)).toBeCloseTo(110);
    expect(ramp(MAX, 0, 80)).toBe(0);
    expect(timeTo(0, MAX)).toBeLessThanOrEqual(UP + 17);
    expect(timeTo(MAX, 0)).toBeLessThanOrEqual(DOWN + 17);
    expect(timeTo(-MAX, 0)).toBeLessThanOrEqual(DOWN + 17);
  });

  it('never overshoots and never slides past zero', () => {
    expect(ramp(MAX, 0, 500)).toBe(0);
    expect(ramp(0, MAX, 500)).toBe(MAX);
    expect(ramp(-MAX, 0, 500)).toBe(0);
  });

  it('a reversal slows to 0 first, then speeds up the other way with the time left', () => {
    expect(ramp(MAX, -MAX, 40)).toBeCloseTo(110); // still slowing
    expect(ramp(MAX, -MAX, 80)).toBe(0);
    expect(ramp(MAX, -MAX, 110)).toBeCloseTo(-110); // 80 ms to stop + 30 ms of speeding up
    expect(timeTo(MAX, -MAX)).toBeLessThanOrEqual(UP + DOWN + 17);
  });

  it('standing stays standing; zero frame time changes nothing', () => {
    expect(ramp(0, 0, 16)).toBe(0);
    expect(ramp(100, MAX, 0)).toBe(100);
  });
});

describe('edgeLimit', () => {
  it('does nothing away from the walls or when moving away from them', () => {
    expect(edgeLimit(500, 220, 20, 1000)).toBe(220);
    expect(edgeLimit(25, 220, 20, 1000)).toBe(220);
    expect(edgeLimit(995, -220, 20, 1000)).toBe(-220);
  });
  it('fades speed to zero at the wall', () => {
    expect(edgeLimit(1000 - EDGE_BRAKE_PX / 2, 220, 20, 1000)).toBeCloseTo(110);
    expect(edgeLimit(1000, 220, 20, 1000)).toBe(0);
    expect(edgeLimit(1010, 220, 20, 1000)).toBe(0);
    expect(edgeLimit(20, -220, 20, 1000)).toBeCloseTo(0);
    expect(edgeLimit(20 + EDGE_BRAKE_PX / 2, -220, 20, 1000)).toBeCloseTo(-110);
  });
});

describe('nextFacing (hysteresis)', () => {
  const start: FacingState = { facing: 1, changedAt: -1e9 };
  it('flips at once on a new direction and keeps facing when standing', () => {
    const s = nextFacing(start, -1, 1000);
    expect(s).toEqual({ facing: -1, changedAt: 1000 });
    expect(nextFacing(s, 0, 5000)).toBe(s);
    expect(nextFacing(s, -1, 5000)).toBe(s);
  });
  it('alternating every frame flips at most once per hold time', () => {
    let s = start;
    let flips = 0;
    for (let i = 0; i < 60; i++) {
      const next = nextFacing(s, i % 2 === 0 ? -1 : 1, 1000 + i * 16);
      if (next.facing !== s.facing) flips++;
      s = next;
    }
    // 60 frames = 960 ms; without hysteresis that would be 60 flips.
    expect(flips).toBeLessThanOrEqual(Math.ceil(960 / FACING_HOLD_MS) + 1);
    expect(flips).toBeGreaterThan(1);
  });
  it('a direction still held after the hold flips then', () => {
    const s = nextFacing(start, -1, 1000);
    const back = nextFacing(s, 1, 1020);
    expect(back.facing).toBe(-1);
    expect(nextFacing(back, 1, 1000 + FACING_HOLD_MS).facing).toBe(1);
  });
});
