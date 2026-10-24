// Key-value backends for the progress store (Task 006): IndexedDB, then localStorage, then memory.
// Every call may reject; the store then moves on to the next backend. No dependencies.

export interface KVBackend {
  readonly name: string;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

/** Rejects if `p` takes longer than `ms` (a stuck IndexedDB, e.g. in some private modes, must not hang the game). */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

const DB_NAME = 'athi-games';
const STORE = 'kv';
const IDB_TIMEOUT_MS = 1500;

export class IndexedDbBackend implements KVBackend {
  readonly name = 'indexeddb';
  private db: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    this.db ??= withTimeout(
      new Promise<IDBDatabase>((resolve, reject) => {
        const idb = globalThis.indexedDB;
        if (!idb) throw new Error('no indexedDB');
        const req = idb.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('open failed'));
        req.onblocked = () => reject(new Error('blocked'));
      }),
      IDB_TIMEOUT_MS,
    );
    // A failed open is not cached, so a later call may try again.
    this.db.catch(() => (this.db = null));
    return this.db;
  }

  private async run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();
    return withTimeout(
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error ?? new Error('tx failed'));
        tx.onabort = () => reject(tx.error ?? new Error('tx aborted'));
      }),
      IDB_TIMEOUT_MS,
    );
  }

  async get(key: string): Promise<string | null> {
    const v = await this.run('readonly', (s) => s.get(key));
    return typeof v === 'string' ? v : null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.run('readwrite', (s) => s.put(value, key));
  }
}

export class LocalStorageBackend implements KVBackend {
  readonly name = 'localstorage';
  async get(key: string): Promise<string | null> {
    return globalThis.localStorage.getItem(key); // the getter itself may throw: the store catches it
  }
  async set(key: string, value: string): Promise<void> {
    globalThis.localStorage.setItem(key, value);
  }
}

export class MemoryBackend implements KVBackend {
  readonly name = 'memory';
  readonly data = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }
}

/** The default chain for the browser. */
export function defaultBackends(): KVBackend[] {
  return [new IndexedDbBackend(), new LocalStorageBackend(), new MemoryBackend()];
}
