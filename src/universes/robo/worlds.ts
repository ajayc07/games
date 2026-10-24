// The worlds and their levels in play order. Plain data (no Phaser), so tests can read it.
import type { WorldDef } from '../../core/types';

export const worlds: WorldDef[] = [
  { id: 'grass', name: 'Grass', levels: ['grass-1', 'grass-2', 'grass-3', 'grass-4', 'grass-5', 'grass-6'] },
  { id: 'cave', name: 'Cave', levels: [] },
  { id: 'sky', name: 'Sky', levels: [] },
  { id: 'castle', name: 'Castle', levels: [] },
];
