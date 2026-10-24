// The chosen avatar option, remembered between visits in one tiny localStorage key per universe (Task 005d).
// Task 006 migrates it into the progress record. Every access is wrapped: blocked or missing storage
// (private mode, disabled site data) simply means "nothing stored", and the game works without it.

/** The subset of the Storage API used here (injectable for tests). */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

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

/** The stored option id, or null (none stored, storage unavailable, or a read error). */
export function loadChoice(universeId: string, store: KeyValueStore | null = defaultStore()): string | null {
  try {
    const v = store?.getItem(choiceKey(universeId));
    return typeof v === 'string' && v.length > 0 && v.length <= 64 ? v : null;
  } catch {
    return null;
  }
}

/** Stores the option id. Returns false if it could not be stored (never throws). */
export function saveChoice(universeId: string, optionId: string, store: KeyValueStore | null = defaultStore()): boolean {
  try {
    if (!store) return false;
    store.setItem(choiceKey(universeId), optionId);
    return true;
  } catch {
    return false;
  }
}
