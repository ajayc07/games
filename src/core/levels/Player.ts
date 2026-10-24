// One character on the level: an invisible physics box plus a separate picture that moves with a lively,
// purely visual animation (Task 004b, maths and numbers in animation.ts), swaps poses (D-023) and casts
// a soft shadow. Used for the real player and for the "watch me" ghost (D-024), so the demo runs through
// exactly the same movement, jump and animation code as real play (the ghost just gets no dust).
import Phaser from 'phaser';
import { PHYSICS } from './physics';
import type { CharacterLook, PoseLook } from './characterLook';
import { choosePose, flipSign, type PoseName } from './poses';
import {
  ANIM,
  advanceFlipbook,
  advanceStride,
  airLean,
  breath,
  celebrateDuration,
  celebrateLift,
  celebrateStretch,
  clamp,
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
  type Pulse,
} from './animation';

/** What drives the player this frame: real input or the demo script. */
export interface PlayerIntent {
  /** Horizontal speed in px/s (negative = left). */
  vx: number;
  /** Jump was pressed this frame (buffered and coyote-timed, D-021). */
  jumpPressed: boolean;
}

export interface StepResult {
  jumped: boolean;
  landed: boolean;
}

/** Where dust goes (the scene's pooled effects). Omitted for the demo ghost. */
export interface MotionFxSink {
  footfall(x: number, y: number, dir: number): void;
  landing(x: number, y: number): void;
  streak(x: number, y: number, dir: number): void;
}

export interface PlayerOptions {
  x: number;
  /** World y of the ground under the start (feet). */
  feet: number;
  look: CharacterLook;
  colliders: Phaser.GameObjects.GameObject[];
  depth: number;
  tile: number;
  alpha?: number;
  /** The level's normal run speed (flipbook speed reference). */
  runSpeed: number;
  /** World y of the ground surface under x at or below `feet`, or null over a gap (for the shadow). */
  groundAt: (x: number, feet: number) => number | null;
  fx?: MotionFxSink;
}

/** Edge of the celebration bounce envelope (ms), so it fades in and out instead of popping. */
const CELEBRATE_EDGE_MS = 80;
/** Ignore position jumps bigger than this per frame (teleports) for the stride. */
const MAX_STRIDE_DX = 40;

export class Player {
  readonly zone: Phaser.GameObjects.Zone;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  /** +1 right, -1 left: the way the character travels and faces. */
  facing = 1;
  jumps = 0;
  lastGroundedCol = 0;
  /** While set, the picture follows this point instead of the body (cloud ride). */
  ride: { x: number; y: number } | null = null;
  pose: PoseName = 'idle';
  /** Run flipbook frame shown (-1 = none). */
  frameIndex = -1;
  /** Counts of dust events sent (for tests). */
  readonly fxCount = { footfall: 0, landing: 0, streak: 0 };

  private jumpUsed = false;
  private jumpBufferUntil = -1;
  private lastGroundedAt = 0;
  private airborneSince = -1;
  private readonly look: CharacterLook;
  private readonly tile: number;
  private readonly runSpeed: number;
  private readonly groundAt: PlayerOptions['groundAt'];
  private readonly fx: MotionFxSink | undefined;

  // Animation state (visual only).
  private pulse: Pulse | null = null;
  private stridePhase = 0;
  private runBlend = 0;
  private lean = 0;
  private lastX: number;
  private lastFootfallAt = -1e9;
  private lastStreakAt = -1e9;
  private flipPos = 0;
  private celebrateFrom = -1;
  private celebrateUntil = -1;
  private stretch = 0;

