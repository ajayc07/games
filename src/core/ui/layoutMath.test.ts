import { describe, expect, it } from 'vitest';
import { logicalWidthFor } from './layoutMath';

describe('logicalWidthFor', () => {
  it('follows the screen aspect ratio with height locked to 720', () => {
    expect(logicalWidthFor(844, 390)).toBe(1558); // landscape phone
    expect(logicalWidthFor(1280, 800)).toBe(1152); // 16:10 tablet
    expect(logicalWidthFor(1920, 1080)).toBe(1280); // 16:9
  });

  it('clamps to 960 (4:3) and 1680', () => {
    expect(logicalWidthFor(1024, 768)).toBe(960);
    expect(logicalWidthFor(800, 800)).toBe(960);
    expect(logicalWidthFor(1366, 512)).toBe(1680);
  });

  it('survives a zero-sized parent', () => {
    expect(logicalWidthFor(0, 0)).toBe(1280);
  });
});
