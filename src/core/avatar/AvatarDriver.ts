// Shared lively motion for every look (Task 004b maths, moved here from Player in Task 005b): stride phase,
// run blend, squash/stretch pulses, lean, breathing, the win bounce, the soft shadow and dust. It turns
// physics facts (position, velocity, grounded) into an AvatarState and hands it to the look. Each look
// says how strongly the shared motion applies (`motion()`).
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
import { STEP } from '../audio/steps';
import type { Gait } from './clips';
import { IdleWave, landingThump } from './polish';
import type { AvatarLook, AvatarState, MotionFxSink } from './types';

/** Sounds the driver asks for (Task 019): the real player only. The scene decides when they may play (not in the car, flying or as Mega Robo). */
export interface AvatarSfx {
  /** A footstep: `running` for the lighter, quicker patter. */
  step(running: boolean): void;
  /** A soft landing thump at world x. */
  thump(x: number): void;
}

export interface DriverOptions {
  /** Footsteps and the landing thump (the real player only). */
  sfx?: AvatarSfx;
  /** Tile size (px), for the landing thump's height rule. */
  tile?: number;
  look: AvatarLook;
  x: number;
  feet: number;
  depth: number;
  alpha?: number;
  /** The level's moving speed (px/s). */
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
  /** Time since his last touch (ms), and whether the scene lets idle life happen now (the real player in play, not as a car or Mega). Default: no idle wave. */
  idleMs?: number;
  calm?: boolean;
  /** The auto-pause time (ms; Infinity when off), so he does not wave right before it. */
  sleepMs?: number;
}

/** Edge of the celebration bounce envelope (ms), so it fades in and out instead of popping. */
const CELEBRATE_EDGE_MS = 80;
/** Ignore position jumps bigger than this per frame (teleports) for the stride. */
const MAX_STRIDE_DX = 40;

export class AvatarDriver {
  readonly look: AvatarLook;
  readonly shadow: Phaser.GameObjects.Image;
  /** Counts of dust events sent (for tests). */
  readonly fxCount = { footfall: 0, landing: 0, streak: 0 };

  private readonly groundAt: DriverOptions['groundAt'];
  private readonly fx: MotionFxSink | undefined;
  private readonly refSpeed: number;
  private gait: Gait;
  private pulse: Pulse | null = null;
  private stridePhase = 0;
  private runBlend = 0;
  private lean = 0;
  /** Flying with the rocket boots (Task 023): leaned forward like a superhero while in the air. */
  flying = false;
  private lastX: number;
  private lastFootfallAt = -1e9;
  private lastStreakAt = -1e9;
  private celebrateFrom = -1;
  private celebrateUntil = -1;
  private stretch = 0;
  private visible = true;
  private alpha: number;
  private facing: 1 | -1 = 1;
  private lastBottom = 0;
  private readonly sfx: AvatarSfx | undefined;
  private readonly tile: number;
  private lastStepAt = -1e9;
  /** The highest point (smallest y of the feet) of this stay in the air, and whether he flew (no thump after a flight). */
  private airTop = Infinity;
  private airFlown = false;
  private readonly wave = new IdleWave();

  constructor(scene: Phaser.Scene, opts: DriverOptions) {
    this.look = opts.look;
    this.groundAt = opts.groundAt;
    this.fx = opts.fx;
    this.sfx = opts.sfx;
    this.tile = opts.tile ?? 64;
    this.refSpeed = opts.refSpeed;
    this.gait = opts.gait;
    this.alpha = opts.alpha ?? 1;
    this.lastX = opts.x;
    this.shadow = scene.add.image(opts.x, opts.feet, 'fx-shadow').setDepth(opts.depth - 0.5).setAlpha(ANIM.shadow.alpha * this.alpha);
    this.look.setDepth(opts.depth);
    this.look.setAlpha(this.alpha);
  }

  /** Walking or running legs (the hold-to-run switch, Task 021). */
  setGait(gait: Gait): void {
    this.gait = gait;
  }

  // ---------- events from the physics side ----------

  takeoff(now: number): void {
    // Continues from whatever squash is showing, so jumping out of a landing never pops.
    this.pulse = kickPulse(this.pulse, now, ANIM.pulse.takeoff);
    this.look.trigger('jump', now);
  }

  land(now: number, x: number, feet: number): void {
    this.pulse = kickPulse(this.pulse, now, ANIM.pulse.landing);
    // The soft thump after a drop of at least a tile (a jump peak is 2.5 tiles), never after a flight.
    if (this.sfx && !this.airFlown && Number.isFinite(this.airTop) && landingThump(feet - this.airTop, this.tile)) this.sfx.thump(x);
    this.airTop = Infinity;
    this.airFlown = false;
    if (this.fx) {
      this.fx.landing(x, feet);
      this.fxCount.landing++;
    }
    this.look.trigger('land', now);
  }

  /** Happy hop at the goal: the look switches to its win animation. */
  hop(now: number): void {
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
    this.airTop = Infinity;
    this.airFlown = false;
    if (this.wave.active) {
      this.wave.reset();
      this.look.trigger('waveEnd', now);
    }
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
    const leanTarget = riding || grounded ? 0 : this.flying ? 0.38 * this.facing : airLean(input.vy, this.facing) * w.air;
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

    // Footsteps (Task 019): one tap per footfall while he walks or runs on the ground, never while flying.
    if (running && this.sfx && !this.flying && crossedFootfall(before, this.stridePhase) && time - this.lastStepAt >= STEP.minGapMs) {
      this.lastStepAt = time;
      this.sfx.step(this.gait === 'run');
    }
    // The highest point of this stay in the air (for the landing thump).
    if (grounded) {
      this.airTop = Infinity;
      this.airFlown = false;
    } else if (!riding) {
      this.airTop = Math.min(this.airTop, input.bottom);
      if (this.flying) this.airFlown = true;
    }
    // The idle wave (Task 019): standing free and untouched for a while.
    const free = !!input.calm && grounded && input.enabled && speed < 5 && !(time < this.celebrateUntil) && !this.flying && this.visible;
    const ev = this.wave.update(dtMs, input.idleMs ?? 0, free, input.sleepMs ?? Infinity);
    if (ev === 'start') this.look.trigger('wave', time);
    else if (ev === 'end') this.look.trigger('waveEnd', time);
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
