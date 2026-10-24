// The AvatarLook interface (D-032): how a character is drawn. Physics, hit box and level logic never
// depend on the look. AvatarDriver (shared) works out the lively motion of Task 004b and feeds each look
// the same state every frame.
import type Phaser from 'phaser';
import type { PoseName } from '../levels/poses';
import type { Gait } from './clips';
import type { LookName } from './config';

export type AvatarEvent = 'jump' | 'land' | 'win' | 'shoot';

/** Everything a look needs for one frame. Positions are world coordinates; the root sits at the feet. */
export interface AvatarState {
  /** Scene time (ms) and frame time (ms). */
  time: number;
  dtMs: number;
  /** Feet position (lift not applied). */
  x: number;
  y: number;
  /** Visual lift above the feet (px, up positive): stride bounce, celebration. */
  lift: number;
  /** Squash/stretch amount (+0.1 = 10% taller and thinner). */
  stretch: number;
  /** Whole-body rotation (radians, Phaser clockwise): lean and rock, already signed for the facing. */
  rotation: number;
  facing: 1 | -1;
  pose: PoseName;
  grounded: boolean;
  /** Ground speed (|vx|, px/s) and vertical velocity (px/s, down positive). */
  speed: number;
  vy: number;
  /** Stride phase in steps (one whole number per footfall), from distance travelled on the ground. */
  stridePhase: number;
  /** 0 standing .. 1 moving, eased (Task 004b run blend). */
  runBlend: number;
  gait: Gait;
  /** The level's normal moving speed (px/s). */
  refSpeed: number;
  /** On the respawn cloud. */
  riding: boolean;
}

/** How strongly the shared procedural motion applies to a look (1 = as Task 004b). */
export interface MotionWeights {
  /** Stride bounce, stride squash/stretch, run lean and rock. */
  stride: number;
  /** Lean in the air. */
  air: number;
  /** Take-off/landing pulses, breathing and the win bounce's squash. */
  squash: number;
}

export interface AvatarLook {
  readonly name: LookName;
  /** The display root (feet origin). Tweens may target it (e.g. the ghost fading out). */
  readonly root: Phaser.GameObjects.Image | Phaser.GameObjects.Container;
  /** Resolves when the look's pictures are ready (or have failed and fallen back). */
  readonly ready: Promise<void>;
  /** Shadow size compared with the default. */
  readonly shadowScale: number;
  motion(): MotionWeights;
  update(state: AvatarState): void;
  setFacing(facing: 1 | -1): void;
  /** One-shot events. */
  trigger(event: AvatarEvent, now: number): void;
  setAlpha(alpha: number): void;
  setDepth(depth: number): void;
  setVisible(visible: boolean): void;
  /** World point where a shot leaves, as of the last update. */
  muzzle(): { x: number; y: number };
  /** Numbers for tests (`?debug=1`). */
  debug(): Record<string, number | string | boolean>;
  destroy(): void;
}

/** Where dust goes (the scene's pooled effects). Omitted for the demo ghost. */
export interface MotionFxSink {
  footfall(x: number, y: number, dir: number): void;
  landing(x: number, y: number): void;
  streak(x: number, y: number, dir: number): void;
}
