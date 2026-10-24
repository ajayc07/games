import { afterEach, describe, expect, it, vi } from 'vitest';
import { freshRecord, mergeResult, parseRecord, PROGRESS_VERSION, serializeRecord } from './progress';
import { progressKey, ProgressStore, SAVE_DEBOUNCE_MS } from './store';
import { MemoryBackend, type KVBackend } from './backends';

describe('progress record', () => {
  it('a fresh record has the D-036 shape', () => {
    expect(freshRecord()).toEqual({ version: PROGRESS_VERSION, chosenCharacterId: null, look: null, levels: {}, settings: {} });
  });

  it('keeps the best stars and coins, never lowers them', () => {
    let r = freshRecord();
    r = mergeResult(r, 'g1', { stars: 2, coins: 10 });
    r = mergeResult(r, 'g1', { stars: 1, coins: 14 });
    expect(r.levels.g1).toEqual({ stars: 2, bestCoins: 14 });
    r = mergeResult(r, 'g1', { stars: 3, coins: 3 });
    expect(r.levels.g1).toEqual({ stars: 3, bestCoins: 14 });
    r = mergeResult(r, 'g1', { stars: 9, coins: -5 });
    expect(r.levels.g1).toEqual({ stars: 3, bestCoins: 14 });
    const before = freshRecord();
    mergeResult(before, 'x', { stars: 1, coins: 1 });
    expect(before.levels).toEqual({}); // pure: returns a new record
  });

  it('round-trips and repairs bad fields', () => {
    const r = mergeResult({ ...freshRecord(), chosenCharacterId: 'blue', look: 'ball', settings: { soundOn: false } }, 'g2', { stars: 1, coins: 4 });
    expect(parseRecord(serializeRecord(r))).toEqual({ record: r, status: 'ok' });
    const junk = JSON.stringify({ version: 1, chosenCharacterId: 5, levels: { g1: { stars: 'x' }, g2: { stars: 2.6, bestCoins: 7 }, g3: 4 }, settings: { unlockAll: 'yes' } });
    const { record } = parseRecord(junk);
    expect(record.chosenCharacterId).toBeNull();
    expect(record.levels).toEqual({ g1: { stars: 0, bestCoins: 0 }, g2: { stars: 3, bestCoins: 7 } });
    expect(record.settings).toEqual({});
  });

  it('empty, corrupt and unknown versions give a fresh record with a status', () => {
    expect(parseRecord(null).status).toBe('empty');
    expect(parseRecord('{nope').status).toBe('corrupt');
    expect(parseRecord('[1,2]').status).toBe('corrupt');
    const v2 = parseRecord(JSON.stringify({ version: 2, levels: { g1: { stars: 3 } } }));
    expect(v2.status).toBe('unknown-version');
    expect(v2.record).toEqual(freshRecord());
  });
});

/** A backend that always throws (blocked IndexedDB, Safari private mode localStorage, ...). */
const broken = (name: string): KVBackend => ({
  name,
  get: async () => {
    throw new Error(`${name} blocked`);
  },
  set: async () => {
    throw new Error(`${name} blocked`);
  },
});
/** Works for reading but throws on write (storage full). */
const readOnly = (inner: MemoryBackend): KVBackend => ({ name: 'full', get: (k) => inner.get(k), set: async () => { throw new Error('quota'); } });

describe('ProgressStore', () => {
  afterEach(() => vi.useRealTimers());
  const KEY = progressKey('robo');

  it('falls through the chain: a throwing backend is skipped silently', async () => {
    const ls = new MemoryBackend();
    const store = await ProgressStore.open('robo', { backends: [broken('indexeddb'), ls] });
    expect(store.backendName).toBe('memory');
    store.recordResult('g1', { stars: 2, coins: 9 });
    await store.flush();
    expect(JSON.parse(ls.data.get(KEY)!).levels.g1).toEqual({ stars: 2, bestCoins: 9 });
  });

  it('with every backend blocked it still works in memory, without errors', async () => {
    const store = await ProgressStore.open('robo', { backends: [broken('indexeddb'), broken('localstorage')] });
    expect(store.backendName).toBe('memory');
    store.recordResult('g1', { stars: 1, coins: 1 });
    await expect(store.flush()).resolves.toBeUndefined();
    expect(store.level('g1').stars).toBe(1);
  });

  it('reads a record a later backend saved when the first one is empty', async () => {
    const idb = new MemoryBackend();
    const ls = new MemoryBackend();
    ls.data.set(KEY, serializeRecord(mergeResult(freshRecord(), 'g3', { stars: 3, coins: 20 })));
    const store = await ProgressStore.open('robo', { backends: [idb, ls] });
    expect(store.level('g3').stars).toBe(3);
  });

  it('moves on to the next backend when a write fails', async () => {
    const a = new MemoryBackend();
    const b = new MemoryBackend();
    const store = await ProgressStore.open('robo', { backends: [readOnly(a), b] });
    store.setChosenCharacter('pink');
    await store.flush();
    expect(JSON.parse(b.data.get(KEY)!).chosenCharacterId).toBe('pink');
  });

  it('an unknown version is played in memory and never overwritten', async () => {
    const ls = new MemoryBackend();
    const newer = JSON.stringify({ version: 2, whatever: true });
    ls.data.set(KEY, newer);
    const store = await ProgressStore.open('robo', { backends: [ls] });
    expect(store.status).toBe('unknown-version');
    store.recordResult('g1', { stars: 3, coins: 5 });
    await store.flush();
    expect(ls.data.get(KEY)).toBe(newer);
    expect(store.level('g1').stars).toBe(3);
  });

  it('migrates the 005d choice when the record has none, and never overrides a saved one', async () => {
    const ls = new MemoryBackend();
    const store = await ProgressStore.open('robo', { backends: [ls], legacyChoice: 'teal' });
    expect(store.migrated).toBe(true);
    expect(store.record.chosenCharacterId).toBe('teal');
    await store.flush();
    expect(JSON.parse(ls.data.get(KEY)!).chosenCharacterId).toBe('teal');
    const again = await ProgressStore.open('robo', { backends: [ls], legacyChoice: 'red' });
    expect(again.record.chosenCharacterId).toBe('teal');
    expect(again.migrated).toBe(false);
  });

  it('coalesces writes: a burst of changes is one write after the debounce', async () => {
    vi.useFakeTimers();
    const ls = new MemoryBackend();
    let writes = 0;
    const counting: KVBackend = { name: 'count', get: (k) => ls.get(k), set: async (k, v) => { writes++; await ls.set(k, v); } };
    const store = await ProgressStore.open('robo', { backends: [counting] });
    store.recordResult('g1', { stars: 1, coins: 1 });
    store.setLook('ball');
    store.setChosenCharacter('blue');
    expect(writes).toBe(0);
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS + 10);
    expect(writes).toBe(1);
    expect(JSON.parse(ls.data.get(KEY)!)).toMatchObject({ look: 'ball', chosenCharacterId: 'blue' });
    await store.flush(); // nothing new: no extra write
    expect(writes).toBe(1);
  });

  it('recordResult returns the record before and after', async () => {
    const store = await ProgressStore.open('robo', { backends: [new MemoryBackend()] });
    store.recordResult('g1', { stars: 1, coins: 3 });
    const { before, after } = store.recordResult('g1', { stars: 2, coins: 1 });
    expect(before.levels.g1.stars).toBe(1);
    expect(after.levels.g1).toEqual({ stars: 2, bestCoins: 3 });
  });
});
