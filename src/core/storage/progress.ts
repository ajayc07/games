// The per-universe progress record (D-036, Task 006). Pure: parsing, defaults and the best-value merge.
// No browser APIs here; ProgressStore (store.ts) does the saving.

export const PROGRESS_VERSION = 1;

export interface LevelProgress {
  /** Best star count, 0..3 (1 = finished, D-020). */
  stars: number;
  /** Most coins collected in one run. */
  bestCoins: number;
}

/** The parent view's saved settings (Task 010, D-047). Every field is optional; a missing one means "default". */
export interface ProgressSettings {
  soundOn?: boolean;
  buttonScale?: number;
  /** Which right-hand button is the larger corner one in a level with both Jump and Power. */
  buttonsPrimary?: 'jump' | 'power';
  unlockAll?: boolean;
  /** Walk assist in Practice (Task 011): `sticky` = a quick tap on Left/Right keeps walking. Missing = off. */
  walkAssist?: 'off' | 'sticky';
}

export interface ProgressRecord {
  version: typeof PROGRESS_VERSION;
  /** The chosen avatar option (a colour id, D-038/D-039), or null before the first pick. */
  chosenCharacterId: string | null;
  /** The last look (`robot`/`ball`), or null for the default. */
  look: string | null;
  levels: Record<string, LevelProgress>;
  settings: ProgressSettings;
}

export type ParseStatus = 'ok' | 'empty' | 'corrupt' | 'unknown-version';

export function freshRecord(): ProgressRecord {
  return { version: PROGRESS_VERSION, chosenCharacterId: null, look: null, levels: {}, settings: {} };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown, min: number, max: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : min;
const shortString = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 && v.length <= 64 ? v : null);

/**
 * Reads a stored record (JSON text or null). Bad fields are repaired with defaults. A record with a
 * different version is not understood: status `unknown-version` (the caller must not overwrite it).
 */
export function parseRecord(raw: string | null | undefined): { record: ProgressRecord; status: ParseStatus } {
  if (raw === null || raw === undefined || raw === '') return { record: freshRecord(), status: 'empty' };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { record: freshRecord(), status: 'corrupt' };
  }
  if (!isObj(data)) return { record: freshRecord(), status: 'corrupt' };
  if (data.version !== PROGRESS_VERSION) return { record: freshRecord(), status: 'unknown-version' };
  const record = freshRecord();
  record.chosenCharacterId = shortString(data.chosenCharacterId);
  record.look = shortString(data.look);
  if (isObj(data.levels)) {
    for (const [id, v] of Object.entries(data.levels)) {
      if (!isObj(v) || id.length > 64) continue;
      record.levels[id] = { stars: int(v.stars, 0, 3), bestCoins: int(v.bestCoins, 0, 100000) };
    }
  }
  if (isObj(data.settings)) {
    const s = data.settings;
    if (typeof s.soundOn === 'boolean') record.settings.soundOn = s.soundOn;
    if (typeof s.buttonScale === 'number' && Number.isFinite(s.buttonScale)) record.settings.buttonScale = s.buttonScale;
    if (s.buttonsPrimary === 'jump' || s.buttonsPrimary === 'power') record.settings.buttonsPrimary = s.buttonsPrimary;
    if (typeof s.unlockAll === 'boolean') record.settings.unlockAll = s.unlockAll;
    if (s.walkAssist === 'off' || s.walkAssist === 'sticky') record.settings.walkAssist = s.walkAssist;
  }
  return { record, status: 'ok' };
}

export function serializeRecord(r: ProgressRecord): string {
  return JSON.stringify(r);
}

/** A level result merged into the record: best stars and best coins are kept, never lowered. Returns a new record. */
export function mergeResult(r: ProgressRecord, levelId: string, result: { stars: number; coins: number }): ProgressRecord {
  const prev = r.levels[levelId] ?? { stars: 0, bestCoins: 0 };
  const next: LevelProgress = {
    stars: Math.max(prev.stars, int(result.stars, 0, 3)),
    bestCoins: Math.max(prev.bestCoins, int(result.coins, 0, 100000)),
  };
  return { ...r, levels: { ...r.levels, [levelId]: next } };
}

/** Stars of a level (0 when never played). */
export function starsOf(r: ProgressRecord, levelId: string): number {
  return r.levels[levelId]?.stars ?? 0;
}

/** Reset progress (Task 010): stars, best coins and the unlock record go; colour, look and settings stay. Returns a new record. */
export function resetLevels(r: ProgressRecord): ProgressRecord {
  return { ...r, levels: {} };
}
