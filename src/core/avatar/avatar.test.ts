import { describe, expect, it } from 'vitest';
import {
  BLINK_MS,
  LAND_POSE,
  airClip,
  approachWeight,
  blendPose,
  blinkOpen,
  eyeLook,
  fallWeight,
  gaitClip,
  gaitFor,
  idleClip,
  jumpClip,
  landWeight,
  nextBlinkAt,
  rollAngle,
  shootClip,
  springStep,
  turnToward,
  winClip,
  withShot,
  type RobotPose,
} from './clips';
import { DEFAULT_LOOK, LOOK_NAMES, parseLook, portraitPixels, portraitProblems, resolveAvatar } from './config';
import { DEFAULT_PALETTE, ROBOT_CLIPS, SCALE_RANGE } from './robotSpec';

/** Largest difference between any two numbers of two poses. */
function poseDiff(p: RobotPose, q: RobotPose): number {
  const flat = (r: RobotPose) => [r.bob, r.lean, r.head, r.armN.a, r.armN.b, r.armF.a, r.armF.b, r.legN.a, r.legN.b, r.legN.foot, r.legF.a, r.legF.b, r.legF.foot];
  const a = flat(p);
  const b = flat(q);
  return Math.max(...a.map((v, i) => Math.abs(v - b[i])));
}

describe('gait clips (walk, run)', () => {
  for (const gait of ['walk', 'run'] as const) {
    it(`${gait}: continuous at the loop wrap (a cycle is 2 steps)`, () => {
      for (const p of [0, 0.37, 1.5]) expect(poseDiff(gaitClip(gait, p), gaitClip(gait, p + 2))).toBeLessThan(1e-9);
      // No jumps between neighbouring phases anywhere in the cycle, including across the wrap.
      for (let p = 0; p < 4; p += 0.01) expect(poseDiff(gaitClip(gait, p), gaitClip(gait, p + 0.01))).toBeLessThan(0.15); // radians, or px for bob
    });

    it(`${gait}: far limbs run half a cycle (one step) behind the near ones`, () => {
      for (const p of [0, 0.25, 0.8, 1.3]) {
        const a = gaitClip(gait, p);
        const b = gaitClip(gait, p + 1);
        expect(b.legF.a).toBeCloseTo(a.legN.a, 9);
        expect(b.legF.b).toBeCloseTo(a.legN.b, 9);
        expect(b.armF.a).toBeCloseTo(a.armN.a, 9);
      }
    });

    it(`${gait}: arms swing against the leg on the same side; legs spread at foot-strike`, () => {
      const strike = gaitClip(gait, 0);
      expect(Math.sign(strike.armN.a)).toBe(-Math.sign(strike.legN.a));
      expect(Math.abs(strike.legN.a - strike.legF.a)).toBeGreaterThan(1);
      // body lowest at foot-strike, highest as the legs pass
      expect(strike.bob).toBeLessThan(gaitClip(gait, 0.5).bob);
    });
  }

  it('run swings further, leans more and bends the elbows more than walk', () => {
    const w = gaitClip('walk', 0);
    const r = gaitClip('run', 0);
    expect(Math.abs(r.legN.a)).toBeGreaterThan(Math.abs(w.legN.a));
    expect(r.lean).toBeGreaterThan(w.lean);
    expect(r.armN.b).toBeGreaterThan(w.armN.b);
  });

  it('gait: walk on Left/Right levels, run on auto-run levels', () => {
    expect(gaitFor(false)).toBe('walk');
    expect(gaitFor(true)).toBe('run');
  });

  it('step length keeps feet from skating: leg reach covers most of a step', () => {
    for (const gait of ['walk', 'run'] as const) {
      const k = ROBOT_CLIPS[gait];
      const reach = 2 * 27 * Math.sin(k.leg); // both legs, about 27 px of leg below the hip
      expect(reach / ROBOT_CLIPS.stepLength[gait]).toBeGreaterThan(0.6);
    }
  });
});

