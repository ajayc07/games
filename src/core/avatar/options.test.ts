import { describe, expect, it } from 'vitest';
import type { AvatarOptionDef } from '../types';
import { colorFromSearch, findOption, validateOptions } from './options';
import { resolveAvatar } from './config';
import { DEFAULT_PALETTE, SCALE_RANGE } from './robotSpec';

const opt = (id: string, extra: Partial<AvatarOptionDef> = {}): AvatarOptionDef => ({
  id,
  chime: { semitones: 0, timbre: 'soft' },
  ...extra,
});

describe('avatar options: validation', () => {
  it('accepts a good list', () => {
    expect(validateOptions([opt('red'), opt('blue', { scale: 1.1, antennae: 1 })])).toEqual([]);
  });

  it('reports empty lists, duplicate or bad ids, scale and antennae out of range, bad chimes', () => {
    expect(validateOptions([])).toEqual(['no avatar options']);
    expect(validateOptions([opt('red'), opt('red')])).toEqual(['option 2 (red): duplicate id']);
    expect(validateOptions([opt('Red Robot')])[0]).toMatch(/id must be lower-case/);
    expect(validateOptions([opt('big', { scale: 3 })])[0]).toMatch(/scale 3 is outside/);
    expect(validateOptions([opt('a', { antennae: 5 })])[0]).toMatch(/antennae must be 0, 1 or 2/);
    expect(validateOptions([opt('a', { chime: { semitones: 0, timbre: 'kazoo' as never } })])[0]).toMatch(/timbre/);
    expect(validateOptions([opt('a', { chime: { semitones: 40, timbre: 'bell' } })])[0]).toMatch(/semitones/);
  });

  it('options resolve like any avatar: palette defaults filled, scale clamped', () => {
    const r = resolveAvatar(opt('x', { palette: { accent: 0xff0000 }, scale: 9 }));
    expect(r.palette).toEqual({ ...DEFAULT_PALETTE, accent: 0xff0000 });
    expect(r.scale).toBe(SCALE_RANGE.max);
    expect(resolveAvatar(opt('y', { scale: 0.1 })).scale).toBe(SCALE_RANGE.min);
    expect(resolveAvatar(opt('z')).antennae).toBe(2);
  });
});

describe('avatar options: ?color= and lookup', () => {
  const list = [opt('red'), opt('blue'), opt('pink')];

  it('finds by id', () => {
    expect(findOption(list, 'blue')?.id).toBe('blue');
    expect(findOption(list, 'nope')).toBeUndefined();
    expect(findOption(list, null)).toBeUndefined();
  });

  it('reads ?color=, case-insensitive', () => {
    expect(colorFromSearch('?color=blue', list)).toMatchObject({ requested: true, warning: null, option: { id: 'blue' } });
    expect(colorFromSearch('?level=grass-3&color=PINK', list).option.id).toBe('pink');
  });

  it('without the parameter: not requested, first option', () => {
    expect(colorFromSearch('', list)).toMatchObject({ requested: false, warning: null, option: { id: 'red' } });
    expect(colorFromSearch('?color=', list).requested).toBe(false);
  });

  it('an unknown colour falls back to the first option with one warning message', () => {
    const r = colorFromSearch('?color=gold', list);
    expect(r.requested).toBe(true);
    expect(r.option.id).toBe('red');
    expect(r.warning).toMatch(/unknown color "gold", using "red"/);
  });

  it('the old ?char= parameter is gone (ignored)', () => {
    expect(colorFromSearch('?char=blue', list).requested).toBe(false);
  });
});
