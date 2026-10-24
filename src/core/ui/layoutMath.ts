// Pure scaling maths for layout.ts (D-013), kept Phaser-free so it can be unit-tested.

export const LOGICAL_HEIGHT = 720;
export const MIN_WIDTH = 960;
export const MAX_WIDTH = 1920;
/** Highest canvas pixels per logical unit (D-017: devicePixelRatio, capped at 2). */
export const MAX_RENDER_SCALE = 2;
export const SAFE_WIDTH = 960;

/** Logical width for a screen of the given CSS size: height locked to 720, width clamped to 960..1920. */
export function logicalWidthFor(cssWidth: number, cssHeight: number): number {
  if (cssWidth <= 0 || cssHeight <= 0) return 1280;
  const w = Math.round((LOGICAL_HEIGHT * cssWidth) / cssHeight);
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w));
}

/**
 * Canvas pixels per logical unit for a screen of the given CSS height and devicePixelRatio:
 * enough to match the physical pixels (so art is crisp), never below 1, never above 2.
 */
export function renderScaleFor(cssHeight: number, dpr: number): number {
  if (!(cssHeight > 0) || !(dpr > 0)) return 1;
  const physical = (cssHeight * dpr) / LOGICAL_HEIGHT;
  // Quarter steps avoid hairline seams from odd zoom factors.
  return Math.min(MAX_RENDER_SCALE, Math.max(1, Math.ceil(physical * 4) / 4));
}