describe('idle, air, land, win, shoot', () => {
  it('idle breathes smoothly and loops', () => {
    expect(poseDiff(idleClip(0), idleClip(ROBOT_CLIPS.idle.breathMs * ROBOT_CLIPS.idle.headMs))).toBeLessThan(1e-6);
    for (let t = 0; t < 3000; t += 16) expect(poseDiff(idleClip(t), idleClip(t + 16))).toBeLessThan(0.05);
  });

  it('jump: crouch at take-off, arms up and legs tucked once rising', () => {
    const start = jumpClip(0);
    const rise = jumpClip(1000);
    expect(start.legN.b).toBeGreaterThan(0.8); // knees bent (anticipation)
    expect(start.armN.a).toBeLessThan(0); // arms back
    expect(rise.armN.a).toBeGreaterThan(2); // arm up
    expect(rise.legN.b).toBeGreaterThan(1); // knee tucked
    for (let t = 0; t < 300; t += 16) expect(poseDiff(jumpClip(t), jumpClip(t + 16))).toBeLessThan(0.5);
  });

  it('fall weight follows vertical speed and is clamped', () => {
    expect(fallWeight(-800)).toBe(0);
    expect(fallWeight(ROBOT_CLIPS.fall.fullAtVy)).toBe(1);
    expect(fallWeight(5000)).toBe(1);
    const mid = fallWeight(50);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    // rising = jump pose, falling = arms out
    expect(poseDiff(airClip(1000, -700, 0), jumpClip(1000))).toBeLessThan(1e-9);
    expect(airClip(1000, 900, 0).armF.a).toBeLessThan(-0.8);
  });

  it('landing comes in quickly and fades out, never popping', () => {
    expect(landWeight(-1)).toBe(0);
    expect(landWeight(0)).toBe(0);
    expect(landWeight(ROBOT_CLIPS.land.inMs)).toBe(1);
    expect(landWeight(ROBOT_CLIPS.land.inMs + ROBOT_CLIPS.land.outMs)).toBe(0);
    for (let t = 0; t < 300; t += 16) expect(Math.abs(landWeight(t + 16) - landWeight(t))).toBeLessThan(0.45);
    expect(LAND_POSE.legN.b).toBeGreaterThan(0.8);
  });

  it('win: both arms up in a V, waving, continuous', () => {
    const p = winClip(0);
    expect(p.armN.a).toBeGreaterThan(1.8);
    expect(p.armF.a).toBeLessThan(-1.8);
    for (let t = 0; t < 2000; t += 16) expect(poseDiff(winClip(t), winClip(t + 16))).toBeLessThan(0.4); // bob is in px
  });

  it('shoot: arm points forward, recoils, shows the cannon and a short flash', () => {
    expect(shootClip(-5)).toEqual({ weight: 0, recoil: 0, cannon: false, flash: false });
    const early = shootClip(10);
    expect(early.flash).toBe(true);
    expect(early.cannon).toBe(true);
    const k = ROBOT_CLIPS.shoot;
    expect(shootClip(k.inMs + 10).weight).toBe(1);
    expect(shootClip(30 + k.recoilMs / 2).recoil).toBeCloseTo(k.recoil, 5);
    expect(shootClip(k.flashMs + 1).flash).toBe(false);
    expect(shootClip(k.inMs + k.holdMs + k.outMs + 1).weight).toBe(0);
    const aimed = withShot(idleClip(0), { weight: 1, recoil: 0, cannon: true, flash: false });
    expect(aimed.armN.a).toBeCloseTo(Math.PI / 2, 9);
    expect(aimed.armN.b).toBe(0);
    expect(withShot(idleClip(0), shootClip(-1))).toEqual(idleClip(0));
  });
});

describe('blending', () => {
  it('blendPose clamps the weight and returns the ends exactly', () => {
    const a = idleClip(0);
    const b = winClip(0);
    expect(blendPose(a, b, 0)).toBe(a);
    expect(blendPose(a, b, 1)).toBe(b);
    expect(blendPose(a, b, -3)).toBe(a);
    expect(blendPose(a, b, 7)).toBe(b);
    const m = blendPose(a, b, 0.5);
    expect(m.armN.a).toBeCloseTo((a.armN.a + b.armN.a) / 2, 9);
  });

  it('approachWeight ramps in and out over the given times and stays in 0..1', () => {
    expect(approachWeight(0, true, 50, 100, 200)).toBeCloseTo(0.5);
    expect(approachWeight(0.5, true, 500, 100, 200)).toBe(1);
    expect(approachWeight(1, false, 100, 100, 200)).toBeCloseTo(0.5);
    expect(approachWeight(0.1, false, 500, 100, 200)).toBe(0);
  });

  it('turnToward passes through 0 (paper turn) in about the turn time', () => {
    let v = 1;
    let t = 0;
    let sawZeroish = false;
    while (v !== -1 && t < 1000) {
      v = turnToward(v, -1, 16, 120);
      if (Math.abs(v) < 0.3) sawZeroish = true;
      t += 16;
    }
    expect(v).toBe(-1);
    expect(sawZeroish).toBe(true);
    expect(t).toBeLessThanOrEqual(128);
  });

  it('springStep settles on its target without blowing up', () => {
    let s = { angle: 0, vel: 0 };
    for (let i = 0; i < 300; i++) s = springStep(s.angle, s.vel, 0.4, 16, 180, 9);
    expect(s.angle).toBeCloseTo(0.4, 2);
    s = springStep(0, 0, 1, 10_000, 180, 9); // a huge frame is clamped
    expect(Number.isFinite(s.angle)).toBe(true);
    expect(Math.abs(s.angle)).toBeLessThan(1);
  });
});

