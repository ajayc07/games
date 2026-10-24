// Character voice clips (D-023), framework-free and unit-tested.
// Each slot (pick / jump / win) has a list of clips; one is picked at random, avoiding the same
// clip twice in a row. Some slots are rate-limited so mashing does not turn into a chatterbox.

export type VoiceSlot = 'pick' | 'jump' | 'win';

/** Minimum time between two clips of a slot (ms). The generic sound effects are not limited by this. */
export const VOICE_GAPS: Record<VoiceSlot, number> = { pick: 0, jump: 1500, win: 0 };

export class VoicePicker {
  private readonly lastAt = new Map<VoiceSlot, number>();
  private readonly lastIndex = new Map<VoiceSlot, number>();

  constructor(private readonly gaps: Record<VoiceSlot, number> = VOICE_GAPS) {}

  /**
   * Index of the clip to play for `slot` out of `count` clips, or null if there are none or the slot
   * is still in its quiet gap. `random` returns 0..1 (Math.random by default; injected in tests).
   */
  pick(slot: VoiceSlot, count: number, now: number, random: () => number = Math.random): number | null {
    if (count <= 0) return null;
    const last = this.lastAt.get(slot);
    if (last !== undefined && now - last < this.gaps[slot]) return null;
    let i = Math.min(count - 1, Math.floor(random() * count));
    const prev = this.lastIndex.get(slot);
    if (count > 1 && i === prev) i = (i + 1) % count;
    this.lastAt.set(slot, now);
    this.lastIndex.set(slot, i);
    return i;
  }

  /** Forget timings (a new level or character). */
  reset(): void {
    this.lastAt.clear();
    this.lastIndex.clear();
  }
}
