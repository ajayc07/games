import { describe, expect, it } from 'vitest';
import { CHIME_BASE_HZ, CHIME_SEMITONES, CHIME_TIMBRES, chimeRecipe, chimeRootHz, chimeSoundId, peakGain, type ChimeDef } from './chimes';
import { recipeDuration, type SynthRecipe } from './recipes';

const ALL: ChimeDef[] = [];
for (const timbre of CHIME_TIMBRES) for (const semitones of [-5, -3, 0, 2, 4, 5, 7, 9]) ALL.push({ semitones, timbre });

/** The main notes (not the quieter overtones). */
const mains = (r: SynthRecipe) => r.tones.filter((t, i) => i === 0 || t.type === r.tones[0].type && (t.gain ?? 1) >= 0.5);

describe('option chimes (D-038)', () => {
  it('differ per pitch and per timbre, for both pick and win', () => {
    for (const kind of ['pick', 'win'] as const) {
      const seen = new Set(ALL.map((d) => JSON.stringify(chimeRecipe(kind, d))));
      expect(seen.size).toBe(ALL.length);
    }
    // Same pitch, different timbre: a different shape (notes and waves), not just different numbers.
    const shapes = CHIME_TIMBRES.map((timbre) =>
      chimeRecipe('win', { semitones: 0, timbre })
        .tones.map((t) => `${t.type}:${Math.round(t.freq)}`)
        .join(),
    );
    expect(new Set(shapes).size).toBe(CHIME_TIMBRES.length);
  });

  it('pick is short and rising, win is a longer arpeggio that ends higher than it starts', () => {
    for (const d of ALL) {
      const pick = chimeRecipe('pick', d);
      const win = chimeRecipe('win', d);
      expect(recipeDuration(pick)).toBeLessThanOrEqual(0.4);
      expect(recipeDuration(win)).toBeGreaterThan(recipeDuration(pick));
      expect(recipeDuration(win)).toBeLessThanOrEqual(1.3);
      const p = mains(pick);
      expect(p[p.length - 1].freq).toBeGreaterThan(p[0].freq);
      const w = mains(win);
      expect(w.length).toBeGreaterThanOrEqual(5);
      expect(w[w.length - 1].freq).toBeGreaterThan(w[0].freq);
    }
  });

  it('stays in a safe, pleasant range: loud enough, never clipping, no shrill or muddy notes', () => {
    for (const d of ALL) {
      for (const kind of ['pick', 'win'] as const) {
        const r = chimeRecipe(kind, d);
        const label = `${d.timbre} ${d.semitones} ${kind}`;
        const peak = peakGain(r);
        expect(peak, label).toBeGreaterThanOrEqual(0.6);
        expect(peak, label).toBeLessThanOrEqual(1.6);
        for (const t of r.tones) {
          expect(t.freq, label).toBeGreaterThanOrEqual(250);
          expect(t.freq, label).toBeLessThanOrEqual(5000);
          expect(t.gain ?? 1).toBeLessThanOrEqual(1);
          expect(['sine', 'triangle']).toContain(t.type); // soft waveforms only
        }
      }
    }
  });

  it('clamps the pitch and falls back to a soft timbre for unknown values', () => {
    expect(chimeRootHz({ semitones: 0, timbre: 'soft' })).toBeCloseTo(CHIME_BASE_HZ);
    expect(chimeRootHz({ semitones: 99, timbre: 'soft' })).toBeCloseTo(CHIME_BASE_HZ * 2 ** (CHIME_SEMITONES.max / 12));
    expect(chimeRootHz({ semitones: Number.NaN, timbre: 'soft' })).toBeCloseTo(CHIME_BASE_HZ);
    const odd = chimeRecipe('win', { semitones: 0, timbre: 'kazoo' as never });
    expect(odd).toEqual(chimeRecipe('win', { semitones: 0, timbre: 'soft' }));
  });

  it('names sound ids per option and kind', () => {
    expect(chimeSoundId('blue', 'win')).toBe('chime:blue:win');
    expect(chimeSoundId('blue', 'pick')).not.toBe(chimeSoundId('red', 'pick'));
  });
});
