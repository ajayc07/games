// Grid -> entities, collision rectangles, respawn spots and stars. Pure and unit-tested.
// Coordinates here are grid cells: col 0 is the left edge, row 0 is the top row.

export interface Cell {
  col: number;
  row: number;
}

/** A solid rectangle in cells. `top` is true when nothing solid sits directly above it (draw grass). */
export interface SolidRect extends Cell {
  width: number;
  height: number;
}

/** A bubble in the grid (Task 007). Small: one cell. Big: a 2x2 block whose top-left cell is (col, row). */
export interface BubbleCell extends Cell {
  kind: 'small' | 'big';
}

export interface GridEntities {
  cols: number;
  rows: number;
  /** solid[row][col] */
  solid: boolean[][];
  coins: Cell[];
  /** In grid order (top to bottom, left to right by first cell). */
  bubbles: BubbleCell[];
  start: Cell;
  flag: Cell;
}

/** Splits a validated grid into what the scene needs. Assumes parseLevel() accepted it. */
export function extractEntities(grid: readonly string[]): GridEntities {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const solid: boolean[][] = [];
  const coins: Cell[] = [];
  const bubbles: BubbleCell[] = [];
  const bigTaken = new Set<string>();
  let start: Cell = { col: 0, row: 0 };
  let flag: Cell = { col: 0, row: 0 };
  for (let row = 0; row < rows; row++) {
    const line: boolean[] = [];
    for (let col = 0; col < cols; col++) {
      const ch = grid[row][col];
      line.push(ch === '#');
      if (ch === 'c') coins.push({ col, row });
      else if (ch === 'o') bubbles.push({ kind: 'small', col, row });
      else if (ch === 'O' && !bigTaken.has(`${row}:${col}`)) {
        // parseLevel checked that every O is part of a whole 2x2 block.
        bubbles.push({ kind: 'big', col, row });
        for (const k of [`${row}:${col + 1}`, `${row + 1}:${col}`, `${row + 1}:${col + 1}`]) bigTaken.add(k);
      }
      else if (ch === 'S') start = { col, row };
      else if (ch === 'F') flag = { col, row };
    }
    solid.push(line);
  }
  return { cols, rows, solid, coins, bubbles, start, flag };
}

/**
 * Covers the solid cells with few rectangles: horizontal runs per row, then runs with the same
 * columns on consecutive rows are stacked. Fewer bodies, and no seams for the player to snag on.
 */
export function mergeSolids(solid: readonly (readonly boolean[])[]): SolidRect[] {
  const done: SolidRect[] = [];
  let open = new Map<string, SolidRect>(); // runs from the previous row, keyed "col:width"
  for (let row = 0; row < solid.length; row++) {
    const next = new Map<string, SolidRect>();
    const line = solid[row];
    let col = 0;
    while (col < line.length) {
      if (!line[col]) {
        col++;
        continue;
      }
      const from = col;
      while (col < line.length && line[col]) col++;
      const key = `${from}:${col - from}`;
      const above = open.get(key);
      if (above) {
        above.height++;
        open.delete(key);
        next.set(key, above);
      } else {
        next.set(key, { col: from, row, width: col - from, height: 1 });
      }
    }
    for (const r of open.values()) done.push(r);
    open = next;
  }
  for (const r of open.values()) done.push(r);
  return done.sort((a, b) => a.row - b.row || a.col - b.col);
}

/** Top solid row in a column that has open space above it (somewhere to stand), or null for a gap. */
export function surfaceRow(solid: readonly (readonly boolean[])[], col: number): number | null {
  for (let row = 0; row < solid.length; row++) {
    if (solid[row][col] && (row === 0 || !solid[row - 1][col])) return row;
  }
  return null;
}

/**
 * Where to put the player back after a fall (D-019): the nearest column at least `back` cells behind
 * the last column the player stood on that has ground to stand on. "Behind" is against the direction of travel
 * `dir` (1 = heading right, the default; -1 = heading left, so a fall while walking back over a gap puts the
 * player on the side he came from, not across the gap). Prefers a column whose neighbours are
 * also ground at the same height, so the player does not land on the lip of a gap. Heading left, if nothing is
 * found on the right (the end of the level), the left side is searched.
 * Returns the cell the player stands in (the empty cell just above the ground), or null if none.
 */
export function findRespawn(
  solid: readonly (readonly boolean[])[],
  lastGroundedCol: number,
  back = 3,
  dir: 1 | -1 = 1,
): Cell | null {
  if (dir === 1) return searchRespawn(solid, lastGroundedCol, back, -1);
  return searchRespawn(solid, lastGroundedCol, back, 1) ?? searchRespawn(solid, lastGroundedCol, back, -1);
}

/** One direction of findRespawn: `step` -1 searches to the left of the start column, 1 to the right. */
function searchRespawn(solid: readonly (readonly boolean[])[], lastGroundedCol: number, back: number, step: 1 | -1): Cell | null {
  const cols = solid[0]?.length ?? 0;
  const from = Math.floor(lastGroundedCol) + step * back;
  let fallback: Cell | null = null;
  for (let col = step === -1 ? Math.min(cols - 1, from) : from; col >= 0 && col < cols; col += step) {
    const row = surfaceRow(solid, col);
    if (row === null || row === 0) continue;
    const spot = { col, row: row - 1 };
    const steady = [col - 1, col + 1].every((c) => c >= 0 && c < cols && surfaceRow(solid, c) === row);
    if (steady) return spot;
    fallback ??= spot;
  }
  return fallback;
}

/** Stars for a result (D-020): finishing gives 1, coin thresholds add the 2nd and 3rd. */
export function starsFor(finished: boolean, coins: number, thresholds: { two: number; three: number }): 0 | 1 | 2 | 3 {
  if (!finished) return 0;
  if (coins >= thresholds.three) return 3;
  if (coins >= thresholds.two) return 2;
  return 1;
}
