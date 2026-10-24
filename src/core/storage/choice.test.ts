import { describe, expect, it } from 'vitest';
import { choiceKey, loadChoice, saveChoice, type KeyValueStore } from './choice';

function memory(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}
const throwing: KeyValueStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('stored avatar choice', () => {
  it('round-trips one small key per universe', () => {
    const s = memory();
    expect(loadChoice('robo', s)).toBeNull();
    expect(saveChoice('robo', 'blue', s)).toBe(true);
    expect(loadChoice('robo', s)).toBe('blue');
    expect([...s.data.keys()]).toEqual([choiceKey('robo')]);
    expect(loadChoice('other', s)).toBeNull();
  });

  it('never throws when storage is blocked, full or missing', () => {
    expect(loadChoice('robo', throwing)).toBeNull();
    expect(saveChoice('robo', 'blue', throwing)).toBe(false);
    expect(loadChoice('robo', null)).toBeNull();
    expect(saveChoice('robo', 'blue', null)).toBe(false);
  });

  it('ignores junk values', () => {
    const s = memory();
    s.data.set(choiceKey('robo'), '');
    expect(loadChoice('robo', s)).toBeNull();
    s.data.set(choiceKey('robo'), 'x'.repeat(500));
    expect(loadChoice('robo', s)).toBeNull();
  });

  it('works without any localStorage at all (default store)', () => {
    expect(() => loadChoice('robo')).not.toThrow();
    expect(() => saveChoice('robo', 'red')).not.toThrow();
  });
});
