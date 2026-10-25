// The Phaser side of a Combo Practice run (Task 011, D-049), used by LevelScene on practice levels only:
// - walk assist (StickyWalk) between the input state and Player.step, with the latched button shown pressed;
// - combo detection (ComboTracker) and its reward: a sparkle burst on the two buttons involved, a rising two-note sound,
//   the next star of the row of five at the top filling with a pop; the fifth star gives a small celebration (coin shower,
//   confetti, a happy jingle, the avatar's win pose for a second without stopping the walk) and the row empties;
// - the gentle coach (CoachTimer): a ghost hand holding the nav button and tapping the action button twice.
// No numbers, no text, nothing ever lost.
import Phaser from 'phaser';
import type { Action } from '../types';
import type { PracticeMode } from '../levels/practice';
import type { TouchControls } from '../ui/TouchControls';
import type { Layout } from '../ui/layout';
import { audio } from '../audio/AudioManager';
import { comboSoundId } from '../audio/recipes';
import { StickyWalk } from '../levels/stickyWalk';
import { drawFinger } from '../levels/demoFx';
import { starPath } from '../ui/icons';
import { COMBO, ComboTracker, type ComboEvent } from './combo';
import { COACH, CoachTimer, coachTaps } from './coach';

export interface PracticeRunOptions {
  mode: PracticeMode;
  /** Parent setting `walkAssist: sticky` (practice levels only). */
  walkAssist: boolean;
  touch: TouchControls;
  layout: Layout;
  coinTexture: string;
  /** The fifth star: the scene shows the avatar's win pose (the walk goes on). */
  onRowDone: () => void;
}

/** What the scene tells the run each frame. */
export interface PracticeFrame {
  now: number;
  /** In play (not the intro, the cloud ride or the flag). */
  playing: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  power: boolean;
  jumpPressed: boolean;
  powerPressed: boolean;
  airborne: boolean;
  /** A combo is possible now (not over a gap, not on the cloud, not at the flag). */
  possible: boolean;
  /** The way the avatar travels (the coach holds this nav button). */
  facing: 1 | -1;
  /** The avatar on screen (logical px): the hint never covers it. */
  avatar: { left: number; top: number; right: number; bottom: number };
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const DEPTH = { hud: 905, fx: 1001, finger: 1100, shower: 1002 };
const STAR = { r: 30, gap: 76, y: 52 };
/** The coach's timeline inside its 2.5 s (ms): the hold finger presses, then two taps. */
const HINT = { pressAt: 250, taps: [800, 1550], tapMs: 160 };

export class PracticeRun {
  readonly combo: ComboTracker;
  readonly coach = new CoachTimer();
  readonly sticky = new StickyWalk();
  /** Celebrations shown this run (debug). */
  celebrations = 0;
  private readonly row: Phaser.GameObjects.Container;
  private readonly slots: Array<{ root: Phaser.GameObjects.Container; full: Phaser.GameObjects.Graphics }> = [];
  private shown = 0;
  private emptyTimer: Phaser.Time.TimerEvent | null = null;
  private readonly sparkle: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly confetti: Phaser.GameObjects.Particles.ParticleEmitter;
  private hint: {
    nav: Action;
    taps: Array<'jump' | 'power'>;
    startedAt: number;
    hold: Phaser.GameObjects.Container;
    tap: Phaser.GameObjects.Container;
    ring: Phaser.GameObjects.Graphics;
    tapsDone: number;
    pressShown: boolean;
    hidden: boolean;
  } | null = null;
  private lastEvent: ComboEvent | null = null;
  private fingerRects: Rect[] = [];
  private avatarRect: Rect | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: PracticeRunOptions,
  ) {
    this.combo = new ComboTracker(opts.mode);
    this.row = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.hud);
    for (let i = 0; i < COMBO.rowSize; i++) {
      const empty = scene.add.graphics();
      const pts = starPath(STAR.r).map((p) => new Phaser.Math.Vector2(p.x, p.y));
      empty.fillStyle(0xffffff, 0.45).lineStyle(5, 0xffffff, 1).fillPoints(pts, true).strokePoints(pts, true);
      const full = scene.add.graphics();
      full.fillStyle(0xffd600, 1).lineStyle(5, 0xff8f00, 1).fillPoints(pts, true).strokePoints(pts, true);
      full.fillStyle(0xffffff, 0.6).fillCircle(-STAR.r * 0.2, -STAR.r * 0.2, STAR.r * 0.13);
      full.setScale(0);
      const root = scene.add.container((i - (COMBO.rowSize - 1) / 2) * STAR.gap, 0, [empty, full]);
      this.row.add(root);
      this.slots.push({ root, full });
    }
    this.row.setScrollFactor(0, 0, true);
    this.sparkle = scene.add
      .particles(0, 0, 'fx-sparkle', {
        emitting: false,
        speed: { min: 140, max: 320 },
        scale: { start: 1.1, end: 0 },
        rotate: { min: 0, max: 180 },
        tint: [0xffffff, 0xfff176, 0xffd54f, 0x80deea],
        lifespan: 520,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.fx);
    this.confetti = scene.add
      .particles(0, 0, 'fx-confetti', {
        emitting: false,
        speed: { min: 220, max: 560 },
        angle: { min: 200, max: 340 },
        gravityY: 700,
        rotate: { min: 0, max: 360 },
        scale: { min: 0.5, max: 0.9 },
        tint: [0xe53935, 0xffeb3b, 0x43a047, 0x1e88e5, 0xff8f00, 0xab47bc],
        lifespan: 1800,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.fx);
    opts.layout.bindToScene(scene, (l) => this.relayout(l));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.emptyTimer?.remove());
  }

