import { describe, expect, it } from 'vitest';
import {
  ANIM,
  advanceFlipbook,
  advanceStride,
  airLean,
  breath,
  celebrateDuration,
  celebrateLift,
  celebrateStretch,
  crossedFootfall,
  flipbookFrame,
  kickPulse,
  pulseValue,
  runLean,
  shadowAlpha,
  shadowScale,
  smoothToward,
  stepBlend,
  strideBounce,
  strideRock,
  strideStretch,
  widthFor,
} from './animation';
import { flipSign } from './poses';

const L = ANIM.run.stepLength;

describe('stride phase', () => {
  it('advances with distance, not time', () => {
    expect(advanceStride(0, L)).toBeCloseTo(1);
    expect(advanceStride(0, -L / 2)).toBeCloseTo(0.5); // direction does not matter
    expect(advanceStride(1.25, 0)).toBe(1.25); // standing still: no stride motion
  });

  it('steps faster at higher speed for the same time', () => {
    const frame = 1 / 60;
    let slow = 0;
    let fast = 0;
    for (let i = 0; i < 60; i++) {
      slow = advanceStride(slow, 100 * frame);
      fast = advanceStride(fast, 200 * frame);
    }
    expect(fast).toBeCloseTo(slow * 2);
    expect(fast).toBeCloseTo(200 / L);
  });

  it('detects footfalls when crossing a whole step', () => {
    expect(crossedFootfall(0.9, 1.05)).toBe(true);
    expect(crossedFootfall(1.05, 1.5)).toBe(false);
    expect(crossedFootfall(2.99, 3)).toBe(true);
  });
});

describe('stride shape', () => {
  it('is grounded and squashed at foot-strike, lifted and stretched mid-stride', () => {
    expect(strideBounce(0)).toBeCloseTo(0);
    expect(strideBounce(3)).toBeCloseTo(0);
    expect(strideBounce(0.5)).toBeCloseTo(ANIM.run.bounce);
    expect(strideStretch(0)).toBeCloseTo(ANIM.run.strikeSquash);
    expect(strideStretch(0)).toBeLessThan(0);
    expect(strideStretch(0.5)).toBeCloseTo(ANIM.run.midStretch);
    expect(strideStretch(0.25)).toBeCloseTo(0);
  });

  it('rocks side to side, alternating each step', () => {
    expect(strideRock(0)).toBeCloseTo(0);
    expect(strideRock(0.5)).toBeCloseTo(ANIM.run.rock);
    expect(strideRock(1.5)).toBeCloseTo(-ANIM.run.rock);
    expect(strideRock(1)).toBeCloseTo(0);
  });

  it('scales with amplitude (reduced when a flipbook plays)', () => {
    const a = ANIM.flipbook.motionScale;
    expect(strideBounce(0.5, a)).toBeCloseTo(ANIM.run.bounce * a);
    expect(strideStretch(0, a)).toBeCloseTo(ANIM.run.strikeSquash * a);
    expect(runLean(1, a)).toBeCloseTo(ANIM.run.lean * a);
  });

  it('leans in the direction of travel', () => {
    expect(runLean(1)).toBeGreaterThan(0);
    expect(runLean(-1)).toBeCloseTo(-runLean(1));
    expect(Math.abs(runLean(1))).toBeLessThan((6 * Math.PI) / 180); // a few degrees only
  });
});

describe('run blend', () => {
  it('blends in over blendInMs and out over blendOutMs, never past 0..1', () => {
    let b = 0;
    b = stepBlend(b, true, ANIM.run.blendInMs / 2);
    expect(b).toBeCloseTo(0.5);
    b = stepBlend(b, true, ANIM.run.blendInMs);
    expect(b).toBe(1);
    b = stepBlend(b, false, ANIM.run.blendOutMs / 4);
    expect(b).toBeCloseTo(0.75);
    b = stepBlend(b, false, 10_000);
    expect(b).toBe(0);
  });

  it('changes by small amounts per frame (no popping)', () => {
    let b = 0;
    let maxStep = 0;
    for (let i = 0; i < 30; i++) {
      const n = stepBlend(b, i < 15, 1000 / 60);
      maxStep = Math.max(maxStep, Math.abs(n - b));
      b = n;
    }
    expect(maxStep).toBeLessThanOrEqual(1000 / 60 / ANIM.run.blendInMs + 1e-9);
  });
});

describe('air lean', () => {
  it('tilts back going up and forward coming down, clamped, mirrored by facing', () => {
    expect(airLean(-760, 1)).toBeLessThan(0);
    expect(airLean(600, 1)).toBeGreaterThan(0);
    expect(airLean(-100_000, 1)).toBeCloseTo(-ANIM.air.maxBack);
    expect(airLean(100_000, 1)).toBeCloseTo(ANIM.air.maxForward);
    expect(airLean(600, -1)).toBeCloseTo(-airLean(600, 1));
    expect(airLean(0, 1)).toBeCloseTo(0);
  });

  it('eases toward its target', () => {
    const v = smoothToward(0, 1, 1000 / 60);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(0.5);
    expect(smoothToward(0.3, 1, 10_000)).toBe(1);
  });
});

