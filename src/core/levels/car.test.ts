import { describe, expect, it } from 'vitest';
import { CAR, CarTimer, carAlpha, touchesPickup, wheelAngle } from './car';
import { PHYSICS } from './physics';

describe('car power-up (Task 017)', () => {
  it('is a modest, short, harmless change: a little faster, ten seconds, nothing else', () => {
    expect(CAR.speedScale).toBeGreaterThan(1);
    expect(CAR.speedScale).toBeLessThanOrEqual(1.4);
    expect(CAR.durationMs).toBeGreaterThanOrEqual(8000);
    expect(CAR.durationMs).toBeLessThanOrEqual(12000);
    expect(CAR.blinkMs).toBeLessThan(CAR.durationMs / 3);
    // The fastest car still clears a 2-tile gap with the same jump (more reach, never less).
    expect(PHYSICS.walkSpeed * CAR.speedScale).toBeGreaterThan(PHYSICS.walkSpeed);
  });

  it('the timer starts, runs out by itself, and can be stopped', () => {
    const t = new CarTimer();
    expect(t.active(0)).toBe(false);
    expect(t.remaining(0)).toBe(0);
    t.start(1000);
    expect(t.active(1000 + CAR.durationMs - 1)).toBe(true);
    expect(t.remaining(1000 + 4000)).toBe(CAR.durationMs - 4000);
    expect(t.active(1000 + CAR.durationMs)).toBe(false);
    t.start(5000);
    t.stop();
    expect(t.active(5001)).toBe(false);
    // Touching a second pickup restarts the full time.
    t.start(0);
    t.start(6000);
    expect(t.remaining(6000)).toBe(CAR.durationMs);
  });

  it('the car only blinks near the end, gently (never fully gone)', () => {
    expect(carAlpha(CAR.durationMs)).toBe(1);
    expect(carAlpha(CAR.blinkMs + 1)).toBe(1);
    const seen = new Set<number>();
    for (let r = CAR.blinkMs; r > 0; r -= 20) seen.add(carAlpha(r));
    expect([...seen].sort()).toEqual([0.55, 1]);
    expect(Math.min(...seen)).toBeGreaterThan(0.4);
  });

  it('a pickup is touched by the body rectangle with a generous circle', () => {
    const body = { left: 100, right: 140, top: 100, bottom: 184 };
    expect(touchesPickup(body, 120, 140)).toBe(true);
    expect(touchesPickup(body, 140 + CAR.pickupHit - 1, 140)).toBe(true);
    expect(touchesPickup(body, 140 + CAR.pickupHit + 2, 140)).toBe(false);
    expect(touchesPickup(body, 120, 184 + CAR.pickupHit + 2)).toBe(false);
  });

  it('wheels turn with the distance rolled', () => {
    expect(wheelAngle(0)).toBe(0);
    expect(wheelAngle(2 * Math.PI * CAR.wheel.r)).toBeCloseTo(2 * Math.PI);
  });
});
