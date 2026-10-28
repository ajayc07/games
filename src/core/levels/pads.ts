// Bounce pads and step blocks (Task 015, D-059). Pure and unit-tested; drawing and wiring are in LevelScene.ts.
// A step block (`B`) is a solid 1-tile block he jumps up onto. A bounce pad (`^`) is a low springy plate on the ground:
// stepping on it launches him high by itself (no new button), up to coins in the air. Both only ever help.
import { PHYSICS, jumpPeak } from './physics';

export const PAD = {
  /** Upward launch speed (px/s). The player's body clamps vertical speed to 1000, so this is the most a pad can give. */
  launch: 1000,
  /** The pad plate stands this many tiles above the ground. */
  heightTiles: 0.4,
  /** The pad plate is this many tiles wide (the cell is one tile). */
  widthTiles: 1,
  /** The body must overlap the plate by this much on each side before it fires (px), so a brush at the edge does not. */
  edge: 8,
  /** A pad fires again after he has left it and come back, or after he has stood on it this long (ms). */
  rearmMs: 700,
  /** Squash (ms) of the plate when it fires. */
  squashMs: 320,
} as const;

/** Blocks may be stacked at most this high (tiles): a jump peaks 2.5 tiles, so 2 keeps 0.5 tile spare. */
export const BLOCK_MAX_TILES = 2;

/** Height a launch reaches above the take-off feet (px). */
export const padPeak = (): number => jumpPeak(PAD.launch, PHYSICS.gravity);

/** Time a launch stays in the air before landing at the same height (ms). */
export const padAirMs = (): number => ((2 * PAD.launch) / PHYSICS.gravity) * 1000;

export interface PadBody {
  left: number;
  right: number;
  bottom: number;
  vy: number;
}

/** One pad's state: fires when the body steps onto the plate, and re-arms when he steps off or has stood on it a while. */
export class PadTrigger {
  private armed = true;
  private groundedSince = -1;

  /**
   * `plate` = the pad plate (centre x, width and top y in world px). `grounded` = the body stands on something.
   * Returns true on the frame the pad fires.
   */
  update(now: number, body: PadBody, plate: { x: number; width: number; top: number }, grounded: boolean): boolean {
    const over = body.right > plate.x - plate.width / 2 + PAD.edge && body.left < plate.x + plate.width / 2 - PAD.edge;
    if (!over) {
      this.armed = true;
      this.groundedSince = -1;
      return false;
    }
    if (!this.armed) {
      this.groundedSince = grounded ? (this.groundedSince < 0 ? now : this.groundedSince) : -1;
      if (this.groundedSince >= 0 && now - this.groundedSince >= PAD.rearmMs) this.armed = true;
      else return false;
    }
    // Feet have reached the plate and he is not rising.
    if (body.bottom < plate.top - 4 || body.vy < -20) return false;
    this.armed = false;
    this.groundedSince = -1;
    return true;
  }
}
