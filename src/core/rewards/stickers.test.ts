import { describe, expect, it } from 'vitest';
import { GUARDIAN_STICKER, STICKERS, STICKER_COUNT, cleanStickers, earnsSticker, nextSticker, stickerById } from './stickers';

describe('stickers (Task 031, D-074)', () => {
  it('24 distinct stickers, twelve shapes twice, ids in order', () => {
    expect(STICKER_COUNT).toBe(24);
    expect(new Set(STICKERS.map((s) => s.id)).size).toBe(24);
    expect(new Set(STICKERS.map((s) => s.shape)).size).toBe(12);
    expect(STICKERS[0].id).toBe('s01');
    expect(STICKERS[23].id).toBe('s24');
    expect(STICKERS[0].color).not.toBe(STICKERS[12].color);
    expect(stickerById('s05')?.shape).toBe('sun');
    expect(stickerById('nope')).toBeUndefined();
  });

  it('the Cave Guardian sticker (Task 040) is a 25th, special one: never handed out by nextSticker, kept by cleanStickers', () => {
    expect(GUARDIAN_STICKER.id).toBe('g01');
    expect(GUARDIAN_STICKER.shape).toBe('crystal');
    expect(STICKERS.some((s) => s.id === 'g01')).toBe(false);
    expect(stickerById('g01')).toBe(GUARDIAN_STICKER);
    expect(nextSticker([])).toBe('s01');
    expect(cleanStickers(['g01', 's02', 'g01'])).toEqual(['s02', 'g01']);
    expect(earnsSticker('guardian', null, 0)).toBe(true);
  });

  it('the next sticker is the first one he does not have, null when he has them all', () => {
    expect(nextSticker([])).toBe('s01');
    expect(nextSticker(['s01', 's02'])).toBe('s03');
    expect(nextSticker(['s02'])).toBe('s01');
    expect(nextSticker(STICKERS.map((s) => s.id))).toBeNull();
  });

  it('cleans a saved list: unknown ids, repeats and junk go, order is the catalogue order', () => {
    expect(cleanStickers(['s03', 's01', 's01', 'zzz', 7, null])).toEqual(['s01', 's03']);
    expect(cleanStickers('s01')).toEqual([]);
    expect(cleanStickers(undefined)).toEqual([]);
  });

  it('Mega Robo always earns one; a finish only the first time cleared and the first time three stars', () => {
    expect(earnsSticker('mega', { stars: 3 }, 3)).toBe(true);
    expect(earnsSticker('finish', null, 1)).toBe(true);
    expect(earnsSticker('finish', { stars: 0 }, 2)).toBe(true);
    expect(earnsSticker('finish', { stars: 1 }, 2)).toBe(false);
    expect(earnsSticker('finish', { stars: 1 }, 3)).toBe(true);
    expect(earnsSticker('finish', { stars: 3 }, 3)).toBe(false);
    expect(earnsSticker('finish', null, 0)).toBe(false);
  });
});
