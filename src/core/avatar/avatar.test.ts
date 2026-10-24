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
  nearSide,
  springStep,
  turnToward,
  viewOf,
  winClip,
  withShot,
  yawStep,
  yawTarget,
  type RobotPose,
  type YawInput,
} from './clips';
import { solveRig, type RigFrame, type RigInput, type Xf } from './robotRig';
import { DEFAULT_LOOK, LOOK_NAMES, parseLook, resolveAvatar } from './config';
import { DEFAULT_PALETTE, ROBOT, ROBOT_CLIPS, SCALE_RANGE } from './robotSpec';

/** Largest difference between any two numbers of two poses. */
function poseDiff(p: RobotPose, q: RobotPose): number {
  const flat = (r: RobotPose) => [r.bob, r.lean, r.head, r.armN.a, r.armN.b, r.armN.s, r.armF.a, r.armF.b, r.armF.s, r.legN.a, r.legN.b, r.legN.foot, r.legF.a, r.legF.b, r.legF.foot];
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
    expect(rise.armN.a).toBeGreaterThan(2.5); // both arms up...
    expect(rise.armF.a).toBeGreaterThan(2.5);
    expect(rise.armN.s).toBeGreaterThan(0.4); // ...and spread into a V
    expect(rise.legN.b).toBeGreaterThan(1); // knee tucked
    // A quick swing from arms back to arms up (about 3.7 rad in riseMs), but never a jump between frames.
    for (let t = 0; t < 300; t += 16) expect(poseDiff(jumpClip(t), jumpClip(t + 16))).toBeLessThan(0.7);
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
    const fall = airClip(1000, 900, 0);
    expect(fall.armN.s).toBeGreaterThan(0.8); // arms out to the sides
    expect(fall.armF.s).toBeGreaterThan(0.8);
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
    expect(p.armN.a).toBeGreaterThan(2.5);
    expect(p.armF.a).toBeGreaterThan(2.5);
    expect(Math.min(p.armN.s, p.armF.s)).toBeGreaterThan(0.3);
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

describe('config: look parameter, palette, scale', () => {
  it('reads ?look= with robot as the default and a warning for unknown values', () => {
    expect(parseLook('')).toEqual({ look: DEFAULT_LOOK, warning: null });
    expect(DEFAULT_LOOK).toBe('robot');
    expect([...LOOK_NAMES]).toEqual(['robot', 'ball']);
    for (const name of LOOK_NAMES) expect(parseLook(`?look=${name}`)).toEqual({ look: name, warning: null });
    expect(parseLook('?debug=1&look=ROBOT').look).toBe('robot');
    const bad = parseLook('?look=dragon');
    expect(bad.look).toBe('robot');
    expect(bad.warning).toMatch(/unknown look "dragon"/);
    // The removed looks (D-037) fall back to the robot with a warning.
    for (const old of ['sprite', 'portrait']) {
      expect(parseLook(`?look=${old}`).look).toBe('robot');
      expect(parseLook(`?look=${old}`).warning).not.toBeNull();
    }
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

});

// ---------- three-quarter view (Task 005c) ----------

const Y = ROBOT.yaw;
const yawIn = (o: Partial<YawInput>): YawInput => ({ facing: 1, speed: 0, refSpeed: 220, air: 0, shoot: 0, win: 0, ...o });

describe('yaw: target, sweep and view', () => {
  it('faces the player when still, turns toward the way it goes when moving (scaled by speed)', () => {
    expect(yawTarget(yawIn({ speed: 0 }))).toBe(Y.idle);
    expect(yawTarget(yawIn({ speed: 220 }))).toBeCloseTo(Y.move, 9);
    expect(yawTarget(yawIn({ facing: -1, speed: 220 }))).toBeCloseTo(-Y.move, 9);
    const slow = yawTarget(yawIn({ speed: 40 }));
    expect(slow).toBeGreaterThan(0);
    expect(slow).toBeLessThan(Y.move);
    // more speed never turns it less
    let last = -1;
    for (let v = 0; v <= 400; v += 10) {
      const y = yawTarget(yawIn({ speed: v }));
      expect(y).toBeGreaterThanOrEqual(last);
      last = y;
    }
  });

  it('keeps the face readable in the air, turns for a shot, and faces the player to celebrate', () => {
    expect(yawTarget(yawIn({ speed: 220, air: 1 }))).toBeCloseTo(Y.air, 9);
    expect(yawTarget(yawIn({ speed: 0, air: 1, facing: -1 }))).toBeCloseTo(-Y.air, 9);
    expect(Y.air).toBeGreaterThanOrEqual(0.4);
    expect(Y.air).toBeLessThanOrEqual(0.5);
    expect(yawTarget(yawIn({ shoot: 1 }))).toBeCloseTo(Y.shoot, 9);
    expect(yawTarget(yawIn({ speed: 220, win: 1 }))).toBeCloseTo(Y.win, 9);
    expect(Y.win).toBe(0);
  });

  it('sweeps at a steady rate: head from -move to +move in headSweepMs, body in bodySweepMs, through 0', () => {
    const sweep = (ms: number) => {
      let y = -Y.move;
      let t = 0;
      let zeroAt = -1;
      while (y < Y.move && t < 2000) {
        y = yawStep(y, Y.move, 1, ms);
        t++;
        if (zeroAt < 0 && y >= 0) zeroAt = t;
      }
      return { t, zeroAt };
    };
    const head = sweep(Y.headSweepMs);
    const body = sweep(Y.bodySweepMs);
    expect(Math.abs(head.t - Y.headSweepMs)).toBeLessThanOrEqual(1);
    expect(Math.abs(body.t - Y.bodySweepMs)).toBeLessThanOrEqual(1);
    expect(head.zeroAt).toBeLessThan(body.zeroAt); // the head leads, the body follows
    expect(yawStep(0.7, 0.75, 1000, 100)).toBe(0.75); // never overshoots
    expect(yawStep(-0.2, -0.75, 1000, 100)).toBe(-0.75);
  });

  it('view: front at 0, side at 1, mirror side kept at exactly 0', () => {
    expect(viewOf(0, 1)).toEqual({ dir: 1, side: 0, front: 1 });
    expect(viewOf(0, -1).dir).toBe(-1);
    expect(viewOf(-1, 1).dir).toBe(-1);
    expect(viewOf(1, -1).side).toBeCloseTo(1, 9);
    expect(viewOf(Y.move, 1).side).toBeGreaterThan(0.85);
  });

  it('depth order: the near side follows the facing (and only changes at yaw 0)', () => {
    expect(nearSide(viewOf(0.5, 1).dir)).toBe('right');
    expect(nearSide(viewOf(-0.5, 1).dir)).toBe('left');
    expect(nearSide(viewOf(0, -1).dir)).toBe('left');
    // a whole turn changes the side exactly once
    let y: number = Y.move;
    let dir: 1 | -1 = 1;
    let changes = 0;
    for (let t = 0; t < 400; t += 16) {
      y = yawStep(y, -Y.move, 16, Y.bodySweepMs);
      const v = viewOf(y, dir);
      if (v.dir !== dir) changes++;
      dir = v.dir;
    }
    expect(changes).toBe(1);
  });
});

const rig = (yaw: number, prev: 1 | -1, pose: RobotPose = idleClip(0), more: Partial<RigInput> = {}): RigFrame =>
  solveRig({ pose, air: 0, body: viewOf(yaw, prev), head: viewOf(yaw, prev), look: { x: 0, y: 0 }, antenna: 0, antennae: 2, cannon: false, ...more });

/** Visual centre of a boot (its origin is at the ankle, toward the heel). */
const bootCentre = (f: Xf) => f.x + f.sx * (ROBOT.parts.boot.w / 2 - ROBOT.parts.boot.heel);

function near(a: Xf, b: Xf, tol = 0.05): void {
  expect(Math.abs(a.x - b.x)).toBeLessThan(tol);
  expect(Math.abs(a.y - b.y)).toBeLessThan(tol);
  expect(Math.abs(a.rot - b.rot)).toBeLessThan(tol);
  expect(Math.abs(Math.abs(a.sx) - Math.abs(b.sx))).toBeLessThan(tol);
  expect(Math.abs(a.sy - b.sy)).toBeLessThan(tol);
}

describe('rig: three-quarter view geometry', () => {
  it('has no visible jump across yaw 0 (the mirror flips where the front view is symmetric)', () => {
    for (const t of [0, 450, 900]) {
      const pose = idleClip(t);
      const a = rig(1e-4, 1, pose);
      const b = rig(-1e-4, 1, pose);
      // Left and right swap roles: what was the near limb is now drawn as the far one, at the same place.
      a.armN.forEach((f, i) => near(f, b.armF[i]));
      a.armF.forEach((f, i) => near(f, b.armN[i]));
      for (let i = 0; i < 2; i++) {
        near(a.legN[i], b.legF[i]);
        near(a.legF[i], b.legN[i]);
      }
      expect(Math.abs(bootCentre(a.legN[2]) - bootCentre(b.legF[2]))).toBeLessThan(0.05);
      expect(Math.abs(bootCentre(a.legF[2]) - bootCentre(b.legN[2]))).toBeLessThan(0.05);
      near(a.torso, b.torso);
      near(a.chest, b.chest);
      near(a.head, b.head);
      near(a.visor, b.visor);
      near(a.eyes[0], b.eyes[1]);
      near(a.eyes[1], b.eyes[0]);
      near(a.earN, b.earF);
      near(a.earF, b.earN);
      near(a.antennae[0], b.antennae[1]);
      expect(a.earNFront).toBe(false);
      expect(a.farShade).toBeLessThan(0.01);
    }
  });

  it('a walk cycle shifted by one step swaps the near and far limbs (used when the near side changes)', () => {
    for (const p of [0, 0.3, 1.7]) {
      const a = gaitClip('walk', p);
      const b = gaitClip('walk', p + 1);
      expect(poseDiff({ ...a, armN: b.armF, armF: b.armN, legN: b.legF, legF: b.legN }, a)).toBeLessThan(1e-9);
    }
  });

  it('turned to move: the face leads, the near eye is bigger, toes point forward, both directions', () => {
    for (const dir of [1, -1] as const) {
      const r = rig(dir * Y.move, dir, gaitClip('walk', 0.4));
      expect(Math.sign(r.visor.x - r.head.x)).toBe(dir); // the face is toward the facing side
      expect(Math.abs(r.visor.sx)).toBeLessThan(Math.abs(r.head.sx)); // visor narrows
      expect(Math.abs(r.eyes[1].sx)).toBeLessThan(Math.abs(r.eyes[0].sx)); // far eye compressed
      expect(Math.sign(r.eyes[0].x - r.head.x)).toBe(dir); // both eyes on the face side
      expect(Math.sign(r.legN[2].sx)).toBe(dir); // boots point their toe forward
      expect(Math.sign(r.legF[2].sx)).toBe(dir);
      expect(Math.abs(r.torso.sx)).toBeLessThan(1); // torso narrows
      expect(Math.sign(r.chest.x)).toBe(dir); // chest panel toward the facing side
      expect(Math.sign(r.earN.x - r.head.x)).toBe(-dir); // near ear on the back of the head...
      expect(r.earNFront).toBe(true); // ...drawn over the shell
      expect(r.farShade).toBeGreaterThan(0.8);
    }
  });

  it('front view when idle: left/right symmetric', () => {
    const r = rig(0, 1);
    expect(r.visor.x).toBeCloseTo(r.head.x, 9);
    expect(r.eyes[0].x + r.eyes[1].x).toBeCloseTo(2 * r.head.x, 6);
    expect(Math.abs(r.eyes[0].sx)).toBeCloseTo(Math.abs(r.eyes[1].sx), 9);
    expect(r.armN[0].x).toBeCloseTo(-r.armF[0].x, 6);
  });

  it('the cannon arm points the way the robot faces', () => {
    for (const dir of [1, -1] as const) {
      const pose = withShot(idleClip(0), { weight: 1, recoil: 0, cannon: true, flash: true });
      const r = rig(dir * Y.shoot, dir, pose, { cannon: true });
      expect(Math.sign(r.tip.x)).toBe(dir);
      expect(Math.abs(r.tip.x)).toBeGreaterThan(20); // well clear of the body
    }
  });
});
