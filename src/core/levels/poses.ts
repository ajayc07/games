// Which picture the character shows, and which way to flip it (D-023). Pure and unit-tested.
import type { Facing } from '../types';

/** `win` is the character's main ("hero") picture, shown after the flag hop. */
export type PoseName = 'idle' | 'run' | 'jump' | 'win';

/** Airborne this long (ms) before the jump pose shows, so a one-frame bump does not flicker the picture. */
export const AIR_POSE_DELAY_MS = 70;

export function choosePose(s: { grounded: boolean; speedX: number; airborneMs: number; jumped: boolean }): PoseName {
  if (!s.grounded) return s.jumped || s.airborneMs >= AIR_POSE_DELAY_MS ? 'jump' : 'run';
  return Math.abs(s.speedX) > 10 ? 'run' : 'idle';
}

/**
 * Horizontal scale sign for a picture that faces `pictureFacing`, so the character faces the direction
 * of travel (`travel` +1 right, -1 left). A left-facing picture is mirrored when going right.
 */
export function flipSign(travel: number, pictureFacing: Facing = 'right'): 1 | -1 {
  const dir = travel < 0 ? -1 : 1;
  return (pictureFacing === 'left' ? -dir : dir) as 1 | -1;
}
