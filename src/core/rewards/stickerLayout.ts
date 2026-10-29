// Where the sticker book's slots and Back button go (Task 031). Pure and unit-tested. A grid of round slots, centred, right of
// the Back button (bottom-left corner, inside the device insets).
import { STICKER_COUNT } from './stickers';

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface StickerBookLayout {
  slots: Array<{ x: number; y: number; r: number }>;
  back: { x: number; y: number; r: number };
  cols: number;
  rows: number;
}

export const BOOK = { margin: 28, gap: 22, backR: 70, cols: 6 } as const;

export function stickerBookLayout(width: number, height: number, insets: Insets, count = STICKER_COUNT): StickerBookLayout {
  const B = BOOK;
  const left = insets.left + B.margin;
  const top = insets.top + B.margin;
  const right = width - insets.right - B.margin;
  const bottom = height - insets.bottom - B.margin;
  const back = { x: left + B.backR, y: bottom - B.backR, r: B.backR };
  const cols = B.cols;
  const rows = Math.ceil(count / cols);
  const areaLeft = back.x + B.backR + B.gap;
  const availW = right - areaLeft;
  const availH = bottom - top;
  const cell = Math.floor(Math.min((availW - B.gap * (cols - 1)) / cols, (availH - B.gap * (rows - 1)) / rows));
  const gridW = cols * cell + (cols - 1) * B.gap;
  const gridH = rows * cell + (rows - 1) * B.gap;
  const gx = Math.max(areaLeft, Math.min(width / 2 - gridW / 2, right - gridW));
  const gy = top + (availH - gridH) / 2;
  const slots = Array.from({ length: count }, (_, i) => ({
    x: gx + (i % cols) * (cell + B.gap) + cell / 2,
    y: gy + Math.floor(i / cols) * (cell + B.gap) + cell / 2,
    r: cell / 2,
  }));
  return { slots, back, cols, rows };
}
