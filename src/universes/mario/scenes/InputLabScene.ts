// Input Lab: lets the parent try controls, button sizes and sounds on a real device
// before any level exists. Not a game level: no physics engine, no goals.
import Phaser from 'phaser';
import type { Action } from '../../../core/types';
import { InputManager, type InputConfig } from '../../../core/input/InputManager';
import { TouchControls } from '../../../core/ui/TouchControls';
import { getLayout, type Layout } from '../../../core/ui/layout';
import { audio } from '../../../core/audio/AudioManager';

/** The control ladder (D-001), one config per mode. */
const MODES: InputConfig[] = [
  { enabled: ['jump'], tapAnywhereJumps: true }, // 1: tap anywhere
  { enabled: ['jump'], tapAnywhereJumps: false }, // 2: Jump button only
  { enabled: ['left', 'right', 'jump'], tapAnywhereJumps: false }, // 3: Left + Right + Jump
  { enabled: ['left', 'right', 'jump', 'power'], tapAnywhereJumps: false }, // 4: everything
];
const DEFAULT_MODE = 2; // index of mode 3
const MODE_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];

const ACTIONS: Action[] = ['left', 'right', 'jump', 'power'];
const LIGHT_COLORS: Record<Action, number> = { left: 0xff8f00, right: 0xff8f00, jump: 0xe53935, power: 0x8e24aa };

const GROUND_H = 110;
const HERO_R = 48;
const SPEED = 420; // px/s
const JUMP_V = 980; // px/s
const GRAVITY = 2600; // px/s^2

export class InputLabScene extends Phaser.Scene {
  static readonly KEY = 'mario-input-lab';

  private layout!: Layout;
  private input2!: InputManager;
  private controls!: TouchControls;
  private ground!: Phaser.GameObjects.Rectangle;
  private groundTop!: Phaser.GameObjects.Rectangle;
  private hero!: Phaser.GameObjects.Container;
  private heroBody!: Phaser.GameObjects.Arc;
  private vy = 0;
  private facing = 1;
  private indicators = new Map<Action, Phaser.GameObjects.Arc>();
  private audioLight!: Phaser.GameObjects.Arc;
  private modeIcons: Phaser.GameObjects.Container[] = [];
  private modeIndex = DEFAULT_MODE;

  constructor() {
    super(InputLabScene.KEY);
  }

  create(): void {
    this.layout = getLayout();
    this.cameras.main.setBackgroundColor('#6ec6ff');

    this.ground = this.add.rectangle(0, 0, 10, GROUND_H, 0x4caf50).setOrigin(0, 0);
    this.groundTop = this.add.rectangle(0, 0, 10, 16, 0x388e3c).setOrigin(0, 0);

    this.heroBody = this.add.circle(0, 0, HERO_R, 0xff5252).setStrokeStyle(6, 0xffffff);
    const eyeL = this.add.circle(10, -12, 9, 0xffffff);
    const eyeR = this.add.circle(30, -12, 9, 0xffffff);
    const pupilL = this.add.circle(13, -12, 4, 0x222222);
    const pupilR = this.add.circle(33, -12, 4, 0x222222);
    this.hero = this.add.container(0, 0, [this.heroBody, eyeL, eyeR, pupilL, pupilR]);

    this.input2 = new InputManager(this, {
      reservedKeys: MODE_KEYS,
      ignorePointer: (x, y) => this.modeIcons.some((c) => c.getBounds().contains(x, y)),
    });
    this.controls = new TouchControls(this, this.input2, this.layout);

    this.createLights();
    this.createModeIcons();

    this.input2.onPress(({ action }) => this.onPress(action));
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, (e: KeyboardEvent) => {
      const i = MODE_KEYS.indexOf(e.code);
      if (i >= 0) this.setMode(i);
    });

    this.layout.bindToScene(this, (l) => this.relayout(l));
    this.setMode(this.modeIndex, false);
    this.hero.setPosition(this.layout.centerX, this.groundY());

    // Test/debug hook, only with ?debug=1.
    if (new URLSearchParams(location.search).has('debug')) {
      (window as unknown as { __lab: unknown }).__lab = {
        input: this.input2,
        controls: this.controls,
        layout: this.layout,
        audio,
        scene: this,
        mode: () => this.modeIndex + 1,
      };
    }
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    const input = this.input2;

