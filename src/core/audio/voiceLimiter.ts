// Mashing safety for sounds, framework-free so it can be unit-tested.
// Per sound id: at most `maxVoices` overlapping instances, and at least `minGapMs` between starts.

export interface VoiceLimits {
  maxVoices: number;
  minGapMs: number;
}

export const DEFAULT_LIMITS: VoiceLimits = { maxVoices: 3, minGapMs: 40 };

export class VoiceLimiter {
  /** id -> end times (ms) of voices still playing. */
  private readonly voices = new Map<string, number[]>();
  private readonly lastStart = new Map<string, number>();

  constructor(private readonly limits: VoiceLimits = DEFAULT_LIMITS) {}

  /** Returns true and records the voice if a new instance of `id` may start at `now`. */
  tryStart(id: string, now: number, durationMs: number): boolean {
    const last = this.lastStart.get(id);
    if (last !== undefined && now - last < this.limits.minGapMs) return false;
    const active = (this.voices.get(id) ?? []).filter((end) => end > now);
    if (active.length >= this.limits.maxVoices) {
      this.voices.set(id, active);
      return false;
    }
    active.push(now + durationMs);
    this.voices.set(id, active);
    this.lastStart.set(id, now);
    return true;
  }

  activeCount(id: string, now: number): number {
    return (this.voices.get(id) ?? []).filter((end) => end > now).length;
  }
}
