// Input Lab: lets the parent try controls, button sizes and sounds on a real device, and the avatar looks
// (`?look=`, `?char=`; Power plays the shoot animation and fires a harmless energy ball, Task 005b).
// Not a game level: no physics engine, no goals.
import Phaser from 'phaser';
import type { Action } from '../../../core/types';
import { InputManager, type InputConfig } from '../../../core/input/InputManager';
import { TouchControls } from '../../../core/ui/TouchControls';
import { getLayout, type Layout } from '../../../core/ui/layout';
import { audio } from '../../../core/audio/AudioManager';
import { AvatarDriver } from '../../../core/avatar/AvatarDriver';
import { createLook, lookFromUrl } from '../../../core/avatar/createLook';
import { resolveAvatar } from '../../../core/avatar/config';
import { energyBall, PART_RES } from '../../../core/avatar/parts';
import { makeEffectTextures } from '../../../core/levels/placeholders';
import { characters } from '../characters';

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
/** Half the hero's width, for keeping it on screen. */
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
  private hero!: AvatarDriver;
  /** Hero feet position (logical px). */
  private heroX = 0;
  private heroY = 0;
  private vy = 0;
  private facing: 1 | -1 = 1;
  private airborneSince = -1;
  private jumped = false;
  private character = characters[0];
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

    // The hero is the chosen character in the chosen look, moved by the same avatar code as the levels.
    makeEffectTextures(this);
    const charId = new URLSearchParams(location.search).get('char');
    this.character = characters.find((c) => c.id === charId) ?? characters[0];
    this.heroX = this.layout.centerX;
    this.heroY = this.groundY();
    const look = createLook(this, lookFromUrl(), this.character, this.heroX, this.heroY);
    this.hero = new AvatarDriver(this, {
      look,
      x: this.heroX,
      feet: this.heroY,
      depth: 10,
      refSpeed: SPEED,
      gait: 'walk',
      groundAt: () => this.groundY(),
    });

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

    // Test/debug hook, only with ?debug=1.
    if (new URLSearchParams(location.search).has('debug')) {
      (window as unknown as { __lab: unknown }).__lab = {
        input: this.input2,
        controls: this.controls,
        layout: this.layout,
        audio,
        scene: this,
        mode: () => this.modeIndex + 1,
        anim: () => this.hero.animState(),
        hero: () => ({ x: this.heroX, y: this.heroY, facing: this.facing, look: this.hero.look.name }),
      };
    }
  }

  override update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    const input = this.input2;

    let dir = 0;
    if (input.isDown('left')) dir -= 1;
    if (input.isDown('right')) dir += 1;
    if (dir !== 0) this.facing = dir as 1 | -1;
    const safe = this.layout.safeRect;
    const minX = safe.x + HERO_R;
    const maxX = safe.x + safe.width - HERO_R;
    const before = this.heroX;
    this.heroX = Phaser.Math.Clamp(this.heroX + dir * SPEED * dt, minX, maxX);
    const vx = dt > 0 ? (this.heroX - before) / dt : 0;

    const floor = this.groundY();
    const onGround = this.heroY >= floor - 0.5;
    if (input.justPressed('jump') && onGround) {
      this.vy = -JUMP_V;
      this.jumped = true;
      this.hero.takeoff(time);
    }
    this.vy += GRAVITY * dt;
    this.heroY = Math.min(floor, this.heroY + this.vy * dt);
    const grounded = this.heroY >= floor;
    if (grounded) {
      this.vy = 0;
      if (this.airborneSince >= 0 && time - this.airborneSince > 120) this.hero.land(time, this.heroX, floor);
      this.airborneSince = -1;
      this.jumped = false;
    } else if (this.airborneSince < 0) {
      this.airborneSince = time;
    }
    this.hero.update({
      time,
      dtMs: dt * 1000,
      x: this.heroX,
      bottom: this.heroY,
      vx,
      vy: this.vy,
      onGround: grounded,
      enabled: true,
      airborneMs: this.airborneSince < 0 ? 0 : time - this.airborneSince,
      jumped: this.jumped,
      ride: null,
      facing: this.facing,
    });

    for (const a of ACTIONS) {
      const light = this.indicators.get(a)!;
      const enabled = input.isEnabled(a);
      light.setFillStyle(LIGHT_COLORS[a], input.isDown(a) ? 1 : enabled ? 0.3 : 0.08);
      light.setStrokeStyle(4, 0xffffff, enabled ? 1 : 0.3);
    }
    this.audioLight.setFillStyle(audio.state === 'running' ? 0x43a047 : 0xe53935);
  }

  /** Top of the ground: where the hero's feet stand. */
  private groundY(): number {
    return this.layout.height - GROUND_H;
  }

  private onPress(action: Action): void {
    switch (action) {
      case 'jump':
        audio.play('jump');
        break;
      case 'power':
        audio.play('power');
        this.shoot();
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

  /** Power: the look's shoot animation and a small energy ball that flies forward and fades. No gameplay. */
  private shoot(): void {
    const now = this.time.now;
    this.hero.shoot(now);
    // Fire on the next frame, once the arm has started to point forward.
    this.time.delayedCall(40, () => {
      const from = this.hero.look.muzzle();
      const part = energyBall(this, resolveAvatar(this.character.avatar).palette);
      const dir = this.facing;
      const ball = this.add.image(from.x, from.y, part.key).setOrigin(part.ox, part.oy).setScale(1 / PART_RES).setDepth(11);
      this.tweens.add({
        targets: ball,
        x: from.x + dir * 520,
        alpha: { from: 1, to: 0 },
        scale: { from: 1.1 / PART_RES, to: 0.6 / PART_RES },
        duration: 650,
        ease: 'Sine.easeOut',
        onComplete: () => ball.destroy(),
      });
    });
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
    this.heroX = Phaser.Math.Clamp(this.heroX || l.centerX, safe.x + HERO_R, safe.x + safe.width - HERO_R);
    this.heroY = Math.min(this.heroY || this.groundY(), this.groundY());
  }
}
