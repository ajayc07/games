// Character motion tuning and maths (Task 004b). Every number for the lively run, air and idle motion
// lives here. All functions are pure (no Phaser) and return plain numbers, so they are unit tested and
// allocate nothing per frame. Everything here is visual only: the physics body never changes.
//
// Conventions: "stretch" is a signed amount, +0.1 = 10% taller and thinner, -0.1 = 10% shorter and
// wider (squash); see scalesFor. Angles are radians, positive = clockwise (Phaser), so leaning forward
// while facing right is positive. Stride phase counts steps: every whole number is one footfall.

export const ANIM = {
  run: {
    /** Distance travelled per step (px). At 200 px/s that is about 3.5 steps per second. */
    stepLength: 56,
    /** Peak vertical bounce per step (px). */
    bounce: 5,
    /** Squash at foot-strike (stretch amount, negative). */
    strikeSquash: -0.05,
    /** Stretch at mid-stride. */
    midStretch: 0.04,
    /** Forward lean while running (radians, about 4 degrees). */
    lean: 0.07,
    /** Side-to-side rock, alternating each step (radians, about 2 degrees). */
    rock: 0.035,
    /** Time to blend the run motion in after starting, and out after stopping (ms). */
    blendInMs: 160,
    blendOutMs: 220,
    /** Below this horizontal speed (px/s) the character counts as standing. */
    minSpeed: 10,
  },
  air: {
    /** Lean per px/s of vertical speed; up tilts back, down leans forward. */
    leanPerSpeed: 1 / 7000,
    /** Limits: tilt back going up, lean forward coming down (radians). */
    maxBack: 0.07,
    maxForward: 0.1,
  },
  /** Squash/stretch pulses: peak stretch, time to reach it, time to settle back to 1. */
  pulse: {
    takeoff: { peak: 0.18, attackMs: 70, settleMs: 240 },
    landing: { peak: -0.15, attackMs: 40, settleMs: 120 },
    hop: { peak: 0.14, attackMs: 70, settleMs: 240 },
    placed: { peak: -0.12, attackMs: 30, settleMs: 140 },
  },
  /** How fast lean follows its target (per second, exponential). */
  leanRate: 14,
  idle: {
    /** One slow breath (ms) and its size (stretch amount). */
    breathMs: 1800,
    breath: 0.014,
  },
  celebrate: {
    /** One joyful bounce (ms), matching the star fill rhythm, and its height (px). */
    periodMs: 450,
    height: 20,
    /** Squash at each touch-down / stretch at the top (stretch amount). */
    stretch: 0.05,
  },
  /** How much of sx follows sy in the opposite direction (1 = keep area, 0 = only taller). */
  volume: 0.8,
  shadow: {
    /** Full-size shadow width/height on the ground (logical px). */
    width: 64,
    height: 16,
    alpha: 0.28,
    /** At this height above the ground (px) the shadow reaches its smallest size. */
    fadeHeight: 220,
    minScale: 0.45,
    minAlpha: 0.08,
  },
  dust: {
    /** At least this long between footfall puffs (ms). */
    footfallMinMs: 220,
    footfallCount: 2,
    landingCount: 9,
    /** Speed streaks behind the runner: one every this many ms while running on the ground. */
    streakEveryMs: 140,
  },
  flipbook: {
    /** Default frames per second of a run cycle at the level's normal run speed. */
    fps: 10,
    /** Procedural motion strength when a run flipbook plays (the frames carry most of the motion). */
    motionScale: 0.45,
  },
} as const;

const TAU = Math.PI * 2;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// ---------- stride ----------

/** New stride phase after travelling `dx` px (direction does not matter). */
export function advanceStride(phase: number, dx: number, stepLength: number = ANIM.run.stepLength): number {
  return phase + Math.abs(dx) / stepLength;
}

/** True if the phase crossed a whole number (a footfall) between `before` and `after`. */
export function crossedFootfall(before: number, after: number): boolean {
  return Math.floor(after) > Math.floor(before);
}

/** Fraction through the current step: 0 at foot-strike, 0.5 mid-stride. */
function stepFraction(phase: number): number {
  return phase - Math.floor(phase);
}

/** Vertical lift (px, up is positive) at this stride phase: 0 at foot-strike, peak mid-stride. */
export function strideBounce(phase: number, amp = 1): number {
  return Math.sin(Math.PI * stepFraction(phase)) * ANIM.run.bounce * amp;
}

/** Stretch amount at this stride phase: squash at foot-strike, stretch mid-stride. */
export function strideStretch(phase: number, amp = 1): number {
  const c = Math.cos(TAU * stepFraction(phase)); // 1 at strike, -1 mid-stride
  const v = c > 0 ? c * ANIM.run.strikeSquash : -c * ANIM.run.midStretch;
  return v * amp;
}

/** Side-to-side rock (radians): alternates direction every step, zero at each foot-strike. */
export function strideRock(phase: number, amp = 1): number {
  return Math.sin(Math.PI * phase) * ANIM.run.rock * amp;
}

/** Forward lean target (radians) while running, toward the direction of travel. */
export function runLean(facing: number, amp = 1): number {
  return (facing < 0 ? -1 : 1) * ANIM.run.lean * amp;
}

