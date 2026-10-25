// Hold-to-exit timing (D-036, Task 006): a press must be held HOLD_MS to count; a quick tap only wobbles.
// Pure and unit-tested; HoldButton.ts draws it.

export const HOLD_MS = 1000;
/** Parent view (D-047, Task 010): the map's gear and the Reset button need 3 s, longer than leaving a level. */
export const PARENT_HOLD_MS = 3000;
export const RESET_HOLD_MS = 3000;

export type HoldEvent = 'none' | 'done' | 'tap';

export class HoldTracker {
  private startedAt: number | null = null;
  private fired = false;

  constructor(readonly holdMs = HOLD_MS) {}

  get holding(): boolean {
    return this.startedAt !== null && !this.fired;
  }

  down(now: number): void {
    this.startedAt = now;
    this.fired = false;
  }

  /** 0..1 while held, 0 otherwise. */
  progress(now: number): number {
    if (this.startedAt === null || this.fired) return 0;
    return Math.min(1, Math.max(0, (now - this.startedAt) / this.holdMs));
  }

  /** Call every frame: 'done' once, the moment the hold reaches holdMs. */
  update(now: number): HoldEvent {
    if (this.startedAt === null || this.fired) return 'none';
    if (now - this.startedAt >= this.holdMs) {
      this.fired = true;
      return 'done';
    }
    return 'none';
  }

  /** Release: 'tap' if it was let go early (wobble), 'none' after a completed hold. */
  up(now: number): HoldEvent {
    if (this.startedAt === null) return 'none';
    const early = !this.fired && now - this.startedAt < this.holdMs;
    const finished = !this.fired && !early;
    this.startedAt = null;
    if (finished) {
      this.fired = true;
      return 'done';
    }
    return early ? 'tap' : 'none';
  }

  /** Finger slid off or the button was hidden: forget the press without an event. */
  cancel(): void {
    this.startedAt = null;
  }
}