  constructor(scene: Phaser.Scene, opts: PlayerOptions) {
    const { width, height } = PHYSICS.body;
    this.look = opts.look;
    this.tile = opts.tile;
    this.runSpeed = opts.runSpeed;
    this.groundAt = opts.groundAt;
    this.fx = opts.fx;
    this.zone = scene.add.zone(opts.x, opts.feet - height / 2, width, height);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body as Phaser.Physics.Arcade.Body;
    this.body.setMaxVelocity(1000, PHYSICS.maxFallSpeed);
    this.body.setCollideWorldBounds(true);
    scene.physics.add.collider(this.zone, opts.colliders);

    const alpha = opts.alpha ?? 1;
    this.shadow = scene.add.image(opts.x, opts.feet, 'fx-shadow').setDepth(opts.depth - 0.5).setAlpha(ANIM.shadow.alpha * alpha);
    const idle = this.look.get('idle');
    this.sprite = scene.add.image(opts.x, opts.feet, idle.key).setOrigin(0.5, 1).setDepth(opts.depth);
    this.sprite.setAlpha(alpha);
    this.lastGroundedAt = scene.time.now;
    this.lastX = opts.x;
  }

  get grounded(): boolean {
    return this.body.blocked.down;
  }

  /** Movement and jumping for one frame. */
  step(now: number, intent: PlayerIntent): StepResult {
    const body = this.body;
    let landed = false;
    if (this.grounded) {
      this.lastGroundedAt = now;
      this.lastGroundedCol = Math.floor(body.center.x / this.tile);
      if (body.velocity.y >= 0) this.jumpUsed = false;
      if (this.airborneSince >= 0) {
        if (now - this.airborneSince > 120) {
          landed = true;
          this.pulse = kickPulse(this.pulse, now, ANIM.pulse.landing);
          if (this.fx) {
            this.fx.landing(body.center.x, body.bottom);
            this.fxCount.landing++;
          }
        }
        this.airborneSince = -1;
      }
    } else if (this.airborneSince < 0) {
      this.airborneSince = now;
    }

    body.setVelocityX(intent.vx);
    if (intent.vx !== 0) this.facing = Math.sign(intent.vx);

    // Buffering and coyote time (D-021). Fixed height: no early release cut.
    if (intent.jumpPressed) this.jumpBufferUntil = now + PHYSICS.jumpBufferMs;
    const canJump = !this.jumpUsed && now - this.lastGroundedAt <= PHYSICS.coyoteMs;
    let jumped = false;
    if (now <= this.jumpBufferUntil && canJump) {
      body.setVelocityY(-PHYSICS.jumpVelocity);
      this.jumpUsed = true;
      this.jumpBufferUntil = -1;
      this.jumps++;
      // Continues from whatever squash is showing, so jumping out of a landing never pops.
      this.pulse = kickPulse(this.pulse, now, ANIM.pulse.takeoff);
      jumped = true;
    }
    return { jumped, landed };
  }

  /** Happy hop at the flag. */
  hop(now: number): void {
    this.body.setVelocityY(-PHYSICS.jumpVelocity * 0.7);
    this.jumpUsed = true;
    this.pulse = kickPulse(this.pulse, now, ANIM.pulse.hop);
  }

  /** Joyful repeat bounce on the spot (visual only) for at least `minMs`, ending on the ground. */
  celebrate(now: number, minMs: number): void {
    this.celebrateFrom = now;
    this.celebrateUntil = now + celebrateDuration(minMs);
  }

  /** Puts the player on the ground at (x, feet), standing still. */
  placeAt(x: number, feet: number, now: number): void {
    this.zone.setPosition(x, feet - PHYSICS.body.height / 2);
    this.body.enable = true;
    this.body.reset(this.zone.x, this.zone.y);
    this.jumpUsed = false;
    this.jumpBufferUntil = -1;
    this.airborneSince = -1;
    this.lastGroundedAt = now;
    this.pulse = kickPulse(this.pulse, now, ANIM.pulse.placed);
    this.lastX = x;
    this.stridePhase = 0;
  }

  /** Hidden and frozen (the real player during the demo). */
  setPresent(present: boolean): void {
    this.body.enable = present;
    if (!present) this.body.setVelocity(0, 0);
    this.sprite.setVisible(present);
    this.shadow.setVisible(present);
  }

