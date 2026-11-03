import { describe, expect, it } from 'vitest';
import { FLASH } from './powerups';
import { RUN_HOLD } from './runHold';
import { CAR } from './car';
import { MAX_TIMED, combines, dropsForMega, dropsForPickup, excludes, orbTakeable, powerFromSearch, type ActivePower, type Form } from './powerRules';

const PICKUPS = ['car', 'magnet', 'boots', 'flash'] as const;
const FORMS: Form[] = [...PICKUPS, 'mega'];
const act = (...pairs: Array<[ActivePower['kind'], number]>): ActivePower[] => pairs.map(([kind, left]) => ({ kind, left }));

describe('power-up rules (Task 034, D-078)', () => {
  it('the whole matrix: Mega excludes everything, the car and Flash exclude each other, nothing else is excluded', () => {
    const excluded: string[] = [];
    for (const a of FORMS) for (const b of FORMS) if (a !== b && !combines(a, b)) excluded.push(`${a}+${b}`);
    expect(excluded.sort()).toEqual(
      [
        'car+flash', 'flash+car',
        'mega+car', 'mega+magnet', 'mega+boots', 'mega+flash',
        'car+mega', 'magnet+mega', 'boots+mega', 'flash+mega',
      ].sort(),
    );
    // Symmetric, and a form never excludes itself (a second orb restarts it).
    for (const a of FORMS) {
      expect(combines(a, a)).toBe(true);
      for (const b of FORMS) expect(excludes(a, b)).toBe(excludes(b, a));
    }
    // The pairs that stay: magnet and boots with each other and with the car or Flash (a fast flier is allowed).
    for (const [a, b] of [['magnet', 'boots'], ['magnet', 'car'], ['magnet', 'flash'], ['boots', 'car'], ['boots', 'flash']] as const) expect(combines(a, b), `${a}+${b}`).toBe(true);
  });

  it('orbs cannot be taken while he is Mega Robo', () => {
    expect(orbTakeable(true)).toBe(false);
    expect(orbTakeable(false)).toBe(true);
  });

  it('a pickup of the other fast kind replaces the running one (car <-> Flash), in both directions', () => {
    expect(dropsForPickup(act(['car', 5000]), 'flash')).toEqual(['car']);
    expect(dropsForPickup(act(['flash', 5000]), 'car')).toEqual(['flash']);
    // With a magnet along, only the fast one goes; the magnet stays and there is room for the new one.
    expect(dropsForPickup(act(['car', 9000], ['magnet', 1000]), 'flash')).toEqual(['car']);
    expect(dropsForPickup(act(['magnet', 1000], ['flash', 9000]), 'car')).toEqual(['flash']);
  });

  it('the same kind just restarts: nothing is dropped, even with two running', () => {
    for (const k of PICKUPS) expect(dropsForPickup(act([k, 100]), k)).toEqual([]);
    expect(dropsForPickup(act(['magnet', 100], ['boots', 9000]), 'magnet')).toEqual([]);
    expect(dropsForPickup(act(['flash', 100], ['magnet', 9000]), 'flash')).toEqual([]);
  });

  it('at most two timed powers: a third replaces the one with the least time left', () => {
    expect(MAX_TIMED).toBe(2);
    expect(dropsForPickup(act(['magnet', 7000], ['boots', 3000]), 'car')).toEqual(['boots']);
    expect(dropsForPickup(act(['magnet', 2000], ['boots', 3000]), 'flash')).toEqual(['magnet']);
    expect(dropsForPickup(act(['car', 8000], ['magnet', 4000]), 'boots')).toEqual(['magnet']);
    // Every pair that may run together, with every third pickup: the result never leaves more than two powers, and never mixes the car with Flash.
    for (const a of PICKUPS) {
      for (const b of PICKUPS) {
        if (a === b || excludes(a, b)) continue;
        for (const c of PICKUPS) {
          const running = act([a, 6000], [b, 2000]);
          const drops = dropsForPickup(running, c);
          const left = running.filter((r) => !drops.includes(r.kind)).map((r) => r.kind);
          const after = left.includes(c) ? left : [...left, c];
          expect(after.length, `${a}+${b} then ${c}`).toBeLessThanOrEqual(MAX_TIMED);
          for (const x of after) for (const y of after) expect(combines(x, y), `${a}+${b} then ${c}: ${x}+${y}`).toBe(true);
        }
      }
    }
  });

  it('a first and a second power never drop anything unless they exclude each other', () => {
    expect(dropsForPickup([], 'flash')).toEqual([]);
    expect(dropsForPickup(act(['boots', 1000]), 'flash')).toEqual([]);
    expect(dropsForPickup(act(['boots', 1000]), 'car')).toEqual([]);
    expect(dropsForPickup(act(['magnet', 1000]), 'flash')).toEqual([]);
  });

  it('a full coin bar ends every running power, whatever it is', () => {
    expect(dropsForMega([])).toEqual([]);
    expect(dropsForMega(act(['car', 1])).sort()).toEqual(['car']);
    expect(dropsForMega(act(['magnet', 5000], ['boots', 3000])).sort()).toEqual(['boots', 'magnet']);
    expect(dropsForMega(act(['flash', 5000], ['boots', 3000])).sort()).toEqual(['boots', 'flash']);
  });

  it('Flash: 10 s, faster than a walk but under its ceiling, never stacked with the hold-to-run bonus, small bubbles only', () => {
    expect(FLASH.durationMs).toBeGreaterThanOrEqual(8000);
    expect(FLASH.durationMs).toBeLessThanOrEqual(12000);
    expect(FLASH.speedScale).toBeGreaterThan(CAR.speedScale);
    expect(FLASH.speedScale).toBeLessThanOrEqual(RUN_HOLD.flashCap);
    expect(RUN_HOLD.flashCap).toBeLessThanOrEqual(2);
    // The pop reach is smaller than Mega's (120) and about a robot's width plus a bubble's radius.
    expect(FLASH.popReach).toBeLessThan(120);
    expect(FLASH.popReach).toBeGreaterThan(40);
    expect(FLASH.ghosts).toBe(3);
  });

  it('?power=<kind> picks a pickup kind for the test hook and ignores anything else', () => {
    expect(powerFromSearch('')).toBeNull();
    expect(powerFromSearch('?power=flash')).toBe('flash');
    expect(powerFromSearch('?zen=1&power=boots&seed=2')).toBe('boots');
    expect(powerFromSearch('?power=car')).toBe('car');
    expect(powerFromSearch('?power=magnet')).toBe('magnet');
    expect(powerFromSearch('?power=mega')).toBeNull();
    expect(powerFromSearch('?power=')).toBeNull();
  });
});
