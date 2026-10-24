// Where the touch buttons go, and which one a touch hits (Task 009). Pure and unit-tested; TouchControls
// draws what this decides. Units are logical px (the screen is always 720 high, so layouts are the same
// at every screen size except for the corners they hang on).
//
// Rules (D-001, D-015, Task 009):
// - Left and Right sit bottom-left, side by side, with a gap; a thumb sliding between them never meets a dead zone.
// - Jump and Power sit bottom-right so one thumb reaches both. With only one of them it takes the corner
//   (bigger when it is the only right-hand button). With both, they sit side by side, the primary one in the
//   corner (larger), the other beside it a little higher (a gentle arc). `?buttons=jump|power` picks the primary.
// - The two right-hand buttons are at least 0.20 of the screen's short edge across (Left and Right keep their 0.18),
//   at least RIGHT_GAP apart edge to edge, and their enlarged hit circles never overlap.
// - The whole layout stays inside the device insets and never overlaps itself: if a big `?buttonScale` would make
//   the two clusters meet, the scale is reduced to fit.
import type { Action } from '../types';

/** Diameter as a fraction of the short edge, per situation. */
export const BUTTON_SIZE = {
  left: 0.18,
  right: 0.18,
  /** Jump with Left/Right (Grass 3, 5). */
  jump: 0.22,
  /** The only right-hand button (Jump in Grass 2, Power in Grass 4): big and unmissable. */
  solo: 0.28,
  /** With both Jump and Power: the primary (corner) button and the other one. */
  primary: 0.26,
  secondary: 0.22,
} as const;

/** Each right-hand button is at least this much of the short edge across (the smallest, `secondary`, is 0.22). */
export const MIN_BUTTON_SIZE = 0.2;
/** Space from the screen edge (inside the insets) to a button's edge. */
export const EDGE_MARGIN = 28;
/** Gap between the two right-hand buttons, edge to edge (logical px; 26 physical px at 844x390). */
export const RIGHT_GAP = 48;
/** The second right-hand button sits this much (a fraction of its radius) higher than the corner one. */
export const ARC_LIFT = 0.3;
/** Hit circles are this much larger than the drawn circle. */
export const HIT_SLOP = 1.1;
/** Space kept free between the left and the right cluster (logical px). */
const CLUSTER_GAP = 40;

export type Primary = 'jump' | 'power';

/** `?buttons=jump|power`: which right-hand button is the larger, corner one when both are shown. Default jump. */
export function parsePrimary(search: string): Primary {
  const v = new URLSearchParams(search).get('buttons');
  return v === 'power' ? 'power' : 'jump';
}

export interface ButtonPlacement {
  action: Action;
  x: number;
  y: number;
  radius: number;
}

export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutOptions {
  /** The buttons shown (visible actions). */
  shown: readonly Action[];
  /** Screen area minus device insets (Layout.uiRect). */
  ui: Area;
  /** Short edge (the logical height, 720). */
  short: number;
  /** `?buttonScale` multiplier; reduced if the clusters would meet. */
  scale?: number;
  primary?: Primary;
}

/** Diameter fractions for the shown set (before `scale`). */
export function sizesFor(shown: readonly Action[], primary: Primary = 'jump'): Partial<Record<Action, number>> {
  const has = (a: Action) => shown.includes(a);
  const out: Partial<Record<Action, number>> = {};
  if (has('left')) out.left = BUTTON_SIZE.left;
  if (has('right')) out.right = BUTTON_SIZE.right;
  if (has('jump') && has('power')) {
    out[primary] = BUTTON_SIZE.primary;
    out[primary === 'jump' ? 'power' : 'jump'] = BUTTON_SIZE.secondary;
  } else if (has('jump')) {
    // Alone on the screen it is the Grass 2 button; with Left/Right it keeps its Grass 3 size.
    out.jump = shown.length === 1 ? BUTTON_SIZE.solo : BUTTON_SIZE.jump;
  } else if (has('power')) {
    out.power = BUTTON_SIZE.solo;
  }
  return out;
}