  /** Picture: pose or run frame, stride, lean, squash and stretch, flip by direction, shadow. */
  updateSprite(time: number, dt: number): void {
    const body = this.body;
    const dtMs = dt * 1000;
    let x = body.center.x;
    let y = body.bottom;
    const riding = this.ride !== null;
    if (this.ride) {
      x = this.ride.x;
      y = this.ride.y;
      this.pose = 'idle';
    } else {
      this.pose = choosePose({
        grounded: this.grounded,
        speedX: body.velocity.x,
        airborneMs: this.airborneSince < 0 ? 0 : time - this.airborneSince,
        jumped: this.jumpUsed,
      });
    }
    const grounded = !riding && this.grounded;
    const speed = Math.abs(body.velocity.x);
    const running = grounded && body.enable && speed > ANIM.run.minSpeed;

    // Stride: advances with distance travelled on the ground, so standing still means no stride motion.
    const dx = Math.abs(x - this.lastX);
    this.lastX = x;
    this.runBlend = riding ? 0 : stepBlend(this.runBlend, running, dtMs);
    const before = this.stridePhase;
    if (running && dx <= MAX_STRIDE_DX) this.stridePhase = advanceStride(this.stridePhase, dx);
    else if (this.runBlend === 0) this.stridePhase = 0; // the next start begins at a foot-strike

    // Run flipbook (optional frames): replaces the run picture, procedural motion is toned down.
    const frames = this.look.runFrames;
    const amp = frames.length >= 2 ? ANIM.flipbook.motionScale : 1;
    let look: PoseLook;
    if (this.pose === 'run' && frames.length >= 2) {
      this.flipPos = advanceFlipbook(this.flipPos, dtMs, this.look.runFps, speed, this.runSpeed);
      this.frameIndex = flipbookFrame(this.flipPos, frames.length);
      look = frames[this.frameIndex];
    } else {
      this.flipPos = 0;
      this.frameIndex = -1;
      look = this.look.get(this.pose);
    }

    const blend = this.runBlend;
    let lift = strideBounce(this.stridePhase, amp) * blend;
    let stretch = pulseValue(this.pulse, time) + strideStretch(this.stridePhase, amp) * blend;
    if (grounded) stretch += breath(time) * (1 - blend);

    // Celebration bounce (win screen), faded in and out at its edges.
    if (time < this.celebrateUntil && grounded) {
      const t = time - this.celebrateFrom;
      const env = clamp(Math.min(t, this.celebrateUntil - time) / CELEBRATE_EDGE_MS, 0, 1);
      lift += celebrateLift(t) * env;
      stretch += celebrateStretch(t) * env;
    }

    // Lean: forward while running, follows vertical speed in the air; eased so switches never snap.
    const leanTarget = riding || grounded ? 0 : airLean(body.velocity.y, this.facing);
    this.lean = smoothToward(this.lean, leanTarget, dtMs);
    const rot = this.lean + (runLean(this.facing, amp) + strideRock(this.stridePhase, amp)) * blend;

    if (this.sprite.texture.key !== look.key) this.sprite.setTexture(look.key);
    const flip = flipSign(this.facing, look.facing);
    this.stretch = stretch;
    this.sprite.setPosition(x, y - lift);
    this.sprite.setScale(look.scale * widthFor(stretch) * flip, look.scale * (1 + stretch));
    this.sprite.setRotation(rot);

    this.updateShadow(x, y - lift, riding);
    if (running && this.fx) this.emitDust(time, before, x, body.bottom);
  }

  private updateShadow(x: number, feetY: number, riding: boolean): void {
    const ground = riding || !this.sprite.visible ? null : this.groundAt(x, this.body.bottom - 4);
    if (ground === null) {
      this.shadow.setVisible(false);
      return;
    }
    const h = Math.max(0, ground - feetY);
    const k = shadowScale(h);
    this.shadow.setVisible(true);
    this.shadow.setPosition(x, ground - 2);
    this.shadow.setDisplaySize(ANIM.shadow.width * k, ANIM.shadow.height * k);
    this.shadow.setAlpha(shadowAlpha(h) * this.sprite.alpha);
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
      pose: this.pose,
      frame: this.frameIndex,
      texture: this.sprite.texture.key,
      x: this.sprite.x,
      y: this.sprite.y,
      feet: this.body.bottom,
      rot: this.sprite.rotation,
      scaleX: this.sprite.scaleX,
      scaleY: this.sprite.scaleY,
      displayHeight: this.sprite.displayHeight,
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
    this.zone.destroy();
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
