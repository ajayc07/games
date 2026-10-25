// Small round icon that must be held to act (D-036, Task 006; D-047, Task 010). A ring fills while it is held;
// a quick tap only wobbles it, so a 3-year-old cannot leave a level (home icon, 1 s, Escape on desktop) or open the
// parent view (gear on the map, 3 s, P on desktop) by accident. Screen-fixed, anchored to a top corner inside the insets.
import Phaser from 'phaser';
import type { Layout } from './layout';
import type { Anchor } from './layout';
import { HOLD_MS, HoldTracker } from './hold';

const R = 40;
/** Hit area (square side): bigger than the icon, at least 96 px. */
const HIT = 110;
const INSET = 70;

export interface HoldButtonOptions {
  /** Hold time in ms (default HOLD_MS, 1 s). */
  holdMs?: number;
  /** `home` (default) or `gear`. */
  icon?: 'home' | 'gear';
  /** Screen corner (default top-right). */
  corner?: Extract<Anchor, 'top-left' | 'top-right'>;
  /** Distance from the corner (default 70). */
  inset?: number;
  /** Key code that holds it on desktop (default Escape). */
  key?: string;
  /** Face colour. */
  color?: number;
}

export class HoldButton {
  private readonly root: Phaser.GameObjects.Container;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly tracker: HoldTracker;
  private readonly corner: 'top-left' | 'top-right';
  private readonly inset: number;
  private readonly keyCode: string;
  private enabled = true;
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === this.keyCode && !e.repeat && this.enabled) this.tracker.down(this.scene.time.now);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code === this.keyCode) this.release();
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onDone: () => void,
    depth: number,
    opts: HoldButtonOptions = {},
  ) {
    this.tracker = new HoldTracker(opts.holdMs ?? HOLD_MS);
    this.corner = opts.corner ?? 'top-right';
    this.inset = opts.inset ?? INSET;
    this.keyCode = opts.key ?? 'Escape';
    const base = scene.add.circle(0, 0, R, opts.color ?? 0x1e88e5, 0.85).setStrokeStyle(6, 0xffffff);
    const icon = scene.add.graphics();
    const s = R * 0.48;
    icon.fillStyle(0xffffff, 1);
    if (opts.icon === 'gear') drawGear(icon, s, opts.color ?? 0x1e88e5);
    else {
      icon.fillTriangle(-s * 1.05, -s * 0.05, 0, -s * 1.0, s * 1.05, -s * 0.05);
      icon.fillRect(-s * 0.72, -s * 0.1, s * 1.44, s * 0.95);
    }
    this.ring = scene.add.graphics();
    this.root = scene.add.container(0, 0, [base, icon, this.ring]).setDepth(depth).setScrollFactor(0);
    this.root.setSize(HIT, HIT).setInteractive();
    this.root.setScrollFactor(0, 0, true);
    this.root.on(Phaser.Input.Events.POINTER_DOWN, () => this.enabled && this.tracker.down(scene.time.now));
    this.root.on(Phaser.Input.Events.POINTER_UP, () => this.release());
    this.root.on(Phaser.Input.Events.POINTER_OUT, () => this.tracker.cancel());
    scene.input.on(Phaser.Input.Events.POINTER_UP, () => this.tracker.cancel()); // released anywhere else
    scene.input.keyboard?.on('keydown', this.onKeyDown);
    scene.input.keyboard?.on('keyup', this.onKeyUp);
  }

  layout(l: Layout): void {
    const p = l.anchor(this.corner, this.inset, this.inset);
    this.root.setPosition(p.x, p.y);
  }

  /** Hidden during the demo and on the win screen. */
  setEnabled(on: boolean): void {
    this.enabled = on;
    this.root.setVisible(on);
    if (!on) this.tracker.cancel();
  }

  /** True if a logical point is on the button (so the level's input ignores it). */
  contains(x: number, y: number): boolean {
    return this.enabled && Math.abs(x - this.root.x) <= HIT / 2 && Math.abs(y - this.root.y) <= HIT / 2;
  }

  /** Test hook. */
  get state(): { x: number; y: number; visible: boolean; progress: number; holding: boolean } {
    return { x: this.root.x, y: this.root.y, visible: this.root.visible, progress: this.tracker.progress(this.scene.time.now), holding: this.tracker.holding };
  }

  update(now: number): void {
    if (this.tracker.update(now) === 'done') this.finish();
    const p = this.tracker.progress(now);
    this.ring.clear();
    if (p > 0) {
      this.ring.lineStyle(9, 0xffd600, 1);
      this.ring.beginPath();
      this.ring.arc(0, 0, R + 9, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2, false);
      this.ring.strokePath();
    }
  }

  private release(): void {
    const ev = this.tracker.up(this.scene.time.now);
    if (ev === 'done') this.finish();
    else if (ev === 'tap') {
      this.scene.tweens.killTweensOf(this.root);
      this.root.setAngle(0);
      this.scene.tweens.add({ targets: this.root, angle: { from: -10, to: 10 }, duration: 70, yoyo: true, repeat: 1, onComplete: () => this.root.setAngle(0) });
    }
  }

  private finish(): void {
    if (!this.enabled) return;
    this.setEnabled(false);
    this.onDone();
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown', this.onKeyDown);
    this.scene.input.keyboard?.off('keyup', this.onKeyUp);
    this.root.destroy();
  }
}

/** A cog: eight teeth round a disc with a centre hole in the button colour. */
function drawGear(g: Phaser.GameObjects.Graphics, s: number, hole: number): void {
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    g.save();
    g.translateCanvas(0, 0);
    g.rotateCanvas(a);
    g.fillRect(-s * 0.2, -s * 1.15, s * 0.4, s * 0.5);
    g.restore();
  }
  g.fillCircle(0, 0, s * 0.85);
  g.fillStyle(hole, 1).fillCircle(0, 0, s * 0.36);
}
