// Shared lively motion for every look (Task 004b maths, moved here from Player in Task 005b): stride phase,
// run blend, squash/stretch pulses, lean, breathing, the win bounce, the soft shadow and dust. It turns
// physics facts (position, velocity, grounded) into an AvatarState and hands it to the look. Each look
// says how strongly the shared motion applies (`motion()`); the picture look uses it all, unchanged.
import type Phaser from 'phaser';
import {
  ANIM,
  advanceStride,
  airLean,
  breath,
  celebrateDuration,
  celebrateLift,
  celebrateStretch,
  clamp,
  crossedFootfall,
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
  type Pulse,
} from '../levels/animation';
import { choosePose, type PoseName } from '../levels/poses';
import type { Gait } from './clips';
import type { AvatarLook, AvatarState, MotionFxSink } from './types';

export interface DriverOptions {
  look: AvatarLook;
  x: number;
  feet: number;
  depth: number;
  alpha?: number;
  /** The level's moving speed (flipbook speed reference). */
  refSpeed: number;
  gait: Gait;
  /** World y of the ground surface under x at or below `feet`, or null over a gap (for the shadow). */
  groundAt: (x: number, feet: number) => number | null;
  fx?: MotionFxSink;
}

/** Physics facts for one frame. */
export interface DriveInput {
  time: number;
  dtMs: number;
  /** Body centre x and bottom (feet). */
  x: number;
  bottom: number;
  vx: number;
  vy: number;
  /** The body touches the ground. */
  onGround: boolean;
  /** The body is enabled (false while hidden or frozen). */
  enabled: boolean;
  /** Time since leaving the ground (ms, 0 on the ground). */
  airborneMs: number;
  /** A jump was made and has not landed yet. */
  jumped: boolean;
  /** Cloud ride point, or null. */
  ride: { x: number; y: number } | null;
  facing: 1 | -1;
}

/** Edge of the celebration bounce envelope (ms), so it fades in and out instead of popping. */
const CELEBRATE_EDGE_MS = 80;
/** Ignore position jumps bigger than this per frame (teleports) for the stride. */
const MAX_STRIDE_DX = 40;

export class AvatarDriver {
  readonly look: AvatarLook;
  readonly shadow: Phaser.GameObjects.Image;
  pose: PoseName = 'idle';
  /** Counts of dust events sent (for tests). */
  readonly fxCount = { footfall: 0, landing: 0, streak: 0 };

  private readonly groundAt: DriverOptions['groundAt'];
  private readonly fx: MotionFxSink | undefined;
  private readonly refSpeed: number;
  private readonly gait: Gait;
  private pulse: Pulse | null = null;
  private stridePhase = 0;
  private runBlend = 0;
  private lean = 0;
  private lastX: number;
  private lastFootfallAt = -1e9;
  private lastStreakAt = -1e9;
  private celebrateFrom = -1;
  private celebrateUntil = -1;
  private stretch = 0;
  private winPose = false;
  private visible = true;
  private alpha: number;
  private facing: 1 | -1 = 1;
  private lastBottom = 0;

  constructor(scene: Phaser.Scene, opts: DriverOptions) {
    this.look = opts.look;
    this.groundAt = opts.groundAt;
    this.fx = opts.fx;
    this.refSpeed = opts.refSpeed;
    this.gait = opts.gait;
    this.alpha = opts.alpha ?? 1;
    this.lastX = opts.x;
    this.shadow = scene.add.image(opts.x, opts.feet, 'fx-shadow').setDepth(opts.depth - 0.5).setAlpha(ANIM.shadow.alpha * this.alpha);
    this.look.setDepth(opts.depth);
    this.look.setAlpha(this.alpha);
  }

  // ---------- events from the physics side ----------

  takeoff(now: number): void {
    // Continues from whatever squash is showing, so jumping out of a landing never pops.
    this.pulse = kickPulse(this.pulse, now, ANIM.pulse.takeoff);
    this.look.trigger('jump', now);
  }

  land(now: number, x: number, feet: number): void {
    this.pulse = kickPulse(this.pulse, now, ANIM.pulse.landing);
    if (this.fx) {
      this.fx.landing(x, feet);
      this.fxCount.landing++;
    }
    this.look.trigger('land', now);
  }

  /** Happy hop at the flag: from now on, standing shows the win pose. */
  hop(now: number): void {
    this.winPose = true;
    this.pulse = kickPulse(this.pulse, now, ANIM.pulse.hop);
    this.look.trigger('win', now);
  }

  /** Joyful repeat bounce on the spot (visual only) for at least `minMs`, ending on the ground. */
  celebrate(now: number, minMs: number): void {
    this.celebrateFrom = now;
    this.celebrateUntil = now + celebrateDuration(minMs);
  }

  /** Put down on the ground (start, respawn): a small squash, stride restarts. */
  placed(now: number, x: number): void {
    this.pulse = kickPulse(this.pulse, now, ANIM.pulse.placed);
    this.lastX = x;
    this.stridePhase = 0;
    this.winPose = false;
  }

  shoot(now: number): void {
    this.look.trigger('shoot', now);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.look.setVisible(visible);
    this.shadow.setVisible(visible);
  }

  setAlpha(alpha: number): void {
    this.alpha = alpha;
    this.look.setAlpha(alpha);
  }

