// Where the parent view's rows, preview and buttons go for a given screen (Task 010, D-047). Pure and unit-tested.
// Two columns, no scrolling: the left column holds six rows (label + controls; walk assist added in Task 011), the right column the button size
// steps, the live preview of the real button layout, the held Reset button and Back.
import type { Area } from '../ui/buttonLayout';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type RowId = 'sound' | 'look' | 'main' | 'unlock' | 'assist' | 'demos';

export interface ParentRow {
  id: RowId;
  rect: Rect;
  label: Rect;
  /** Two choices (On/Off, Robot/Ball, Jump/Power) or, for the demos row, one wide "Show again" button. */
  controls: Rect[];
}

export interface ParentLayout {
  rows: ParentRow[];
  /** Caption above the size steps. */
  sizeLabel: Rect;
  sizeSteps: Rect[];
  /** The Full screen row (Task 013), under the size steps; null when fullscreen is unavailable (row hidden, preview grows). */
  fullscreen: { rect: Rect; label: Rect; controls: Rect[] } | null;
  /** The "More settings ›" button at the top of the right column; on the second page it reads "‹ Settings" (Task 025). */
  more: Rect;
  /** The second page (Task 025): Day / night, Vibration and Volume (Task 032), one row each across the whole width, and a note under them. */
  page2: { rows: Array<{ id: 'daynight' | 'vibration' | 'volume'; rect: Rect; label: Rect; controls: Rect[] }>; note: Rect };
  /** The preview panel (the mini screen is drawn inside it, see `previewFit`). */
  preview: Rect;
  reset: Rect;
  back: Rect;
}

export const PARENT = {
  margin: 28,
  /** Space between rows and between controls. */
  gap: 24,
  /** Row and control height; no control is smaller than this. */
  rowH: 84,
  labelH: 30,
  /** Widest content (wider screens centre it). */
  maxContentW: 1240,
  colGap: 32,
  /** Share of the content width taken by the left column. */
  leftShare: 0.49,
  /** Label column: 42% of the left column, between these. */
  labelMin: 150,
  labelMax: 190,
  controlMinW: 100,
  backW: 128,
  /** Extra room under the size caption for the "More settings" button. */
  moreExtra: 14,
  moreW: 196,
  moreH: 44,
  /** The preview never gets less than this height. */
  previewMinH: 200,
} as const;

