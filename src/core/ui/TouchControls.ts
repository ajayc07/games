// Big, round, icon-only touch buttons. Visibility follows the InputManager config:
// only enabled actions are shown, and none at all in tap-anywhere mode.
import Phaser from 'phaser';
import type { Action } from '../types';
import { INPUT_EVENTS, type InputConfig, type InputManager } from '../input/InputManager';
import type { Layout } from './layout';
import { readButtonScale } from './buttonScale';

interface ButtonStyle {
  color: number;
  pressed: number;
  icon: number;
  /** Diameter as a fraction of the screen short edge. */
  size: number;
}

const STYLES: Record<Action, ButtonStyle> = {
  left: { color: 0xff8f00, pressed: 0xffc046, icon: 0xffffff, size: 0.18 },
  right: { color: 0xff8f00, pressed: 0xffc046, icon: 0xffffff, size: 0.18 },
  jump: { color: 0xe53935, pressed: 0xff6f60, icon: 0xffffff, size: 0.22 },
  power: { color: 0x8e24aa, pressed: 0xc158dc, icon: 0xffeb3b, size: 0.18 },
};

/** Jump diameter when it is the only button on screen (Grass 2): big and unmissable. */
const SOLO_JUMP_SIZE = 0.28;
const HIT_SLOP = 1.1; // hit area is 10% larger than the drawn circle
const PRESSED_SCALE = 0.9;
const DEPTH = 1000;

interface Button {
  action: Action;
  /** Positioned and scaled down while pressed. */
  container: Phaser.GameObjects.Container;
  /** Inside the container; pulses scale this so they never fight the press scale. */
  face: Phaser.GameObjects.Container;
  /** Expanding ring for pulses. */
  ring: Phaser.GameObjects.Arc;
  base: Phaser.GameObjects.Arc;
  radius: number;
  visible: boolean;
  pressed: boolean;
  /** Shows pressed until this time (ms, scene clock) without real input: the demo's presses. */
  fakeUntil: number;
  pulsing: boolean;
}

