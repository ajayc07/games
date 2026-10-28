import { describe, expect, it } from 'vitest';
import { IDLE_DEFAULT_S, IdleWatch, idleSecondsFrom } from './idle';

describe('auto-pause after inactivity (Task 027, D-070)', () => {
  it('sleeps after the limit with no touch, and not before', () => {
    const w = new IdleWatch(150_000, 0);
    expect(w.shouldSleep(149_999)).toBe(false);
    expect(w.shouldSleep(150_000)).toBe(true);
  });

  it('every touch, move or key press starts the wait again', () => {
    const w = new IdleWatch(150_000, 0);
    w.touch(100_000);
    expect(w.shouldSleep(249_999)).toBe(false);
    expect(w.shouldSleep(250_000)).toBe(true);
  });

  it('a finger held down is activity for as long as it is down, then the wait starts from the release', () => {
    const w = new IdleWatch(150_000, 0);
    w.down(1000);
    expect(w.shouldSleep(1_000_000)).toBe(false);
    w.up(1_000_000);
    expect(w.shouldSleep(1_100_000)).toBe(false);
    expect(w.shouldSleep(1_150_000)).toBe(true);
    // Two fingers: both must be up.
    const v = new IdleWatch(1000, 0);
    v.down(0);
    v.down(10);
    v.up(20);
    expect(v.shouldSleep(5000)).toBe(false);
    v.up(30);
    expect(v.shouldSleep(5000)).toBe(true);
  });

  it('sleeps once, wakes on a tap and then waits the full time again; a stray up event never goes below zero', () => {
    const w = new IdleWatch(1000, 0);
    expect(w.shouldSleep(2000)).toBe(true);
    w.sleep();
    expect(w.sleeping).toBe(true);
    expect(w.shouldSleep(5000)).toBe(false);
    w.up(5000);
    w.wake(6000);
    expect(w.sleeping).toBe(false);
    expect(w.shouldSleep(6999)).toBe(false);
    expect(w.shouldSleep(7000)).toBe(true);
  });

  it('?idle=<seconds> sets the wait, 0 turns it off, junk is ignored', () => {
    expect(IDLE_DEFAULT_S).toBeGreaterThanOrEqual(120);
    expect(IDLE_DEFAULT_S).toBeLessThanOrEqual(180);
    expect(idleSecondsFrom('')).toBe(IDLE_DEFAULT_S);
    expect(idleSecondsFrom('?idle=5')).toBe(5);
    expect(idleSecondsFrom('?idle=0')).toBe(Infinity);
    expect(idleSecondsFrom('?idle=0.2')).toBe(1);
    expect(idleSecondsFrom('?idle=abc')).toBe(IDLE_DEFAULT_S);
    expect(idleSecondsFrom('?idle=-3')).toBe(IDLE_DEFAULT_S);
  });
});