describe('squash and stretch pulses', () => {
  const land = ANIM.pulse.landing;
  const take = ANIM.pulse.takeoff;

  it('landing squash reaches its peak and settles in about 120 ms', () => {
    const p = kickPulse(null, 1000, land);
    expect(pulseValue(p, 1000)).toBe(0);
    expect(pulseValue(p, 1000 + land.attackMs)).toBeCloseTo(land.peak);
    expect(pulseValue(p, 1000 + land.attackMs + land.settleMs)).toBe(0);
    expect(land.settleMs).toBeGreaterThanOrEqual(100);
    expect(land.settleMs).toBeLessThanOrEqual(140);
  });

  it('a jump interrupting a landing squash continues from the current value (no jump in size)', () => {
    const p1 = kickPulse(null, 0, land);
    const now = land.attackMs + 20; // mid-settle
    const before = pulseValue(p1, now);
    expect(before).toBeLessThan(0);
    const p2 = kickPulse(p1, now, take);
    expect(pulseValue(p2, now)).toBeCloseTo(before);
    // Changes smoothly frame by frame towards the stretch.
    let prev = before;
    for (let t = now; t <= now + take.attackMs; t += 1000 / 60) {
      const v = pulseValue(p2, t);
      expect(Math.abs(v - prev)).toBeLessThan(0.15);
      prev = v;
    }
    expect(pulseValue(p2, now + take.attackMs)).toBeCloseTo(take.peak);
  });

  it('mashing (many kicks in a row) stays within the pulse limits', () => {
    let p = kickPulse(null, 0, take);
    for (let t = 5; t < 500; t += 5) {
      p = kickPulse(p, t, t % 10 === 0 ? take : land);
      const v = pulseValue(p, t + 2);
      expect(v).toBeGreaterThanOrEqual(land.peak - 1e-9);
      expect(v).toBeLessThanOrEqual(take.peak + 1e-9);
    }
  });

  it('keeps the picture area roughly constant', () => {
    expect(widthFor(0)).toBe(1);
    expect(widthFor(0.2)).toBeLessThan(1);
    expect(widthFor(-0.2)).toBeGreaterThan(1);
  });
});

describe('idle and celebration', () => {
  it('breathes slowly and gently', () => {
    expect(breath(0)).toBeCloseTo(0);
    expect(breath(ANIM.idle.breathMs / 4)).toBeCloseTo(ANIM.idle.breath);
    expect(Math.abs(breath(1234))).toBeLessThanOrEqual(ANIM.idle.breath);
  });

  it('bounces on the spot, squashing at each touch-down', () => {
    const P = ANIM.celebrate.periodMs;
    expect(celebrateLift(0)).toBeCloseTo(0);
    expect(celebrateLift(P / 2)).toBeCloseTo(ANIM.celebrate.height);
    expect(celebrateLift(P)).toBeCloseTo(0);
    expect(celebrateStretch(0)).toBeCloseTo(-ANIM.celebrate.stretch);
    expect(celebrateStretch(P / 2)).toBeCloseTo(ANIM.celebrate.stretch);
    expect(celebrateDuration(1)).toBe(P);
    expect(celebrateDuration(P * 2 + 1)).toBe(P * 3);
  });
});

describe('shadow', () => {
  it('shrinks and fades with height', () => {
    expect(shadowScale(0)).toBe(1);
    expect(shadowScale(ANIM.shadow.fadeHeight / 2)).toBeLessThan(1);
    expect(shadowScale(10_000)).toBeCloseTo(ANIM.shadow.minScale);
    expect(shadowAlpha(0)).toBeCloseTo(ANIM.shadow.alpha);
    expect(shadowAlpha(10_000)).toBeCloseTo(ANIM.shadow.minAlpha);
    expect(shadowAlpha(50)).toBeLessThan(shadowAlpha(10));
  });
});

describe('run flipbook', () => {
  it('has no cycle with 0 or 1 frames', () => {
    expect(flipbookFrame(3.2, 0)).toBe(-1);
    expect(flipbookFrame(3.2, 1)).toBe(-1);
  });

  it('cycles through 2+ frames in order', () => {
    expect([0, 0.9, 1, 1.5, 2, 2.1].map((p) => flipbookFrame(p, 2))).toEqual([0, 0, 1, 1, 0, 0]);
    expect([0, 1, 2, 3, 4].map((p) => flipbookFrame(p, 4))).toEqual([0, 1, 2, 3, 0]);
  });

  it('plays at fps at normal speed, faster when faster, frozen when standing', () => {
    expect(advanceFlipbook(0, 1000, 10, 200, 200)).toBeCloseTo(10);
    expect(advanceFlipbook(0, 1000, 10, 400, 200)).toBeCloseTo(20);
    expect(advanceFlipbook(0, 1000, 10, -200, 200)).toBeCloseTo(10); // running left
    expect(advanceFlipbook(2.5, 1000, 10, 0, 200)).toBe(2.5);
    expect(advanceFlipbook(1, 1000, 10, 200, 0)).toBe(1);
  });

  it('mirrors each frame by its own facing', () => {
    const frames: Array<'right' | 'left'> = ['right', 'left'];
    const signs = frames.map((f) => flipSign(1, f));
    expect(signs).toEqual([1, -1]);
    expect(frames.map((f) => flipSign(-1, f))).toEqual([-1, 1]);
  });
});
