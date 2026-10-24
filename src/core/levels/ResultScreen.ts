// End-of-level screen (D-020, D-025): 1-3 big stars fill one by one, then big icon buttons: Replay
// (circular arrow), Next (play triangle, biggest and pulsing, only if a level follows) and Home (house).
// No text. Keys: Space/Right = Next (Replay if there is no Next), R = Replay, Escape/Enter = Home.
import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import type { Layout } from '../ui/layout';

const DEPTH = 2000;
const STAR_R = 72;
const STAR_GAP = 190;
const BUTTON_R = 80; // as big as the Jump button
const NEXT_R = 100;
const HOME_R_WITH_NEXT = 70;
const STAR_STEP_MS = 450;
/** Buttons ignore input this long after they appear, so leftover mashing does not press them. */
const ARM_MS = 600;

export interface ResultHandlers {
  onReplay: () => void;
  onHome: () => void;
  /** Omitted = no Next button. */
  onNext?: () => void;
}

type Choice = 'replay' | 'next' | 'home';

export class ResultScreen {
  static readonly DEPTH = DEPTH;
  private readonly root: Phaser.GameObjects.Container;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly stars: Phaser.GameObjects.Container[] = [];
  private readonly replay: Phaser.GameObjects.Container;
  private readonly home: Phaser.GameObjects.Container;
  private readonly next: Phaser.GameObjects.Container | null;
  private armed = false;
  private done = false;

  constructor(
    private readonly scene: Phaser.Scene,
    layout: Layout,
    private readonly count: number,
    private readonly handlers: ResultHandlers,
  ) {
    this.dim = scene.add.rectangle(0, 0, 10, 10, 0x0d47a1, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    for (let i = 0; i < 3; i++) {
      const star = this.makeStar();
      star.setPosition((i - 1) * STAR_GAP, i === 1 ? -150 : -120).setScale(0);
      this.root.add(star);
      this.stars.push(star);
    }
    const hasNext = !!handlers.onNext;
    const homeR = hasNext ? HOME_R_WITH_NEXT : BUTTON_R;
    this.replay = this.makeButton(0x43a047, BUTTON_R, (g) => drawReplay(g, BUTTON_R * 0.5), () => this.choose('replay'));
    this.home = this.makeButton(0x1e88e5, homeR, (g) => drawHouse(g, homeR * 0.5), () => this.choose('home'));
    this.next = hasNext ? this.makeButton(0xff8f00, NEXT_R, (g) => drawNext(g, NEXT_R * 0.5), () => this.choose('next')) : null;
    // Around the character, who celebrates in the middle of the screen. With Next: Home, Replay | Next.
    if (this.next) {
      this.home.setPosition(-385, 150).setScale(0);
      this.replay.setPosition(-200, 150).setScale(0);
      this.next.setPosition(245, 140).setScale(0);
      this.root.add([this.replay, this.home, this.next]);
    } else {
      this.replay.setPosition(-230, 150).setScale(0);
      this.home.setPosition(230, 150).setScale(0);
      this.root.add([this.replay, this.home]);
    }
    // Children need scrollFactor 0 too: Phaser hit-tests them with their own scroll factor.
    this.root.setScrollFactor(0, 0, true);

    scene.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKey, this);
    this.layout(layout);
    this.play();
  }

  layout(l: Layout): void {
    this.dim.setSize(l.width, l.height);
    this.root.setPosition(l.centerX, l.height / 2);
  }

  /** Test hook: is the screen accepting input yet? */
  get isArmed(): boolean {
    return this.armed;
  }

  /** Test hook: button centres in screen coordinates. */
  buttons(): Array<{ id: Choice; x: number; y: number; r: number }> {
    const list: Array<[Choice, Phaser.GameObjects.Container | null]> = [
      ['replay', this.replay],
      ['next', this.next],
      ['home', this.home],
    ];
    return list
      .filter((e): e is [Choice, Phaser.GameObjects.Container] => e[1] !== null)
      .map(([id, c]) => ({ id, x: this.root.x + c.x, y: this.root.y + c.y, r: (c.getData('r') as number) ?? BUTTON_R }));
  }

  private get all(): Phaser.GameObjects.Container[] {
    return this.next ? [this.replay, this.next, this.home] : [this.replay, this.home];
  }

