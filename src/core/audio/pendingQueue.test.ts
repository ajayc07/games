import { describe, expect, it } from 'vitest';
import { PENDING_MAX_AGE_MS, PendingQueue } from './pendingQueue';


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