  /** Walk direction for this frame: the walk assist when it is on, else the usual hold = walk (D-029). */
  move(now: number, left: boolean, right: boolean): -1 | 0 | 1 {
    if (!this.opts.walkAssist) return left === right ? 0 : left ? -1 : 1;
    const dir = this.sticky.step(now, left, right);
    this.opts.touch.setLatched(left || right ? null : this.sticky.latch === 1 ? 'right' : this.sticky.latch === -1 ? 'left' : null);
    return dir;
  }

  /** A fall or the float-back: the latch lets go. */
  cancelLatch(): void {
    this.sticky.cancel();
    this.opts.touch.setLatched(null);
  }

  /** Every frame (any mode): combos while playing, the coach, the hint's animation. */
  update(f: PracticeFrame): void {
    const latch = this.opts.walkAssist ? this.sticky.latch : 0;
    if (f.playing) {
      const e = this.combo.step({
        now: f.now,
        left: f.left || latch === -1,
        right: f.right || latch === 1,
        jump: f.jump,
        power: f.power,
        airborne: f.airborne,
        jumpPressed: f.jumpPressed,
        powerPressed: f.powerPressed,
      });
      if (e) this.reward(e, f.now);
    }
    const ev = this.coach.step({ now: f.now, playing: f.playing, possible: f.possible });
    if (ev === 'show') this.showHint(f);
    else if (ev === 'hide') this.hideHint();
    this.avatarRect = f.avatar;
    this.updateHint(f.now);
  }

  /** The flag: the hint goes, the latch lets go. */
  finish(): void {
    this.cancelLatch();
    // The win screen shows the run's combo stars; the in-level row steps aside.
    this.scene.tweens.add({ targets: this.row, alpha: 0, duration: 400, delay: 600 });
    if (this.coach.step({ now: this.scene.time.now, playing: false, possible: false }) === 'hide') this.hideHint();
  }

  // ---------- reward ----------

