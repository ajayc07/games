import { describe, expect, it } from 'vitest';
import { VoicePicker } from './voices';
import { PENDING_MAX_AGE_MS, PendingQueue } from './pendingQueue';

describe('VoicePicker', () => {
  it('picks from the list at random and returns null without clips', () => {
    const p = new VoicePicker();
    expect(p.pick('win', 0, 0)).toBeNull();
    expect(p.pick('win', 3, 0, () => 0.99)).toBe(2);
    expect(p.pick('pick', 3, 0, () => 0)).toBe(0);
  });

  it('avoids the same clip twice in a row when there is a choice', () => {
    const p = new VoicePicker();
    expect(p.pick('win', 2, 0, () => 0)).toBe(0);
    expect(p.pick('win', 2, 10, () => 0)).toBe(1);
    // A single clip simply repeats.
    expect(p.pick('pick', 1, 0)).toBe(0);
    expect(p.pick('pick', 1, 10)).toBe(0);
  });

  it('rate-limits the jump voice to one per 1.5 s while mashing', () => {
    const p = new VoicePicker();
    let played = 0;
    for (let t = 0; t < 6000; t += 100) if (p.pick('jump', 1, t) !== null) played++; // 10 presses a second for 6 s
    expect(played).toBe(4); // at 0, 1500, 3000, 4500
    expect(p.pick('jump', 1, 6000)).toBe(0);
  });

  it('does not limit win, and reset forgets the gap', () => {
    const p = new VoicePicker();
    expect(p.pick('win', 1, 0)).toBe(0);
    expect(p.pick('win', 1, 1)).toBe(0);
    expect(p.pick('jump', 1, 0)).toBe(0);
    expect(p.pick('jump', 1, 10)).toBeNull();
    p.reset();
    expect(p.pick('jump', 1, 20)).toBe(0);
  });
});

describe('PendingQueue (sounds requested while audio unlocks)', () => {
  it('plays requests that are still fresh once audio runs', () => {
    const q = new PendingQueue();
    q.push('jump', 1000);
    q.push('coin', 1100);
    expect(q.drain(1250)).toEqual(['jump', 'coin']);
    expect(q.size).toBe(0);
  });

  it('drops requests older than about 300 ms', () => {
    const q = new PendingQueue();
    q.push('jump', 1000);
    q.push('coin', 1200);
    expect(q.drain(1000 + PENDING_MAX_AGE_MS + 1)).toEqual(['coin']);
    expect(q.drain(5000)).toEqual([]);
  });

  it('keeps one entry per sound and only a few in total (mashing during unlock)', () => {
    const q = new PendingQueue();
    for (let i = 0; i < 10; i++) q.push('jump', i);
    expect(q.size).toBe(1);
    for (const id of ['a', 'b', 'c', 'd', 'e']) q.push(id, 5);
    expect(q.size).toBe(4);
    expect(q.drain(10)).toEqual(['b', 'c', 'd', 'e']);
  });
});
