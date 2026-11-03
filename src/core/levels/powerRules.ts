// "One form at a time" (Task 034, D-078): which forms and power-ups may run together. Pure and tested; LevelScene asks these
// functions every time an orb is touched or Mega Robo starts, so the rules live in one place.
//
// - Mega Robo combines with nothing: orbs cannot be taken while he is big, and a full coin bar ends every other power at once.
// - The car and Flash exclude each other (both are about moving fast): the later pickup replaces the earlier one.
// - Everything else combines (magnet, boots, and either of car / Flash), at most two timed powers at once: a third one
//   replaces the one with the least time left.
import type { PickupKind } from './powerups';

/** A timed power (the pickups), or Mega Robo. */
export type Form = PickupKind | 'mega';

/** At most this many timed powers run at once. */
export const MAX_TIMED = 2;

/** Pairs of pickups that cannot run together. */
const EXCLUSIVE: ReadonlyArray<readonly [PickupKind, PickupKind]> = [['car', 'flash']];

export interface ActivePower {
  kind: PickupKind;
  /** Time left (ms): the one with the least is dropped first when there is no room. */
  left: number;
}

/** Do these two forms exclude each other? (A form never excludes itself: a second pickup just restarts it.) */
export function excludes(a: Form, b: Form): boolean {
  if (a === b) return false;
  if (a === 'mega' || b === 'mega') return true;
  return EXCLUSIVE.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** May two forms run at the same time? The whole matrix, for the tests and the docs. */
export const combines = (a: Form, b: Form): boolean => a === b || !excludes(a, b);

/** Can he take an orb right now? Not while he is Mega Robo (the orb waits, dimmed). */
export const orbTakeable = (megaOn: boolean): boolean => !megaOn;

/**
 * He touches an orb of `kind` while the powers in `active` run: which of them end at once? The ones that exclude it, then, if
 * the new power would be a third, the one with the least time left. A power of the same kind is not dropped (it restarts).
 */
export function dropsForPickup(active: readonly ActivePower[], kind: PickupKind): PickupKind[] {
  const drops: PickupKind[] = active.filter((a) => excludes(a.kind, kind)).map((a) => a.kind);
  const stay = active.filter((a) => !drops.includes(a.kind));
  if (stay.some((a) => a.kind === kind)) return drops;
  if (stay.length >= MAX_TIMED) {
    const least = [...stay].sort((a, b) => a.left - b.left)[0];
    drops.push(least.kind);
  }
  return drops;
}

/** The coin bar fills while powers run: every one of them ends at once (Mega Robo is the reward and wins). */
export const dropsForMega = (active: readonly ActivePower[]): PickupKind[] => active.map((a) => a.kind);

/** `?power=flash` (test hook): start with this power already on. Only the pickup kinds are accepted. */
export function powerFromSearch(search: string): PickupKind | null {
  const raw = new URLSearchParams(search).get('power');
  return raw === 'car' || raw === 'magnet' || raw === 'boots' || raw === 'flash' ? raw : null;
}
