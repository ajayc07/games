// Gentle coaching for Combo Practice (Task 011, D-049): after about 8 s without a combo, while one is possible, a ghost
// hand shows the combo (a finger holds the nav button, a second finger taps the action button twice) for about 2.5 s,
// then nothing for at least 20 s. It stops at once when a combo happens or the moment is gone (a gap, the cloud ride,
// the flag). Pure and unit-tested; the scene draws the hand.
import type { PracticeMode } from '../levels/practice';

export const COACH = {
  /** No combo for this long (ms) while one is possible: show the hint. */
  idleMs: 8000,
  /** The hint lasts this long (ms). */
  showMs: 2500,
  /** After a hint (or since it was cut short), quiet for at least this long (ms). */
  quietMs: 20000,
} as const;

export interface CoachInput {
  now: number;
  /** The run has started (not the intro, not the flag). */
  playing: boolean;
  /** A combo is possible right now (on the ground or in a normal jump; not over a gap, not on the cloud). */
  possible: boolean;
}

export type CoachEvent = 'show' | 'hide' | null;

export class CoachTimer {
  showing = false;
  shownAt = -Infinity;
  /** Hints shown this run (debug). */
  count = 0;
  private idleFrom: number | null = null;
  private quietUntil = -Infinity;

  /** Call every frame. 'show' starts the hint, 'hide' ends it early or on time. */
  step(i: CoachInput): CoachEvent {
    if (!i.playing) {
      this.idleFrom = null; // the clock starts when the run does
      return this.end(i.now);
    }
    this.idleFrom ??= i.now;
    if (this.showing) {
      if (!i.possible || i.now - this.shownAt >= COACH.showMs) return this.end(i.now);
      return null;
    }
    if (i.possible && i.now - this.idleFrom >= COACH.idleMs && i.now >= this.quietUntil) {
      this.showing = true;
      this.shownAt = i.now;
      this.count++;
      return 'show';
    }
    return null;
  }

  /** A combo counted: the hint stops at once and the idle clock restarts. */
  combo(now: number): CoachEvent {
    this.idleFrom = now;
    return this.end(now);
  }

  /** Earliest time the next hint may appear (for tests and the debug hook). */
  nextAt(): number {
    return Math.max((this.idleFrom ?? Infinity) + COACH.idleMs, this.quietUntil);
  }

  private end(now: number): CoachEvent {
    if (!this.showing) return null;
    this.showing = false;
    this.quietUntil = now + COACH.quietMs;
    return 'hide';
  }
}

/** The button the tapping finger shows: the focus's action; `everything` takes turns; jump + shoot taps Jump, then Power. */
export function coachTaps(mode: PracticeMode, hintIndex: number): Array<'jump' | 'power'> {
  if (mode === 'walk-shoot') return ['power', 'power'];
  if (mode === 'walk-jump') return ['jump', 'jump'];
  if (mode === 'jump-shoot') return ['jump', 'power'];
  return hintIndex % 2 === 0 ? ['power', 'power'] : ['jump', 'jump'];
}
