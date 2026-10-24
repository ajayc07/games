// Animation clips for code-built avatars (Task 005b, D-033). Pure functions of phase or time that
// return joint angles, offsets and flags; no Phaser, unit-tested. Numbers live in robotSpec.ts.
// Conventions: see robotSpec.ts (0 = limb hanging down, positive = forward; knees bend back, elbows forward).
import { ROBOT, ROBOT_CLIPS as C } from './robotSpec';

export type Gait = 'walk' | 'run';

export interface Limb {
  /** Upper segment angle (hip or shoulder), forward positive. */
  a: number;
  /** Bend at the middle joint (knee backwards, elbow forwards), 0 = straight. */
  b: number;
  /** Spread out to the side (arms; 0 for legs). Seen from the front this is what opens a V. */
  s: number;
}

export interface LegPose extends Limb {
  /** Boot tilt, absolute (0 = flat). */
  foot: number;
}

export interface RobotPose {
  /** Extra lift of the whole body (px, up positive). */
  bob: number;
  /** Upper-body lean around the hips (forward positive). */
  lean: number;
  /** Head tilt on top of the lean. */
  head: number;
  armN: Limb;
  armF: Limb;
  legN: LegPose;
  legF: LegPose;
}

const TAU = Math.PI * 2;

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

const lerp = (a: number, b: number, w: number) => a + (b - a) * w;
const smooth = (t: number) => {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
};

/** Gait from the level's controls: walking on Left/Right levels, running on auto-run levels. */
export function gaitFor(autoRun: boolean): Gait {
  return autoRun ? 'run' : 'walk';
}

const limb = (a: number, b: number, s: number): Limb => ({ a, b, s });
const leg = (a: number, b: number, foot: number): LegPose => ({ a, b, s: 0, foot });

/** Blends two poses (w = 0 gives `p`, 1 gives `q`, clamped). */
export function blendPose(p: RobotPose, q: RobotPose, w: number): RobotPose {
  const t = clamp01(w);
  if (t === 0) return p;
  if (t === 1) return q;
  const bl = (x: Limb, y: Limb): Limb => ({ a: lerp(x.a, y.a, t), b: lerp(x.b, y.b, t), s: lerp(x.s, y.s, t) });
  const bg = (x: LegPose, y: LegPose): LegPose => ({ a: lerp(x.a, y.a, t), b: lerp(x.b, y.b, t), s: 0, foot: lerp(x.foot, y.foot, t) });
  return {
    bob: lerp(p.bob, q.bob, t),
    lean: lerp(p.lean, q.lean, t),
    head: lerp(p.head, q.head, t),
    armN: bl(p.armN, q.armN),
    armF: bl(p.armF, q.armF),
    legN: bg(p.legN, q.legN),
    legF: bg(p.legF, q.legF),
  };
}

/** Moves a blend weight toward 0 or 1 linearly: `inMs` to reach 1, `outMs` to reach 0. */
export function approachWeight(w: number, on: boolean, dtMs: number, inMs: number, outMs: number): number {
  if (on) return Math.min(1, w + dtMs / Math.max(1, inMs));
  return Math.max(0, w - dtMs / Math.max(1, outMs));
}

// ---------- idle ----------

export function idleClip(t: number): RobotPose {
  const k = C.idle;
  const breath = Math.sin((TAU * t) / k.breathMs);
  return {
    bob: k.bob * (0.5 + 0.5 * breath),
    lean: 0,
    head: k.head * Math.sin((TAU * t) / k.headMs),
    // Symmetric, so the front view (idle faces the player) looks the same mirrored.
    armN: limb(k.armOut + 0.03 * breath, 0.25, k.spread + 0.02 * breath),
    armF: limb(k.armOut + 0.03 * breath, 0.25, k.spread + 0.02 * breath),
    legN: leg(k.legOut, 0.04, 0),
    legF: leg(k.legOut, 0.04, 0),
  };
}

// ---------- walk / run ----------

/**
 * One walk or run cycle is 2 steps (`phase` counts steps, from distance travelled). Whole numbers are
 * foot-strikes (legs spread); the far limbs run half a cycle (1 step) behind the near ones.
 */
export function gaitClip(gait: Gait, phase: number): RobotPose {
  const k = gait === 'run' ? C.run : C.walk;
  const th = Math.PI * phase + Math.PI / 2;
  const legAt = (x: number): LegPose => {
    const a = k.leg * Math.sin(x);
    const b = k.knee + k.kneeLift * Math.max(0, Math.cos(x)); // the swinging leg lifts its knee
    return leg(a, b, -0.5 * (a - b));
  };
  const armAt = (x: number): Limb => limb(-k.arm * Math.sin(x), k.elbow, k.spread); // opposite to the leg on the same side
  return {
    bob: k.bob * 0.5 * (1 + Math.cos(2 * th)), // highest as the legs pass, lowest at foot-strike
    lean: k.lean,
    head: k.head * Math.sin(2 * th),
    armN: armAt(th),
    armF: armAt(th + Math.PI),
    legN: legAt(th),
    legF: legAt(th + Math.PI),
  };
}

