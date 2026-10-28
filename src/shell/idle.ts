// Auto-pause after inactivity (Task 027, D-070): when nobody has touched the screen for a couple of minutes (he fell asleep
// with it, or walked away mid-level) the game pauses and lets the screen sleep; the next tap wakes it. Pure rules here, the
// DOM wiring in `idleSleep.ts`.

/** Seconds without a touch before the game sleeps. */
export const IDLE_DEFAULT_S = 150;

/** `?idle=<seconds>` (1 or more) for testing, else the default. `?idle=0` turns the auto-pause off. */
export function idleSecondsFrom(search: string): number {
  const raw = new URLSearchParams(search).get('idle');
  if (raw === null) return IDLE_DEFAULT_S;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return IDLE_DEFAULT_S;
  return n === 0 ? Infinity : Math.max(1, n);
}

/** Tracks the last touch and decides when to sleep. A finger held down counts as activity for as long as it is down. */
export class IdleWatch {
  private last: number;
  private pointers = 0;
  private asleep = false;

  constructor(
    private readonly limitMs: number,
    now: number,
  ) {
    this.last = now;
  }

  /** Any touch, move or key press. */
  touch(now: number): void {
    this.last = now;
  }

  down(now: number): void {
    this.pointers++;
    this.last = now;
  }

  up(now: number): void {
    this.pointers = Math.max(0, this.pointers - 1);
    this.last = now;
  }

  get sleeping(): boolean {
    return this.asleep;
  }

  /** True once, when it is time to sleep (call `sleep()` to act on it). */
  shouldSleep(now: number): boolean {
    return !this.asleep && this.pointers === 0 && now - this.last >= this.limitMs;
  }

  sleep(): void {
    this.asleep = true;
  }

  /** The tap that wakes it: counts as fresh activity and forgets any fingers that were down before. */
  wake(now: number): void {
    this.asleep = false;
    this.pointers = 0;
    this.last = now;
  }
}
