// ProgressStore (Task 006, D-036): one universe's progress record behind a chain of backends
// (IndexedDB -> localStorage -> memory). A backend that is missing or throws is skipped silently; the game
// never waits on or crashes because of storage. Writes are coalesced and flushed on page hide.
import { defaultBackends, MemoryBackend, type KVBackend } from './backends';
import { mergeResult, parseRecord, serializeRecord, type LevelProgress, type ParseStatus, type ProgressRecord } from './progress';

export function progressKey(universeId: string): string {
  return `athi.${universeId}.progress`;
}

/** Wait this long after a change before writing, so a burst of changes is one write (ms). */
export const SAVE_DEBOUNCE_MS = 250;

export interface OpenOptions {
  backends?: KVBackend[];
  /** The 005d choice key's value (`athi.<universe>.choice`), copied in when the record has no choice. */
  legacyChoice?: string | null;
}

export class ProgressStore {
  private active: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private writing: Promise<void> = Promise.resolve();
  private dirty = false;

  private constructor(
    readonly key: string,
    private readonly backends: KVBackend[],
    active: number,
    private current: ProgressRecord,
    /** How the stored record was read ('unknown-version' = kept in memory only, never written back). */
    readonly status: ParseStatus,
    /** True when a migration or repair changed the record at load. */
    readonly migrated: boolean,
  ) {
    this.active = active;
  }

  /**
   * Loads the record. Reads backends in order: the first one that works becomes the write target; if it has
   * no record, later backends are checked too (e.g. a visit when IndexedDB was blocked saved to localStorage).
   */
  static async open(universeId: string, opts: OpenOptions = {}): Promise<ProgressStore> {
    const backends = [...(opts.backends ?? defaultBackends())];
    if (!backends.some((b) => b instanceof MemoryBackend)) backends.push(new MemoryBackend());
    const key = progressKey(universeId);
    let active = -1;
    let raw: string | null = null;
    for (let i = 0; i < backends.length; i++) {
      try {
        const v = await backends[i].get(key);
        if (active < 0) active = i;
        if (v !== null) {
          raw = v;
          break;
        }
      } catch {
        // unavailable: try the next one
      }
    }
    if (active < 0) active = backends.length - 1;
    const { record, status } = parseRecord(raw);
    let backendList = backends;
    if (status === 'unknown-version') {
      // A newer (or unknown) format: play with a fresh record in memory and leave the stored one alone.
      backendList = [new MemoryBackend()];
      active = 0;
    }
    let migrated = false;
    if (!record.chosenCharacterId && opts.legacyChoice) {
      record.chosenCharacterId = opts.legacyChoice;
      migrated = true;
    }
    const store = new ProgressStore(key, backendList, active, record, status, migrated);
    if (migrated) store.scheduleSave();
    return store;
  }

  get record(): ProgressRecord {
    return this.current;
  }

  /** Name of the backend writes go to (tests and `?debug=1`). */
  get backendName(): string {
    return this.backends[this.active]?.name ?? 'none';
  }

  level(levelId: string): LevelProgress {
    return this.current.levels[levelId] ?? { stars: 0, bestCoins: 0 };
  }

  /** Keeps the best stars and coins (never lowers them) and saves. Returns the record before and after. */
  recordResult(levelId: string, result: { stars: number; coins: number }): { before: ProgressRecord; after: ProgressRecord } {
    const before = this.current;
    this.current = mergeResult(before, levelId, result);
    this.scheduleSave();
    return { before, after: this.current };
  }

  setChosenCharacter(id: string): void {
    if (this.current.chosenCharacterId === id) return;
    this.current = { ...this.current, chosenCharacterId: id };
    this.scheduleSave();
  }

  setLook(look: string): void {
    if (this.current.look === look) return;
    this.current = { ...this.current, look };
    this.scheduleSave();
  }

  /** Coalesces writes: one write SAVE_DEBOUNCE_MS after the last change. */
  scheduleSave(): void {
    this.dirty = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
  }

  /** Writes now if anything changed. A failing backend is dropped for the next one (memory last). Never rejects. */
  flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.dirty) return this.writing;
    this.dirty = false;
    const text = serializeRecord(this.current);
    this.writing = this.writing.then(async () => {
      while (this.active < this.backends.length) {
        try {
          await this.backends[this.active].set(this.key, text);
          return;
        } catch {
          this.active++;
        }
      }
      this.active = this.backends.length - 1; // nothing worked; stay on the last (memory) one
    });
    return this.writing;
  }

  /** Flushes when the page is hidden or closed (tablet home button, tab switch). */
  flushOnHide(target: Window = window): void {
    const flush = () => void this.flush();
    target.addEventListener('pagehide', flush);
    target.document?.addEventListener('visibilitychange', () => {
      if (target.document.visibilityState === 'hidden') flush();
    });
  }
}
