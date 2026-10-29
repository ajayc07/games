// The sticker book (Task 031, D-074): a screen of round slots; the stickers he has earned are in colour, the rest are empty
// dotted discs. Tap a sticker: it wiggles and chimes. Back (bottom-left, or Escape) returns to the map. No text anywhere.
import Phaser from 'phaser';
import { getLayout, type Layout } from '../ui/layout';
import { audio } from '../audio/AudioManager';
import { drawEmptySlot, drawSticker } from './stickerArt';
import { STICKERS } from './stickers';
import { stickerBookLayout, type StickerBookLayout } from './stickerLayout';

export interface StickerSceneData {
  /** Ids of the stickers he has. */
  owned: string[];
  onBack: () => void;
}

export class StickerScene extends Phaser.Scene {
  static readonly KEY = 'stickers';

  private data0!: StickerSceneData;
  private layout!: Layout;
  private geo!: StickerBookLayout;
  private sky!: Phaser.GameObjects.Graphics;
  private slots: Phaser.GameObjects.Container[] = [];
  private back!: Phaser.GameObjects.Container;
  private done = false;

  constructor() {
    super(StickerScene.KEY);
  }

  init(data: StickerSceneData): void {
    this.data0 = data;
    this.slots = [];
    this.done = false;
  }

  create(): void {
    this.layout = getLayout();
    this.sky = this.add.graphics().setDepth(-10);
    const owned = new Set(this.data0.owned);
    STICKERS.forEach((def, i) => {
      const g = this.add.graphics();
      const root = this.add.container(0, 0, [g]);
      root.setData('has', owned.has(def.id));
      root.setData('id', def.id);
      root.setSize(10, 10).setInteractive({ useHandCursor: true });
      root.on(Phaser.Input.Events.POINTER_DOWN, () => this.tapSlot(i));
      // The earned ones bob gently, each out of step.
      if (owned.has(def.id)) this.tweens.add({ targets: g, y: -5, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 130 });
      this.slots.push(root);
    });
    this.back = this.makeBack();
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKey, this);
    this.layout.bindToScene(this, (l) => this.relayout(l));
    this.installDebugHook();
  }

  private makeBack(): Phaser.GameObjects.Container {
    const r = 70;
    const base = this.add.circle(0, 0, r, 0x1e88e5).setStrokeStyle(10, 0xffffff);
    const g = this.add.graphics();
    const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
    g.fillStyle(0xffffff, 1).fillPoints([v(-36, 0), v(-4, -30), v(-4, -12), v(34, -12), v(34, 12), v(-4, 12), v(-4, 30)], true);
    const c = this.add.container(0, 0, [base, g]).setSize(r * 2.2, r * 2.2);
    c.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.POINTER_DOWN, () => this.goBack());
    return c;
  }

  private relayout(l: Layout): void {
    this.geo = stickerBookLayout(l.width, l.height, l.insets);
    const g = this.sky.clear();
    g.fillGradientStyle(0xffd180, 0xffd180, 0xfff3e0, 0xfff3e0, 1).fillRect(0, 0, l.width, l.height);
    g.fillStyle(0x7cd34a, 1).fillRect(0, l.height - 60, l.width, 60);
    this.slots.forEach((root, i) => {
      const s = this.geo.slots[i];
      root.setPosition(s.x, s.y);
      const gr = root.list[0] as Phaser.GameObjects.Graphics;
      gr.clear();
      if (root.getData('has')) drawSticker(gr, STICKERS[i], s.r);
      else drawEmptySlot(gr, s.r);
      root.setSize(s.r * 2, s.r * 2);
      (root.input?.hitArea as Phaser.Geom.Rectangle | undefined)?.setTo(0, 0, s.r * 2, s.r * 2);
    });
    this.back.setPosition(this.geo.back.x, this.geo.back.y);
  }

  private tapSlot(i: number): void {
    const root = this.slots[i];
    this.tweens.killTweensOf(root);
    if (root.getData('has')) {
      audio.play('stickerGet');
      this.tweens.add({ targets: root, scale: 1.25, angle: { from: -10, to: 10 }, duration: 120, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: () => root.setScale(1).setAngle(0) });
    } else {
      audio.play('tap');
      this.tweens.add({ targets: root, scale: 0.9, duration: 90, yoyo: true });
    }
  }

  private goBack(): void {
    if (this.done) return;
    this.done = true;
    audio.play('pick');
    this.tweens.add({
      targets: this.back,
      scale: 0.85,
      duration: 90,
      yoyo: true,
      onComplete: () => this.game.events.once(Phaser.Core.Events.POST_STEP, () => this.data0.onBack()),
    });
  }

  private seen = new WeakSet<KeyboardEvent>();
  private onKey(e: KeyboardEvent): void {
    if (this.done || this.seen.has(e)) return;
    this.seen.add(e);
    if (e.code === 'Escape' || e.code === 'Backspace' || e.code === 'Enter') this.goBack();
  }

  private installDebugHook(): void {
    if (!new URLSearchParams(location.search).has('debug')) return;
    (window as unknown as { __stickers: unknown }).__stickers = {
      scene: this,
      state: () => ({ owned: this.data0.owned, slots: this.geo.slots, back: this.geo.back }),
    };
  }
}
