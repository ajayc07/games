import { describe, expect, it } from 'vitest';
import { VoiceLimiter } from './voiceLimiter';

describe('VoiceLimiter', () => {
  it('enforces a minimum retrigger gap', () => {
    const v = new VoiceLimiter({ maxVoices: 3, minGapMs: 40 });
    expect(v.tryStart('jump', 0, 150)).toBe(true);
    expect(v.tryStart('jump', 39, 150)).toBe(false);
    expect(v.tryStart('jump', 40, 150)).toBe(true);
  });

  it('caps overlapping voices per sound', () => {
    const v = new VoiceLimiter({ maxVoices: 3, minGapMs: 0 });
    expect(v.tryStart('jump', 0, 1000)).toBe(true);
    expect(v.tryStart('jump', 10, 1000)).toBe(true);
    expect(v.tryStart('jump', 20, 1000)).toBe(true);
    expect(v.tryStart('jump', 30, 1000)).toBe(false);
    expect(v.activeCount('jump', 30)).toBe(3);
    // the first voice ends at 1000, freeing a slot
    expect(v.tryStart('jump', 1000, 1000)).toBe(true);
  });

  it('limits are per sound id', () => {
    const v = new VoiceLimiter({ maxVoices: 1, minGapMs: 40 });
    expect(v.tryStart('jump', 0, 500)).toBe(true);
    expect(v.tryStart('coin', 0, 500)).toBe(true);
    expect(v.tryStart('jump', 100, 500)).toBe(false);
  });

  it('mashing at 20 presses per second never exceeds the cap', () => {
    const v = new VoiceLimiter({ maxVoices: 3, minGapMs: 40 });
    let started = 0;
    for (let t = 0; t < 2000; t += 50) {
      if (v.tryStart('jump', t, 400)) started++;
      expect(v.activeCount('jump', t)).toBeLessThanOrEqual(3);
    }
    expect(started).toBeGreaterThan(0);
  });
});
