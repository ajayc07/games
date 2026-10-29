// Parent view (D-047, Task 010): the one place with text. Sound, button size (with a live preview of the real
// four-button layout), main button, look, unlock all, "show demos again" and a held Reset. Opened from the map's gear
// (held 3 s) or `?parent=1`; Back or Escape returns to the map. Generic: the universe supplies the state and actions.
import Phaser from 'phaser';
import { getLayout, type Layout } from '../ui/layout';
import { audio } from '../audio/AudioManager';
import { HoldTracker, RESET_HOLD_MS } from '../ui/hold';
import { placeButtons } from '../ui/buttonLayout';
import { STYLES, drawActionIcon } from '../ui/TouchControls';
import { BUTTON_SCALE_STEPS, nearestScaleStep, type ButtonsPrimary, type DayNight, type Volume, type WalkAssist } from '../settings/settings';
import { LOOK_NAMES, type LookName } from '../avatar/config';
import { ZEN_LIMITS, minutesText, type ZenLimit } from '../settings/zenTime';
import { parentLayout, previewFit, type ParentLayout, type Rect } from './parentLayout';

export interface ParentState {
  soundOn: boolean;
  buttonScale: number;
  buttonsPrimary: ButtonsPrimary;
  look: LookName;
  unlockAll: boolean;
  /** Walk assist in Practice (Task 011). */
  walkAssist: WalkAssist;
  /** Browser fullscreen on the first tap (Task 013). */
  fullscreen: boolean;
  /** Whether this browser can do fullscreen and the app is not installed; the row is hidden otherwise. */
  fullscreenAvailable: boolean;
  /** Bright or dark look (Task 025). */
  dayNight: DayNight;
  /** The fall buzz (Task 025), and whether this browser can vibrate at all (iOS Safari cannot). */
  vibration: boolean;
  vibrationSupported: boolean;
  /** How loud the game is (Task 032). */
  volume: Volume;
  /** Zen minutes allowed per day (0 = no limit) and the zen time played today in ms (Task 033). */
  zenLimit: ZenLimit;
  zenSpentMs: number;
  /** Settings the URL pins for this visit (a change is saved but this visit still uses the URL value). */
  pinned: { buttonScale: boolean; buttonsPrimary: boolean; soundOn: boolean; unlockAll: boolean; look: boolean; walkAssist: boolean; fullscreen: boolean; dayNight: boolean; vibration: boolean };
}

export interface ParentSceneData {
  read(): ParentState;
  setSound(on: boolean): void;
  setButtonScale(scale: number): void;
  setButtonsPrimary(p: ButtonsPrimary): void;
  setLook(look: LookName): void;
  setUnlockAll(on: boolean): void;
  setWalkAssist(v: WalkAssist): void;
  /** Saves the setting and, being a tap, enters or leaves fullscreen right away. */
  setFullscreen(on: boolean): void;
  setDayNight(v: DayNight): void;
  setVibration(on: boolean): void;
  /** Saves the volume and plays a sound at that volume, so the parent hears it. */
  setVolume(v: Volume): void;
  setZenLimit(v: ZenLimit): void;
  /** Buzzes now, whatever the switch says; true if the browser accepted it. */
  testBuzz(): boolean;
  showDemosAgain(): void;
  resetProgress(): Promise<void>;
  onBack(): void;
}

const C = {
  bg: 0xf4efe4,
  panel: 0xffffff,
  ink: '#33291f',
  soft: '#7a6c5a',
  choice: 0xe6dfd0,
  on: 0x2e9d57,
  line: 0xcfc4ad,
  back: 0x1e88e5,
  reset: 0xd84a3a,
};
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

export class ParentScene extends Phaser.Scene {
  static readonly KEY = 'parent';

  private data0!: ParentSceneData;
  private layout!: Layout;
  private pl!: ParentLayout;
  private root: Phaser.GameObjects.Container | null = null;
  private tracker = new HoldTracker(RESET_HOLD_MS);
  private resetFill: Phaser.GameObjects.Graphics | null = null;
  private resetTitle: Phaser.GameObjects.Text | null = null;
  private leaving = false;
  private resetDone = 0;
  private demoTick = 0;
  /** 1 = the main page, 2 = Day / night and Vibration (Task 025). */
  private page: 1 | 2 = 1;
  private buzzTried: 'none' | 'ok' | 'no' = 'none';
  private seenKeys = new WeakSet<KeyboardEvent>();
  private pointerOnReset = -1;
  private previewButtons: Array<{ action: string; x: number; y: number; r: number }> = [];

