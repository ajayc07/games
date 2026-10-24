// Avatar picker (Task 005d, D-038): the universe's options as big colour cards, each with its robot standing
// front-on (idle breathing, antennae sway). No text. Tap a card: it pops, the robot waves and hops once, the
// option's pick chime plays, a ring and a star badge mark it and the other cards dim a little. The green Play
// button (bottom-right) starts the game. Keys: arrows move the cursor, Enter/Space selects, again plays.
// Generic: the universe passes the options and what Play does, so core never imports a universe.
import Phaser from 'phaser';
import type { AvatarOptionDef } from '../types';
import { getLayout, type Layout } from '../ui/layout';
import { audio } from '../audio/AudioManager';
import { playChime } from '../audio/chimePlayer';
import { AvatarDriver } from '../avatar/AvatarDriver';
import { createLook } from '../avatar/createLook';
import { resolveAvatar } from '../avatar/config';
import { makeEffectTextures } from '../levels/placeholders';
import { pickerLayout, type PickerLayout, type PickerRect } from './pickerLayout';
import { canPlay, confirm, initialPicker, moveFocus, selectCard, type PickerDir, type PickerState } from './selection';

export interface PickerSceneData {
  options: AvatarOptionDef[];
  /** The previously chosen option id (selected at the start), or null for the first card. */
  selectedId: string | null;
  /** Play pressed with this option. */
  onPlay: (optionId: string) => void;
}

const COLS = 4;
const RADIUS = 28;
const DIM_ALPHA = 0.24;
/** How long the robot's wave lasts after a pick (ms). */
const WAVE_MS = 1100;
const KEY_DIRS: Record<string, PickerDir> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyW: 'up',
  KeyS: 'down',
};
const CONFIRM_KEYS = new Set(['Enter', 'NumpadEnter', 'Space']);

interface Card {
  option: AvatarOptionDef;
  root: Phaser.GameObjects.Container;
  panel: Phaser.GameObjects.Graphics;
  holder: Phaser.GameObjects.Container;
  driver: AvatarDriver;
  dim: Phaser.GameObjects.Graphics;
  rect: PickerRect;
  restAt: number;
}

export class PickerScene extends Phaser.Scene {
  static readonly KEY = 'picker';

  private data0!: PickerSceneData;
  private layout!: Layout;
  private cards: Card[] = [];
  private state: PickerState = { selected: -1, focus: 0 };
  private sky!: Phaser.GameObjects.Graphics;
  private ring!: Phaser.GameObjects.Graphics;
  private focusRing!: Phaser.GameObjects.Graphics;
  private badge!: Phaser.GameObjects.Container;
  private play!: Phaser.GameObjects.Container;
  private playPulse: Phaser.Tweens.Tween | null = null;
  private geo!: PickerLayout;
  private keyboardUsed = false;
  private done = false;
  /**
   * Key events already handled. Phaser re-sends queued events when several keys arrive within one frame
   * (its duplicate check only remembers the last event), so one press could move the cursor twice.
   */
  private seenKeys = new WeakSet<KeyboardEvent>();

  constructor() {
    super(PickerScene.KEY);
  }

  init(data: PickerSceneData): void {
    this.data0 = data;
    this.cards = [];
    this.done = false;
    this.keyboardUsed = false;
    this.seenKeys = new WeakSet();
    this.playPulse = null;
    this.state = initialPicker(
      data.options.map((o) => o.id),
      data.selectedId,
    );
  }

