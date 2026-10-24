// Dust for the moving character (Task 004b): a small puff at footfalls, a ring on landing and short speed
// streaks behind the runner. Three Phaser particle emitters, created once per scene; Phaser reuses dead
// particles, so emitting allocates nothing per frame. Counts and rates are in animation.ts (ANIM.dust).
import type Phaser from 'phaser';
import { ANIM } from './animation';
import type { MotionFxSink } from '../avatar/types';

export class MotionFx implements MotionFxSink {
  private readonly puff: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly ring: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly streaks: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Direction of travel for the emit callbacks (+1 right, -1 left). */
  private dir = 1;

  /** `size` = the avatar's visual size factor, so dust stays in proportion (Task 006). */
  constructor(scene: Phaser.Scene, depth: number, size = 1) {
    const z = (v: number) => v * size;
    const backwards = (min: number, max: number) => ({
      onEmit: () => -this.dir * (min + Math.random() * (max - min)),
    });
    this.puff = scene.add
      .particles(0, 0, 'fx-dust', {
        emitting: false,
        speedX: backwards(z(20), z(70)),
        speedY: { min: z(-40), max: z(-10) },
        scale: { start: z(0.35), end: z(0.08) },
        alpha: { start: 0.55, end: 0 },
        lifespan: 320,
        maxAliveParticles: 24,
      })
      .setDepth(depth);
    this.ring = scene.add
      .particles(0, 0, 'fx-dust', {
        emitting: false,
        // Outwards to both sides, never straight up: a flat ring rather than a blob.
        speedX: { onEmit: () => (Math.random() < 0.5 ? -1 : 1) * z(70 + Math.random() * 110) },
        speedY: { min: z(-35), max: z(-5) },
        scale: { start: z(0.42), end: z(0.1) },
        alpha: { start: 0.5, end: 0 },
        lifespan: 340,
        maxAliveParticles: 40,
      })
      .setDepth(depth);
    this.streaks = scene.add
      .particles(0, 0, 'fx-streak', {
        emitting: false,
        speedX: backwards(z(60), z(110)),
        scaleX: { start: z(1), end: z(0.3) },
        scaleY: size,
        alpha: { start: 0.45, end: 0 },
        lifespan: 220,
        maxAliveParticles: 12,
      })
      .setDepth(depth - 1.5); // behind the character
  }

  footfall(x: number, y: number, dir: number): void {
    this.dir = dir;
    this.puff.emitParticleAt(x, y, ANIM.dust.footfallCount);
  }

  landing(x: number, y: number): void {
    this.ring.emitParticleAt(x, y - 4, ANIM.dust.landingCount);
  }

  streak(x: number, y: number, dir: number): void {
    this.dir = dir;
    this.streaks.emitParticleAt(x, y, 1);
  }
}
