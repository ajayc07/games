import { describe, expect, it } from 'vitest';
import { COMBO_STEPS, comboRecipe, comboSoundId, DEFAULT_RECIPES, recipeDuration } from './recipes';

describe('combo sounds (Task 011)', () => {
  it('one short rising two-note sound per star, each a little higher than the one before', () => {
    expect(COMBO_STEPS.map((_, i) => comboSoundId(i))).toEqual(['combo-0', 'combo-1', 'combo-2', 'combo-3', 'combo-4']);
    expect(comboSoundId(9)).toBe('combo-4');
    expect(comboSoundId(-1)).toBe('combo-0');
    let last = 0;
    for (let i = 0; i < COMBO_STEPS.length; i++) {
      const r = comboRecipe(i);
      expect(recipeDuration(r)).toBeLessThan(0.3);
      expect(r.tones[1].freq).toBeGreaterThan(r.tones[0].freq); // rising
      expect(r.tones[0].freq).toBeGreaterThan(last);
      last = r.tones[0].freq;
      for (const t of r.tones) {
        expect(t.freq).toBeLessThan(4500);
        expect(t.gain ?? 1).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it('the row jingle is short, soft and not the win jingle', () => {
    expect(recipeDuration(DEFAULT_RECIPES.comboRow)).toBeLessThan(0.9);
    expect(DEFAULT_RECIPES.comboRow).not.toEqual(DEFAULT_RECIPES.win);
    for (const t of DEFAULT_RECIPES.comboRow.tones) expect(t.gain ?? 1).toBeLessThanOrEqual(0.6);
  });
});
