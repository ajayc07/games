// The Phaser side of shooting (Task 007, D-041), shared by the levels and the Input Lab so they never drift
// apart: the pure ShotCannon decides when shots fire and where they fly; this draws each one as a soft orb in
// the avatar's accent colour with a short fading trail, plays the avatar's `shoot` clip and the power sound,
// and fades a shot out softly at the end of its range or when it pops something.
import type Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { PART_RES, shotOrb } from '../avatar/parts';
import type { AvatarPalette } from '../avatar/config';
import { ShotCannon, type CannonEvents, type Shot } from './shots';

/** Who is shooting: the facing, the muzzle point and the shoot animation (an AvatarDriver + look). */
export interface Shooter {
  facing: 1 | -1;
  muzzle(): { x: number; y: number };
  shoot(now: number): void;
}

interface ShotView {
  orb: Phaser.GameObjects.Image;
  trail: Phaser.GameObjects.Image[];
}

/** Trail: copies behind the orb, each smaller and fainter (spacing in px). */
const TRAIL = { count: 3, spacing: 15, scale: [0.78, 0.6, 0.44], alpha: [0.5, 0.32, 0.18] };
/** Orb picture scale (the texture is 40 px with its glow). */
const ORB_SCALE = 1;
const FADE_MS = 180;

export class Blaster {
  readonly cannon = new ShotCannon();
  private readonly views = new Map<number, ShotView>();
  private readonly key: string;

  constructor(
    private readonly scene: Phaser.Scene,
    palette: AvatarPalette,
    private readonly depth: number,
  ) {
    this.key = shotOrb(scene, palette).key;
  }

  /** One frame: fire if Power asks for it, move the shots, fade the ones at the end of their range. */
  update(now: number, dtMs: number, input: { pressed: boolean; held: boolean }, shooter: Shooter): CannonEvents {
    const ev = this.cannon.update(now, dtMs, input, shooter.facing, () => shooter.muzzle());
    if (ev.fired) {
      shooter.shoot(now);
      audio.play('power');
    }
    for (const s of ev.launched) this.views.set(s.id, this.makeView());
    for (const s of this.cannon.shots) if (s.phase === 'flying') this.place(s);
    for (const s of ev.expired) {
      this.place(s);
      this.fadeOut(s, false);
    }
    return ev;
  }

  /** Shots that are flying now (for hit tests). */
  flying(): Shot[] {
    return this.cannon.shots.filter((s) => s.phase === 'flying');
  }

  /** The shot popped something: it is used up and vanishes in a quick bright puff. */
  hit(shot: Shot): void {
    this.cannon.consume(shot);
    this.fadeOut(shot, true);
  }

  /** Removes every shot at once (the demo ends). */
  clear(): void {
    this.cannon.clear();
    for (const v of this.views.values()) this.destroyView(v);
    this.views.clear();
  }

  /** Number of shot pictures still on screen (debug). */
  get visibleCount(): number {
    return this.views.size;
  }

  destroy(): void {
    this.clear();
  }

  private makeView(): ShotView {
    const add = (scale: number, alpha: number) =>
      this.scene.add.image(0, 0, this.key).setScale(scale / PART_RES).setAlpha(alpha).setDepth(this.depth);
    const trail = TRAIL.scale.slice(0, TRAIL.count).map((sc, i) => add(sc * ORB_SCALE, TRAIL.alpha[i]));
    const orb = add(ORB_SCALE, 1);
    return { orb, trail };
  }

  private place(s: Shot): void {
    const v = this.views.get(s.id);
    if (!v) return;
    v.orb.setPosition(s.x, s.y);
    v.trail.forEach((t, i) => {
      // The trail never reaches back past the muzzle.
      const back = Math.min((i + 1) * TRAIL.spacing, s.travelled);
      t.setPosition(s.x - s.dir * back, s.y).setVisible(back > 2);
    });
  }

  private fadeOut(s: Shot, popped: boolean): void {
    const v = this.views.get(s.id);
    if (!v) return;
    this.views.delete(s.id);
    const all = [v.orb, ...v.trail];
    this.scene.tweens.killTweensOf(all);
    this.scene.tweens.add({
      targets: v.orb,
      alpha: 0,
      scale: (popped ? 1.6 : 0.6) / PART_RES,
      duration: popped ? 140 : FADE_MS,
      ease: 'Sine.easeOut',
    });
    this.scene.tweens.add({
      targets: v.trail,
      alpha: 0,
      duration: popped ? 100 : FADE_MS * 0.7,
      onComplete: () => undefined,
    });
    this.scene.time.delayedCall(FADE_MS + 40, () => this.destroyView(v));
  }

  private destroyView(v: ShotView): void {
    v.orb.destroy();
    for (const t of v.trail) t.destroy();
  }
}
