// Combo Practice selector (Task 011, D-049): four big icon-only cards, one per focus, each showing the buttons it
// practises (arrow + star, up arrow + star, arrow + up arrow, all four), and a big Back button. A tap pops the card
// with the `pick` sound and starts a run. Keys: arrows move a yellow cursor, Enter/Space start, Escape goes back.
// Generic: the universe says what a pick and Back do.
import Phaser from 'phaser';
import { getLayout, type Layout } from '../ui/layout';
import { audio } from '../audio/AudioManager';
import type { PracticeMode } from '../levels/practice';
import { addModePictogram } from './icons';
import { CARD_ORDER, moveCardFocus, practiceSelectLayout, type PracticeSelectLayout } from './practiceLayout';

export interface PracticeSceneData {
  onPick: (mode: PracticeMode) => void;
  onBack: () => void;
  /** The focus the cursor starts on (the last one played), default the first. */
  focus?: PracticeMode;
}

const RADIUS = 30;
/** Soft card colours, one per focus (the pictogram carries the meaning). */
const CARD_COLORS: Record<PracticeMode, number> = {
  'walk-shoot': 0xffe0b2,
  'jump-shoot': 0xe1bee7,
  'walk-jump': 0xffcdd2,
  everything: 0xc8e6c9,
};
const KEY_DIRS: Record<string, 'left' | 'right' | 'up' | 'down'> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyW: 'up',
  KeyS: 'down',
};

interface Card {
  mode: PracticeMode;
  root: Phaser.GameObjects.Container;
  panel: Phaser.GameObjects.Graphics;
  art: Phaser.GameObjects.Container;
}

export class PracticeScene extends Phaser.Scene {
  static readonly KEY = 'practice';

  private data0!: PracticeSceneData;
  private layout!: Layout;
  private geo!: PracticeSelectLayout;
  private cards: Card[] = [];
  private sky!: Phaser.GameObjects.Graphics;
  private cursor!: Phaser.GameObjects.Graphics;
  private back!: Phaser.GameObjects.Container;
  private focus = 0;
  private keyboardUsed = false;
  private done = false;
  private picked: PracticeMode | 'back' | null = null;
  private seenKeys = new WeakSet<KeyboardEvent>();

  constructor() {
    super(PracticeScene.KEY);
  }

  init(data: PracticeSceneData): void {
    this.data0 = data;
    this.cards = [];
    this.done = false;
    this.picked = null;
    this.keyboardUsed = false;
    this.seenKeys = new WeakSet();
    this.focus = Math.max(0, CARD_ORDER.indexOf(data.focus ?? CARD_ORDER[0]));
  }

