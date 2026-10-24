// "Watch me" demo logic (D-024), framework-free and unit-tested. The Phaser side lives in LevelScene.
import type { DemoConfig } from './format';

/**
 * Turns a demo config into scripted presses. Call `step(x)` once per frame with the ghost's centre x:
 * it says whether to press Jump this frame (the ghost just entered a jump column) and when the demo is over.
 * Each jump column fires once, in order, even if a long frame skips past several columns.
 */
export class DemoScript {
  private next = 0;
  private readonly jumpXs: number[];
  private readonly endX: number;

  constructor(config: DemoConfig, tileSize: number) {
    this.jumpXs = config.jumpsAtTiles.map((col) => col * tileSize);
    this.endX = config.tiles * tileSize;
  }

  step(x: number): { jump: boolean; done: boolean } {
    let jump = false;
    while (this.next < this.jumpXs.length && x >= this.jumpXs[this.next]) {
      jump = true;
      this.next++;
    }
    return { jump, done: x >= this.endX };
  }

  /** Number of presses made so far. */
  get pressed(): number {
    return this.next;
  }
}

/** Value of the `?demo=` URL parameter: '1' forces the demo, '0' skips it, anything else = normal rules. */
export type DemoOverride = 'force' | 'skip' | null;

export function demoOverrideFrom(search: string): DemoOverride {
  const v = new URLSearchParams(search).get('demo');
  if (v === '1') return 'force';
  if (v === '0') return 'skip';
  return null;
}

/** The demo plays once per session per level (in memory), unless the URL forces or skips it. */
export function shouldPlayDemo(config: DemoConfig | false, seenThisSession: boolean, override: DemoOverride): boolean {
  if (!config || override === 'skip') return false;
  return override === 'force' || !seenThisSession;
}

/** A tap ends the demo only after this long, so the child sees at least one press. */
export const DEMO_SKIP_AFTER_MS = 1500;