/** Places the shown buttons. Hidden actions are not in the result. */
export function placeButtons(opts: LayoutOptions): ButtonPlacement[] {
  const { shown, ui, short } = opts;
  const primary = opts.primary ?? 'jump';
  const fractions = sizesFor(shown, primary);
  const place = (scale: number): ButtonPlacement[] => {
    const r = (a: Action) => ((fractions[a] ?? 0) * short * scale) / 2;
    const out: ButtonPlacement[] = [];
    const bottom = ui.y + ui.height;
    // Left cluster: Left and Right side by side, bottom-left.
    if (fractions.left !== undefined || fractions.right !== undefined) {
      const rl = r('left') || r('right');
      const rr = r('right') || r('left');
      const y = bottom - EDGE_MARGIN - rl;
      const gap = rl * 0.9; // generous, so Left and Right are not confused
      const lx = ui.x + EDGE_MARGIN + rl;
      if (fractions.left !== undefined) out.push({ action: 'left', x: lx, y, radius: rl });
      if (fractions.right !== undefined) out.push({ action: 'right', x: lx + rl + gap + rr, y, radius: rr });
    }
    // Right cluster: the corner button, then the other one beside it.
    const right = ui.x + ui.width;
    const rightHand = (['jump', 'power'] as const).filter((a) => fractions[a] !== undefined);
    if (rightHand.length === 1) {
      const a = rightHand[0];
      out.push({ action: a, x: right - EDGE_MARGIN - r(a), y: bottom - EDGE_MARGIN - r(a), radius: r(a) });
    } else if (rightHand.length === 2) {
      const first = primary;
      const second = primary === 'jump' ? 'power' : 'jump';
      const x1 = right - EDGE_MARGIN - r(first);
      out.push({ action: first, x: x1, y: bottom - EDGE_MARGIN - r(first), radius: r(first) });
      out.push({
        action: second,
        x: x1 - r(first) - RIGHT_GAP - r(second),
        y: bottom - EDGE_MARGIN - r(second) - ARC_LIFT * r(second),
        radius: r(second),
      });
    }
    return out;
  };

  // A big scale must not push the two clusters into each other: shrink until they fit side by side.
  let scale = opts.scale ?? 1;
  const extent = (ps: ButtonPlacement[]) => {
    const leftEdge = Math.max(0, ...ps.filter((p) => p.action === 'left' || p.action === 'right').map((p) => p.x + p.radius - ui.x));
    const rightEdge = Math.max(0, ...ps.filter((p) => p.action === 'jump' || p.action === 'power').map((p) => ui.x + ui.width - (p.x - p.radius)));
    return leftEdge + rightEdge;
  };
  const at1 = extent(place(1));
  if (at1 > 0) scale = Math.min(scale, Math.max(0.5, (ui.width - CLUSTER_GAP) / at1));
  return place(scale);
}

/**
 * The button a touch at (x, y) hits. Left and Right share one band with no dead zone (a sliding thumb switches
 * at the midpoint). Otherwise the nearest button whose enlarged circle (`HIT_SLOP`) contains the point wins.
 */
export function pickButton(buttons: readonly ButtonPlacement[], x: number, y: number, slop: number = HIT_SLOP): Action | null {
  const l = buttons.find((b) => b.action === 'left');
  const r = buttons.find((b) => b.action === 'right');
  if (l && r) {
    const reach = Math.max(l.radius, r.radius) * slop;
    const inBand = Math.abs(y - l.y) <= reach && x >= l.x - l.radius * slop && x <= r.x + r.radius * slop;
    if (inBand) return x < (l.x + r.x) / 2 ? 'left' : 'right';
  }
  let best: Action | null = null;
  let bestDist = Infinity;
  for (const b of buttons) {
    const d = Math.hypot(x - b.x, y - b.y);
    if (d <= b.radius * slop && d < bestDist) {
      best = b.action;
      bestDist = d;
    }
  }
  return best;
}

/** True if two enlarged hit circles overlap (they must not for the two right-hand buttons). */
export function hitCirclesOverlap(a: ButtonPlacement, b: ButtonPlacement, slop: number = HIT_SLOP): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < (a.radius + b.radius) * slop;
}
