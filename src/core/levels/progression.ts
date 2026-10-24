// Level order within worlds. Pure and unit-tested. The world map (Task 006) will build on this.
import type { WorldDef } from '../types';

/** The level after `levelId` in the same world, or null if it is the last one (or unknown). */
export function nextLevelId(worlds: readonly WorldDef[], levelId: string): string | null {
  for (const world of worlds) {
    const i = world.levels.indexOf(levelId);
    if (i >= 0) return world.levels[i + 1] ?? null;
  }
  return null;
}
