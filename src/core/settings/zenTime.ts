// Zen time management (Task 033, D-076): the parent sets how many minutes of zen he may play each day (15, 30, 60 or no limit),
// and the game counts the zen minutes of today. Pure rules; the store keeps the numbers and the scene counts the time.

/** Minutes per day the parent can choose; 0 = no limit. */
export const ZEN_LIMITS = [15, 30, 60, 0] as const;
export type ZenLimit = (typeof ZEN_LIMITS)[number];
export const DEFAULT_ZEN_LIMIT: ZenLimit = 30;

/** Zen minutes played on one day (the device's local date). */
export interface ZenDay {
  /** `YYYY-MM-DD`, local time. */
  date: string;
  ms: number;
}

export function todayKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The limit in force: `?zenlimit=<minutes>` (0 = none; for testing), else the saved value, else 30. Junk falls back. */
export function resolveZenLimit(search: string, saved: { zenLimit?: ZenLimit }): ZenLimit {
  const raw = new URLSearchParams(search).get('zenlimit');
  if (raw !== null) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n === 0 ? 0 : (Math.round(n) as ZenLimit);
  }
  return saved.zenLimit ?? DEFAULT_ZEN_LIMIT;
}

/** Milliseconds played today (a saved day from another date counts as nothing). */
export function spentToday(day: ZenDay | null | undefined, today: string): number {
  return day && day.date === today ? Math.max(0, day.ms) : 0;
}

/** Adds played time to today's total (starting a new day if the date changed). */
export function addZenMs(day: ZenDay | null | undefined, ms: number, today: string): ZenDay {
  return { date: today, ms: spentToday(day, today) + Math.max(0, Math.round(ms)) };
}

/** Time left today in ms, or null when there is no limit. Never below 0. */
export function zenRemainingMs(limitMinutes: number, spentMs: number): number | null {
  if (limitMinutes <= 0) return null;
  return Math.max(0, limitMinutes * 60_000 - spentMs);
}

/** `12 min` style text for the parent page. */
export function minutesText(ms: number): string {
  return `${Math.floor(ms / 60_000)} min`;
}