  constructor() {
    super(ParentScene.KEY);
  }

  init(data: ParentSceneData): void {
    this.data0 = data;
    this.leaving = false;
    this.tracker = new HoldTracker(RESET_HOLD_MS);
    this.root = null;
    this.resetFill = null;
    this.resetTitle = null;
    this.resetDone = 0;
    this.demoTick = 0;
    this.page = 1;
    this.buzzTried = 'none';
    this.pointerOnReset = -1;
    this.seenKeys = new WeakSet();
  }

  create(): void {
    this.layout = getLayout();
    this.layout.bindToScene(this, (l) => this.build(l));
    this.input.keyboard?.on('keydown', this.onKeyDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.onKeyDown, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    });
    this.installDebugHook();
  }

  override update(time: number): void {
    if (this.tracker.update(time) === 'done') this.finishReset();
    this.drawResetFill(time);
  }

  // ---------- building ----------

  /** Rebuilds everything from the saved state (a handful of shapes). On resize and after each change. */
  private build(l: Layout): void {
    this.root?.destroy();
    this.pointerOnReset = -1;
    this.tracker.cancel();
    this.previewButtons = [];
    const root = this.add.container(0, 0);
    this.root = root;
    const st = this.data0.read();
    this.pl = parentLayout(l.width, l.height, l.insets, st.fullscreenAvailable);
    root.add(this.add.graphics().fillStyle(C.bg, 1).fillRect(0, 0, l.width, l.height));

    if (this.page === 2) {
      this.buildPage2(st);
      return;
    }
    const row = (id: string) => this.pl.rows.find((r) => r.id === id)!;
    const put = (...o: Phaser.GameObjects.GameObject[]) => root.add(o);

    this.rowLabel(row('sound'), 'Sound');
    this.choice(row('sound').controls[0], 'On', st.soundOn, () => this.change(() => this.data0.setSound(true)));
    this.choice(row('sound').controls[1], 'Off', !st.soundOn, () => this.change(() => this.data0.setSound(false)));
    this.rowLabel(row('look'), 'Look');
    LOOK_NAMES.forEach((name, i) => this.choice(row('look').controls[i], name === 'robot' ? 'Robot' : 'Ball', st.look === name, () => this.change(() => this.data0.setLook(name))));
    this.rowLabel(row('main'), 'Main button');
    (['jump', 'power'] as const).forEach((p, i) => this.choice(row('main').controls[i], p === 'jump' ? 'Jump' : 'Power', st.buttonsPrimary === p, () => this.change(() => this.data0.setButtonsPrimary(p))));
    this.rowLabel(row('unlock'), 'Unlock all');
    this.choice(row('unlock').controls[0], 'On', st.unlockAll, () => this.change(() => this.data0.setUnlockAll(true)));
    this.choice(row('unlock').controls[1], 'Off', !st.unlockAll, () => this.change(() => this.data0.setUnlockAll(false)));
    // Walk assist (Task 011): two lines, the second smaller, so the long name fits the label column.
    const ar = row('assist');
    root.add(this.text('Walk assist', ar.label.x, ar.label.y + ar.label.height / 2 - 14, 26, C.ink, true).setOrigin(0, 0.5));
    root.add(this.text('in Practice', ar.label.x, ar.label.y + ar.label.height / 2 + 16, 19, C.soft).setOrigin(0, 0.5));
    this.choice(ar.controls[0], 'Off', st.walkAssist !== 'sticky', () => this.change(() => this.data0.setWalkAssist('off')));
    this.choice(ar.controls[1], 'Sticky', st.walkAssist === 'sticky', () => this.change(() => this.data0.setWalkAssist('sticky')));
    const fr = this.pl.fullscreen;
    if (fr) {
      this.rowLabel(fr, 'Full screen');
      this.choice(fr.controls[0], 'On', st.fullscreen, () => this.change(() => this.data0.setFullscreen(true)));
      this.choice(fr.controls[1], 'Off', !st.fullscreen, () => this.change(() => this.data0.setFullscreen(false)));
    }
    this.rowLabel(row('demos'), 'Demos');
    this.choice(row('demos').controls[0], this.demoTick > 0 ? 'Shown again ✓' : 'Show again', this.demoTick > 0, () => {
      this.data0.showDemosAgain();
      audio.play('coin');
      this.demoTick++;
      this.change(() => undefined);
    }).setFontSize(24);

    const pinned = [st.pinned.soundOn && 'sound', st.pinned.look && 'look', st.pinned.buttonScale && 'button size', st.pinned.buttonsPrimary && 'main button', st.pinned.unlockAll && 'unlock all', st.pinned.walkAssist && 'walk assist', st.pinned.fullscreen && 'full screen'].filter(Boolean);
    if (pinned.length > 0) {
      const last = row('demos').rect;
      put(this.text(`The web address sets ${pinned.join(', ')} for this visit.`, last.x, last.y + last.height + 14, 17, C.soft).setWordWrapWidth(last.width));
    }

    put(this.text('Button size', this.pl.sizeLabel.x, this.pl.sizeLabel.y, 26, C.ink, true));
    const names = ['Small', 'Normal', 'Large', 'X-large'];
    const cur = nearestScaleStep(st.buttonScale);
    this.pl.sizeSteps.forEach((r, i) => this.choice(r, names[i], i === cur, () => this.change(() => this.data0.setButtonScale(BUTTON_SCALE_STEPS[i]))).setFontSize(21));
    this.drawPreview(st);
    this.buildMore('More settings  ›');
    this.buildReset();
    this.buildBack();
  }

  /** The second page (Task 025): the look of the levels (bright, dark or random) and the fall buzz with a test button. */
  private buildPage2(st: ParentState): void {
    const [dn, vib, vol, zen] = this.pl.page2.rows;
    this.rowLabel(dn, 'Day / night');
    ([['random', 'Random'], ['day', 'Day'], ['night', 'Night']] as const).forEach(([v, name], i) =>
      this.choice(dn.controls[i], name, st.dayNight === v, () => this.change(() => this.data0.setDayNight(v))),
    );
    this.rowLabel(vib, 'Vibration');
    this.choice(vib.controls[0], 'On', st.vibration, () => this.change(() => this.data0.setVibration(true)));
    this.choice(vib.controls[1], 'Off', !st.vibration, () => this.change(() => this.data0.setVibration(false)));
    const test = this.buzzTried === 'ok' ? 'Buzzed ✓' : this.buzzTried === 'no' ? 'Not felt' : 'Test buzz';
    this.choice(vib.controls[2], test, this.buzzTried === 'ok', () => {
      this.buzzTried = this.data0.testBuzz() ? 'ok' : 'no';
      this.change(() => undefined);
    }).setFontSize(24);
    this.rowLabel(vol, 'Volume');
    ([['low', 'Low'], ['medium', 'Medium'], ['high', 'High']] as const).forEach(([v, name], i) =>
      this.choice(vol.controls[i], name, st.volume === v, () => this.change(() => this.data0.setVolume(v))),
    );
    this.rowLabel(zen, 'Zen time');
    ZEN_LIMITS.forEach((v, i) => this.choice(zen.controls[i], v === 0 ? 'No limit' : `${v} min`, st.zenLimit === v, () => this.change(() => this.data0.setZenLimit(v))));
    const lines = [
      `Zen time: a daily limit (today ${minutesText(st.zenSpentMs)}${st.zenLimit > 0 ? ` of ${st.zenLimit} min` : ', no limit'}). When it is used up a calm moon screen appears and Zen rests until tomorrow.`,
      'Random: bright or dark by chance (first play bright, Night 1 dark). Vibration: a buzz on a fall; if not felt, check silent mode and battery saver.',
      st.vibrationSupported ? '' : 'This browser cannot vibrate at all (iPhone and iPad cannot).',
    ];
    const pinned = [st.pinned.dayNight && 'day / night', st.pinned.vibration && 'vibration'].filter(Boolean);
    if (pinned.length > 0) lines.push(`The web address sets ${pinned.join(' and ')} for this visit.`);
    const n = this.pl.page2.note;
    this.root!.add(this.text(lines.filter(Boolean).join('\n'), n.x, n.y, 18, C.soft).setWordWrapWidth(n.width));
    this.buildMore('‹  Settings');
    this.buildBack();
  }

  /** The button that switches between the two pages. */
  private buildMore(label: string): void {
    const r = this.pl.more;
    const g = this.add.graphics();
    g.fillStyle(C.choice, 1).fillRoundedRect(r.x, r.y, r.width, r.height, 20);
    g.lineStyle(3, C.line, 1).strokeRoundedRect(r.x, r.y, r.width, r.height, 20);
    const t = this.add
      .text(r.x + r.width / 2, r.y + r.height / 2, label, { fontFamily: FONT, fontSize: '21px', color: C.ink, fontStyle: 'bold', resolution: this.layout.renderScale })
      .setOrigin(0.5);
    const zone = this.add.zone(r.x + r.width / 2, r.y + r.height / 2, r.width, r.height).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      if (p.getDistance() >= 24) return;
      audio.play('pick');
      this.page = this.page === 1 ? 2 : 1;
      this.rebuildSoon();
    });
    this.root!.add([g, t, zone]);
  }

  private text(text: string, x: number, y: number, size: number, color: string, bold = false): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal', resolution: this.layout.renderScale })
      .setOrigin(0, 0);
  }

  private rowLabel(row: { label: Rect }, text: string): void {
    this.root!.add(this.text(text, row.label.x, row.label.y + row.label.height / 2, 26, C.ink, true).setOrigin(0, 0.5));
  }

  /** A big rounded choice button; `on` = filled green. Returns its text (to change the font size). */
  private choice(r: Rect, text: string, on: boolean, onTap: () => void): Phaser.GameObjects.Text {
    const g = this.add.graphics();
    g.fillStyle(on ? C.on : C.choice, 1).fillRoundedRect(r.x, r.y, r.width, r.height, 22);
    g.lineStyle(3, on ? 0x1f7a42 : C.line, 1).strokeRoundedRect(r.x, r.y, r.width, r.height, 22);
    const t = this.add
      .text(r.x + r.width / 2, r.y + r.height / 2, text, { fontFamily: FONT, fontSize: '28px', color: on ? '#ffffff' : C.ink, fontStyle: 'bold', resolution: this.layout.renderScale })
      .setOrigin(0.5);
    const zone = this.add.zone(r.x + r.width / 2, r.y + r.height / 2, r.width, r.height).setInteractive({ useHandCursor: true });
    // A tap, not the end of a drag that started elsewhere.
    zone.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      if (p.getDistance() < 24) onTap();
    });
    this.root!.add([g, t, zone]);
    return t;
  }

  /** Runs a change, then redraws once the frame is over (the saved state is read back, so the screen always matches it). */
  private change(fn: () => void): void {
    fn();
    this.rebuildSoon();
  }

  private rebuildSoon(): void {
    this.game.events.once(Phaser.Core.Events.POST_STEP, () => {
      if (this.scene.isActive(ParentScene.KEY) && !this.leaving) this.build(this.layout);
    });
  }

  private drawPreview(st: ParentState): void {
    const panel = this.pl.preview;
    const l = this.layout;
    const g = this.add.graphics();
    g.fillStyle(C.panel, 1).fillRoundedRect(panel.x, panel.y, panel.width, panel.height, 22);
    g.lineStyle(3, C.line, 1).strokeRoundedRect(panel.x, panel.y, panel.width, panel.height, 22);
    // The mini screen: sky and a strip of ground, then the real placement from buttonLayout.ts.
    const fit = previewFit({ x: panel.x, y: panel.y + 26, width: panel.width, height: panel.height - 26 }, l.width, l.height);
    g.fillStyle(0x8ed1f5, 1).fillRect(fit.x, fit.y, fit.width, fit.height);
    g.fillStyle(0x7cc255, 1).fillRect(fit.x, fit.y + fit.height * 0.86, fit.width, fit.height * 0.14);
    g.lineStyle(2, 0x55422c, 0.6).strokeRect(fit.x, fit.y, fit.width, fit.height);
    this.root!.add(g);
    const placed = placeButtons({ shown: ['left', 'right', 'jump', 'power'], ui: l.uiRect, short: l.height, scale: st.buttonScale, primary: st.buttonsPrimary });
    for (const p of placed) {
      const x = fit.x + p.x * fit.k;
      const y = fit.y + p.y * fit.k;
      const r = p.radius * fit.k;
      const base = this.add.circle(x, y, r, STYLES[p.action].color).setStrokeStyle(Math.max(2, 8 * fit.k), 0xffffff);
      const icon = this.add.graphics().setPosition(x, y);
      drawActionIcon(icon, p.action, r);
      this.root!.add([base, icon]);
      this.previewButtons.push({ action: p.action, x, y, r });
    }
    const assist = st.walkAssist === 'sticky' ? '  ·  Practice: a quick tap on an arrow keeps walking' : '';
    const cap = this.text(`What he sees in the last level${assist}`, panel.x + 16, panel.y + 6, 16, C.soft);
    this.root!.add(cap);
  }

  private buildReset(): void {
    const r = this.pl.reset;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).fillRoundedRect(r.x, r.y, r.width, r.height, 22);
    g.lineStyle(4, C.reset, 1).strokeRoundedRect(r.x, r.y, r.width, r.height, 22);
    this.resetFill = this.add.graphics();
    const cleared = this.resetDone > 0;
    const title = this.add
      .text(r.x + r.width / 2, r.y + r.height / 2 - 11, cleared ? 'Progress cleared ✓' : 'Reset progress', {
        fontFamily: FONT,
        fontSize: '26px',
        color: cleared ? '#2e7d4a' : '#b3261e',
        fontStyle: 'bold',
        resolution: this.layout.renderScale,
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(r.x + r.width / 2, r.y + r.height / 2 + 16, 'hold for 3 seconds', { fontFamily: FONT, fontSize: '17px', color: C.soft, resolution: this.layout.renderScale })
      .setOrigin(0.5);
    const zone = this.add.zone(r.x + r.width / 2, r.y + r.height / 2, r.width, r.height).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      this.pointerOnReset = p.id;
      this.tracker.down(this.time.now);
    });
    zone.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.tracker.cancel();
      this.pointerOnReset = -1;
    });
    this.root!.add([g, this.resetFill, title, sub, zone]);
    this.resetTitle = title;
  }

  private drawResetFill(now: number): void {
    if (!this.resetFill || !this.pl) return;
    const r = this.pl.reset;
    const p = this.tracker.progress(now);
    this.resetFill.clear();
    if (p > 0) this.resetFill.fillStyle(C.reset, 0.28).fillRoundedRect(r.x, r.y, Math.max(24, r.width * p), r.height, 22);
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerOnReset) return;
    this.pointerOnReset = -1;
    const ev = this.tracker.up(this.time.now);
    if (ev === 'done') this.finishReset();
    else if (ev === 'tap') this.wobble();
  }

  /** A short press (or mashing) only shakes the title; nothing is cleared. */
  private wobble(): void {
    const t = this.resetTitle;
    if (!t) return;
    audio.play('bump');
    const x0 = this.pl.reset.x + this.pl.reset.width / 2;
    this.tweens.killTweensOf(t);
    this.tweens.add({ targets: t, x: { from: x0 - 8, to: x0 + 8 }, duration: 70, yoyo: true, repeat: 1, onComplete: () => t.setX(x0) });
  }

  private finishReset(): void {
    this.tracker.cancel();
    this.pointerOnReset = -1;
    audio.play('unlock');
    void this.data0.resetProgress().then(() => {
      this.resetDone++;
      this.rebuildSoon();
    });
  }

  private buildBack(): void {
    const r = this.pl.back;
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const g = this.add.graphics();
    g.fillStyle(C.back, 1).fillRoundedRect(r.x, r.y, r.width, r.height, 22);
    const v = (x: number, y: number) => new Phaser.Math.Vector2(cx + x, cy + y);
    g.fillStyle(0xffffff, 1).fillPoints([v(-30, 0), v(-4, -22), v(-4, -8), v(28, -8), v(28, 8), v(-4, 8), v(-4, 22)], true);
    const zone = this.add.zone(cx, cy, r.width, r.height).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_UP, () => this.back());
    this.root!.add([g, zone]);
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    audio.play('pick');
    this.game.events.once(Phaser.Core.Events.POST_STEP, () => this.data0.onBack());
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.seenKeys.has(e)) return;
    this.seenKeys.add(e);
    if (e.code === 'Escape' || e.code === 'Backspace') this.back();
  }

  private installDebugHook(): void {
    if (!new URLSearchParams(location.search).has('debug')) return;
    (window as unknown as { __parent: unknown }).__parent = {
      scene: this,
      layout: () => this.pl,
      state: () => ({
        ...this.data0.read(),
        reset: { progress: this.tracker.progress(this.time.now), holding: this.tracker.holding, done: this.resetDone },
        demoTick: this.demoTick,
        page: this.page,
        preview: this.previewButtons,
        fps: this.game.loop.actualFps,
      }),
    };
  }
}