export function parentLayout(width: number, height: number, insets: Insets, withFullscreen = false): ParentLayout {
  const P = PARENT;
  const left0 = insets.left + P.margin;
  const top = insets.top + P.margin;
  const right0 = width - insets.right - P.margin;
  const bottom = height - insets.bottom - P.margin;
  const contentW = Math.min(P.maxContentW, right0 - left0);
  const cx = left0 + (right0 - left0 - contentW) / 2;
  const leftW = Math.floor((contentW - P.colGap) * P.leftShare);
  const rightX = cx + leftW + P.colGap;
  const rightW = contentW - leftW - P.colGap;

  const labelW = Math.round(Math.max(P.labelMin, Math.min(P.labelMax, leftW * 0.42)));
  // Left column rows.
  const ids: RowId[] = ['sound', 'look', 'main', 'unlock', 'assist', 'demos'];
  // Rows keep the usual gap when it fits (it does at every tested size); otherwise they close up a little.
  const rowGap = Math.max(12, Math.min(P.gap, (bottom - top - ids.length * P.rowH) / (ids.length - 1)));
  const rows: ParentRow[] = ids.map((id, i) => {
    const y = top + i * (P.rowH + rowGap);
    const rect = { x: cx, y, width: leftW, height: P.rowH };
    const label = { x: cx, y, width: labelW, height: P.rowH };
    const ctrlX = cx + labelW + P.gap;
    const ctrlW = leftW - labelW - P.gap;
    let controls: Rect[];
    if (id === 'demos') {
      controls = [{ x: ctrlX, y, width: ctrlW, height: P.rowH }];
    } else {
      const w = Math.floor((ctrlW - P.gap) / 2);
      controls = [
        { x: ctrlX, y, width: w, height: P.rowH },
        { x: ctrlX + w + P.gap, y, width: w, height: P.rowH },
      ];
    }
    return { id, rect, label, controls };
  });

  // Right column: size steps on top, Reset and Back at the bottom, the preview in between.
  const sizeLabel = { x: rightX, y: top, width: rightW, height: P.labelH };
  const stepY = top + P.labelH + 8 + P.moreExtra;
  const stepW = Math.floor((rightW - P.gap * 3) / 4);
  const sizeSteps: Rect[] = [0, 1, 2, 3].map((i) => ({ x: rightX + i * (stepW + P.gap), y: stepY, width: stepW, height: P.rowH }));
  const bottomY = bottom - P.rowH;
  const back = { x: rightX + rightW - P.backW, y: bottomY, width: P.backW, height: P.rowH };
  const reset = { x: rightX, y: bottomY, width: rightW - P.backW - P.gap, height: P.rowH };
  let fullscreen: ParentLayout['fullscreen'] = null;
  let previewY = stepY + P.rowH + P.gap;
  if (withFullscreen) {
    const y = previewY;
    const lw = Math.round(Math.max(P.labelMin, Math.min(P.labelMax, rightW * 0.3)));
    const cx0 = rightX + lw + P.gap;
    const w = Math.floor((rightW - lw - P.gap * 2) / 2);
    fullscreen = {
      rect: { x: rightX, y, width: rightW, height: P.rowH },
      label: { x: rightX, y, width: lw, height: P.rowH },
      controls: [
        { x: cx0, y, width: w, height: P.rowH },
        { x: cx0 + w + P.gap, y, width: w, height: P.rowH },
      ],
    };
    previewY = y + P.rowH + P.gap;
  }
  const preview = { x: rightX, y: previewY, width: rightW, height: Math.max(P.previewMinH, bottomY - P.gap - previewY) };
  const more = { x: rightX + rightW - P.moreW, y: top - 6, width: P.moreW, height: P.moreH };
  // Page 2: the whole content width, so three choices fit even on the narrowest screen.
  const p2Ctrl = cx + labelW + P.gap;
  const p2W = contentW - labelW - P.gap;
  const w3 = Math.floor((p2W - P.gap * 2) / 3);
  const p2Row = (id: 'daynight' | 'vibration' | 'volume', i: number) => {
    const y = top + P.moreH + P.gap + i * (P.rowH + P.gap);
    return {
      id,
      rect: { x: cx, y, width: contentW, height: P.rowH },
      label: { x: cx, y, width: labelW, height: P.rowH },
      controls: [0, 1, 2].map((k) => ({ x: p2Ctrl + k * (w3 + P.gap), y, width: w3, height: P.rowH })),
    };
  };
  const p2rows = [p2Row('daynight', 0), p2Row('vibration', 1), p2Row('volume', 2)];
  const noteY = p2rows[2].rect.y + P.rowH + P.gap;
  const note = { x: cx, y: noteY, width: contentW, height: Math.max(60, bottomY - P.gap - noteY) };
  return { rows, sizeLabel, sizeSteps, fullscreen, more, page2: { rows: p2rows, note }, preview, reset, back };
}

/**
 * Where the mini screen sits inside the preview panel: the whole screen (width x 720 logical, minus nothing; its UI
 * area is `ui`) shrunk by `k` to fit with a small padding. `ui` is the screen's UI area in screen units, so the
 * preview can call `placeButtons` with exactly what the real level uses.
 */
export function previewFit(panel: Rect, screenW: number, screenH: number, pad = 12): { x: number; y: number; k: number; width: number; height: number } {
  const k = Math.min((panel.width - pad * 2) / screenW, (panel.height - pad * 2) / screenH);
  const width = screenW * k;
  const height = screenH * k;
  return { x: panel.x + (panel.width - width) / 2, y: panel.y + (panel.height - height) / 2, k, width, height };
}

export const toArea = (r: Rect): Area => ({ x: r.x, y: r.y, width: r.width, height: r.height });