  create(): void {
    this.layout = getLayout();
    makeEffectTextures(this);
    this.sky = this.add.graphics().setDepth(-10);
    this.ring = this.add.graphics().setDepth(5);
    this.focusRing = this.add.graphics().setDepth(6).setVisible(false);
    this.tweens.add({ targets: this.focusRing, alpha: { from: 1, to: 0.35 }, duration: 600, yoyo: true, repeat: -1 });
    this.data0.options.forEach((option, i) => this.cards.push(this.makeCard(option, i)));
    this.badge = this.makeBadge().setDepth(7);
    this.play = this.makePlay().setDepth(8);

    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKey, this);
    this.layout.bindToScene(this, (l) => this.relayout(l));
    this.showSelection(false);
    this.installDebugHook();
  }

  override update(time: number, delta: number): void {
    const dtMs = Math.min(delta, 50);
    for (const c of this.cards) {
      if (c.restAt > 0 && time >= c.restAt) {
        c.restAt = 0;
        c.driver.look.trigger('rest', time);
      }
      // Standing on the card: front view, breathing and antenna sway come from the idle clip and springs.
      c.driver.update({
        time,
        dtMs,
        x: 0,
        bottom: 0,
        vx: 0,
        vy: 0,
        onGround: true,
        enabled: true,
        airborneMs: 0,
        jumped: false,
        ride: null,
        facing: 1,
      });
    }
  }

  // ---------- building ----------

  private makeCard(option: AvatarOptionDef, index: number): Card {
    const root = this.add.container(0, 0);
    const panel = this.add.graphics();
    const holder = this.add.container(0, 0);
    const look = createLook(this, 'robot', option, 0, 0);
    const driver = new AvatarDriver(this, {
      look,
      x: 0,
      feet: 0,
      depth: 1,
      refSpeed: 200,
      gait: 'walk',
      groundAt: () => 0,
    });
    holder.add([driver.shadow, look.root]);
    const dim = this.add.graphics().setAlpha(0);
    root.add([panel, holder, dim]);
    root.setSize(10, 10).setInteractive({ useHandCursor: true });
    root.on(Phaser.Input.Events.POINTER_DOWN, () => this.pick(index));
    return { option, root, panel, holder, driver, dim, rect: { x: 0, y: 0, width: 10, height: 10 }, restAt: 0 };
  }

  private makeBadge(): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).fillCircle(0, 0, 34);
    g.fillStyle(0xffd600, 1).lineStyle(5, 0xff8f00, 1);
    const pts = starPoints(26);
    g.fillPoints(pts, true).strokePoints(pts, true);
    return this.add.container(0, 0, [g]).setScale(0);
  }

  private makePlay(): Phaser.GameObjects.Container {
    const r = 84;
    const base = this.add.circle(0, 0, r, 0x43a047).setStrokeStyle(10, 0xffffff);
    const g = this.add.graphics();
    const s = r * 0.5;
    g.fillStyle(0xffffff, 1).fillTriangle(-s * 0.6, -s * 0.95, -s * 0.6, s * 0.95, s * 1.0, 0);
    const c = this.add.container(0, 0, [base, g]).setSize(r * 2.2, r * 2.2);
    c.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.POINTER_DOWN, () => this.start());
    return c;
  }

  // ---------- layout ----------

  private relayout(l: Layout): void {
    this.geo = pickerLayout(l.width, l.height, l.insets, this.cards.length, COLS);
    this.drawSky(l);
    this.cards.forEach((c, i) => {
      const r = this.geo.cards[i];
      c.rect = r;
      c.root.setPosition(r.x + r.width / 2, r.y + r.height / 2);
      const hw = r.width / 2;
      const hh = r.height / 2;
      const accent = resolveAvatar(c.option).palette.accent;
      c.panel.clear();
      c.panel.fillStyle(0x000000, 0.12).fillRoundedRect(-hw + 4, -hh + 8, r.width, r.height, RADIUS);
      c.panel.fillStyle(accent, 1).fillRoundedRect(-hw, -hh, r.width, r.height, RADIUS);
      c.panel.fillStyle(0xffffff, 0.22).fillRoundedRect(-hw + 10, -hh + 10, r.width - 20, r.height * 0.42, RADIUS - 8);
      c.panel.fillStyle(0x000000, 0.1).fillEllipse(0, hh * 0.62, r.width * 0.62, 26);
      c.panel.lineStyle(6, 0xffffff, 0.9).strokeRoundedRect(-hw, -hh, r.width, r.height, RADIUS);
      c.dim.clear().fillStyle(0x0d2a4a, 1).fillRoundedRect(-hw, -hh, r.width, r.height, RADIUS);
      c.holder.setPosition(0, hh * 0.62).setScale(this.geo.robotScale);
      // Hit area = the whole card (a container's hit area starts at its top-left corner).
      c.root.setSize(r.width, r.height);
      (c.root.input?.hitArea as Phaser.Geom.Rectangle | undefined)?.setTo(0, 0, r.width, r.height);
    });
    this.play.setPosition(this.geo.play.x, this.geo.play.y);
    this.showSelection(false);
  }

  private drawSky(l: Layout): void {
    const g = this.sky.clear();
    g.fillGradientStyle(0x4fb3ff, 0x4fb3ff, 0xb8e6ff, 0xb8e6ff, 1).fillRect(0, 0, l.width, l.height);
    g.fillStyle(0xffffff, 0.55);
    for (const [fx, fy, s] of [
      [0.08, 0.12, 1],
      [0.34, 0.06, 0.8],
      [0.62, 0.1, 1.1],
      [0.9, 0.16, 0.9],
    ] as const) {
      const x = l.width * fx;
      const y = l.height * fy;
      g.fillCircle(x, y, 34 * s).fillCircle(x + 40 * s, y + 6, 26 * s).fillCircle(x - 40 * s, y + 8, 24 * s);
    }
    g.fillStyle(0x7cd34a, 1).fillRect(0, l.height - 60, l.width, 60);
    g.fillStyle(0x4e9a2a, 1).fillRect(0, l.height - 60, l.width, 8);
  }

  // ---------- selection ----------

  private pick(index: number): void {
    if (this.done) return;
    this.state = selectCard(this.state, index, this.cards.length);
    this.celebrate(index);
    this.showSelection(true);
  }

  /** Pop, wave, hop and chime for the chosen card. */
  private celebrate(index: number): void {
    const c = this.cards[index];
    const now = this.time.now;
    playChime(c.option, 'pick');
    this.tweens.killTweensOf(c.root);
    c.root.setScale(1);
    this.tweens.add({ targets: c.root, scale: 1.08, duration: 120, yoyo: true, ease: 'Back.easeOut' });
    c.driver.hop(now);
    c.driver.celebrate(now, 450);
    c.restAt = now + WAVE_MS;
  }

  /** Ring, badge, dimming and Play state for the current selection; `animate` pops the badge. */
  private showSelection(animate: boolean): void {
    if (!this.geo) return;
    const { selected, focus } = this.state;
    this.cards.forEach((c, i) => {
      const target = selected < 0 || i === selected ? 0 : DIM_ALPHA;
      this.tweens.killTweensOf(c.dim);
      if (animate) this.tweens.add({ targets: c.dim, alpha: target, duration: 180 });
      else c.dim.setAlpha(target);
    });
    this.ring.clear();
    if (selected >= 0) {
      const r = this.cards[selected].rect;
      this.ring.lineStyle(14, 0xffffff, 1).strokeRoundedRect(r.x - 9, r.y - 9, r.width + 18, r.height + 18, RADIUS + 9);
      this.ring.lineStyle(5, 0xffd600, 1).strokeRoundedRect(r.x - 9, r.y - 9, r.width + 18, r.height + 18, RADIUS + 9);
      this.badge.setPosition(r.x + r.width - 10, r.y + 10);
      this.tweens.killTweensOf(this.badge);
      if (animate) {
        this.badge.setScale(0).setAngle(-30);
        this.tweens.add({ targets: this.badge, scale: 1, angle: 0, duration: 280, ease: 'Back.easeOut' });
      } else this.badge.setScale(1);
    } else this.badge.setScale(0);

    const f = this.cards[focus]?.rect;
    this.focusRing.clear().setVisible(this.keyboardUsed && !!f && focus !== selected);
    if (f) this.focusRing.lineStyle(8, 0xfff176, 1).strokeRoundedRect(f.x - 7, f.y - 7, f.width + 14, f.height + 14, RADIUS + 7);

    const enabled = canPlay(this.state, this.cards.length);
    this.play.setAlpha(enabled ? 1 : 0.4);
    if (enabled && !this.playPulse) {
      this.playPulse = this.tweens.add({ targets: this.play, scale: 1.08, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else if (!enabled && this.playPulse) {
      this.playPulse.remove();
      this.playPulse = null;
      this.play.setScale(1);
    }
  }

  private onKey(e: KeyboardEvent): void {
    if (this.done || this.seenKeys.has(e)) return;
    this.seenKeys.add(e);
    const dir = KEY_DIRS[e.code];
    if (dir) {
      this.keyboardUsed = true;
      this.state = moveFocus(this.state, dir, this.cards.length, COLS);
      audio.play('tap');
      this.showSelection(false);
      return;
    }
    if (!CONFIRM_KEYS.has(e.code) || e.repeat) return;
    this.keyboardUsed = true;
    const r = confirm(this.state, this.cards.length);
    if (r.play) {
      this.start();
      return;
    }
    this.state = r.state;
    if (this.state.selected >= 0) this.celebrate(this.state.selected);
    this.showSelection(true);
  }

  private start(): void {
    if (this.done || !canPlay(this.state, this.cards.length)) return;
    this.done = true;
    audio.play('pick');
    const id = this.cards[this.state.selected].option.id;
    this.playPulse?.remove();
    this.playPulse = null;
    this.tweens.add({
      targets: this.play,
      scale: 0.85,
      duration: 90,
      yoyo: true,
      // Leave after this frame: stopping the scene mid-update would break the rest of the frame.
      onComplete: () => this.game.events.once(Phaser.Core.Events.POST_STEP, () => this.data0.onPlay(id)),
    });
  }

  private installDebugHook(): void {
    if (!new URLSearchParams(location.search).has('debug')) return;
    (window as unknown as { __picker: unknown }).__picker = {
      scene: this,
      layout: this.layout,
      audio,
      state: () => ({
        ...this.state,
        selectedId: this.cards[this.state.selected]?.option.id ?? null,
        ids: this.cards.map((c) => c.option.id),
        cards: this.cards.map((c) => ({ id: c.option.id, ...c.rect, dim: c.dim.alpha, scale: c.root.scale })),
        play: { ...this.geo.play, alpha: this.play.alpha },
        robotScale: this.geo.robotScale,
        done: this.done,
        fps: this.game.loop.actualFps,
      }),
    };
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