// ---------- air ----------

const CROUCH: RobotPose = {
  bob: 0,
  lean: 0.12,
  head: 0.05,
  armN: limb(-0.6, 0.3, 0.25),
  armF: limb(-0.75, 0.3, 0.25),
  legN: leg(0.5, 0.95, 0),
  legF: leg(0.4, 0.85, 0),
};
// Rising: both arms straight up and spread into a V (the V reads in front and three-quarter views).
const RISE: RobotPose = {
  bob: 0,
  lean: -0.04,
  head: -0.08,
  armN: limb(2.95, 0.1, 0.62),
  armF: limb(2.85, 0.1, 0.62),
  legN: leg(0.95, 1.45, 0.3),
  legF: leg(0.3, 0.9, 0.1),
};
const FALL: RobotPose = {
  bob: 0,
  lean: 0.06,
  head: 0.06,
  armN: limb(1.7, 0.2, 1.0),
  armF: limb(1.4, 0.2, 1.0),
  legN: leg(0.28, 0.35, 0.1),
  legF: leg(-0.15, 0.2, -0.05),
};

/** Jump `t` ms after take-off: a crouch that springs into arms-up, legs-tucked. */
export function jumpClip(t: number): RobotPose {
  return blendPose(CROUCH, RISE, smooth(t / C.jump.riseMs));
}

/** Falling: arms out to the sides, legs dangling, a little flail over time `t`. */
export function fallClip(t: number): RobotPose {
  const f = C.fall.flail * Math.sin((TAU * C.fall.flailHz * t) / 1000);
  return { ...FALL, armN: limb(FALL.armN.a + f, FALL.armN.b, FALL.armN.s), armF: limb(FALL.armF.a - f, FALL.armF.b, FALL.armF.s) };
}

/** How much of the fall pose shows at vertical speed `vy` (px/s, down positive). */
export function fallWeight(vy: number): number {
  return clamp01((vy - C.fall.startAtVy) / (C.fall.fullAtVy - C.fall.startAtVy));
}

/** In the air: rise blending into fall with vertical speed. */
export function airClip(tSinceJump: number, vy: number, t: number): RobotPose {
  return blendPose(jumpClip(tSinceJump), fallClip(t), fallWeight(vy));
}

// ---------- land ----------

export const LAND_POSE: RobotPose = {
  bob: 0,
  lean: 0.1,
  head: 0.06,
  armN: limb(-0.2, 0.3, 0.2),
  armF: limb(-0.35, 0.3, 0.2),
  legN: leg(0.45, 1.0, 0),
  legF: leg(0.35, 0.9, 0),
};

/** Weight of the landing crouch `t` ms after touching down: quick in, then out; 0 once done. */
export function landWeight(t: number): number {
  if (t < 0) return 0;
  if (t < C.land.inMs) return t / C.land.inMs;
  return clamp01(1 - (t - C.land.inMs) / C.land.outMs);
}

// ---------- win ----------

/** Arms up in a V and waving, a little dance with alternating steps. Continuous in `t`. Seen from the front (win faces the player). */
export function winClip(t: number): RobotPose {
  const k = C.win;
  const w = (TAU * t) / k.periodMs;
  const step = Math.sin(w / 2);
  return {
    bob: k.bob * Math.abs(Math.sin(w / 2)),
    lean: 0,
    head: k.head * Math.sin(w / 2),
    // A "V": both arms up and spread out to the sides, waving in turn.
    armN: limb(2.75, 0.15, k.spread + k.wave * Math.sin(w)),
    armF: limb(2.75, 0.15, k.spread + k.wave * Math.sin(w + Math.PI)),
    legN: leg(0.25 * step, 0.35 * Math.max(0, step), 0),
    legF: leg(-0.25 * step, 0.35 * Math.max(0, -step), 0),
  };
}

// ---------- shoot ----------

export interface ShootState {
  /** How much the near arm points forward (0..1). */
  weight: number;
  /** Recoil kick (radians, the arm and body pull back). */
  recoil: number;
  cannon: boolean;
  flash: boolean;
}

/** Shooting `t` ms after the shot (t < 0 or long after = no shot). */
export function shootClip(t: number): ShootState {
  const k = C.shoot;
  if (t < 0) return { weight: 0, recoil: 0, cannon: false, flash: false };
  let weight: number;
  if (t < k.inMs) weight = t / k.inMs;
  else if (t < k.inMs + k.holdMs) weight = 1;
  else weight = clamp01(1 - (t - k.inMs - k.holdMs) / k.outMs);
  const r = clamp01((t - 30) / k.recoilMs);
  return { weight, recoil: k.recoil * Math.sin(Math.PI * r) * (t > 30 ? 1 : 0), cannon: t < k.cannonMs, flash: t < k.flashMs };
}