    let dir = 0;
    if (input.isDown('left')) dir -= 1;
    if (input.isDown('right')) dir += 1;
    if (dir !== 0) this.facing = dir;
    const safe = this.layout.safeRect;
    const minX = safe.x + HERO_R;
    const maxX = safe.x + safe.width - HERO_R;
    this.hero.x = Phaser.Math.Clamp(this.hero.x + dir * SPEED * dt, minX, maxX);
    this.hero.scaleX = this.facing;

    const floor = this.groundY();
    if (input.justPressed('jump') && this.hero.y >= floor - 0.5) this.vy = -JUMP_V;
    this.vy += GRAVITY * dt;
    this.hero.y = Math.min(floor, this.hero.y + this.vy * dt);
    if (this.hero.y >= floor) this.vy = 0;

    for (const a of ACTIONS) {
      const light = this.indicators.get(a)!;
      const enabled = input.isEnabled(a);
      light.setFillStyle(LIGHT_COLORS[a], input.isDown(a) ? 1 : enabled ? 0.3 : 0.08);
      light.setStrokeStyle(4, 0xffffff, enabled ? 1 : 0.3);
    }
    this.audioLight.setFillStyle(audio.state === 'running' ? 0x43a047 : 0xe53935);
  }

  private groundY(): number {
    return this.layout.height - GROUND_H - HERO_R;
  }

  private onPress(action: Action): void {
    switch (action) {
      case 'jump':
        audio.play('jump');
        break;
      case 'power':
        audio.play('power');
        this.burst();
        break;
      default:
        audio.play('tap');
    }
  }

  private setMode(index: number, withSound = true): void {
    this.modeIndex = index;
    this.input2.configure(MODES[index]);
    this.modeIcons.forEach((c, i) => {
      const bg = c.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(i === index ? 0xffffff : 0xffffff, i === index ? 1 : 0.35);
      c.setScale(i === index ? 1.1 : 1);
    });
    if (withSound) audio.play('pick');
  }

  private burst(): void {
    const { x, y } = this.hero;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const p = this.add.circle(x, y, 12, i % 2 ? 0xffeb3b : 0xffffff).setDepth(10);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(a) * 140,
        y: y + Math.sin(a) * 140,
        alpha: 0,
        scale: 0.3,
        duration: 420,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
    this.tweens.add({ targets: this.heroBody, scale: 1.25, duration: 100, yoyo: true });
  }

  private createLights(): void {
    for (const a of ACTIONS) {
      this.indicators.set(a, this.add.circle(0, 0, 16, LIGHT_COLORS[a], 0.3).setStrokeStyle(4, 0xffffff).setDepth(900));
    }
    this.audioLight = this.add.circle(0, 0, 12, 0xe53935).setStrokeStyle(4, 0xffffff).setDepth(900);
  }

  private createModeIcons(): void {
    const size = 64;
    for (let i = 0; i < MODES.length; i++) {
      const bg = this.add.rectangle(0, 0, size, size, 0xffffff, 0.35).setStrokeStyle(4, 0xffffff);
      const dots: Phaser.GameObjects.Arc[] = [];
      for (let d = 0; d <= i; d++) {
        const cols = i < 2 ? i + 1 : 2;
        const row = Math.floor(d / cols);
        const col = d % cols;
        const rows = Math.ceil((i + 1) / cols);
        dots.push(this.add.circle((col - (cols - 1) / 2) * 20, (row - (rows - 1) / 2) * 20, 7, 0x1565c0));
      }
      const c = this.add.container(0, 0, [bg, ...dots]).setDepth(900).setSize(size, size);
      c.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.POINTER_DOWN, () => this.setMode(i));
      this.modeIcons.push(c);
    }
  }

  private relayout(l: Layout): void {
    this.ground.setPosition(0, l.height - GROUND_H).setSize(l.width, GROUND_H);
    this.groundTop.setPosition(0, l.height - GROUND_H).setSize(l.width, 16);

    const top = l.anchor('top', 0, 36);
    ACTIONS.forEach((a, i) => this.indicators.get(a)!.setPosition(top.x + (i - 2) * 44, top.y));
    this.audioLight.setPosition(top.x + 2 * 44 + 18, top.y);

    this.modeIcons.forEach((c, i) => {
      const p = l.anchor('top-right', 24 + 32 + (MODES.length - 1 - i) * 76, 24 + 32);
      c.setPosition(p.x, p.y);
    });

    const safe = l.safeRect;
    this.hero.x = Phaser.Math.Clamp(this.hero.x || l.centerX, safe.x + HERO_R, safe.x + safe.width - HERO_R);
    this.hero.y = Math.min(this.hero.y || this.groundY(), this.groundY());
  }
}
