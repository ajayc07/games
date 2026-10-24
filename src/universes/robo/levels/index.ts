// Every *.json file in this folder is a level: adding a level is a data file only (plus its id in a
// world's list in manifest.ts). Files are validated at load; a broken file throws a readable error.
import { parseLevelOrThrow, type LevelData } from '../../../core/levels/format';

const files = import.meta.glob<unknown>('./*.json', { eager: true, import: 'default' });

export const levels: ReadonlyMap<string, LevelData> = new Map(
  Object.entries(files).map(([path, raw]) => {
    const level = parseLevelOrThrow(raw, path);
    return [level.id, level] as const;
  }),
);
