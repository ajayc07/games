// Polish (Task 019, D-081): the pure rules behind the landing thump and the idle wave. Cosmetic only: nothing here touches physics,
// hit boxes or scores. Tested in polish.test.ts; AvatarDriver applies them.

export const THUMP = {
  /** He must have dropped at least this many tiles from the top of the air to the ground for the thump (a jump peaks 2.5 tiles). */
  minDropTiles: 1,
} as const;

/** Does this landing get the soft thump? `dropPx` is how far he came down (highest point of the air time to the ground). */
export function landingThump(dropPx: number, tile: number): boolean {
  return dropPx >= THUMP.minDropTiles * tile;
}

export const IDLE_WAVE = {
  /** He waves after this long without a touch (ms). */
  startMs: 7000,
  /** One wave sequence: two waves (ms). */
  waveMs: 1800,
  /** After a sequence, at least this long before the next one (ms). */
  restMs: 5000,
  /** No wave in the last stretch before the auto-pause (Task 027) would show (ms). */
  noWaveBeforeSleepMs: 10_000,
  /** The ball look bounces this high (px) while "waving". */
  ballBounce: 12,
} as const;

export type WaveEvent = 'start' | 'end' | null;

/**
 * The idle wave: after `startMs` without a touch, while he stands free on the ground, he waves for `waveMs`, rests, and may wave
 * again. A touch (idle time drops back) or anything that stops him standing free (he moves, jumps, wins, becomes a car...) ends
 * it at once. Never in the last `noWaveBeforeSleepMs` before the auto-pause.
 */
export class IdleWave {
  private waving = false;
  private waveT = 0;
  private rest = 0;
  private lastIdle = 0;

  get active(): boolean {
    return this.waving;
  }

  /**
   * One frame. `idleMs` is the time since the last touch, `free` says he is standing still on the ground with nothing else going
   * on, `sleepMs` is the auto-pause time (Infinity when it is off). Returns 'start' or 'end' when the wave begins or stops.
   */
  update(dtMs: number, idleMs: number, free: boolean, sleepMs: number): WaveEvent {
    const touched = idleMs < this.lastIdle;
    this.lastIdle = idleMs;
    if (this.waving) {
      this.waveT += Math.max(0, dtMs);
      if (!free || touched || this.waveT >= IDLE_WAVE.waveMs || idleMs >= sleepMs - IDLE_WAVE.noWaveBeforeSleepMs) {
        this.waving = false;
        this.rest = touched || !free ? 0 : IDLE_WAVE.restMs;
        return 'end';
      }
      return null;
    }
    this.rest = Math.max(0, this.rest - Math.max(0, dtMs));
    if (free && !touched && this.rest <= 0 && idleMs >= IDLE_WAVE.startMs && idleMs < sleepMs - IDLE_WAVE.noWaveBeforeSleepMs) {
      this.waving = true;
      this.waveT = 0;
      return 'start';
    }
    return null;
  }

  /** How far through the wave sequence (0..1), for the looks. */
  get progress(): number {
    return Math.min(1, this.waveT / IDLE_WAVE.waveMs);
  }

  reset(): void {
    this.waving = false;
    this.waveT = 0;
    this.rest = 0;
    this.lastIdle = 0;
  }
}
