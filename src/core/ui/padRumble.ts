// Gamepad rumble (Task 048): a small buzz in the controller for the things he already hears. One table maps a sound id to a
// rumble, so the audio module needs one line and no scene changes. Gentle on purpose (a 3-year-old holds it): short, never
// continuous except a light hum while flying. The parent's vibration switch turns it off. Never throws.
import { settings } from '../settings/settings';

export interface Rumble {
  /** Length in ms. */
  ms: number;
  /** Light motor (high buzz) and heavy motor (low thump), 0..1. */
  weak: number;
  strong: number;
}

const R = (ms: number, weak: number, strong: number): Rumble => ({ ms, weak, strong });

const TABLE: Readonly<Record<string, Rumble>> = {
  jump: R(40, 0.25, 0),
  coin: R(30, 0.2, 0),
  rainbowCoin: R(140, 0.5, 0.2),
  power: R(45, 0.2, 0.15),
  rainbow: R(240, 0.7, 0.5),
  boing: R(130, 0.4, 0.8),
  bump: R(80, 0.3, 0.3),
  transform: R(350, 0.6, 0.5),
  megaTransform: R(800, 1, 1),
  megaStep: R(90, 0, 0.6),
  megaPop: R(140, 0.5, 0.7),
  flyHum: R(300, 0.15, 0.1),
  flashZip: R(160, 0.5, 0.2),
  flashWhoosh: R(160, 0.4, 0.2),
  bugPop: R(140, 0.6, 0.3),
  beetleHit: R(90, 0.3, 0.6),
  beetlePop: R(160, 0.5, 0.6),
  batPop: R(140, 0.6, 0.3),
  golemHit: R(110, 0.3, 0.8),
  golemStep: R(100, 0, 0.5),
  golemCrumble: R(900, 0.8, 0.9),
  gateOpen: R(500, 0.4, 0.7),
  stickerGet: R(300, 0.6, 0.4),
  unlock: R(250, 0.5, 0.3),
  win: R(500, 0.6, 0.5),
  guardianWin: R(700, 0.7, 0.7),
  comboRow: R(200, 0.5, 0.3),
};

/** The rumble for a sound id, or null for none. Bubble pops (`pop-0`..`pop-5`) get a little tick that grows with the pitch. */
export function rumbleFor(id: string): Rumble | null {
  const pop = /^pop-(\d+)$/.exec(id);
  if (pop) return R(55, 0.3 + 0.05 * Math.min(5, Number(pop[1])), 0.12);
  return TABLE[id] ?? null;
}

type Actuator = { playEffect?: (type: string, params: Record<string, number>) => Promise<unknown> };

/** Rumbles every connected controller that can. */
export function rumblePads(r: Rumble, startDelay = 0): void {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
    for (const pad of navigator.getGamepads()) {
      const act = (pad as unknown as { vibrationActuator?: Actuator } | null)?.vibrationActuator;
      if (!pad?.connected || !act?.playEffect) continue;
      act.playEffect('dual-rumble', { startDelay, duration: r.ms, weakMagnitude: r.weak, strongMagnitude: r.strong })?.catch?.(() => {});
    }
  } catch {
    // A controller that refuses is fine.
  }
}

/** A sound was played: rumble for it if the parent's switch is on. */
export function rumbleForSound(id: string): void {
  try {
    if (!settings.vibration()) return;
    const r = rumbleFor(id);
    if (r) rumblePads(r);
  } catch {
    // Never breaks the game.
  }
}

/** A phone-style pattern (on, off, on ...) played on the controller too, strong and clear (the fall buzz). */
export function rumblePattern(pattern: number | number[]): void {
  const p = Array.isArray(pattern) ? pattern : [pattern];
  let at = 0;
  p.forEach((ms, i) => {
    if (i % 2 === 0 && ms > 0) rumblePads({ ms, weak: 0.7, strong: 0.7 }, at);
    at += ms;
  });
}
