// The picture look (D-023, Task 004b): the character's real images, posed, flipped and moved by the shared
// motion. Behaviour and appearance are exactly those of the Player before Task 005b.
import type Phaser from 'phaser';
import type { CharacterDef } from '../types';
import { ANIM, advanceFlipbook, flipbookFrame, widthFor } from '../levels/animation';
import { CharacterLook, type PoseLook } from '../levels/characterLook';
import { flipSign } from '../levels/poses';
import type { AvatarEvent, AvatarLook, AvatarState, MotionWeights } from './types';

export class SpriteLook implements AvatarLook {
  readonly name = 'sprite' as const;
  readonly root: Phaser.GameObjects.Image;
  readonly ready: Promise<void>;
  readonly shadowScale = 1;
  private readonly pictures: CharacterLook;
  /** Run flipbook position (frames) and frame shown (-1 = none). */
  private flipPos = 0;
  private frameIndex = -1;

  /** `pictures` may be shared between the player and the demo ghost (same textures). */
  constructor(scene: Phaser.Scene, character: CharacterDef, x: number, feet: number, pictures?: CharacterLook) {
    this.pictures = pictures ?? new CharacterLook(scene, character);
    this.ready = this.pictures.ready;
    this.root = scene.add.image(x, feet, this.pictures.get('idle').key).setOrigin(0.5, 1);
  }

  motion(): MotionWeights {
    // With a run flipbook the frames carry most of the motion, so the procedural part is toned down.
    const amp = this.pictures.runFrames.length >= 2 ? ANIM.flipbook.motionScale : 1;
    return { stride: amp, air: 1, squash: 1 };
  }

  update(s: AvatarState): void {
    const frames = this.pictures.runFrames;
    let look: PoseLook;
    if (s.pose === 'run' && frames.length >= 2) {
      this.flipPos = advanceFlipbook(this.flipPos, s.dtMs, this.pictures.runFps, s.speed, s.refSpeed);
      this.frameIndex = flipbookFrame(this.flipPos, frames.length);
      look = frames[this.frameIndex];
    } else {
      this.flipPos = 0;
      this.frameIndex = -1;
      look = this.pictures.get(s.pose);
    }
    const img = this.root;
    if (img.texture.key !== look.key) img.setTexture(look.key);
    const flip = flipSign(s.facing, look.facing);
    img.setPosition(s.x, s.y - s.lift);
    img.setScale(look.scale * widthFor(s.stretch) * flip, look.scale * (1 + s.stretch));
    img.setRotation(s.rotation);
  }

  setFacing(): void {
    // Facing arrives with every update (the picture flips at once, as before).
  }

  trigger(_event: AvatarEvent, _now: number): void {
    // The picture look has no extra one-shot animation; the shared motion squashes and stretches it.
  }

  setAlpha(alpha: number): void {
    this.root.setAlpha(alpha);
  }

  setDepth(depth: number): void {
    this.root.setDepth(depth);
  }

  setVisible(visible: boolean): void {
    this.root.setVisible(visible);
  }

  muzzle(): { x: number; y: number } {
    const img = this.root;
    return { x: img.x + Math.sign(img.scaleX || 1) * img.displayWidth * 0.45, y: img.y - img.displayHeight * 0.55 };
  }

  debug(): Record<string, number | string | boolean> {
    const img = this.root;
    return {
      frame: this.frameIndex,
      texture: img.texture.key,
      x: img.x,
      y: img.y,
      rot: img.rotation,
      scaleX: img.scaleX,
      scaleY: img.scaleY,
      displayHeight: img.displayHeight,
      alpha: img.alpha,
      depth: img.depth,
      visible: img.visible,
    };
  }

  destroy(): void {
    this.root.destroy();
  }
}
