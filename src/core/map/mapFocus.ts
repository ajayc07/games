// Keyboard / gamepad focus on the world map (Task 043), pure and unit-tested. The robot is the cursor along the dots (Left / Right hop to
// the neighbouring open dot, as before); Up and Down reach everything else: the cave mouth above the fork dot, the meadow arch at the
// left end of a branch map, the palette button (top right) and the bottom row of round buttons (stickers, Zen, Practice, left to right).
// Space then does what a tap on that thing does.

export type MapFocus =
  | { kind: 'dot' }
  | { kind: 'mouth'; i: number }
  | { kind: 'arch' }
  | { kind: 'palette' }
  | { kind: 'bottom'; i: number };

export type MapDir = 'left' | 'right' | 'up' | 'down';

export interface MapFocusContext {
  /** The branch mouth above the dot the robot stands on (an index into the branches), or -1. */
  mouthAtDot: number;
  /** A meadow arch exists (a branch map) and the robot stands on the first dot. */
  archAtDot: boolean;
  /** How many buttons are in the bottom row (stickers, Zen, Practice: 0 to 3). */
  bottomCount: number;
  /** The palette button exists (it always does today). */
  palette: boolean;
}

export interface MapFocusMove {
  focus: MapFocus;
  /** On a dot, Left / Right hop to the next open dot (the scene does it); 0 = no hop. */
  step: -1 | 0 | 1;
}

const DOT: MapFocus = { kind: 'dot' };

export function moveMapFocus(f: MapFocus, dir: MapDir, ctx: MapFocusContext): MapFocusMove {
  const stay = (focus: MapFocus = f): MapFocusMove => ({ focus, step: 0 });
  switch (f.kind) {
    case 'dot':
      if (dir === 'left') return ctx.archAtDot ? stay({ kind: 'arch' }) : { focus: DOT, step: -1 };
      if (dir === 'right') return { focus: DOT, step: 1 };
      if (dir === 'up') return ctx.mouthAtDot >= 0 ? stay({ kind: 'mouth', i: ctx.mouthAtDot }) : ctx.palette ? stay({ kind: 'palette' }) : stay();
      return ctx.bottomCount > 0 ? stay({ kind: 'bottom', i: ctx.bottomCount - 1 }) : stay();
    case 'bottom':
      if (dir === 'left') return stay({ kind: 'bottom', i: Math.max(0, f.i - 1) });
      if (dir === 'right') return stay({ kind: 'bottom', i: Math.min(ctx.bottomCount - 1, f.i + 1) });
      if (dir === 'up') return stay(DOT);
      return stay();
    case 'mouth':
      if (dir === 'up') return ctx.palette ? stay({ kind: 'palette' }) : stay();
      return stay(DOT);
    case 'arch':
      return dir === 'left' || dir === 'up' ? stay() : stay(DOT);
    case 'palette':
      return dir === 'down' || dir === 'left' ? stay(DOT) : stay();
  }
}
