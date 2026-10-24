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

export interface GridEntities {
  cols: number;
  rows: number;
  /** solid[row][col] */
  solid: boolean[][];
  coins: Cell[];
  start: Cell;
  flag: Cell;
}

/** Splits a validated grid into what the scene needs. Assumes parseLevel() accepted it. */
export function extractEntities(grid: readonly string[]): GridEntities {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const solid: boolean[][] = [];
  const coins: Cell[] = [];
  let start: Cell = { col: 0, row: 0 };
  let flag: Cell = { col: 0, row: 0 };
  for (let row = 0; row < rows; row++) {
    const line: boolean[] = [];
    for (let col = 0; col < cols; col++) {
      const ch = grid[row][col];
      line.push(ch === '#');
      if (ch === 'c') coins.push({ col, row });
      else if (ch === 'S') start = { col, row };
      else if (ch === 'F') flag = { col, row };
    }
    solid.push(line);
  }
  return { cols, rows, solid, coins, start, flag };
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
 * the last column the player stood on that has ground to stand on. Prefers a column whose neighbours are
 * also ground at the same height, so the player does not land on the lip of a gap.
 * Returns the cell the player stands in (the empty cell just above the ground), or null if none.
 */
export function findRespawn(
  solid: readonly (readonly boolean[])[],
  lastGroundedCol: number,
  back = 3,
): Cell | null {
  const cols = solid[0]?.length ?? 0;
  const from = Math.min(cols - 1, Math.floor(lastGroundedCol) - back);
  let fallback: Cell | null = null;
  for (let col = from; col >= 0; col--) {
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
