import { describe, expect, it, vi, afterEach } from 'vitest';
import { RUN_HOLD, RunHold, runScale, totalScale } from './runHold';
import { FALL_BUZZ, vibrate, vibrationSupported } from '../ui/haptics';

describe('hold to run (Task 021, D-064)', () => {
  it('a tap or a short hold stays a walk; a long hold runs at 1.45x, easing up', () => {
    expect(runScale(0)).toBe(1);
    expect(runScale(RUN_HOLD.holdMs - 1)).toBe(1);
    expect(runScale(RUN_HOLD.holdMs + RUN_HOLD.rampMs / 2)).toBeCloseTo(1 + (RUN_HOLD.scale - 1) / 2);
    expect(runScale(RUN_HOLD.holdMs + RUN_HOLD.rampMs)).toBeCloseTo(RUN_HOLD.scale);
    expect(runScale(60000)).toBeCloseTo(RUN_HOLD.scale);
    let prev = 1;
    for (let ms = 0; ms <= 1000; ms += 10) {
      const s = runScale(ms);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });

  it('never goes over the cap, even on top of the car', () => {
    expect(totalScale(1.45, 1)).toBeCloseTo(1.45);
    expect(totalScale(1.45, 1.25)).toBe(RUN_HOLD.maxTotal);
    expect(totalScale(1, 1.25)).toBeCloseTo(1.25);
  });

  it('releasing, turning round or standing starts again from a walk', () => {
    const r = new RunHold();
    let s = 1;
    for (let i = 0; i < 60; i++) s = r.update(1, 16);
    expect(s).toBeCloseTo(RUN_HOLD.scale);
    expect(r.gaitRun).toBe(true);
    expect(r.update(0, 16)).toBe(1);
    expect(r.gaitRun).toBe(false);
    for (let i = 0; i < 60; i++) r.update(-1, 16);
    expect(r.gaitRun).toBe(true);
    expect(r.update(1, 16)).toBe(1); // turned round
    expect(r.gaitRun).toBe(false);
  });

  it('the legs do not flicker between walk and run while the speed eases', () => {
    const r = new RunHold();
    const flips: boolean[] = [];
    let last = false;
    for (let i = 0; i < 200; i++) {
      r.update(1, 16);
      if (r.gaitRun !== last) {
        flips.push(r.gaitRun);
        last = r.gaitRun;
      }
    }
    expect(flips).toEqual([true]);
  });

  it('a long frame does not skip the walk: the run starts only after the hold time', () => {
    const r = new RunHold();
    expect(r.update(1, 50)).toBe(1);
    expect(r.update(1, 50)).toBe(1);
  });
});

describe('haptics', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('buzzes when the browser can and does nothing when it cannot', () => {
    const fn = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate: fn });
    expect(vibrate(FALL_BUZZ)).toBe(true);
    expect(fn).toHaveBeenCalledWith(FALL_BUZZ);
    vi.stubGlobal('navigator', {});
    expect(vibrationSupported()).toBe(false);
    expect(() => vibrate(50)).not.toThrow();
    expect(vibrate(50, true)).toBe(false);
    vi.stubGlobal('navigator', { vibrate: () => { throw new Error('no'); } });
    expect(() => vibrate(50)).not.toThrow();
  });

  it('the fall buzz is two firm pulses, short as a whole', () => {
    expect(FALL_BUZZ).toHaveLength(3);
    expect(FALL_BUZZ[0]).toBeGreaterThanOrEqual(120);
    expect(FALL_BUZZ.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(500);
  });
});
