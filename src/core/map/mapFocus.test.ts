import { describe, expect, it } from 'vitest';
import { moveMapFocus, type MapFocus, type MapFocusContext } from './mapFocus';

const ctx = (patch: Partial<MapFocusContext> = {}): MapFocusContext => ({ mouthAtDot: -1, archAtDot: false, bottomCount: 3, palette: true, ...patch });
const dot: MapFocus = { kind: 'dot' };

describe('map focus (Task 043)', () => {
  it('on a dot, Left and Right hop along the path as before', () => {
    expect(moveMapFocus(dot, 'left', ctx())).toEqual({ focus: dot, step: -1 });
    expect(moveMapFocus(dot, 'right', ctx())).toEqual({ focus: dot, step: 1 });
  });

  it('Up goes to the cave mouth above the fork dot, else to the palette; Down goes to the Practice button (rightmost of the bottom row)', () => {
    expect(moveMapFocus(dot, 'up', ctx({ mouthAtDot: 0 })).focus).toEqual({ kind: 'mouth', i: 0 });
    expect(moveMapFocus(dot, 'up', ctx()).focus).toEqual({ kind: 'palette' });
    expect(moveMapFocus(dot, 'down', ctx()).focus).toEqual({ kind: 'bottom', i: 2 });
    expect(moveMapFocus(dot, 'down', ctx({ bottomCount: 0 })).focus).toEqual(dot);
  });

  it('the bottom row moves left and right without wrapping and Up returns to the dot', () => {
    expect(moveMapFocus({ kind: 'bottom', i: 2 }, 'left', ctx()).focus).toEqual({ kind: 'bottom', i: 1 });
    expect(moveMapFocus({ kind: 'bottom', i: 0 }, 'left', ctx()).focus).toEqual({ kind: 'bottom', i: 0 });
    expect(moveMapFocus({ kind: 'bottom', i: 2 }, 'right', ctx()).focus).toEqual({ kind: 'bottom', i: 2 });
    expect(moveMapFocus({ kind: 'bottom', i: 1 }, 'up', ctx()).focus).toEqual(dot);
    expect(moveMapFocus({ kind: 'bottom', i: 1 }, 'down', ctx()).focus).toEqual({ kind: 'bottom', i: 1 });
  });

  it('on a branch map, Left from the first dot reaches the meadow arch, and any other way returns to the dot', () => {
    expect(moveMapFocus(dot, 'left', ctx({ archAtDot: true })).focus).toEqual({ kind: 'arch' });
    expect(moveMapFocus({ kind: 'arch' }, 'right', ctx()).focus).toEqual(dot);
    expect(moveMapFocus({ kind: 'arch' }, 'down', ctx()).focus).toEqual(dot);
    expect(moveMapFocus({ kind: 'arch' }, 'left', ctx()).focus).toEqual({ kind: 'arch' });
  });

  it('the mouth and the palette give the focus back to the dot; Up on the mouth reaches the palette', () => {
    expect(moveMapFocus({ kind: 'mouth', i: 0 }, 'down', ctx()).focus).toEqual(dot);
    expect(moveMapFocus({ kind: 'mouth', i: 0 }, 'left', ctx()).focus).toEqual(dot);
    expect(moveMapFocus({ kind: 'mouth', i: 0 }, 'up', ctx()).focus).toEqual({ kind: 'palette' });
    expect(moveMapFocus({ kind: 'palette' }, 'down', ctx()).focus).toEqual(dot);
    expect(moveMapFocus({ kind: 'palette' }, 'up', ctx()).focus).toEqual({ kind: 'palette' });
  });

  it('every focus can get back to the dot in at most two moves (nothing is a trap)', () => {
    const all: MapFocus[] = [dot, { kind: 'mouth', i: 0 }, { kind: 'arch' }, { kind: 'palette' }, { kind: 'bottom', i: 0 }, { kind: 'bottom', i: 2 }];
    for (const f of all) {
      let cur = f;
      let steps = 0;
      while (cur.kind !== 'dot' && steps < 3) {
        const next = (['down', 'right', 'up'] as const).map((d) => moveMapFocus(cur, d, ctx({ mouthAtDot: 0, archAtDot: true })).focus).find((x) => x.kind === 'dot' || x !== cur);
        cur = (['down', 'right', 'up'] as const).map((d) => moveMapFocus(cur, d, ctx({ mouthAtDot: 0, archAtDot: true })).focus).find((x) => x.kind === 'dot') ?? next ?? cur;
        steps++;
      }
      expect(cur.kind, JSON.stringify(f)).toBe('dot');
    }
  });
});
