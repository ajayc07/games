import { describe, expect, it } from 'vitest';
import { BOOTS, MAGNET, PICKUP_CHARS, bootsJumpSpeed, bootsPeak, inMagnetRange, normalPeak, pullStep } from './powerups';
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
