// One character on the level: an invisible physics box plus a look (D-032, D-037: robot or ball)
// moved by the shared lively motion (core/avatar/AvatarDriver). Used for the real player and for the
// "watch me" ghost (D-024), so the demo runs through exactly the same movement, jump and animation code as
// real play (the ghost just gets no dust). Physics and the hit box never depend on the look.
import type Phaser from 'phaser';
import { PHYSICS } from './physics';
import { edgeLimit, nextFacing, rampSpeed, type FacingState } from './walk';
import { AvatarDriver } from '../avatar/AvatarDriver';
import type { Gait } from '../avatar/clips';
import type { AvatarLook, MotionFxSink } from '../avatar/types';

export type { MotionFxSink } from '../avatar/types';

/** What drives the player this frame: real input or the demo script. */
export interface PlayerIntent {
  /** Direction to move: -1 left, 0 stand, 1 right. Speed comes from PlayerOptions.speed. */
  move: -1 | 0 | 1;
  /** Jump was pressed this frame (buffered and coyote-timed, D-021). */
  jumpPressed: boolean;
  /** Extra soft walls this frame (a big bubble, Task 007), on top of the level ends. Same soft stop. */
  walls?: { minX: number; maxX: number };
}

export interface StepResult {
  jumped: boolean;
  landed: boolean;
}

export interface PlayerOptions {
  x: number;
  /** World y of the ground under the start (feet). */
  feet: number;
  /** How the character is drawn (created by the scene with createLook). */
  look: AvatarLook;
  colliders: Phaser.GameObjects.GameObject[];
  depth: number;
  tile: number;
  alpha?: number;
  /** The level's moving speed: run speed on auto-run levels, walk speed otherwise. */
  speed: number;
  /** Walk mode (D-029): speed ramps up and down (PHYSICS.walkRamp*). Off = speed is set at once (auto-run). */
  ramp: boolean;
  /** Walk or run animation for code-built looks. */
  gait: Gait;
  /** Invisible walls: the body centre stays between these x values and stops softly at them. */
  minX: number;
  maxX: number;
  /** World y of the ground surface under x at or below `feet`, or null over a gap (for the shadow). */
  groundAt: (x: number, feet: number) => number | null;
  fx?: MotionFxSink;
}

export class Player {
  readonly zone: Phaser.GameObjects.Zone;
  readonly body: Phaser.Physics.Arcade.Body;
  /** The look and its shared motion, shadow and dust. */
  readonly avatar: AvatarDriver;
  /** +1 right, -1 left: the way the character travels and faces. */
  facing: 1 | -1 = 1;
  jumps = 0;
  lastGroundedCol = 0;
  /** While set, the picture follows this point instead of the body (cloud ride). */
  ride: { x: number; y: number } | null = null;
  /** The look's opacity when it is shown (the car power-up hides the robot by setting its alpha to 0). */
  alphaWanted = 1;
  /** Moving speed multiplier (1 normally; the car power-up makes it a little faster, Task 017). */
  speedScale = 1;
  /** Picture raised above the body's feet (px): standing on the goal pad. */
  lift = 0;

  private jumpUsed = false;
  private jumpBufferUntil = -1;
  private lastGroundedAt = 0;
  private airborneSince = -1;
  private readonly tile: number;
  private readonly speed: number;
  private readonly ramp: boolean;
  private readonly minX: number;
  private readonly maxX: number;
  /** Walk speed before the edge limit (px/s, signed). */
  private walkV = 0;
  private facingChangedAt = -1e9;

  constructor(scene: Phaser.Scene, opts: PlayerOptions) {
    const { width, height } = PHYSICS.body;
    this.tile = opts.tile;
    this.speed = opts.speed;
    this.ramp = opts.ramp;
    this.minX = opts.minX;
    this.maxX = opts.maxX;
    this.zone = scene.add.zone(opts.x, opts.feet - height / 2, width, height);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body as Phaser.Physics.Arcade.Body;
    this.body.setMaxVelocity(1000, PHYSICS.maxFallSpeed);
    this.body.setCollideWorldBounds(true);
    scene.physics.add.collider(this.zone, opts.colliders);

    this.alphaWanted = opts.alpha ?? 1;
    this.avatar = new AvatarDriver(scene, {
      look: opts.look,
      x: opts.x,
      feet: opts.feet,
      depth: opts.depth,
      alpha: opts.alpha,
      refSpeed: opts.speed,
      gait: opts.gait,
      groundAt: opts.groundAt,
      fx: opts.fx,
    });
    this.lastGroundedAt = scene.time.now;
  }

