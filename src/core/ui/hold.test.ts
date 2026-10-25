import { describe, expect, it } from 'vitest';
import { HOLD_MS, HoldTracker, PARENT_HOLD_MS, RESET_HOLD_MS } from './hold';

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

describe('parent-view holds (3 s, D-047)', () => {
  it('both parent holds are 3 s, longer than the level exit', () => {
    expect(PARENT_HOLD_MS).toBe(3000);
    expect(RESET_HOLD_MS).toBe(3000);
    expect(PARENT_HOLD_MS).toBeGreaterThan(HOLD_MS);
  });

  it('2.9 s fails, 3 s passes', () => {
    const early = new HoldTracker(PARENT_HOLD_MS);
    early.down(0);
    expect(early.update(2900)).toBe('none');
    expect(early.up(2900)).toBe('tap');
    const full = new HoldTracker(PARENT_HOLD_MS);
    full.down(0);
    expect(full.update(2999)).toBe('none');
    expect(full.update(3000)).toBe('done');
  });

  it('progress fills over the 3 s and a release resets it', () => {
    const h = new HoldTracker(RESET_HOLD_MS);
    h.down(100);
    expect(h.progress(1600)).toBeCloseTo(0.5);
    h.up(2000);
    expect(h.progress(2100)).toBe(0);
    h.down(5000);
    expect(h.update(7999)).toBe('none'); // starts over: the earlier 1.9 s does not count
  });

  it('mashing never passes, however long it goes on', () => {
    const h = new HoldTracker(PARENT_HOLD_MS);
    let done = 0;
    for (let t = 0; t < 60000; t += 250) {
      h.down(t);
      if (h.update(t + 120) === 'done') done++;
      if (h.up(t + 200) === 'done') done++;
    }
    expect(done).toBe(0);
  });
});
