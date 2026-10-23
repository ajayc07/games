import Phaser from 'phaser';
import { beep, unlockAudio } from '../../../core/audio/beep';

const COLORS = [0xff5252, 0xffd54f, 0x69f0ae, 0x7c4dff, 0xff9800, 0xf06292];
const NOTES = [523, 587, 659, 784, 880, 988]; // pentatonic-ish, always pleasant
const GROUND_HEIGHT = 120;
const BALL_RADIUS = 110;

/** Task 001 smoke test: proves rendering, touch, keyboard and audio unlock work. */
export class PlaceholderScene extends Phaser.Scene {
  static readonly KEY = 'mario-placeholder';
  private ball!: Phaser.GameObjects.Arc;
  private colorIndex = 0;

  constructor() {
    super(PlaceholderScene.KEY);
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setBackgroundColor('#6ec6ff');

    this.add.rectangle(width / 2, height - GROUND_HEIGHT / 2, width, GROUND_HEIGHT, 0x4caf50);
    this.add.rectangle(width / 2, height - GROUND_HEIGHT + 8, width, 16, 0x388e3c);

    this.ball = this.add.circle(width / 2, this.restY(), BALL_RADIUS, COLORS[0]);
    this.ball.setStrokeStyle(10, 0xffffff);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.react());
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, (e: KeyboardEvent) => {
      if (!e.repeat) this.react();
    });
  }

  private restY(): number {
    return this.scale.gameSize.height - GROUND_HEIGHT - BALL_RADIUS;
  }

  private react(): void {
    unlockAudio();
    this.colorIndex = (this.colorIndex + 1) % COLORS.length;
    this.ball.setFillStyle(COLORS[this.colorIndex]);
    beep(NOTES[this.colorIndex]);

    // Restart the bounce from the resting spot so mashing never drifts or stacks.
    const restY = this.restY();
    this.tweens.killTweensOf(this.ball);
    this.ball.setY(restY).setScale(1);
    this.tweens.add({
      targets: this.ball,
      y: restY - 220,
      duration: 260,
      ease: 'Quad.easeOut',
      yoyo: true,
    });
    this.tweens.add({
      targets: this.ball,
      scaleX: 1.15,
      scaleY: 0.85,
      duration: 90,
      yoyo: true,
      delay: 520,
    });
  }
}
