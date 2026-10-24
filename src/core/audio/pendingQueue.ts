// Sounds requested while audio is still unlocking (the very first tap). Framework-free, unit-tested.
// The first tap both unlocks audio and makes the character jump; the jump sound would be lost while
// the AudioContext is resuming. Requests are kept briefly and played once audio runs, if still fresh.

/** A queued sound older than this (ms) is dropped: late sounds feel wrong. */
export const PENDING_MAX_AGE_MS = 300;
const MAX_PENDING = 4;

export class PendingQueue {
  private items: Array<{ id: string; at: number }> = [];

  push(id: string, now: number): void {
    if (this.items.some((p) => p.id === id)) return; // mashing during unlock queues one, not many
    this.items.push({ id, at: now });
    if (this.items.length > MAX_PENDING) this.items.shift();
  }

  /** Ids still fresh enough to play, oldest first. Empties the queue. */
  drain(now: number, maxAgeMs = PENDING_MAX_AGE_MS): string[] {
    const fresh = this.items.filter((p) => now - p.at <= maxAgeMs).map((p) => p.id);
    this.items = [];
    return fresh;
  }

  get size(): number {
    return this.items.length;
  }
}
