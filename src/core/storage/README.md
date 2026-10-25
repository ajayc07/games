# core/storage

Per-universe progress record (D-036, Task 006): `progress.ts` (pure: record shape, parse/repair, best-value merge),
`backends.ts` (IndexedDB, localStorage, memory), `store.ts` (`ProgressStore`: fallback chain, unknown-version safety,
005d choice migration, coalesced writes flushed on page hide). `choice.ts` only reads the old 005d choice key.
See docs/architecture/settings-storage-pwa.md, "Storage".
