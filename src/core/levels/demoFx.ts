// Visual cues for the "watch me" demo (D-024, D-030): a finger that presses the on-screen buttons in sync
// with the ghost (gliding between Left, Right and Jump, staying down for held presses), a ripple at the
// character for tap-anywhere levels, and the "your turn" cue.
// Icons only, no text.
import type Phaser from 'phaser';
import type { Action } from '../types';
import type { TouchControls } from '../ui/TouchControls';

const DEPTH = { finger: 1100, world: 40 };

/** A cartoon finger pointing up, tip at (0, 0). */
export function drawFinger(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0xffcc80, 1).lineStyle(4, 0x8d6e63, 1);
  g.fillRoundedRect(-11, 0, 22, 54, 11).strokeRoundedRect(-11, 0, 22, 54, 11);
  g.fillRoundedRect(-24, 30, 48, 44, 16).strokeRoundedRect(-24, 30, 48, 44, 16);
  return g;
}

export class DemoCues {
  private finger: Phaser.GameObjects.Container | null = null;
  /** Finger tip offset from the button centre (in button radii) while hovering, and while touching. */
  private readonly hover = { x: -0.42, y: 0.3 };
  private readonly touch = { x: -0.05, y: 0.05 };
  private tapping = false;
  private tapT = 0;
  /** Finger tip position (screen, logical), eased toward the aimed button. */
  private pos: { x: number; y: number } | null = null;
  private lastUpdate = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly controls: TouchControls,
    private action: Action = 'jump',
  ) {}

  /** Moves the finger to another button (it glides there). */
  aim(action: Action): void {
    this.action = action;
  }

  private button(): { x: number; y: number; radius: number } | null {
    const b = this.controls.geometry().find((g) => g.action === this.action);
    return b && b.visible ? b : null;
  }

  /** Shows the finger hovering by the button (if the button is on screen). */
  showFinger(): void {
    if (this.finger || !this.button()) return;
    // Comes in from the lower left, leaning right, so the hand stays on screen at the corner.
    const g = drawFinger(this.scene).setAngle(28);
    this.finger = this.scene.add.container(0, 0, [g]).setDepth(DEPTH.finger).setAlpha(0);
    this.finger.setScrollFactor(0, 0, true);
    this.scene.tweens.add({ targets: this.finger, alpha: 1, duration: 250 });
    this.update();
  }

  /** The finger presses `action`'s button: a quick dip, held down `holdMs`, then back. Call when the ghost presses. */
  tap(action: Action = this.action, holdMs = 80): void {
    this.action = action;
    if (!this.finger) return;
    this.scene.tweens.killTweensOf(this);
    this.tapping = true;
    this.tapT = 0;
    this.scene.tweens.add({
      targets: this,
      tapT: 1,
      duration: 130,
      yoyo: true,
      hold: Math.max(80, holdMs - 130),
      ease: 'Sine.easeOut',
      onComplete: () => (this.tapping = false),
    });
  }

  /** Expanding ring at a world point (tap-anywhere levels: "tap, and he jumps"). */
  rippleAt(x: number, y: number): void {
    const ring = this.scene.add.circle(x, y, 30).setStrokeStyle(8, 0xffffff, 1).setDepth(DEPTH.world);
    this.scene.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: 520, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
  }

  /** Keeps the finger on the button (it may move on resize). Call every frame. */
  update(): void {
    const b = this.button();
    if (!this.finger) return;
    if (!b) {
      this.finger.setVisible(false);
      return;
    }
    const t = this.tapping ? this.tapT : 0;
    const r = b.radius;
    const target = { x: b.x + this.hover.x * r, y: b.y + this.hover.y * r };
    // Glide between buttons (about 150 ms); the dip itself is applied directly so presses stay crisp.
    const now = this.scene.time.now;
    const dt = this.lastUpdate < 0 ? 1 : Math.min(0.05, (now - this.lastUpdate) / 1000);
    this.lastUpdate = now;
    if (!this.pos) this.pos = { ...target };
    const k = Math.min(1, dt * 18);
    this.pos.x += (target.x - this.pos.x) * k;
    this.pos.y += (target.y - this.pos.y) * k;
    this.finger.setVisible(true).setScale(Math.max(0.8, r / 80));
    this.finger.setPosition(
      this.pos.x + (this.touch.x - this.hover.x) * t * r,
      this.pos.y + (this.touch.y - this.hover.y) * t * r,
    );
  }

  hideFinger(): void {
    const f = this.finger;
    if (!f) return;
    this.finger = null;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: f, alpha: 0, duration: 250, onComplete: () => f.destroy() });
  }

  /**
   * "Your turn": a bouncing arrow above the character and a ripple at its feet (world coordinates),
   * and the button gives a pulse. Calls `done` after about a second.
   */
  yourTurn(x: number, feetY: number, headY: number, done: () => void): void {
    const s = this.scene;
    const arrow = s.add.graphics().setDepth(DEPTH.world);
    arrow.fillStyle(0xffeb3b, 1).lineStyle(6, 0xf57f17, 1);
    const pts = [
      { x: 0, y: 34 },
      { x: 32, y: 0 },
      { x: 12, y: 0 },
      { x: 12, y: -30 },
      { x: -12, y: -30 },
      { x: -12, y: 0 },
      { x: -32, y: 0 },
    ];
    arrow.fillPoints(pts as Phaser.Types.Math.Vector2Like[], true).strokePoints(pts as Phaser.Types.Math.Vector2Like[], true);
    arrow.setPosition(x, headY - 60).setScale(0);
    s.tweens.add({ targets: arrow, scale: 1, duration: 220, ease: 'Back.easeOut' });
    s.tweens.add({ targets: arrow, y: headY - 40, duration: 260, yoyo: true, repeat: 2, delay: 220, ease: 'Sine.easeInOut' });
    this.rippleAt(x, feetY - 6);
    s.time.delayedCall(300, () => this.rippleAt(x, feetY - 6));
    this.controls.pulse(this.action, 'nudge');
    s.time.delayedCall(1100, () => {
      s.tweens.add({ targets: arrow, alpha: 0, scale: 0.6, duration: 180, onComplete: () => arrow.destroy() });
      done();
    });
  }
}
