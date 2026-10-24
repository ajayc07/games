import { describe, expect, it } from 'vitest';
import { choiceKey, loadLegacyChoice, type KeyValueStore } from './choice';

const memory = (entries: Record<string, string>): KeyValueStore => ({ getItem: (k) => entries[k] ?? null });
const throwing: KeyValueStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
};

describe('legacy avatar choice (005d key, read for the migration only)', () => {
  it('reads the old key per universe', () => {
    const s = memory({ [choiceKey('robo')]: 'blue' });
    expect(choiceKey('robo')).toBe('athi.robo.choice');
    expect(loadLegacyChoice('robo', s)).toBe('blue');
    expect(loadLegacyChoice('other', s)).toBeNull();
  });

  it('never throws when storage is blocked or missing', () => {
    expect(loadLegacyChoice('robo', throwing)).toBeNull();
    expect(loadLegacyChoice('robo', null)).toBeNull();
    expect(() => loadLegacyChoice('robo')).not.toThrow();
  });

  it('ignores junk values', () => {
    expect(loadLegacyChoice('robo', memory({ [choiceKey('robo')]: '' }))).toBeNull();
    expect(loadLegacyChoice('robo', memory({ [choiceKey('robo')]: 'x'.repeat(500) }))).toBeNull();
  });
});