  create(): void {
    this.layout = getLayout();
    this.sky = this.add.graphics().setDepth(-10);
    this.cursor = this.add.graphics().setDepth(6).setVisible(false);
    this.tweens.add({ targets: this.cursor, alpha: { from: 1, to: 0.35 }, duration: 600, yoyo: true, repeat: -1 });
    for (const mode of CARD_ORDER) this.cards.push(this.makeCard(mode));
    this.back = this.makeBack();
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKey, this);
    this.layout.bindToScene(this, (l) => this.relayout(l));
    this.installDebugHook();
  }

  private makeCard(mode: PracticeMode): Card {
    const panel = this.add.graphics();
    const art = this.add.container(0, 0);
    const root = this.add.container(0, 0, [panel, art]);
    root.setSize(10, 10).setInteractive({ useHandCursor: true });
    root.on(Phaser.Input.Events.POINTER_DOWN, () => this.pick(mode));
    // Each card breathes gently, out of step with the others.
    const i = CARD_ORDER.indexOf(mode);
    this.tweens.add({ targets: art, y: -6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 220 });
    return { mode, root, panel, art };
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
    this.geo = practiceSelectLayout(l.width, l.height, l.insets);
    this.drawSky(l);
    this.cards.forEach((c, i) => {
      const r = this.geo.cards[i];
      const hw = r.width / 2;
      const hh = r.height / 2;
      c.root.setPosition(r.x + hw, r.y + hh);
      c.panel.clear();
      c.panel.fillStyle(0x000000, 0.12).fillRoundedRect(-hw + 4, -hh + 8, r.width, r.height, RADIUS);
      c.panel.fillStyle(CARD_COLORS[c.mode], 1).fillRoundedRect(-hw, -hh, r.width, r.height, RADIUS);
      c.panel.fillStyle(0xffffff, 0.35).fillRoundedRect(-hw + 10, -hh + 10, r.width - 20, r.height * 0.4, RADIUS - 8);
      c.panel.lineStyle(6, 0xffffff, 0.95).strokeRoundedRect(-hw, -hh, r.width, r.height, RADIUS);
      c.art.removeAll(true);
      addModePictogram(this, c.art, c.mode, Math.min(r.width * 0.86, r.height * 1.5));
      c.root.setSize(r.width, r.height);
      (c.root.input?.hitArea as Phaser.Geom.Rectangle | undefined)?.setTo(0, 0, r.width, r.height);
    });
    this.back.setPosition(this.geo.back.x, this.geo.back.y);
    this.drawCursor();
  }

  private drawSky(l: Layout): void {
    const g = this.sky.clear();
    g.fillGradientStyle(0x4fb3ff, 0x4fb3ff, 0xb8e6ff, 0xb8e6ff, 1).fillRect(0, 0, l.width, l.height);
    g.fillStyle(0x7cd34a, 1).fillRect(0, l.height - 60, l.width, 60);
    g.fillStyle(0x4e9a2a, 1).fillRect(0, l.height - 60, l.width, 8);
  }

  private drawCursor(): void {
    const r = this.geo?.cards[this.focus];
    this.cursor.clear().setVisible(this.keyboardUsed && !!r);
    if (r) this.cursor.lineStyle(10, 0xfff176, 1).strokeRoundedRect(r.x - 9, r.y - 9, r.width + 18, r.height + 18, RADIUS + 9);
  }

  private pick(mode: PracticeMode): void {
    if (this.done) return;
    this.done = true;
    this.picked = mode;
    audio.play('pick');
    const card = this.cards.find((c) => c.mode === mode)!;
    this.tweens.add({
      targets: card.root,
      scale: 1.1,
      duration: 130,
      yoyo: true,
      ease: 'Back.easeOut',
      // Leave after this frame: stopping the scene mid-update would break the rest of the frame.
      onComplete: () => this.time.delayedCall(120, () => this.game.events.once(Phaser.Core.Events.POST_STEP, () => this.data0.onPick(mode))),
    });
  }

  private goBack(): void {
    if (this.done) return;
    this.done = true;
    this.picked = 'back';
    audio.play('pick');
    this.tweens.add({
      targets: this.back,
      scale: 0.85,
      duration: 90,
      yoyo: true,
      onComplete: () => this.game.events.once(Phaser.Core.Events.POST_STEP, () => this.data0.onBack()),
    });
  }

  private onKey(e: KeyboardEvent): void {
    if (this.done || this.seenKeys.has(e)) return;
    this.seenKeys.add(e);
    const dir = KEY_DIRS[e.code];
    if (dir) {
      this.keyboardUsed = true;
      this.focus = moveCardFocus(this.focus, dir);
      audio.play('tap');
      this.drawCursor();
      return;
    }
    if (e.repeat) return;
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') this.pick(CARD_ORDER[this.focus]);
    else if (e.code === 'Escape' || e.code === 'Backspace') this.goBack();
  }

  private installDebugHook(): void {
    if (!new URLSearchParams(location.search).has('debug')) return;
    (window as unknown as { __practice: unknown }).__practice = {
      scene: this,
      layout: this.layout,
      state: () => ({
        cards: this.geo.cards,
        back: this.geo.back,
        focus: CARD_ORDER[this.focus],
        picked: this.picked,
        fps: this.game.loop.actualFps,
      }),
    };
  }
}
