import { describe, expect, it } from 'vitest';
import { HOLD_MS, HoldTracker } from './hold';

describe('hold-to-exit timing', () => {
  it('a 1-second hold fires once, at 1 s, while still held', () => {
    const h = new HoldTracker();
    h.down(0);
    expect(h.update(500)).toBe('none');
    expect(h.progress(500)).toBeCloseTo(0.5);
    expect(h.update(HOLD_MS - 1)).toBe('none');
    expect(h.update(HOLD_MS)).toBe('done');
    expect(h.update(HOLD_MS + 100)).toBe('none'); // only once
    expect(h.up(HOLD_MS + 200)).toBe('none');
  });

  it('a quick tap does nothing but report a tap (wobble)', () => {
    const h = new HoldTracker();
    h.down(0);
    expect(h.up(150)).toBe('tap');
    expect(h.update(2000)).toBe('none');
    expect(h.progress(2000)).toBe(0);
  });

  it('released after the time but before a frame ran: still counts', () => {
    const h = new HoldTracker();
    h.down(0);
    expect(h.up(1100)).toBe('done');
  });

  it('cancel (finger slid off, button hidden) forgets the press; a new press starts over', () => {
    const h = new HoldTracker();
    h.down(0);
    h.cancel();
    expect(h.update(1500)).toBe('none');
    expect(h.up(1500)).toBe('none');
    h.down(2000);
    expect(h.update(2999)).toBe('none');
    expect(h.update(3000)).toBe('done');
  });

  it('mashing (many short taps) never exits', () => {
    const h = new HoldTracker();
    let done = 0;
    for (let t = 0; t < 10000; t += 100) {
      h.down(t);
      if (h.update(t + 50) === 'done') done++;
      if (h.up(t + 60) === 'done') done++;
    }
    expect(done).toBe(0);
  });
});
