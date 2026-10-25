// What a practice run shows and saves (Task 011, D-049). Pure and unit-tested.
import type { LevelData } from '../levels/format';

/** Most combo stars the win screen shows (two rows of five). */
export const PRACTICE_RESULT_MAX = 10;

/** The win screen's combo stars: 5 slots (10 for a busy run), one filled per combo of the run, no numbers. */
export function practiceStars(combos: number): { slots: number; filled: number } {
  const n = Math.max(0, Math.floor(combos));
  return { slots: n > 5 ? PRACTICE_RESULT_MAX : 5, filled: Math.min(n, PRACTICE_RESULT_MAX) };
}

/**
 * The level's result callback, or nothing for a practice level: practice never records stars, coins or unlocks
 * (Task 011), whatever the universe passed in.
 */
export function resultHandlerFor<T>(level: Pick<LevelData, 'practice'>, onResult: T | undefined): T | undefined {
  return level.practice ? undefined : onResult;
}

/** The walk assist applies only on practice levels (Task 011); Grass 1-6 always walk as before, whatever the setting. */
export function walkAssistOn(level: Pick<LevelData, 'practice'>, assist: boolean | 'off' | 'sticky'): boolean {
  return level.practice === true && (assist === true || assist === 'sticky');
}
