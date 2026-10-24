// The 005d choice key (`athi.<universe>.choice`), read once so ProgressStore can migrate it into the progress
// record (Task 006, D-039). Read-only: the key is left in place, never written or deleted any more.
// Every access is wrapped: blocked or missing storage simply means "nothing stored".

/** The subset of the Storage API used here (injectable for tests). */
export type KeyValueStore = Pick<Storage, 'getItem'>;

export function choiceKey(universeId: string): string {
  return `athi.${universeId}.choice`;
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // some browsers throw on the localStorage getter itself
  }
}

/** The old stored option id, or null (none stored, storage unavailable, or a read error). */
export function loadLegacyChoice(universeId: string, store: KeyValueStore | null = defaultStore()): string | null {
  try {
    const v = store?.getItem(choiceKey(universeId));
    return typeof v === 'string' && v.length > 0 && v.length <= 64 ? v : null;
  } catch {
    return null;
  }
}