  private reward(e: ComboEvent, now: number): void {
    this.lastEvent = e;
    if (this.coach.combo(now) === 'hide') this.hideHint();
    audio.play(comboSoundId(e.star));
    // Sparkles on the two buttons involved: the held nav button (or Jump, for Power in the air) and the action button.
    const pair: Action[] = [e.nav ?? 'jump', e.action];
    const geo = this.opts.touch.geometry();
    for (const a of pair) {
      const b = geo.find((g) => g.action === a && g.visible);
      if (!b) continue;
      this.sparkle.explode(12, b.x, b.y);
      const ring = this.scene.add.circle(b.x, b.y, b.radius).setStrokeStyle(8, 0xfff59d, 1).setScrollFactor(0).setDepth(DEPTH.fx);
      this.scene.tweens.add({ targets: ring, scale: 1.5, alpha: 0, duration: 420, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
    }
    this.fillStar(e.star);
    if (e.rowDone) this.scene.time.delayedCall(260, () => this.celebrate());
  }

  private fillStar(i: number): void {
    if (i === 0 && this.shown > 0) this.emptyRow(true);
    const slot = this.slots[i];
    if (!slot) return;
    this.scene.tweens.killTweensOf(slot.full);
    this.scene.tweens.killTweensOf(slot.root);
    slot.full.setScale(0);
    this.scene.tweens.add({ targets: slot.full, scale: 1, duration: 260, ease: 'Back.easeOut' });
    slot.root.setAngle(0);
    this.scene.tweens.add({ targets: slot.root, angle: { from: -16, to: 0 }, duration: 300, ease: 'Sine.easeOut' });
    this.shown = i + 1;
    const p = this.starScreen(i);
    this.sparkle.explode(8, p.x, p.y);
  }

  /** The fifth star: coin shower, confetti, jingle, the avatar's win pose; then the row empties. */
  private celebrate(): void {
    this.celebrations++;
    audio.play('comboRow');
    const c = this.starScreen(2);
    this.confetti.explode(60, c.x, c.y);
    for (let k = 0; k < 16; k++) {
      const from = this.starScreen(k % COMBO.rowSize);
      const coin = this.scene.add.image(from.x, from.y, this.opts.coinTexture).setDisplaySize(36, 36).setScrollFactor(0).setDepth(DEPTH.shower);
      const dx = Phaser.Math.Between(-160, 160);
      this.scene.tweens.add({
        targets: coin,
        x: from.x + dx,
        y: from.y + Phaser.Math.Between(260, 420),
        angle: Phaser.Math.Between(-200, 200),
        alpha: { from: 1, to: 0 },
        duration: Phaser.Math.Between(800, 1100),
        delay: k * 30,
        ease: 'Quad.easeIn',
        onComplete: () => coin.destroy(),
      });
    }
    this.opts.onRowDone();
    this.emptyTimer?.remove();
    this.emptyTimer = this.scene.time.delayedCall(900, () => this.emptyRow(false));
  }

  /** Empties the row (softly, or at once when the next combo already came). */
  private emptyRow(now: boolean): void {
    this.emptyTimer?.remove();
    this.emptyTimer = null;
    for (const s of this.slots) {
      this.scene.tweens.killTweensOf(s.full);
      if (now) s.full.setScale(0);
      else this.scene.tweens.add({ targets: s.full, scale: 0, duration: 220, ease: 'Sine.easeIn' });
    }
    this.shown = 0;
  }

  private starScreen(i: number): { x: number; y: number } {
    return { x: this.row.x + this.slots[i].root.x, y: this.row.y };
  }

  // ---------- coach ----------

  private showHint(f: PracticeFrame): void {
    this.hideHint();
    const nav: Action = f.facing === 1 ? 'right' : 'left';
    const taps = coachTaps(this.opts.mode, this.coach.count - 1);
    const make = (angle: number) => {
      const c = this.scene.add.container(0, 0, [drawFinger(this.scene).setAngle(angle)]).setDepth(DEPTH.finger).setAlpha(0);
      c.setScrollFactor(0, 0, true);
      this.scene.tweens.add({ targets: c, alpha: 1, duration: 200 });
      return c;
    };
    const ring = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.finger - 1);
    this.hint = { nav, taps, startedAt: f.now, hold: make(28), tap: make(-28), ring, tapsDone: 0, pressShown: false, hidden: false };
    this.updateHint(f.now);
  }

  private hideHint(): void {
    const h = this.hint;
    if (!h) return;
    this.hint = null;
    this.fingerRects = [];
    // The shown presses end with the hint.
    this.opts.touch.animatePress(h.nav, 0);
    for (const a of h.taps) this.opts.touch.animatePress(a, 0);
    for (const c of [h.hold, h.tap]) {
      this.scene.tweens.killTweensOf(c);
      this.scene.tweens.add({ targets: c, alpha: 0, duration: 180, onComplete: () => c.destroy() });
    }
    h.ring.destroy();
  }

  /** Places the two fingers on their buttons for this moment of the hint. */
  private updateHint(now: number): void {
    const h = this.hint;
    if (!h) return;
    const t = now - h.startedAt;
    const geo = this.opts.touch.geometry();
    const navB = geo.find((g) => g.action === h.nav && g.visible);
    const tapAction = h.taps[t >= HINT.taps[0] + HINT.tapMs ? 1 : 0];
    const actB = geo.find((g) => g.action === tapAction && g.visible);
    if (!navB || !actB) return;
    // Hold finger: glides onto the nav button, then stays down; its button shows pressed and a ring fills.
    const pressed = t >= HINT.pressAt;
    if (pressed && !h.pressShown) {
      h.pressShown = true;
      this.opts.touch.animatePress(h.nav, COACH.showMs - t);
    }
    const holdOff = pressed ? { x: -0.05, y: 0.05 } : { x: -0.42, y: 0.3 };
    const ks = Math.max(0.8, navB.radius / 80);
    h.hold.setScale(ks).setPosition(navB.x + holdOff.x * navB.radius, navB.y + holdOff.y * navB.radius);
    const p = Math.min(1, Math.max(0, (t - HINT.pressAt) / (COACH.showMs - HINT.pressAt)));
    h.ring.clear();
    if (p > 0) {
      h.ring.lineStyle(10, 0xffd600, 1).beginPath();
      h.ring.arc(navB.x, navB.y, navB.radius + 14, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2, false).strokePath();
    }
    // Tap finger: dips onto the action button twice (the button pulses and shows a press).
    let dip = 0;
    HINT.taps.forEach((at, i) => {
      if (t >= at && t < at + HINT.tapMs) {
        dip = Math.sin(((t - at) / HINT.tapMs) * Math.PI);
        if (h.tapsDone === i) {
          h.tapsDone = i + 1;
          this.opts.touch.animatePress(h.taps[i], HINT.tapMs + 40);
          this.opts.touch.pulse(h.taps[i], 'nudge');
        }
      }
    });
    const hover = { x: 0.42, y: 0.3 };
    const touch = { x: 0.05, y: 0.05 };
    const ka = Math.max(0.8, actB.radius / 80);
    h.tap
      .setScale(ka)
      .setPosition(actB.x + (hover.x + (touch.x - hover.x) * dip) * actB.radius, actB.y + (hover.y + (touch.y - hover.y) * dip) * actB.radius);
    // Never over the avatar: if a finger would cover it, the hand steps back (hidden) for that moment.
    this.fingerRects = [fingerRect(h.hold.x, h.hold.y, 28, ks), fingerRect(h.tap.x, h.tap.y, -28, ka)];
    const a = this.avatarRect;
    const covers = !!a && this.fingerRects.some((r) => overlaps(r, a));
    if (covers !== h.hidden) {
      h.hidden = covers;
      h.hold.setVisible(!covers);
      h.tap.setVisible(!covers);
      h.ring.setVisible(!covers);
    }
  }

  // ---------- layout and debug ----------

  private relayout(l: Layout): void {
    const safe = l.safeRect;
    const ui = l.uiRect;
    this.row.setPosition(l.centerX, Math.max(safe.y, ui.y) + STAR.y);
  }

  debug(): Record<string, unknown> {
    return {
      mode: this.opts.mode,
      walkAssist: this.opts.walkAssist,
      combos: this.combo.total,
      stars: this.combo.stars,
      starsShown: this.shown,
      rows: this.combo.rows,
      celebrations: this.celebrations,
      ignored: this.combo.ignored,
      lastCombo: this.lastEvent,
      latch: this.sticky.latch,
      hint: {
        showing: this.coach.showing,
        count: this.coach.count,
        shownAt: this.coach.shownAt,
        nextAt: this.coach.nextAt(),
        nav: this.hint?.nav ?? null,
        taps: this.hint?.taps ?? null,
        hidden: this.hint?.hidden ?? false,
        fingers: this.fingerRects,
      },
      avatar: this.avatarRect,
      row: { x: this.row.x, y: this.row.y, gap: STAR.gap, r: STAR.r },
    };
  }
}

/** Screen box of a finger (drawFinger: tip at the origin, 48 x 74 below it), rotated by `angle` degrees and scaled. */
function fingerRect(x: number, y: number, angle: number, scale: number): Rect {
  const a = (angle * Math.PI) / 180;
  const pts = [
    [-24, 0],
    [24, 0],
    [-24, 74],
    [24, 74],
  ].map(([px, py]) => ({ x: x + (px * Math.cos(a) - py * Math.sin(a)) * scale, y: y + (px * Math.sin(a) + py * Math.cos(a)) * scale }));
  return {
    left: Math.min(...pts.map((p) => p.x)),
    right: Math.max(...pts.map((p) => p.x)),
    top: Math.min(...pts.map((p) => p.y)),
    bottom: Math.max(...pts.map((p) => p.y)),
  };
}

const overlaps = (a: Rect, b: Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
