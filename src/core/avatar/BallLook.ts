// The Ball and Portrait looks (D-032): a round body that rolls with the distance travelled while its face
// stays upright and looks where it is going. Portrait puts the character's face (from its image) on the
// ball as a round decal; without a usable image it keeps the drawn eyes. Numbers live in robotSpec.ts (BALL).
import type Phaser from 'phaser';
import type { CharacterDef } from '../types';
import { widthFor } from '../levels/animation';
import { BLINK_MS, blinkOpen, eyeLook, nextBlinkAt, rollAngle, turnToward } from './clips';
import { resolveAvatar, type ResolvedAvatar } from './config';
import { PART_RES, ballParts, partImage, type BallParts, type Part } from './parts';
import { loadPortraitTexture } from './portrait';
import { BALL } from './robotSpec';
import type { AvatarEvent, AvatarLook, AvatarState, MotionWeights } from './types';

type Img = Phaser.GameObjects.Image;
const NEVER = -1e9;
/** Position jumps bigger than this per frame are teleports (respawn): no roll. */
const MAX_ROLL_DX = 40;

export class BallLook implements AvatarLook {
  readonly name: 'ball' | 'portrait';
  readonly root: Phaser.GameObjects.Container;
  readonly ready: Promise<void>;
  readonly shadowScale = BALL.shadow;
  readonly avatar: ResolvedAvatar;
  private readonly parts: BallParts;
  private readonly body: Img;
  private readonly shade: Img;
  private readonly decal: Img;
  private readonly cheeks: Img;
  private readonly sclera: [Img, Img];
  private readonly pupils: [Img, Img];
  private readonly mouth: Img;
  private hasDecal = false;
  private roll = 0;
  private lastX: number;
  private look = 1;
  private blinkAt: number;
  private shootAt = NEVER;
  private winning = false;
  private winAt = NEVER;
  private muzzlePoint = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, character: CharacterDef, x: number, feet: number, portrait: boolean) {
    this.name = portrait ? 'portrait' : 'ball';
    this.avatar = resolveAvatar(character.avatar);
    this.parts = ballParts(scene, this.avatar.palette);
    const p = this.parts;
    this.body = partImage(scene, p.body);
    this.shade = partImage(scene, p.shade);
    this.decal = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.cheeks = partImage(scene, p.cheeks);
    this.sclera = [partImage(scene, p.sclera), partImage(scene, p.sclera)];
    this.pupils = [partImage(scene, p.pupil), partImage(scene, p.pupil)];
    this.mouth = partImage(scene, p.smile);
    this.root = scene.add.container(x, feet, [this.body, this.shade, this.decal, this.cheeks, ...this.sclera, ...this.pupils, this.mouth]);
    this.lastX = x;
    this.blinkAt = nextBlinkAt(scene.time.now, Math.random());

    const decalSize = BALL.size * BALL.decal;
    this.ready = portrait
      ? loadPortraitTexture(scene, character, decalSize).then((key) => {
          if (!key || !this.root.active) return; // no usable image: stay a Ball with eyes
          this.decal.setTexture(key).setScale(1 / PART_RES).setVisible(true);
          this.hasDecal = true;
          for (const o of [this.cheeks, ...this.sclera, ...this.pupils, this.mouth]) o.setVisible(false);
        })
      : Promise.resolve();
  }

  motion(): MotionWeights {
    return BALL.motion;
  }

  setFacing(): void {
    // The face turns smoothly toward the facing in update().
  }

  trigger(event: AvatarEvent, now: number): void {
    if (event === 'shoot') this.shootAt = now;
    else if (event === 'win') {
      this.winning = true;
      this.winAt = now;
    }
  }

  update(s: AvatarState): void {
    const t = s.time;
    const R = BALL.size / 2;
    // Roll with the distance moved (both directions; not on the cloud, not for teleports).
    const dx = s.x - this.lastX;
    this.lastX = s.x;
    if (!s.riding && Math.abs(dx) <= MAX_ROLL_DX) this.roll += dx;
    this.body.setPosition(0, -R).setRotation(rollAngle(this.roll, R * this.avatar.scale));
    this.shade.setPosition(0, -R);

    // The face stays upright and slides toward where the ball is heading.
    this.look = turnToward(this.look, s.facing, s.dtMs, 240);
    const lk = eyeLook(this.look, s.vy, BALL.look.x, BALL.look.y, BALL.look.perVy);
    const cx = lk.x;
    const cy = -R + lk.y;
    const blinkT = t - this.blinkAt;
    if (blinkT >= BLINK_MS) this.blinkAt = nextBlinkAt(t, Math.random());
    const open = this.winning ? 1 : blinkOpen(blinkT);
    const shooting = t - this.shootAt < BALL.shootMs;

    if (this.hasDecal) {
      // Portrait: a blink-like squash and a happy wiggle on win.
      const wiggle = this.winning ? 0.06 * Math.sin(((t - this.winAt) / 450) * Math.PI * 2) : 0;
      const sq = 1 - 0.1 * (1 - open);
      const pop = shooting ? 1 + 0.08 * Math.sin((Math.PI * (t - this.shootAt)) / BALL.shootMs) : 1;
      this.decal.setPosition(cx * 0.6, cy).setRotation(wiggle).setScale((pop * (1 + 0.04 * (1 - open))) / PART_RES, (pop * sq) / PART_RES);
    } else {
      const E = BALL.eye;
      const happy = this.winning;
      const scl = happy ? this.parts.happy : this.parts.sclera;
      this.sclera.forEach((e, i) => {
        const side = i === 0 ? -1 : 1;
        if (e.texture.key !== scl.key) e.setTexture(scl.key).setOrigin(scl.ox, scl.oy);
        e.setPosition(cx + side * E.gap, cy + E.y).setScale(1 / PART_RES, open / PART_RES);
      });
      const px = this.look * BALL.look.pupil;
      const py = Math.max(-1, Math.min(1, s.vy * BALL.look.perVy)) * 2;
      this.pupils.forEach((pp, i) => {
        const side = i === 0 ? -1 : 1;
        pp.setVisible(!happy && open > 0.45);
        pp.setPosition(cx + side * E.gap + px, cy + E.y + 1 + py).setScale(1 / PART_RES, open / PART_RES);
      });
      this.cheeks.setPosition(cx, cy + 9);
      const mouthPart: Part = shooting ? this.parts.open : happy ? this.parts.grin : this.parts.smile;
      if (this.mouth.texture.key !== mouthPart.key) this.mouth.setTexture(mouthPart.key).setOrigin(mouthPart.ox, mouthPart.oy);
      const pulse = shooting ? 1 + 0.5 * Math.sin((Math.PI * (t - this.shootAt)) / BALL.shootMs) : 1;
      this.mouth.setPosition(cx + this.look * 2, cy + BALL.mouthY).setScale(pulse / PART_RES);
    }

    const S = this.avatar.scale;
    this.root.setPosition(s.x, s.y - s.lift);
    this.root.setScale(S * widthFor(s.stretch), S * (1 + s.stretch));
    this.root.setRotation(0);
    this.muzzlePoint = { x: s.x + s.facing * R * 0.95 * S, y: s.y - s.lift + (-R + BALL.mouthY) * S };
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
    return this.muzzlePoint;
  }

  debug(): Record<string, number | string | boolean> {
    return {
      texture: this.hasDecal ? 'portrait' : 'ball',
      x: this.root.x,
      y: this.root.y,
      rot: this.body.rotation,
      scaleX: this.root.scaleX * (this.look < 0 ? -1 : 1),
      scaleY: this.root.scaleY,
      displayHeight: BALL.size * this.avatar.scale,
      alpha: this.root.alpha,
      depth: this.root.depth,
      visible: this.root.visible,
      objects: this.root.length,
      decal: this.hasDecal,
      lookX: this.look,
      happy: this.winning,
      eyeOpen: this.sclera[0].scaleY * PART_RES,
    };
  }

  destroy(): void {
    this.root.destroy();
  }
}