export class TouchControls {
  private readonly buttons = new Map<Action, Button>();
  private readonly scale: number;
  private solo = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly input: InputManager,
    private readonly layout: Layout,
    options: { buttonScale?: number } = {},
  ) {
    this.scale = options.buttonScale ?? readButtonScale();
    for (const action of ['left', 'right', 'jump', 'power'] as const) this.buttons.set(action, this.create(action));

    input.setHitTest((x, y) => this.hitTest(x, y));
    input.on(INPUT_EVENTS.CONFIGURE, this.applyConfig, this);
    this.applyConfig(input.config);
    layout.bindToScene(scene, () => this.position());
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.render, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  /** Button under a point (game coordinates), using enlarged hit circles; nearest centre wins. */
  hitTest(x: number, y: number): Action | null {
    // Left and Right share one band with no dead zone: a sliding thumb switches at the midpoint.
    const l = this.buttons.get('left')!;
    const r = this.buttons.get('right')!;
    if (l.visible && r.visible) {
      const reach = Math.max(l.radius, r.radius) * HIT_SLOP;
      const inBand =
        Math.abs(y - l.container.y) <= reach &&
        x >= l.container.x - l.radius * HIT_SLOP &&
        x <= r.container.x + r.radius * HIT_SLOP;
      if (inBand) return x < (l.container.x + r.container.x) / 2 ? 'left' : 'right';
    }
    let best: Action | null = null;
    let bestDist = Infinity;
    for (const b of this.buttons.values()) {
      if (!b.visible) continue;
      const d = Math.hypot(x - b.container.x, y - b.container.y);
      if (d <= b.radius * HIT_SLOP && d < bestDist) {
        best = b.action;
        bestDist = d;
      }
    }
    return best;
  }

  /** The visible button whose centre is closest to a point (game coordinates), or null if none is shown. */
  nearest(x: number, y: number): Action | null {
    let best: Action | null = null;
    let bestDist = Infinity;
    for (const b of this.buttons.values()) {
      if (!b.visible) continue;
      const d = Math.hypot(x - b.container.x, y - b.container.y);
      if (d < bestDist) {
        best = b.action;
        bestDist = d;
      }
    }
    return best;
  }

  /** Shows a press (button down, lighter colour) without input, e.g. the demo pressing it. */
  animatePress(action: Action, ms = 220): void {
    const b = this.buttons.get(action);
    if (b) b.fakeUntil = this.scene.time.now + ms;
  }

  /**
   * One friendly pulse: the face swells a little and a ring spreads out. `nudge` (a tap that missed)
   * is a bit stronger than `invite` (the idle "press me"). Ignored while a pulse is still running.
   */
  pulse(action: Action, kind: 'invite' | 'nudge' = 'nudge'): void {
    const b = this.buttons.get(action);
    if (!b || !b.visible || b.pulsing) return;
    b.pulsing = true;
    const t = this.scene.tweens;
    const grow = kind === 'nudge' ? 1.16 : 1.09;
    t.add({ targets: b.face, scale: grow, duration: 150, yoyo: true, ease: 'Sine.easeOut', onComplete: () => (b.pulsing = false) });
    b.ring.setRadius(b.radius).setScale(1).setAlpha(kind === 'nudge' ? 0.9 : 0.6).setVisible(true);
    t.add({ targets: b.ring, scale: 1.45, alpha: 0, duration: 520, ease: 'Sine.easeOut', onComplete: () => b.ring.setVisible(false) });
  }

  /** Current on-screen geometry, for tests and debugging. */
  geometry(): Array<{ action: Action; x: number; y: number; radius: number; visible: boolean }> {
    return [...this.buttons.values()].map((b) => ({
      action: b.action,
      x: b.container.x,
      y: b.container.y,
      radius: b.radius,
      visible: b.visible,
    }));
  }

  destroy(): void {
    this.input.setHitTest(null);
    this.input.off(INPUT_EVENTS.CONFIGURE, this.applyConfig, this);
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.render, this);
    for (const b of this.buttons.values()) b.container.destroy();
    this.buttons.clear();
  }

  private applyConfig(config: InputConfig): void {
    for (const b of this.buttons.values()) {
      b.visible = !config.tapAnywhereJumps && config.enabled.includes(b.action);
      b.container.setVisible(b.visible);
    }
    const shown = [...this.buttons.values()].filter((b) => b.visible).map((b) => b.action);
    const solo = shown.length === 1 && shown[0] === 'jump';
    if (solo !== this.solo) {
      this.solo = solo;
      this.position();
    }
    this.input.refreshPointers();
  }

  private position(): void {
    const short = this.layout.height; // landscape: height is the short edge
    const size = (a: Action) => (a === 'jump' && this.solo ? SOLO_JUMP_SIZE : STYLES[a].size);
    const r = (a: Action) => (size(a) * short * this.scale) / 2;
    for (const b of this.buttons.values()) {
      b.radius = r(b.action);
      b.base.setRadius(b.radius);
      b.container.setSize(b.radius * 2, b.radius * 2);
      this.drawIcon(b);
    }
    const margin = 28;
    const gap = r('left') * 0.9; // generous gap so Left and Right are not confused

    const left = this.layout.anchor('bottom-left', margin + r('left'), margin + r('left'));
    this.at('left', left.x, left.y);
    this.at('right', left.x + r('left') + gap + r('right'), left.y);

    const jump = this.layout.anchor('bottom-right', margin + r('jump'), margin + r('jump'));
    this.at('jump', jump.x, jump.y);
    // Power sits above Jump, nudged left so a thumb on Jump does not cover it.
    this.at('power', jump.x - r('jump') * 0.35, jump.y - r('jump') - gap - r('power'));
    this.input.refreshPointers();
  }

  private at(action: Action, x: number, y: number): void {
    this.buttons.get(action)!.container.setPosition(x, y);
  }

  private render(): void {
    const now = this.scene.time.now;
    for (const b of this.buttons.values()) {
      const pressed = b.visible && (this.input.isDown(b.action) || now < b.fakeUntil);
      if (pressed === b.pressed) continue;
      b.pressed = pressed;
      const style = STYLES[b.action];
      b.base.setFillStyle(pressed ? style.pressed : style.color);
      b.container.setScale(pressed ? PRESSED_SCALE : 1);
    }
  }

  private create(action: Action): Button {
    const style = STYLES[action];
    const base = this.scene.add.circle(0, 0, 60, style.color).setStrokeStyle(8, 0xffffff);
    const icon = this.scene.add.graphics();
    const ring = this.scene.add.circle(0, 0, 60).setStrokeStyle(10, 0xffffff, 1).setVisible(false);
    const face = this.scene.add.container(0, 0, [base, icon]);
    const container = this.scene.add.container(0, 0, [ring, face]).setDepth(DEPTH);
    // Children need scrollFactor 0 too (ARCHITECTURE "Screen layout").
    container.setScrollFactor(0, 0, true);
    container.setData('icon', icon);
    return { action, container, face, ring, base, radius: 60, visible: true, pressed: false, fakeUntil: 0, pulsing: false };
  }

  private drawIcon(b: Button): void {
    const g = b.container.getData('icon') as Phaser.GameObjects.Graphics;
    const s = b.radius * 0.5; // icon half-size
    g.clear();
    g.fillStyle(STYLES[b.action].icon, 1);
    const pts = (list: Array<[number, number]>) => list.map(([x, y]) => new Phaser.Math.Vector2(x * s, y * s));
    switch (b.action) {
      case 'left':
        g.fillPoints(pts([[-1, 0], [0.1, -0.9], [0.1, -0.35], [0.9, -0.35], [0.9, 0.35], [0.1, 0.35], [0.1, 0.9]]), true);
        break;
      case 'right':
        g.fillPoints(pts([[1, 0], [-0.1, -0.9], [-0.1, -0.35], [-0.9, -0.35], [-0.9, 0.35], [-0.1, 0.35], [-0.1, 0.9]]), true);
        break;
      case 'jump':
        g.fillPoints(pts([[0, -1], [0.9, 0.1], [0.35, 0.1], [0.35, 0.9], [-0.35, 0.9], [-0.35, 0.1], [-0.9, 0.1]]), true);
        break;
      case 'power': {
        const star: Array<[number, number]> = [];
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 === 0 ? 1.05 : 0.45;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          star.push([rr * Math.cos(a), rr * Math.sin(a) + 0.08]);
        }
        g.fillPoints(pts(star), true);
        break;
      }
    }
  }
}
