/** Touch button size multiplier. For now from the URL (`?buttonScale=1.3`); Task 008 adds a parent setting. */
export function readButtonScale(search: string = window.location.search): number {
  const raw = new URLSearchParams(search).get('buttonScale');
  const value = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.min(1.6, Math.max(0.6, value));
}