  get grounded(): boolean {
    return this.body.blocked.down;
  }

  /** The look (for depth, alpha tweens and debugging). */
  get look(): AvatarLook {
    return this.avatar.look;
  }

  /** Movement and jumping for one frame. */
  step(now: number, intent: PlayerIntent, dtMs: number): StepResult {
    const body = this.body;
    let landed = false;
    if (this.grounded) {
      this.lastGroundedAt = now;
      this.lastGroundedCol = Math.floor(body.center.x / this.tile);
      if (body.velocity.y >= 0) this.jumpUsed = false;
      if (this.airborneSince >= 0) {
        if (now - this.airborneSince > 120) {
          landed = true;
          this.avatar.land(now, body.center.x, body.bottom);
        }
        this.airborneSince = -1;
      }
    } else if (this.airborneSince < 0) {
      this.airborneSince = now;
    }

    // Walk mode ramps (D-029: about 60 ms up, 80 ms down, no sliding); auto-run sets the speed at once.
    const speed = this.speed * this.speedScale;
    const target = intent.move * speed;
    this.walkV = this.ramp ? rampSpeed(this.walkV, target, dtMs, speed, PHYSICS.walkRampUpMs, PHYSICS.walkRampDownMs) : target;
    const minX = Math.max(this.minX, intent.walls?.minX ?? -Infinity);
    const maxX = Math.min(this.maxX, intent.walls?.maxX ?? Infinity);
    body.setVelocityX(edgeLimit(body.center.x, this.walkV, minX, maxX));
    // Facing follows the pressed direction at once, at most one change per FACING_HOLD_MS (no flicker).
    const f = nextFacing({ facing: this.facing, changedAt: this.facingChangedAt } satisfies FacingState, intent.move, now);
    this.facing = f.facing;
    this.facingChangedAt = f.changedAt;

    // Buffering and coyote time (D-021). Fixed height: no early release cut.
    if (intent.jumpPressed) this.jumpBufferUntil = now + PHYSICS.jumpBufferMs;
    const canJump = !this.jumpUsed && now - this.lastGroundedAt <= PHYSICS.coyoteMs;
    let jumped = false;
    if (now <= this.jumpBufferUntil && canJump) {
      body.setVelocityY(-PHYSICS.jumpVelocity);
      this.jumpUsed = true;
      this.jumpBufferUntil = -1;
      this.jumps++;
      this.avatar.takeoff(now);
      jumped = true;
    }
    return { jumped, landed };
  }

  /** A bounce pad fired (Task 015): up at `speed` px/s by itself, like a jump that is already used. */
  launch(now: number, speed: number): void {
    this.body.setVelocityY(-speed);
    this.jumpUsed = true;
    this.jumpBufferUntil = -1;
    this.avatar.takeoff(now);
  }

  /** Happy hop at the goal. */
  hop(now: number): void {
    this.body.setVelocityY(-PHYSICS.jumpVelocity * 0.7);
    this.jumpUsed = true;
    this.avatar.hop(now);
  }

  /** Stops moving at once (flag, respawn); the next walk starts from standing. */
  halt(): void {
    this.walkV = 0;
    this.body.setVelocityX(0);
  }

  /** Joyful repeat bounce on the spot (visual only) for at least `minMs`, ending on the ground. */
  celebrate(now: number, minMs: number): void {
    this.avatar.celebrate(now, minMs);
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
    this.walkV = 0;
    this.avatar.placed(now, x);
  }

  /** Hidden and frozen (the real player during the demo). */
  setPresent(present: boolean): void {
    this.body.enable = present;
    if (!present) this.body.setVelocity(0, 0);
    this.avatar.setVisible(present);
  }

  /** The look for this frame: motion, facing, shadow and dust. */
  updateAvatar(time: number, dt: number): void {
    const body = this.body;
    this.avatar.update({
      time,
      dtMs: dt * 1000,
      x: body.center.x,
      bottom: body.bottom - this.lift,
      vx: body.velocity.x,
      vy: body.velocity.y,
      onGround: this.grounded,
      enabled: body.enable,
      airborneMs: this.airborneSince < 0 ? 0 : time - this.airborneSince,
      jumped: this.jumpUsed,
      ride: this.ride,
      facing: this.facing,
    });
  }

  /** Snapshot of the animation for tests (`?debug=1`). */
  animState(): Record<string, number | boolean | string> {
    return this.avatar.animState();
  }

  destroy(): void {
    this.zone.destroy();
    this.avatar.destroy();
  }
}
