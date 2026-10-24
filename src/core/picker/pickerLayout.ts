// Where the picker's cards and Play button go for a given screen (Task 005d). Pure and unit-tested.
// Play sits in the bottom-right corner (inside the device insets); the cards fill the rest in a grid,
// centred on the screen when there is room, otherwise pushed left of the Play button's column.

export interface PickerRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PickerInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PickerLayout {
  /** Card rectangles (top-left corner and size) in reading order. */
  cards: PickerRect[];
  /** Play button centre and radius. */
  play: { x: number; y: number; r: number };
  /** Robot display factor inside a card (the same for every card, so size differences show). */
  robotScale: number;
}

export const PICKER = {
  margin: 28,
  gap: 22,
  playR: 84,
  card: { maxW: 250, maxH: 300, minSide: 120, maxAspect: 0.9 },
  /** Robot height at avatar scale 1 (px) and how much of the card it may fill. */
  robot: { height: 104, width: 70, fillH: 0.5, fillW: 0.62, maxScale: 2 },
} as const;

export function pickerLayout(width: number, height: number, insets: PickerInsets, count: number, cols: number): PickerLayout {
  const P = PICKER;
  const left = insets.left + P.margin;
  const top = insets.top + P.margin;
  const right = width - insets.right - P.margin;
  const bottom = height - insets.bottom - P.margin;
  const play = { x: right - P.playR, y: bottom - P.playR, r: P.playR };
  const cardsRight = play.x - P.playR - P.gap;

  const rows = Math.max(1, Math.ceil(count / cols));
  const availW = cardsRight - left;
  const availH = bottom - top;
  let cardH = Math.min(P.card.maxH, (availH - P.gap * (rows - 1)) / rows);
  let cardW = Math.min(P.card.maxW, (availW - P.gap * (cols - 1)) / cols, cardH * P.card.maxAspect);
  cardW = Math.max(P.card.minSide, Math.floor(cardW));
  cardH = Math.max(P.card.minSide, Math.floor(cardH));

  const gridW = cols * cardW + (cols - 1) * P.gap;
  const gridH = rows * cardH + (rows - 1) * P.gap;
  const gx = Math.max(left, Math.min(width / 2 - gridW / 2, cardsRight - gridW));
  const gy = top + (availH - gridH) / 2;

  const cards: PickerRect[] = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    cards.push({ x: gx + c * (cardW + P.gap), y: gy + r * (cardH + P.gap), width: cardW, height: cardH });
  }
  const robotScale = Math.min(
    P.robot.maxScale,
    (cardH * P.robot.fillH) / P.robot.height,
    (cardW * P.robot.fillW) / P.robot.width,
  );
  return { cards, play, robotScale };
}