describe('expressions and ball maths', () => {
  it('blinks every 3 to 5 s and closes about 90% at the middle', () => {
    expect(nextBlinkAt(1000, 0)).toBe(4000);
    expect(nextBlinkAt(1000, 1)).toBe(6000);
    expect(nextBlinkAt(1000, 9)).toBe(6000);
    expect(blinkOpen(-1)).toBe(1);
    expect(blinkOpen(BLINK_MS / 2)).toBeCloseTo(0.1);
    expect(blinkOpen(BLINK_MS)).toBe(1);
  });

  it('eyes look toward the facing and with vertical speed, clamped', () => {
    expect(eyeLook(1, 0, 3, 2, 1 / 500)).toEqual({ x: 3, y: 0 });
    expect(eyeLook(-1, 0, 3, 2, 1 / 500).x).toBe(-3);
    expect(eyeLook(5, 5000, 3, 2, 1 / 500)).toEqual({ x: 3, y: 2 });
    expect(eyeLook(1, -5000, 3, 2, 1 / 500).y).toBe(-2);
  });

  it('the ball turns one radian per radius rolled', () => {
    expect(rollAngle(48, 48)).toBe(1);
    expect(rollAngle(-96, 48)).toBe(-2);
    expect(rollAngle(10, 0)).toBe(0);
  });
});

describe('config: look parameter, palette, scale, portrait', () => {
  it('reads ?look= with sprite as the default and a warning for unknown values', () => {
    expect(parseLook('')).toEqual({ look: DEFAULT_LOOK, warning: null });
    expect(DEFAULT_LOOK).toBe('sprite');
    for (const name of LOOK_NAMES) expect(parseLook(`?look=${name}`)).toEqual({ look: name, warning: null });
    expect(parseLook('?debug=1&look=ROBOT').look).toBe('robot');
    const bad = parseLook('?look=dragon');
    expect(bad.look).toBe('sprite');
    expect(bad.warning).toMatch(/unknown look "dragon"/);
    expect(parseLook('?look=').warning).toBeNull();
  });

  it('fills palette defaults and keeps valid colours', () => {
    expect(resolveAvatar(undefined)).toEqual({ palette: { ...DEFAULT_PALETTE }, scale: 1, antennae: 2 });
    const r = resolveAvatar({ palette: { accent: 0xe53935, eye: -4 as number, body: 0x1000000 } });
    expect(r.palette.accent).toBe(0xe53935);
    expect(r.palette.eye).toBe(DEFAULT_PALETTE.eye);
    expect(r.palette.body).toBe(DEFAULT_PALETTE.body);
    expect(r.palette.joint).toBe(DEFAULT_PALETTE.joint);
  });

  it('clamps the size factor and the antennae', () => {
    expect(resolveAvatar({ scale: 1.12 }).scale).toBe(1.12);
    expect(resolveAvatar({ scale: 3 }).scale).toBe(SCALE_RANGE.max);
    expect(resolveAvatar({ scale: 0.2 }).scale).toBe(SCALE_RANGE.min);
    expect(resolveAvatar({ scale: Number.NaN }).scale).toBe(1);
    expect(resolveAvatar({ antennae: 1 }).antennae).toBe(1);
    expect(resolveAvatar({ antennae: 7 }).antennae).toBe(2);
    expect(resolveAvatar({ antennae: -1 }).antennae).toBe(0);
  });

  it('validates the portrait crop against the image', () => {
    expect(portraitProblems({ x: 0.43, y: 0.29, radius: 0.21 }, 600, 844)).toEqual([]);
    expect(portraitProblems({ x: 1.2, y: 0.3, radius: 0.2 }, 600, 844)[0]).toMatch(/portrait.x/);
    expect(portraitProblems({ x: 0.5, y: -0.1, radius: 0.2 }, 600, 844)[0]).toMatch(/portrait.y/);
    expect(portraitProblems({ x: 0.5, y: 0.5, radius: 0 }, 600, 844)[0]).toMatch(/portrait.radius/);
    expect(portraitProblems({ x: 0.1, y: 0.5, radius: 0.2 }, 600, 844)[0]).toMatch(/inside the image/);
    expect(portraitPixels({ x: 0.5, y: 0.5, radius: 0.25 }, 600, 844)).toEqual({ cx: 300, cy: 422, r: 150 });
    expect(portraitPixels({ x: 0.1, y: 0.5, radius: 0.25 }, 600, 844)).toBeNull();
    expect(portraitPixels(undefined, 600, 844)).toBeNull();
  });
});
