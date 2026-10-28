import { describe, expect, it } from 'vitest';
import { PAD, PadTrigger, padAirMs, padPeak } from './pads';
import { PHYSICS } from './physics';

const plate = { x: 100, width: 58, top: 500 };
const standing = (x: number, extra: Partial<{ vy: number; bottom: number }> = {}) => ({
  left: x - 20,
  right: x + 20,
  bottom: 520,
  vy: 0,
  ...extra,
});

describe('bounce pads (Task 015)', () => {
  it('a launch carries well above a normal jump and stays inside the body speed limit', () => {
    expect(PAD.launch).toBeLessThanOrEqual(1000); // Player clamps vertical speed to 1000
    expect(padPeak()).toBeGreaterThan(PHYSICS.jumpVelocity ** 2 / (2 * PHYSICS.gravity) * 1.5);
    expect(padPeak()).toBeLessThan(5 * 64); // the top of the 11-row screen stays in view
    expect(padAirMs()).toBeLessThan(1500);
  });

  it('fires when he steps onto the plate, once, and not while rising or when only brushing its edge', () => {
    const t = new PadTrigger();
    expect(t.update(0, standing(10), plate, true)).toBe(false); // far away
    expect(t.update(10, standing(100 - 29 - 20 + 4), plate, true)).toBe(false); // brushes the edge: overlap < edge
    expect(t.update(20, standing(100, { vy: -300 }), plate, false)).toBe(false); // rising through it
    expect(t.update(30, standing(100), plate, true)).toBe(true);
    expect(t.update(40, standing(100), plate, true)).toBe(false); // already fired
  });

  it('does not fire while he is still above the plate', () => {
    const t = new PadTrigger();
    expect(t.update(0, standing(100, { bottom: 380, vy: 200 }), plate, false)).toBe(false);
  });

  it('re-arms after he steps off and back on, or after standing on it for a while', () => {
    const t = new PadTrigger();
    expect(t.update(0, standing(100), plate, true)).toBe(true);
    // Landing back on it does not bounce him again at once.
    expect(t.update(1200, standing(100), plate, true)).toBe(false);
    expect(t.update(1200 + PAD.rearmMs - 1, standing(100), plate, true)).toBe(false);
    expect(t.update(1200 + PAD.rearmMs + 1, standing(100), plate, true)).toBe(true);
    // Stepping off and on works at once.
    expect(t.update(5000, standing(400), plate, true)).toBe(false);
    expect(t.update(5100, standing(100), plate, true)).toBe(true);
  });
});
