// Robot and Ball tuning (Task 005b): every proportion, colour default and clip amplitude in one place,
// so a review round only edits this file. Pure data, no Phaser. Units: logical px at avatar scale 1,
// angles in radians. Limb angles: 0 = hanging straight down, positive = swung forward (the way the
// character faces). Knee bends are positive backwards, elbow bends positive forwards.

export const ROBOT = {
  /** Body parts (logical px). The feet are at y = 0; up is negative. */
  parts: {
    head: { w: 48, h: 34, radius: 14 },
    visor: { w: 36, h: 21, radius: 9, y: 1 },
    ear: { r: 7, ring: 2.5 },
    eye: { w: 7, h: 10, gap: 8.5, y: 1 },
    antenna: { length: 12, width: 2.6, tip: 3.6, spread: 9, splay: 0.28 },
    torso: { w: 32, h: 26, radius: 10 },
    chest: { r: 6.5 },
    hips: { w: 26, h: 7 },
    neck: { w: 12, h: 4 },
    upperArm: { w: 10, len: 13 },
    forearm: { w: 10, len: 12 },
    hand: { r: 6 },
    cannon: { w: 11, len: 13 },
    thigh: { w: 12, len: 14 },
    shin: { w: 12, len: 13 },
    boot: { w: 20, h: 10, ankle: 7 },
  },
  /** Joint layout relative to the feet when standing straight. */
  layout: {
    /** Hip height: thigh + shin + boot ankle height. */
    hipY: -34,
    hipX: { near: 6, far: -6 },
    /** Shoulders above the hips. */
    shoulderY: 21,
    shoulderX: { near: 14, far: -14 },
    /** Head centre above the hips. */
    headY: 50,
    torsoY: 13,
  },
  /** How far the eyes move toward the facing direction (px), and with vertical speed. */
  look: { x: 3, y: 2, perVy: 1 / 500 },
  /** Antenna spring: stiffness (1/s^2), damping (1/s), push per px/s of speed change, idle sway. */
  antennaSpring: { stiffness: 180, damping: 9, push: 0.00012, vyPush: 0.0005, sway: 0.06, max: 0.7 },
  /** Facing turn: time to go from one side to the other (ms), squeezing through 0 like a paper turn. */
  turnMs: 120,
} as const;

/** Clip amplitudes for the robot (and the walk/run timing). */
export const ROBOT_CLIPS = {
  /** Ground distance per step at scale 1 (px): the legs reach about this far, so feet do not skate. */
  stepLength: { walk: 46, run: 56 },
  idle: { breathMs: 1800, bob: 1.2, armOut: 0.12, legOut: 0.06, headMs: 2400, head: 0.04 },
  walk: { leg: 0.62, knee: 0.15, kneeLift: 0.6, arm: 0.42, elbow: 0.35, bob: 2.5, lean: 0.05, head: 0.03 },
  run: { leg: 0.78, knee: 0.3, kneeLift: 1.15, arm: 0.75, elbow: 1.45, bob: 3.5, lean: 0.16, head: 0.05 },
  /** Jump: crouch at take-off, then arms up and legs tucked while rising (ms to reach the rise pose). */
  jump: { riseMs: 140 },
  /** Fall: arms out, legs dangle, a little flail. vy where the fall pose is fully in (px/s). */
  fall: { fullAtVy: 300, startAtVy: -150, flail: 0.12, flailHz: 2.2 },
  /** Land: crouch overlay, in quickly then out (ms). */
  land: { inMs: 40, outMs: 200 },
  win: { periodMs: 450, wave: 0.3, bob: 3, head: 0.12 },
  /** Shoot: arm forward, recoil kick, cannon visible for cannonMs, muzzle flash for flashMs. */
  shoot: { inMs: 60, holdMs: 300, outMs: 120, recoil: 0.3, recoilMs: 130, cannonMs: 380, flashMs: 100 },
  /** Blend times (ms): into the air pose / back to the ground pose, into the win pose. */
  blend: { airIn: 90, airOut: 80, winIn: 160 },
  /** Strength of the shared procedural motion on the robot (it has its own bob and lean). */
  motion: { stride: 0, air: 0.6, squash: 0.5 },
} as const;

export const BALL = {
  /** Diameter at scale 1 (px). */
  size: 96,
  eye: { w: 15, h: 19, gap: 13, y: -7, pupil: 4.6 },
  mouthY: 13,
  /** Face shift toward the facing direction (px) and with vertical speed. */
  look: { x: 7, y: 3, perVy: 1 / 400, pupil: 3.2 },
  /** Portrait decal diameter as a fraction of the ball. */
  decal: 0.8,
  /** Mouth open time for "shoot" (ms). */
  shootMs: 260,
  /** Shared procedural motion on the ball: a little bounce, no lean (the ball rolls instead). */
  motion: { stride: 0.5, air: 0, squash: 1 },
  /** Shadow size compared with the default (the ball is wider than a standing character). */
  shadow: 1.35,
} as const;

/** Default robot palette (D-033): white body, dark-grey joints, cyan accents, dark visor, glowing cyan eyes. */
export const DEFAULT_PALETTE = {
  body: 0xf3f6f9,
  joint: 0x59656f,
  accent: 0x2fd6e0,
  visor: 0x14232e,
  eye: 0x4ff0ff,
} as const;

/** Allowed range of the per-character size factor. */
export const SCALE_RANGE = { min: 0.9, max: 1.15 } as const;