  setDepth(depth: number): void {
    this.look.setDepth(depth);
  }

  // ---------- per frame ----------

  update(input: DriveInput): void {
    const { time, dtMs } = input;
    let x = input.x;
    let y = input.bottom;
    const riding = input.ride !== null;
    if (input.facing !== this.facing) {
      this.facing = input.facing;
      this.look.setFacing(input.facing);
    }
    if (input.ride) {
      x = input.ride.x;
      y = input.ride.y;
      this.pose = 'idle';
    } else {
      this.pose = choosePose({ grounded: input.onGround, speedX: input.vx, airborneMs: input.airborneMs, jumped: input.jumped });
      if (this.pose === 'idle' && this.winPose) this.pose = 'win';
    }
    const grounded = !riding && input.onGround;
    const speed = Math.abs(input.vx);
    const running = grounded && input.enabled && speed > ANIM.run.minSpeed;
    const w = this.look.motion();

    // Stride: advances with distance travelled on the ground, so standing still means no stride motion.
    const dx = Math.abs(x - this.lastX);
    this.lastX = x;
    this.runBlend = riding ? 0 : stepBlend(this.runBlend, running, dtMs);
    const before = this.stridePhase;
    if (running && dx <= MAX_STRIDE_DX) this.stridePhase = advanceStride(this.stridePhase, dx);
    else if (this.runBlend === 0) this.stridePhase = 0; // the next start begins at a foot-strike

    const blend = this.runBlend;
    let lift = strideBounce(this.stridePhase, w.stride) * blend;
    let stretch = (pulseValue(this.pulse, time) + strideStretch(this.stridePhase, w.stride) * blend) * w.squash;
    if (grounded) stretch += breath(time) * (1 - blend) * w.squash;

    // Celebration bounce (win screen), faded in and out at its edges.
    if (time < this.celebrateUntil && grounded) {
      const t = time - this.celebrateFrom;
      const env = clamp(Math.min(t, this.celebrateUntil - time) / CELEBRATE_EDGE_MS, 0, 1);
      lift += celebrateLift(t) * env;
      stretch += celebrateStretch(t) * env * w.squash;
    }

    // Lean: forward while running, follows vertical speed in the air; eased so switches never snap.
    const leanTarget = riding || grounded ? 0 : airLean(input.vy, this.facing) * w.air;
    this.lean = smoothToward(this.lean, leanTarget, dtMs);
    const rotation = this.lean + (runLean(this.facing, w.stride) + strideRock(this.stridePhase, w.stride)) * blend;
    this.stretch = stretch;

    const state: AvatarState = {
      time,
      dtMs,
      x,
      y,
      lift,
      stretch,
      rotation,
      facing: this.facing,
      pose: this.pose,
      grounded,
      speed,
      vy: input.vy,
      stridePhase: this.stridePhase,
      runBlend: blend,
      gait: this.gait,
      refSpeed: this.refSpeed,
      riding,
    };
    this.look.update(state);
    this.lastBottom = input.bottom;

    this.updateShadow(x, y - lift, input.bottom, riding);
    if (running && this.fx) this.emitDust(time, before, x, input.bottom);
  }

  private updateShadow(x: number, feetY: number, bottom: number, riding: boolean): void {
    const ground = riding || !this.visible ? null : this.groundAt(x, bottom - 4);
    if (ground === null) {
      this.shadow.setVisible(false);
      return;
    }
    const h = Math.max(0, ground - feetY);
    const k = shadowScale(h) * this.look.shadowScale;
    this.shadow.setVisible(true);
    this.shadow.setPosition(x, ground - 2);
    this.shadow.setDisplaySize(ANIM.shadow.width * k, ANIM.shadow.height * k);
    this.shadow.setAlpha(shadowAlpha(h) * this.alpha);
  }

  private emitDust(time: number, phaseBefore: number, x: number, feet: number): void {
    const fx = this.fx!;
    const dir = this.facing;
    if (crossedFootfall(phaseBefore, this.stridePhase) && time - this.lastFootfallAt >= ANIM.dust.footfallMinMs) {
      this.lastFootfallAt = time;
      fx.footfall(x - dir * 8, feet - 2, dir);
      this.fxCount.footfall++;
    }
    if (this.runBlend >= 0.9 && time - this.lastStreakAt >= ANIM.dust.streakEveryMs) {
      this.lastStreakAt = time;
      fx.streak(x - dir * 34, feet - 26 - Math.random() * 44, dir);
      this.fxCount.streak++;
    }
  }

  /** Snapshot of the animation for tests (`?debug=1`). Allocates; not used per frame by the game. */
  animState(): Record<string, number | boolean | string> {
    return {
      look: this.look.name,
      pose: this.pose,
      ...this.look.debug(),
      feet: this.lastBottom,
      stretch: this.stretch,
      blend: this.runBlend,
      phase: this.stridePhase,
      shadow: this.shadow.visible,
      shadowW: this.shadow.displayWidth,
      shadowAlpha: this.shadow.alpha,
      shadowY: this.shadow.y,
      footfalls: this.fxCount.footfall,
      landings: this.fxCount.landing,
      streaks: this.fxCount.streak,
    };
  }

  destroy(): void {
    this.look.destroy();
    this.shadow.destroy();
  }
}
