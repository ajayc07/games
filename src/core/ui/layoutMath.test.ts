import { describe, expect, it } from 'vitest';
import { logicalWidthFor, renderScaleFor } from './layoutMath';

describe('logicalWidthFor', () => {
  it('follows the screen aspect ratio with height locked to 720', () => {
    expect(logicalWidthFor(844, 390)).toBe(1558); // landscape phone
    expect(logicalWidthFor(1280, 800)).toBe(1152); // 16:10 tablet
    expect(logicalWidthFor(1920, 1080)).toBe(1280); // 16:9
  });

  it('clamps to 960 (4:3) and 1920 (D-017)', () => {
    expect(logicalWidthFor(1024, 768)).toBe(960);
    expect(logicalWidthFor(800, 800)).toBe(960);
    expect(logicalWidthFor(1366, 512)).toBe(1920); // 2.67:1 now fits without bars
    expect(logicalWidthFor(2400, 1000)).toBe(1728);
    expect(logicalWidthFor(3440, 1000)).toBe(1920);
  });

  it('survives a zero-sized parent', () => {
    expect(logicalWidthFor(0, 0)).toBe(1280);
  });
});

describe('renderScaleFor', () => {
  it('matches physical pixels in quarter steps', () => {
    expect(renderScaleFor(390, 3)).toBe(1.75); // phone: 1170 physical px tall
    expect(renderScaleFor(1080, 1)).toBe(1.5); // 1080p desktop
    expect(renderScaleFor(720, 1)).toBe(1);
  });

  it('is capped at 2 and never below 1', () => {
    expect(renderScaleFor(800, 2)).toBe(2); // tablet
    expect(renderScaleFor(1440, 3)).toBe(2);
    expect(renderScaleFor(300, 1)).toBe(1);
    expect(renderScaleFor(0, 2)).toBe(1);
    expect(renderScaleFor(800, NaN)).toBe(1);
  });
});
