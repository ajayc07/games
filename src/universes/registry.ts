import type { UniverseManifest, UniverseModule } from '../core/types';

/**
 * Universe id -> lazy loader. Each entry is a dynamic import, so every universe is its own
 * chunk and is only downloaded when opened. This is the only file outside a universe folder
 * that may reference one.
 */
export const universes: Record<string, () => Promise<UniverseModule>> = {
  mario: () => import('./mario'),
};

export async function loadUniverse(id: string): Promise<UniverseManifest> {
  const loader = universes[id];
  if (!loader) throw new Error(`Unknown universe: ${id}`);
  const mod = await loader();
  return mod.default;
}
