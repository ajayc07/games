// Combo detection for Combo Practice (Task 011, D-049). Pure and unit-tested; the scene draws the reward.
// A combo is an action button pressed while a navigation button is held (or was held a moment ago, to forgive thumb
// timing), or Power pressed while in the air. Each focus counts only its own kind. Counted combos are at least
// COMBO.minGapMs apart, so mashing cannot fill the star row instantly. Nothing is ever lost: the row only fills.
import type { PracticeMode } from '../levels/practice';

export const COMBO = {
  /** A nav button released this recently still counts as held (ms). */
  navGraceMs: 120,
  /** Counted combos are at least this far apart (ms). */
  minGapMs: 400,
  /** Stars in the row; the last one gives the celebration and the row starts again. */
  rowSize: 5,
} as const;

export type ComboKind = 'nav-power' | 'nav-jump' | 'air-power';

/** Which kinds count in each focus. */
export const COMBO_KINDS: Record<PracticeMode, readonly ComboKind[]> = {
  'walk-shoot': ['nav-power'],
  'jump-shoot': ['air-power'],
  'walk-jump': ['nav-jump'],
  everything: ['nav-power', 'nav-jump', 'air-power'],
};

export interface ComboFrame {
  now: number;
  /** Navigation held this frame (a real hold, or the walk-assist latch). */
  left: boolean;
  right: boolean;
  jump: boolean;
  power: boolean;
  airborne: boolean;
  jumpPressed: boolean;
  powerPressed: boolean;
}

export interface ComboEvent {
  kind: ComboKind;
  /** The nav button involved (held now or a moment ago), or null (Power in the air without one). */
  nav: 'left' | 'right' | null;
  action: 'jump' | 'power';
  at: number;
  /** Index of the star this combo fills (0..rowSize-1). */
  star: number;
  /** True when this combo filled the row (the celebration plays and the row empties). */
  rowDone: boolean;
}

export class ComboTracker {
  /** Stars filled in the current row (0..rowSize-1; it empties when the last one fills). */
  stars = 0;
  /** Every combo counted this run. */
  total = 0;
  /** Rows completed this run. */
  rows = 0;
  lastComboAt = -Infinity;
  /** Candidates turned away by the minimum gap (debug). */
  ignored = 0;
  private lastHeld = { left: -Infinity, right: -Infinity };

  constructor(readonly mode: PracticeMode) {}

  step(f: ComboFrame): ComboEvent | null {
    if (f.left) this.lastHeld.left = f.now;
    if (f.right) this.lastHeld.right = f.now;
    const recent = (d: 'left' | 'right') => f[d] || f.now - this.lastHeld[d] <= COMBO.navGraceMs;
    const nav: 'left' | 'right' | null =
      recent('left') && recent('right')
        ? this.lastHeld.left >= this.lastHeld.right
          ? 'left'
          : 'right'
        : recent('left')
          ? 'left'
          : recent('right')
            ? 'right'
            : null;
    const kinds = COMBO_KINDS[this.mode];
    let kind: ComboKind | null = null;
    let action: 'jump' | 'power' = 'power';
    if (f.powerPressed && nav && kinds.includes('nav-power')) kind = 'nav-power';
    else if (f.powerPressed && f.airborne && kinds.includes('air-power')) kind = 'air-power';
    else if (f.jumpPressed && nav && kinds.includes('nav-jump')) {
      kind = 'nav-jump';
      action = 'jump';
    }
    if (!kind) return null;
    if (f.now - this.lastComboAt < COMBO.minGapMs) {
      this.ignored++;
      return null;
    }
    this.lastComboAt = f.now;
    this.total++;
    const star = this.stars;
    const rowDone = star === COMBO.rowSize - 1;
    if (rowDone) {
      this.stars = 0;
      this.rows++;
    } else this.stars++;
    return { kind, nav, action, at: f.now, star, rowDone };
  }
}
