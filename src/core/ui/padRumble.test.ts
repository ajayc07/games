import { describe, expect, it } from 'vitest';
import { rumbleFor } from './padRumble';

describe('gamepad rumble (Task 048)', () => {
  it('known sounds map to a gentle rumble, unknown ones to none', () => {
    expect(rumbleFor('jump')).toEqual({ ms: 40, weak: 0.25, strong: 0 });
    expect(rumbleFor('nope')).toBeNull();
    expect(rumbleFor('tap')).toBeNull();
  });

  it('every rumble is short enough and within 0..1', () => {
    for (const id of ['jump', 'coin', 'rainbow', 'boing', 'megaTransform', 'golemCrumble', 'win', 'flyHum', 'pop-0', 'pop-5', 'pop-99']) {
      const r = rumbleFor(id)!;
      expect(r.ms).toBeGreaterThan(0);
      expect(r.ms).toBeLessThanOrEqual(1000);
      for (const m of [r.weak, r.strong]) {
        expect(m).toBeGreaterThanOrEqual(0);
        expect(m).toBeLessThanOrEqual(1);
      }
    }
  });

  it('bubble pops tick harder as the pitch climbs, and only Mega Robo gets the full-strength rumble', () => {
    expect(rumbleFor('pop-5')!.weak).toBeGreaterThan(rumbleFor('pop-0')!.weak);
    expect(rumbleFor('megaTransform')!.strong).toBe(1);
    expect(rumbleFor('coin')!.weak).toBeLessThan(0.5);
  });
});
