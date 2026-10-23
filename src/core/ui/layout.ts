// Height-locked, width-flexible scaling (D-013).
// Logical height is always 720; logical width follows the screen aspect ratio, clamped to 960..1680.
// Gameplay-critical content stays inside the central 960x720 safe rect; extra width is scenery.
import Phaser from 'phaser';
import { LOGICAL_HEIGHT, SAFE_WIDTH, logicalWidthFor } from './layoutMath';

export { LOGICAL_HEIGHT, MAX_WIDTH, MIN_WIDTH, SAFE_WIDTH, logicalWidthFor } from './layoutMath';

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Anchor =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right';

const ANCHOR_PARTS: Record<Anchor, readonly ['top' | 'center' | 'bottom', 'left' | 'center' | 'right']> = {
  'top-left': ['top', 'left'],
  top: ['top', 'center'],
  'top-right': ['top', 'right'],
  left: ['center', 'left'],
  center: ['center', 'center'],
  right: ['center', 'right'],
  'bottom-left': ['bottom', 'left'],
  bottom: ['bottom', 'center'],
  'bottom-right': ['bottom', 'right'],
};

type Listener = (layout: Layout) => void;

export class Layout {
  width = 1280;
  readonly height = LOGICAL_HEIGHT;
  /** Device safe-area insets (notch, home bar), in logical units. */
  insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  private readonly listeners = new Set<Listener>();
  private readonly probe: HTMLDivElement;
  private readonly observer: ResizeObserver;
  private pending = 0;

  constructor(
    private readonly game: Phaser.Game,
    private readonly parent: HTMLElement,
  ) {
    // A hidden element whose padding is the CSS safe-area insets, so we can read them in px.
    this.probe = document.createElement('div');
    this.probe.style.cssText =
      'position:fixed;inset:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
    document.body.appendChild(this.probe);

    const schedule = () => {
      cancelAnimationFrame(this.pending);
      this.pending = requestAnimationFrame(() => this.apply());
    };
    this.observer = new ResizeObserver(schedule);
    this.observer.observe(this.parent);
    window.addEventListener('orientationchange', schedule);
    this.apply();
  }

  /** Central 960x720 area where gameplay-critical content must fit. */
  get safeRect(): Rect {
    return { x: (this.width - SAFE_WIDTH) / 2, y: 0, width: SAFE_WIDTH, height: this.height };
  }

  /** Screen area minus device insets: where UI may be anchored. */
  get uiRect(): Rect {
    const i = this.insets;
    return { x: i.left, y: i.top, width: this.width - i.left - i.right, height: this.height - i.top - i.bottom };
  }

  get centerX(): number {
    return this.width / 2;
  }

  /** Point at an anchor of the UI rect, moved inwards by (dx, dy). Positive values always point inwards. */
  anchor(anchor: Anchor, dx = 0, dy = 0): { x: number; y: number } {
    const r = this.uiRect;
    const [v, h] = ANCHOR_PARTS[anchor];
    let x = r.x + r.width / 2 + dx;
    if (h === 'left') x = r.x + dx;
    if (h === 'right') x = r.x + r.width - dx;
    let y = r.y + r.height / 2 + dy;
    if (v === 'top') y = r.y + dy;
    if (v === 'bottom') y = r.y + r.height - dy;
    return { x, y };
  }

  /** Subscribe to layout changes (resize, rotation). Called once immediately. Returns an unsubscribe function. */
  onResize(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this);
    return () => this.listeners.delete(listener);
  }

  /** Convenience: subscribe for the lifetime of a scene. */
  bindToScene(scene: Phaser.Scene, listener: Listener): void {
    const off = this.onResize(listener);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
    scene.events.once(Phaser.Scenes.Events.DESTROY, off);
  }

  private apply(): void {
    const cssW = this.parent.clientWidth || window.innerWidth;
    const cssH = this.parent.clientHeight || window.innerHeight;
    const width = logicalWidthFor(cssW, cssH);
    const toLogical = LOGICAL_HEIGHT / Math.max(1, Math.min(cssH, (cssW * LOGICAL_HEIGHT) / width));
    const cs = getComputedStyle(this.probe);
    const px = (v: string) => (parseFloat(v) || 0) * toLogical;
    this.insets = {
      top: px(cs.paddingTop),
      right: px(cs.paddingRight),
      bottom: px(cs.paddingBottom),
      left: px(cs.paddingLeft),
    };
    if (width !== this.width || this.game.scale.width !== width) {
      this.width = width;
      this.game.scale.setGameSize(width, LOGICAL_HEIGHT);
    } else {
      this.game.scale.refresh();
    }
    for (const l of this.listeners) l(this);
  }
}

let current: Layout | null = null;

export function initLayout(game: Phaser.Game, parent: HTMLElement): Layout {
  current ??= new Layout(game, parent);
  return current;
}

/** The app-wide layout. initLayout() must have run (main.ts does it at boot). */
export function getLayout(): Layout {
  if (!current) throw new Error('Layout not initialised');
  return current;
}