/**
 * Moves the run blend (0 = standing, 1 = full run motion) toward its target linearly,
 * over blendInMs when starting and blendOutMs when stopping.
 */
export function stepBlend(blend: number, running: boolean, dtMs: number): number {
  if (running) return Math.min(1, blend + dtMs / ANIM.run.blendInMs);
  return Math.max(0, blend - dtMs / ANIM.run.blendOutMs);
}

// ---------- air ----------

/** Lean target in the air (radians): going up tilts back a little, coming down leans forward. */
export function airLean(vy: number, facing: number): number {
  const a = clamp(vy * ANIM.air.leanPerSpeed, -ANIM.air.maxBack, ANIM.air.maxForward);
  return (facing < 0 ? -1 : 1) * a;
}

/** Exponential approach of `current` to `target` at `rate` per second. */
export function smoothToward(current: number, target: number, dtMs: number, rate: number = ANIM.leanRate): number {
  return current + (target - current) * Math.min(1, (rate * dtMs) / 1000);
}

// ---------- squash / stretch pulses ----------

/** A short squash or stretch (take-off, landing, ...) that eases to `peak` and settles back to 0. */
export interface Pulse {
  start: number;
  /** Value at the start: whatever the previous pulse showed, so an interrupt never jumps. */
  from: number;
  peak: number;
  attackMs: number;
  settleMs: number;
}

export interface PulseShape {
  peak: number;
  attackMs: number;
  settleMs: number;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));

/** Stretch amount of a pulse at time `now` (0 once settled, or with no pulse). */
export function pulseValue(p: Pulse | null, now: number): number {
  if (!p) return 0;
  const t = now - p.start;
  if (t <= 0) return p.from;
  if (t < p.attackMs) return p.from + (p.peak - p.from) * easeInOut(t / p.attackMs);
  const s = t - p.attackMs;
  if (s < p.settleMs) return p.peak * (1 - easeInOut(s / p.settleMs));
  return 0;
}

/** Starts a new pulse at `now`, continuing from the current value of `prev` (smooth interrupts). */
export function kickPulse(prev: Pulse | null, now: number, shape: PulseShape): Pulse {
  return { start: now, from: pulseValue(prev, now), peak: shape.peak, attackMs: shape.attackMs, settleMs: shape.settleMs };
}

// ---------- idle and celebration ----------

/** Slow breathing (stretch amount) at time `now`. */
export function breath(now: number): number {
  return Math.sin((TAU * now) / ANIM.idle.breathMs) * ANIM.idle.breath;
}

/** Joyful repeat bounce `t` ms after it started: lift (px, up positive). */
export function celebrateLift(t: number): number {
  if (t < 0) return 0;
  const u = (t % ANIM.celebrate.periodMs) / ANIM.celebrate.periodMs;
  return 4 * u * (1 - u) * ANIM.celebrate.height;
}

/** Stretch amount during the celebration bounce: squash at each touch-down, stretch at the top. */
export function celebrateStretch(t: number): number {
  if (t < 0) return 0;
  const u = (t % ANIM.celebrate.periodMs) / ANIM.celebrate.periodMs;
  return ANIM.celebrate.stretch * (1 - 4 * Math.abs(u - 0.5)); // -1 at touch-down, +1 at the top
}

/** Celebration length (ms) rounded up to whole bounces, so it always ends on the ground. */
export function celebrateDuration(minMs: number): number {
  return Math.max(1, Math.ceil(minMs / ANIM.celebrate.periodMs)) * ANIM.celebrate.periodMs;
}

// ---------- scales ----------

/** Horizontal scale factor for a stretch amount (the vertical one is 1 + stretch). */
export function widthFor(stretch: number): number {
  return 1 - stretch * ANIM.volume;
}

// ---------- shadow ----------

/** Shadow size factor (0..1 of full) for a height above the ground (px). */
export function shadowScale(height: number): number {
  const t = clamp(height / ANIM.shadow.fadeHeight, 0, 1);
  return 1 - (1 - ANIM.shadow.minScale) * t;
}

/** Shadow alpha for a height above the ground (px). */
export function shadowAlpha(height: number): number {
  const t = clamp(height / ANIM.shadow.fadeHeight, 0, 1);
  return ANIM.shadow.alpha - (ANIM.shadow.alpha - ANIM.shadow.minAlpha) * t;
}

// ---------- run flipbook ----------

/**
 * Advances a flipbook position (in frames) by `dtMs` at `fps`, scaled by how fast the character
 * moves compared with the normal run speed (faster = quicker frames, standing = frozen).
 */
export function advanceFlipbook(pos: number, dtMs: number, fps: number, speed: number, refSpeed: number): number {
  if (refSpeed <= 0) return pos;
  return pos + (dtMs / 1000) * fps * (Math.abs(speed) / refSpeed);
}

/** Frame index for a flipbook position, or -1 when there is no cycle to play (fewer than 2 frames). */
export function flipbookFrame(pos: number, frameCount: number): number {
  if (frameCount < 2) return -1;
  const i = Math.floor(pos) % frameCount;
  return i < 0 ? i + frameCount : i;
}
