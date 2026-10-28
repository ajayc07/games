import { describe, expect, it } from 'vitest';
import { BOOTS, FLIGHT, MAGNET, flightVelocity, PICKUP_CHARS, bootsJumpSpeed, bootsPeak, inMagnetRange, normalPeak, pullStep } from './powerups';
import { PHYSICS } from './physics';
import { extractEntities } from './grid';

describe('magnet and rocket boots (Task 018)', () => {
  it('both are short, timed and modest', () => {
    for (const ms of [MAGNET.durationMs, BOOTS.durationMs]) {
      expect(ms).toBeGreaterThanOrEqual(8000);
      expect(ms).toBeLessThanOrEqual(12000);
    }
    expect(MAGNET.radius).toBeGreaterThan(150);
    expect(MAGNET.radius).toBeLessThanOrEqual(300);
  });

  it('the boots jump higher, within what the body allows, and clear a 2-tile block with room to spare', () => {
    expect(bootsJumpSpeed()).toBeGreaterThan(PHYSICS.jumpVelocity);
    expect(bootsJumpSpeed()).toBeLessThanOrEqual(BOOTS.maxSpeed);
    expect(bootsPeak()).toBeGreaterThan(normalPeak() * 1.5);
    expect(bootsPeak()).toBeLessThan(5 * 64); // the top of the 11-row screen stays in view
    expect(normalPeak()).toBeLessThan(3 * 64);
    expect(bootsPeak()).toBeGreaterThan(4 * 64);
  });

  it('pickup letters map to kinds, and the grid reports them (not solid)', () => {
    expect(PICKUP_CHARS).toEqual({ P: 'car', M: 'magnet', J: 'boots' });
    const e = extractEntities(['.P.M.J.', '#######']);
    expect(e.pickups.map((p) => p.kind)).toEqual(['car', 'magnet', 'boots']);
    expect(e.solid[0].some(Boolean)).toBe(false);
  });

  it('a coin is pulled only inside the radius', () => {
    const me = { x: 500, y: 500 };
    expect(inMagnetRange({ x: 500 + MAGNET.radius - 1, y: 500 }, me)).toBe(true);
    expect(inMagnetRange({ x: 500 + MAGNET.radius + 1, y: 500 }, me)).toBe(false);
    expect(inMagnetRange({ x: 500 + MAGNET.radius * 0.8, y: 500 + MAGNET.radius * 0.8 }, me)).toBe(false);
  });

  it('a pulled coin moves at the pull speed, in a straight line, and never overshoots', () => {
    const target = { x: 100, y: 100 };
    const a = pullStep({ x: 0, y: 100 }, target, 100); // 100 ms at 560 px/s = 56 px
    expect(a.x).toBeCloseTo(MAGNET.pullSpeed * 0.1);
    expect(a.y).toBeCloseTo(100);
    const b = pullStep({ x: 90, y: 100 }, target, 1000);
    expect(b).toEqual(target);
    expect(pullStep(target, target, 16)).toEqual(target);
    // Always gets there: from the edge of the field in under a second.
    let c = { x: target.x + MAGNET.radius, y: target.y };
    let t = 0;
    while (c.x !== target.x || c.y !== target.y) {
      c = pullStep(c, target, 16);
      t += 16;
      expect(t).toBeLessThan(1000);
    }
  });
});

describe('rocket boots flight (Task 023, D-066): hold Jump to rise like Iron Man, let go to glide', () => {
  const frame = 16;
  const run = (vy: number, held: boolean, frames: number, top = 400) => {
    let v = vy;
    for (let i = 0; i < frames; i++) v = flightVelocity(v, held, frame, top, 40);
    return v;
  };

  it('holding thrust speeds up to the climb speed and no further', () => {
    expect(run(0, true, 1)).toBeLessThan(0);
    expect(run(300, true, 30)).toBeCloseTo(-FLIGHT.climbSpeed, 5);
    expect(run(-FLIGHT.climbSpeed, true, 5)).toBeCloseTo(-FLIGHT.climbSpeed, 5);
  });

  it('the thrust beats gravity with room to spare, so he really does rise', () => {
    expect(FLIGHT.thrust).toBeGreaterThan(PHYSICS.gravity * 2);
    // From a stop he is moving up within 3 frames even after gravity adds its share.
    const v = run(0, true, 3);
    expect(v + (PHYSICS.gravity * 3 * frame) / 1000).toBeLessThan(0);
  });

  it('a boost faster than the climb (the 1.3x jump) is never slowed by the thrust', () => {
    expect(flightVelocity(-bootsJumpSpeed(), true, frame, 400, 40)).toBe(-bootsJumpSpeed());
  });

  it('letting go glides down: the fall is capped, a rise is left to gravity', () => {
    expect(run(900, false, 1)).toBe(FLIGHT.glideFall);
    expect(run(100, false, 1)).toBe(100);
    expect(run(-200, false, 1)).toBe(-200);
    expect(FLIGHT.glideFall).toBeLessThan(PHYSICS.maxFallSpeed / 2);
  });

  it('never goes above the ceiling', () => {
    expect(flightVelocity(-400, true, frame, 40, 40)).toBe(0);
    expect(flightVelocity(-400, true, frame, 20, 40)).toBe(0);
    expect(flightVelocity(300, true, frame, 20, 40)).toBeLessThan(300);
    expect(flightVelocity(-400, true, frame, 41, 40)).toBeLessThan(0);
  });

  it('flying from the ground reaches the sky coins (rows 1-2) well inside the 10 seconds', () => {
    // 64 px tiles, 11 rows: the feet are at row 9's top (576) when standing, the ceiling is 40 px below the grid top.
    const climb = 576 - 84 - 40 - 64 * 1.5;
    expect(climb / FLIGHT.climbSpeed).toBeLessThan(2);
  });
});

