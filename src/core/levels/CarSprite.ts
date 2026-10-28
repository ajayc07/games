// The car the robot turns into (Task 017, D-061): a code-drawn little car in the robot's colours with its head in the
// window, two spinning wheels and a headlight glow. Pure picture: it follows the player's body and has no physics.
import type Phaser from 'phaser';
import { CAR, wheelAngle } from './car';
import { TEX_RES, carTextureKeys, makeCarTextures } from './placeholders';

export class CarSprite {
  readonly root: Phaser.GameObjects.Container;
  private readonly wheels: Phaser.GameObjects.Image[];
  private readonly body: Phaser.GameObjects.Image;
  private readonly light: Phaser.GameObjects.Image;
  private roll = 0;
  private lastX = 0;

  constructor(
    scene: Phaser.Scene,
    accent: number,
    joint: number,
    private readonly size: number,
    depth: number,
  ) {
    makeCarTextures(scene, accent, joint);
    const keys = carTextureKeys(accent, joint);
    const { w, h } = CAR.size;
    this.body = scene.add.image(0, 0, keys.body).setOrigin(0.5, 1).setScale(1 / TEX_RES);
    const wy = -CAR.wheel.r;
    this.wheels = [CAR.wheel.back, CAR.wheel.front].map((x) => scene.add.image(x - w / 2, wy, keys.wheel).setScale(1 / TEX_RES));
    this.light = scene.add.image(w / 2 + 6, -h * 0.4, 'fx-glow').setDisplaySize(64, 64).setTint(0xfff176).setAlpha(0.55).setBlendMode('ADD');
    this.root = scene.add.container(0, 0, [this.body, ...this.wheels, this.light]).setDepth(depth).setVisible(false);
  }

  setVisible(visible: boolean): void {
    this.root.setVisible(visible);
  }

  /** Follows the body: feet at (x, feet), facing, ground speed and vertical speed (px/s, down positive). */
  update(time: number, x: number, feet: number, facing: 1 | -1, vx: number, vy: number, grounded: boolean, alpha: number): void {
    const dx = x - this.lastX;
    this.lastX = x;
    if (Math.abs(dx) < 40) this.roll += dx;
    for (const wheel of this.wheels) wheel.setRotation(wheelAngle(this.roll) * (facing === 1 ? 1 : -1));
    const bounce = grounded && Math.abs(vx) > 10 ? -Math.abs(Math.sin(time * 0.03)) * 1.6 : 0;
    const lean = Math.max(-0.12, Math.min(0.12, -vy * 0.00022));
    this.root
      .setPosition(x, feet + bounce)
      .setScale(this.size * CAR.scale * facing, this.size * CAR.scale)
      .setRotation(-lean * facing)
      .setAlpha(alpha);
  }

  /** Teleport the roll reference (when the car appears), so the wheels do not spin for the jump from the old position. */
  reset(x: number): void {
    this.lastX = x;
  }

  destroy(): void {
    this.root.destroy();
  }
}