/** Applies a shot to a pose: the near arm points straight forward, then recoils. */
export function withShot(p: RobotPose, s: ShootState): RobotPose {
  if (s.weight <= 0) return p;
  const w = s.weight;
  return {
    ...p,
    lean: p.lean - 0.2 * s.recoil * w,
    armN: { a: lerp(p.armN.a, Math.PI / 2 - s.recoil, w), b: lerp(p.armN.b, 0, w), s: lerp(p.armN.s, 0, w) },
  };
}

// ---------- expressions ----------

/** Time of the next blink after `now`: every 3 to 5 s (`rand` in 0..1). */
export function nextBlinkAt(now: number, rand: number): number {
  return now + 3000 + clamp01(rand) * 2000;
}

export const BLINK_MS = 140;

/** Eye openness `t` ms into a blink: 1 open, about 0.1 closed at the middle, back to 1 at BLINK_MS. */
export function blinkOpen(t: number): number {
  if (t < 0 || t >= BLINK_MS) return 1;
  const u = t / BLINK_MS;
  return 1 - 0.9 * Math.sin(Math.PI * u);
}

/** Eye offset toward where the character looks: x from the (smoothed) facing, y from vertical speed. */
export function eyeLook(facing: number, vy: number, kx: number, ky: number, perVy: number): { x: number; y: number } {
  const y = Math.max(-1, Math.min(1, vy * perVy)) * ky;
  return { x: Math.max(-1, Math.min(1, facing)) * kx, y };
}

// ---------- yaw (three-quarter view, Task 005c) ----------

export interface YawInput {
  facing: 1 | -1;
  /** Ground speed (px/s) and the level's normal speed. */
  speed: number;
  refSpeed: number;
  /** Weights 0..1: in the air, shooting, winning. */
  air: number;
  shoot: number;
  win: number;
}

/** Where the yaw is heading (-1..1, sign = facing): front-on when still, turned toward the way it goes when moving. */
export function yawTarget(i: YawInput): number {
  const Y = ROBOT.yaw;
  const moving = smooth(i.speed / Math.max(1, i.refSpeed * Y.fullAtSpeed));
  let mag = lerp(Y.idle, Y.move, moving);
  mag = lerp(mag, Y.air, clamp01(i.air));
  mag = lerp(mag, Math.max(mag, Y.shoot), clamp01(i.shoot));
  mag = lerp(mag, Y.win, clamp01(i.win));
  return i.facing * mag;
}

/** Moves a yaw toward its target at a steady rate: a sweep from -move to +move takes `sweepMs`. */
export function yawStep(yaw: number, target: number, dtMs: number, sweepMs: number): number {
  const step = ((2 * ROBOT.yaw.move) / Math.max(1, sweepMs)) * dtMs;
  if (yaw < target) return Math.min(target, yaw + step);
  return Math.max(target, yaw - step);
}

/** How the body is seen at a yaw: facing side (`dir`, kept from before at exactly 0), and the side/front mix. */
export interface View {
  dir: 1 | -1;
  /** sin(|yaw| x 90 deg): 0 front view, 1 side view. */
  side: number;
  /** cos(|yaw| x 90 deg). */
  front: number;
}

export function viewOf(yaw: number, prevDir: 1 | -1): View {
  const dir = yaw > 0 ? 1 : yaw < 0 ? -1 : prevDir;
  const phi = (Math.min(1, Math.abs(yaw)) * Math.PI) / 2;
  return { dir, side: Math.sin(phi), front: Math.cos(phi) };
}

/**
 * Which of the robot's own sides is nearer the player, so its limbs are drawn in front of the body: turned
 * to the right (dir 1) its right side comes forward; turned left, its left side. The rig draws the clip's
 * "N" limbs on the near side, so when this changes (only at yaw 0) the walk cycle shifts by one step to keep
 * every limb where it was.
 */
export function nearSide(dir: 1 | -1): 'right' | 'left' {
  return dir > 0 ? 'right' : 'left';
}

/** Moves a facing value (-1..1) toward the real one, passing through 0 (the Ball's face). */
export function turnToward(current: number, facing: number, dtMs: number, turnMs: number): number {
  const step = (2 * dtMs) / Math.max(1, turnMs);
  if (current < facing) return Math.min(facing, current + step);
  return Math.max(facing, current - step);
}

/** One step of a damped spring (angle, velocity) toward `target`. */
export function springStep(
  angle: number,
  vel: number,
  target: number,
  dtMs: number,
  stiffness: number,
  damping: number,
): { angle: number; vel: number } {
  const dt = Math.min(0.05, dtMs / 1000);
  const v = vel + ((target - angle) * stiffness - vel * damping) * dt;
  return { angle: angle + v * dt, vel: v };
}

/** Ball rolling: body angle (radians) after rolling `distance` px with radius `r`. */
export function rollAngle(distance: number, r: number): number {
  return r > 0 ? distance / r : 0;
}
