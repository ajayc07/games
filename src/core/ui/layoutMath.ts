// Pure scaling maths for layout.ts (D-013), kept Phaser-free so it can be unit-tested.

export const LOGICAL_HEIGHT = 720;
export const MIN_WIDTH = 960;
export const MAX_WIDTH = 1680;
export const SAFE_WIDTH = 960;

/** Logical width for a screen of the given CSS size: height locked to 720, width clamped to 960..1680. */
export function logicalWidthFor(cssWidth: number, cssHeight: number): number {
  if (cssWidth <= 0 || cssHeight <= 0) return 1280;
  const w = Math.round((LOGICAL_HEIGHT * cssWidth) / cssHeight);
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w));
}
