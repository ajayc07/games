// Unlocking and the map's current dot (D-036, D-037, Task 006). Pure and unit-tested.
import type { WorldDef } from '../types';
import type { LevelProgress } from '../storage/progress';

export interface DotState {
  id: string;
  index: number;
  stars: number;
  /** At least one star recorded. */
  cleared: boolean;
  open: boolean;
}

export interface UnlockOptions {
  /** Levels open at a time beyond the cleared ones (manifest `unlock.openAtATime`, default 3). */
  openAtATime: number;
  /** `?unlock=all` (later the parent view): everything open. */
  unlockAll?: boolean;
}

/**
 * Level i (in world order) is open if i < clearedCount + openAtATime. With `finalLevelStarsRequired`, the
 * world's last level also needs that many stars in the world. Cleared = at least 1 star.
 */
export function worldDots(world: WorldDef, levels: Record<string, LevelProgress>, opts: UnlockOptions): DotState[] {
  const stars = world.levels.map((id) => Math.max(0, Math.min(3, levels[id]?.stars ?? 0)));
  const cleared = stars.filter((s) => s >= 1).length;
  const total = stars.reduce((a, b) => a + b, 0);
  const open = Math.max(0, Math.floor(opts.openAtATime));
  const last = world.levels.length - 1;
  return world.levels.map((id, i) => {
    let isOpen = !!opts.unlockAll || i < cleared + open;
    if (!opts.unlockAll && i === last && world.finalLevelStarsRequired !== undefined && total < world.finalLevelStarsRequired) {
      isOpen = false;
    }
    return { id, index: i, stars: stars[i], cleared: stars[i] >= 1, open: isOpen };
  });
}

/**
 * Where the avatar stands on the map: the first open level not yet cleared (the next one to play), else the
 * furthest cleared one, else the first dot.
 */
export function currentDot(dots: readonly DotState[]): number {
  const next = dots.findIndex((d) => d.open && !d.cleared);
  if (next >= 0) return next;
  for (let i = dots.length - 1; i >= 0; i--) if (dots[i].cleared) return i;
  return 0;
}

/** Dots that just opened between two states (for the cloud-clearing animation). */
export function newlyOpened(before: readonly DotState[], after: readonly DotState[]): number[] {
  return after.filter((d, i) => d.open && !before[i]?.open).map((d) => d.index);
}

/** The next or previous open dot from `from` (keyboard Left/Right on the map); stays put at the ends. */
export function stepOpen(dots: readonly DotState[], from: number, dir: 1 | -1): number {
  for (let i = from + dir; i >= 0 && i < dots.length; i += dir) if (dots[i].open) return i;
  return from;
}

/** `?unlock=all` (or the saved parent switch), and with `?debug=1` an `?open=N` override of openAtATime (to show the unlock animation). */
export function unlockFromSearch(search: string, openAtATime: number, savedUnlockAll = false): UnlockOptions {
  const p = new URLSearchParams(search);
  // The parent view's "unlock all" switch (Task 010) counts like `?unlock=all`.
  const unlockAll = p.get('unlock') === 'all' || savedUnlockAll;
  const forced = p.has('debug') ? Number(p.get('open')) : NaN;
  return { openAtATime: Number.isFinite(forced) && forced >= 1 ? Math.floor(forced) : openAtATime, unlockAll };
}
