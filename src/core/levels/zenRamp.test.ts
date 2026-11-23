import { describe, expect, it } from 'vitest';
import { parseLevel } from './format';
import { generateZen, zenTier, ZEN_RAMP, ZEN_FLAIR_COINS } from './zen';

const SEEDS = Array.from({ length: 60 }, (_, i) => 1000 + i * 37);

describe('zen difficulty ramp (Task 045)', () => {
  it('tier 0 below 300 coins, then one tier per 150 coins up to 4', () => {
    expect([0, 150, 299].map(zenTier)).toEqual([0, 0, 0]);
    expect([300, 449].map(zenTier)).toEqual([1, 1]);
    expect([450, 600, 750, 5000].map(zenTier)).toEqual([2, 3, 4, ZEN_RAMP.maxTier]);
    expect(zenTier(Number.NaN)).toBe(0);
  });

  it('tier 0 is unchanged and has no combo motifs', () => {
    for (const seed of SEEDS) {
      const a = generateZen(seed, 'grass', { carry: undefined });
      expect(generateZen(seed, 'grass', { tier: 0 }).config.grid).toEqual(a.config.grid);
      expect(a.motifs.some((m) => ['gapShoot', 'stairShoot', 'padShoot', 'gauntlet'].includes(m))).toBe(false);
    }
  });

  it('each tier adds its own combo, and only from that tier on; every segment is still valid with legal gaps', () => {
    const seen = (tier: number) => new Set(SEEDS.flatMap((s) => generateZen(s, 'grass', { tier }).motifs as string[]));
    expect(seen(1).has('gapShoot')).toBe(true);
    expect(seen(1).has('stairShoot')).toBe(false);
    expect(seen(2).has('stairShoot')).toBe(true);
    expect(seen(2).has('padShoot')).toBe(false);
    expect(seen(3).has('padShoot')).toBe(true);
    expect(seen(3).has('gauntlet')).toBe(false);
    expect(seen(4).has('gauntlet')).toBe(true);
    expect(seen(4).has('rest')).toBe(false);
    for (const tier of [1, 2, 3, 4]) {
      for (const seed of SEEDS) {
        const seg = generateZen(seed, 'grass', { tier });
        expect(parseLevel(seg.config, 'zen').ok).toBe(true);
        for (const g of seg.gaps) expect(g.width <= 2).toBe(true);
        for (let i = 1; i < seg.gaps.length; i++) expect(seg.gaps[i].col - (seg.gaps[i - 1].col + seg.gaps[i - 1].width)).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it('a long play (500 coins) adds the four set-pieces and closer power-ups; every segment stays valid', () => {
    expect(ZEN_FLAIR_COINS).toBe(500);
    const motifs = new Set(SEEDS.flatMap((s) => generateZen(s, 'grass', { tier: 2, flair: true }).motifs as string[]));
    for (const m of ['frenzy', 'padChain', 'rainbowRun', 'treasure']) expect(motifs.has(m)).toBe(true);
    const plain = new Set(SEEDS.flatMap((s) => generateZen(s, 'grass', { tier: 2 }).motifs as string[]));
    for (const m of ['frenzy', 'padChain', 'rainbowRun', 'treasure']) expect(plain.has(m)).toBe(false);
    const powers = (flair: boolean) => SEEDS.reduce((n, s) => n + generateZen(s, 'grass', { tier: 2, flair }).motifs.filter((m) => String(m).startsWith('power-')).length, 0);
    expect(powers(true)).toBeGreaterThan(powers(false));
    for (const seed of SEEDS) expect(parseLevel(generateZen(seed, 'grass', { tier: 4, flair: true }).config, 'zen').ok).toBe(true);
  });
});