  private play(): void {
    const t = this.scene.tweens;
    t.add({ targets: this.dim, fillAlpha: 0.28, duration: 400 });
    // Empty slots pop in together, then the earned stars fill one by one.
    this.stars.forEach((s) => t.add({ targets: s, scale: 1, duration: 300, ease: 'Back.easeOut' }));
    for (let i = 0; i < this.count; i++) {
      const fill = this.stars[i].getAt(1) as Phaser.GameObjects.Graphics;
      this.scene.time.delayedCall(450 + i * STAR_STEP_MS, () => {
        audio.play('coin');
        t.add({ targets: fill, scale: { from: 0, to: 1 }, duration: 320, ease: 'Back.easeOut' });
        t.add({ targets: this.stars[i], angle: { from: -12, to: 0 }, duration: 320, ease: 'Sine.easeOut' });
      });
    }
    const buttonsAt = 450 + this.count * STAR_STEP_MS + 250;
    this.scene.time.delayedCall(buttonsAt, () => {
      for (const b of this.all) t.add({ targets: b, scale: 1, duration: 300, ease: 'Back.easeOut' });
      this.scene.time.delayedCall(ARM_MS, () => {
        this.armed = true;
        // Gentle breathing so the main button invites a tap: Next if there is one, else Replay.
        const main = this.next ?? this.replay;
        t.add({ targets: main, scale: 1.1, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
    });
  }

  private onKey(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowRight') this.choose(this.next ? 'next' : 'replay');
    else if (e.code === 'KeyR') this.choose('replay');
    else if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'NumpadEnter') this.choose('home');
  }

  private choose(which: Choice): void {
    if (!this.armed || this.done) return;
    const target = which === 'replay' ? this.replay : which === 'home' ? this.home : this.next;
    if (!target) return;
    this.done = true;
    audio.play('pick');
    this.scene.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKey, this);
    this.scene.tweens.killTweensOf(target);
    const h = this.handlers;
    this.scene.tweens.add({
      targets: target,
      scale: 0.85,
      duration: 90,
      yoyo: true,
      onComplete: () => (which === 'replay' ? h.onReplay() : which === 'home' ? h.onHome() : h.onNext?.()),
    });
  }

  private makeStar(): Phaser.GameObjects.Container {
    const empty = this.scene.add.graphics();
    empty.fillStyle(0xffffff, 0.35).lineStyle(8, 0xffffff, 1);
    empty.fillPoints(starPoints(STAR_R), true).strokePoints(starPoints(STAR_R), true);
    const full = this.scene.add.graphics();
    full.fillStyle(0xffd600, 1).lineStyle(8, 0xff8f00, 1);
    full.fillPoints(starPoints(STAR_R), true).strokePoints(starPoints(STAR_R), true);
    full.fillStyle(0xffffff, 0.6).fillCircle(-STAR_R * 0.2, -STAR_R * 0.2, STAR_R * 0.12);
    full.setScale(0);
    return this.scene.add.container(0, 0, [empty, full]);
  }

  private makeButton(color: number, r: number, icon: (g: Phaser.GameObjects.Graphics) => void, onTap: () => void) {
    const base = this.scene.add.circle(0, 0, r, color).setStrokeStyle(10, 0xffffff);
    const g = this.scene.add.graphics();
    icon(g);
    // Hit area a little larger than the circle, but not so large that neighbours overlap.
    const c = this.scene.add.container(0, 0, [base, g]).setSize(r * 2.2, r * 2.2).setData('r', r);
    c.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.POINTER_DOWN, onTap);
    return c;
  }
}

function starPoints(r: number): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.48;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(new Phaser.Math.Vector2(rr * Math.cos(a), rr * Math.sin(a) + r * 0.08));
  }
  return pts;
}

/** Circular arrow. */
function drawReplay(g: Phaser.GameObjects.Graphics, s: number): void {
  g.lineStyle(s * 0.32, 0xffffff, 1);
  g.beginPath();
  g.arc(0, 0, s * 0.85, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(220), false);
  g.strokePath();
  const a = Phaser.Math.DegToRad(-60);
  const tip = { x: Math.cos(a) * s * 0.85, y: Math.sin(a) * s * 0.85 };
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(tip.x - s * 0.55, tip.y - s * 0.2, tip.x + s * 0.25, tip.y - s * 0.5, tip.x + s * 0.15, tip.y + s * 0.45);
}

/** Play triangle ("go on"). */
function drawNext(g: Phaser.GameObjects.Graphics, s: number): void {
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(-s * 0.6, -s * 0.95, -s * 0.6, s * 0.95, s * 1.0, 0);
}

/** House. */
function drawHouse(g: Phaser.GameObjects.Graphics, s: number): void {
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(-s * 1.05, -s * 0.05, 0, -s * 1.0, s * 1.05, -s * 0.05);
  g.fillRect(-s * 0.72, -s * 0.1, s * 1.44, s * 0.95);
  g.fillStyle(0x1e88e5, 1).fillRoundedRect(-s * 0.22, s * 0.25, s * 0.44, s * 0.6, { tl: s * 0.2, tr: s * 0.2, bl: 0, br: 0 });
}
