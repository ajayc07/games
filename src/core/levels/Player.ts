// One character on the level: an invisible physics box plus a separate picture that bobs, stretches,
// squashes, flips and swaps poses (D-023). Used for the real player and for the "watch me" ghost (D-024),
// so the demo runs through exactly the same movement and jump code as real play.
import Phaser from 'phaser';
import { PHYSICS } from './physics';
import type { CharacterLook } from './characterLook';
import { choosePose, flipSign, type PoseName } from './poses';

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

export interface PlayerOptions {
  x: number;
  /** World y of the ground under the start (feet). */
  feet: number;
  look: CharacterLook;
  colliders: Phaser.GameObjects.GameObject[];
  depth: number;
  tile: number;
  alpha?: number;
}

export class Player {
  readonly zone: Phaser.GameObjects.Zone;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly sprite: Phaser.GameObjects.Image;
  /** +1 right, -1 left: the way the character travels and faces. */
  facing = 1;
  jumps = 0;
  lastGroundedCol = 0;
  /** While set, the picture follows this point instead of the body (cloud ride). */
  ride: { x: number; y: number } | null = null;
  pose: PoseName = 'idle';

  private jumpUsed = false;
  private jumpBufferUntil = -1;
  private lastGroundedAt = 0;
  private airborneSince = -1;
  private squash = { x: 1, y: 1 };
  private bobPhase = 0;
  private readonly look: CharacterLook;
  private readonly tile: number;

  constructor(scene: Phaser.Scene, opts: PlayerOptions) {
    const { width, height } = PHYSICS.body;
    this.look = opts.look;
    this.tile = opts.tile;
    this.zone = scene.add.zone(opts.x, opts.feet - height / 2, width, height);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body as Phaser.Physics.Arcade.Body;
    this.body.setMaxVelocity(1000, PHYSICS.maxFallSpeed);
    this.body.setCollideWorldBounds(true);
    scene.physics.add.collider(this.zone, opts.colliders);

    const idle = this.look.get('idle');
    this.sprite = scene.add.image(opts.x, opts.feet, idle.key).setOrigin(0.5, 1).setDepth(opts.depth);
    this.sprite.setAlpha(opts.alpha ?? 1);
    this.lastGroundedAt = scene.time.now;
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
          this.squash = { x: 1.2, y: 0.8 };
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
      this.squash = { x: 0.82, y: 1.2 };
      jumped = true;
    }
    return { jumped, landed };
  }

  /** Happy hop at the flag. */
  hop(): void {
    this.body.setVelocityY(-PHYSICS.jumpVelocity * 0.7);
    this.jumpUsed = true;
    this.squash = { x: 0.85, y: 1.15 };
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
    this.squash = { x: 1.15, y: 0.85 };
  }

  /** Hidden and frozen (the real player during the demo). */
  setPresent(present: boolean): void {
    this.body.enable = present;
    if (!present) this.body.setVelocity(0, 0);
    this.sprite.setVisible(present);
  }

  /** Picture: pose, bob while running, lean in the air, squash and stretch, flip by direction. */
  updateSprite(time: number, dt: number): void {
    const body = this.body;
    const k = Math.min(1, dt * 12);
    this.squash.x += (1 - this.squash.x) * k;
    this.squash.y += (1 - this.squash.y) * k;

    let x = body.center.x;
    let y = body.bottom;
    let rot = 0;
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
      if (this.pose === 'run' && this.grounded) {
        this.bobPhase += dt * (Math.abs(body.velocity.x) / 22);
        y -= Math.abs(Math.sin(this.bobPhase)) * 6;
        rot = Math.sin(this.bobPhase) * 0.06;
      } else if (!this.grounded) {
        rot = Phaser.Math.Clamp(body.velocity.y / 6000, -0.08, 0.12) * this.facing;
      } else {
        this.squash.y += Math.sin(time / 300) * 0.002; // idle: a slow breath
      }
    }
    const look = this.look.get(this.pose);
    if (this.sprite.texture.key !== look.key) this.sprite.setTexture(look.key);
    const sx = look.scale * this.squash.x * flipSign(this.facing, look.facing);
    this.sprite.setPosition(x, y);
    this.sprite.setScale(sx, look.scale * this.squash.y);
    this.sprite.setRotation(rot);
  }

  destroy(): void {
    this.zone.destroy();
    this.sprite.destroy();
  }
}
