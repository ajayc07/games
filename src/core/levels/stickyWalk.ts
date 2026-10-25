// Walk assist for Combo Practice (Task 011, D-049; parent setting `walkAssist: sticky`, practice levels only).
// A quick tap on Left or Right (released within STICKY.tapMs) latches walking that way; tapping the same button again
// stops; tapping the other one reverses. A longer press behaves as always (D-029: walk while held, stop on release) and
// cancels any latch. Falls cancel it too (`cancel`). Pure and unit-tested; it sits between the input state and Player.step.
import { walkDirection } from './walk';

export const STICKY = {
  /** A press released within this long is a tap (ms). */
  tapMs: 250,
} as const;

type Dir = -1 | 1;

export class StickyWalk {
  /** The latched direction (0 = none). */
  latch: -1 | 0 | 1 = 0;
  private pressedAt: Record<Dir, number | null> = { [-1]: null, [1]: null } as Record<Dir, number | null>;
  private held: Record<Dir, boolean> = { [-1]: false, [1]: false } as Record<Dir, boolean>;
  /** A press that went past the tap time: it became a hold (and cancelled the latch). */
  private longPress: Record<Dir, boolean> = { [-1]: false, [1]: false } as Record<Dir, boolean>;

  /** One frame: the buttons as held now; returns the direction to walk. */
  step(now: number, left: boolean, right: boolean): -1 | 0 | 1 {
    this.edge(-1, left, now);
    this.edge(1, right, now);
    if (left || right) return walkDirection(left, right);
    return this.latch;
  }

  /** A fall or the float-back: walking stops until the next press. */
  cancel(): void {
    this.latch = 0;
  }

  private edge(d: Dir, down: boolean, now: number): void {
    const was = this.held[d];
    this.held[d] = down;
    if (down && !was) {
      this.pressedAt[d] = now;
      this.longPress[d] = false;
    } else if (down && was) {
      const at = this.pressedAt[d];
      if (at !== null && !this.longPress[d] && now - at > STICKY.tapMs) {
        this.longPress[d] = true;
        this.latch = 0; // a hold cancels any latch; it walks while held, as always
      }
    } else if (!down && was) {
      const at = this.pressedAt[d];
      this.pressedAt[d] = null;
      if (at === null || this.longPress[d] || now - at > STICKY.tapMs) {
        this.latch = 0;
        return;
      }
      this.latch = this.latch === d ? 0 : d; // tap: latch, stop (same again) or reverse (the other way)
    }
  }
}
