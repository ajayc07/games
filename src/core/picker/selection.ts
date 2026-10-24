// Picker selection logic (Task 005d), pure and unit-tested. Cards sit in a grid of `cols` columns.
// `selected` is the chosen card (ring + star); `focus` is the keyboard cursor. A tap selects at once.
// Enter/Space: the first press selects the focused card, a second press (focus = selected) plays.

export type PickerDir = 'left' | 'right' | 'up' | 'down';

export interface PickerState {
  /** Index of the chosen card, or -1 (then Play is disabled). */
  selected: number;
  /** Index of the keyboard cursor. */
  focus: number;
}

/** Starts on the previously chosen option if it is in the list, else the first one. */
export function initialPicker(ids: readonly string[], storedId: string | null): PickerState {
  const i = storedId ? ids.indexOf(storedId) : -1;
  const selected = i >= 0 ? i : ids.length > 0 ? 0 : -1;
  return { selected, focus: Math.max(0, selected) };
}

export function canPlay(s: PickerState, count: number): boolean {
  return s.selected >= 0 && s.selected < count;
}

/**
 * Moves the cursor. Left/Right step through the cards in reading order and wrap round; Up/Down move a row
 * and stay put at the top or bottom edge (or where the next row has no card in that column).
 */
export function moveFocus(s: PickerState, dir: PickerDir, count: number, cols: number): PickerState {
  if (count <= 0) return s;
  let f = s.focus;
  if (dir === 'left') f = (f - 1 + count) % count;
  else if (dir === 'right') f = (f + 1) % count;
  else {
    const next = f + (dir === 'down' ? cols : -cols);
    if (next >= 0 && next < count) f = next;
  }
  return { ...s, focus: f };
}

/** A tap (or click) on a card: selects it and moves the cursor there. */
export function selectCard(s: PickerState, index: number, count: number): PickerState {
  if (index < 0 || index >= count) return s;
  return { selected: index, focus: index };
}

/** Enter/Space: select the focused card, or play if it is already the selected one. */
export function confirm(s: PickerState, count: number): { state: PickerState; play: boolean } {
  if (s.focus === s.selected && canPlay(s, count)) return { state: s, play: true };
  return { state: selectCard(s, s.focus, count), play: false };
}
