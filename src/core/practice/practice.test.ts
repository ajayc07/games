import { describe, expect, it } from 'vitest';
import { COMBO, ComboTracker, type ComboEvent, type ComboFrame } from './combo';
import { COACH, CoachTimer, coachTaps } from './coach';
import { STICKY, StickyWalk } from '../levels/stickyWalk';
import { PRACTICE_MODES, type PracticeMode } from '../levels/practice';

const FRAME = 1000 / 60;
const idle = (now: number): ComboFrame => ({ now, left: false, right: false, jump: false, power: false, airborne: false, jumpPressed: false, powerPressed: false });

/** Runs a bot for `ms`: `at(now)` describes the frame; returns the events. */
function play(mode: PracticeMode, ms: number, at: (now: number, i: number) => Partial<ComboFrame>): { t: ComboTracker; events: ComboEvent[] } {
  const t = new ComboTracker(mode);
  const events: ComboEvent[] = [];
  for (let i = 0; i * FRAME < ms; i++) {
    const now = i * FRAME;
    const e = t.step({ ...idle(now), ...at(now, i) });
    if (e) events.push(e);
  }
  return { t, events };
}

/** True on the frames where a key pressed every `everyMs` goes down (an edge), offset by `phase`. */
const tapEvery = (now: number, everyMs: number, phase = 0) => Math.floor((now - phase) / everyMs) !== Math.floor((now - phase - FRAME) / everyMs) && now >= phase;

describe('ComboTracker (Task 011)', () => {
  it('walk + shoot: Power pressed while Right is held counts; the stars fill and the fifth celebrates and empties the row', () => {
    const { t, events } = play('walk-shoot', 6000, (now) => {
      const p = tapEvery(now, 500, 100);
      return { right: true, power: p, powerPressed: p };
    });
    expect(events.length).toBeGreaterThanOrEqual(10);
    expect(events.every((e) => e.kind === 'nav-power' && e.nav === 'right' && e.action === 'power')).toBe(true);
    expect(events.slice(0, 6).map((e) => e.star)).toEqual([0, 1, 2, 3, 4, 0]);
    expect(events[4].rowDone).toBe(true);
    expect(events.filter((e) => e.rowDone).length).toBe(t.rows);
    expect(t.total).toBe(events.length);
    expect(t.stars).toBe(events.length % COMBO.rowSize);
  });

  it('a nav button let go a moment ago (up to 120 ms) still counts; later it does not', () => {
    const t = new ComboTracker('walk-shoot');
    t.step({ ...idle(0), left: true });
    expect(t.step({ ...idle(110), powerPressed: true, power: true })?.nav).toBe('left');
    const u = new ComboTracker('walk-shoot');
    u.step({ ...idle(0), left: true });
    expect(u.step({ ...idle(140), powerPressed: true, power: true })).toBeNull();
  });

  it('each focus counts only its own combo', () => {
    const navJump = { right: true, jumpPressed: true, jump: true };
    const navPower = { left: true, powerPressed: true, power: true };
    const airPower = { airborne: true, powerPressed: true, power: true };
    const counts = (mode: PracticeMode) =>
      [navJump, navPower, airPower].map((f) => new ComboTracker(mode).step({ ...idle(1000), ...f })?.kind ?? null);
    expect(counts('walk-shoot')).toEqual([null, 'nav-power', null]);
    expect(counts('jump-shoot')).toEqual([null, null, 'air-power']);
    expect(counts('walk-jump')).toEqual(['nav-jump', null, null]);
    expect(counts('everything')).toEqual(['nav-jump', 'nav-power', 'air-power']);
    // Power in the air while walking: the nav button is named (both buttons sparkle).
    expect(new ComboTracker('everything').step({ ...idle(0), ...airPower, right: true })).toMatchObject({ kind: 'nav-power', nav: 'right' });
    expect(new ComboTracker('jump-shoot').step({ ...idle(0), ...airPower, right: true })).toMatchObject({ kind: 'air-power', nav: 'right' });
  });

  for (const mode of PRACTICE_MODES) {
    it(`${mode}: a bot doing the focus combo fills the row and gets the celebration at five`, () => {
      const { events } = play(mode, 8000, (now) => {
        const p = tapEvery(now, 700, 50);
        // Jump every 1.4 s; Power at about the top of each jump (0.42 s later).
        const air = (now % 1400) > 60 && (now % 1400) < 900;
        const jumpEdge = tapEvery(now, 1400, 40);
        const powerInAir = tapEvery(now, 1400, 460);
        if (mode === 'walk-shoot') return { right: true, power: p, powerPressed: p };
        if (mode === 'walk-jump') return { right: true, jump: p, jumpPressed: p };
        if (mode === 'jump-shoot') return { jump: jumpEdge, jumpPressed: jumpEdge, airborne: air, power: powerInAir, powerPressed: powerInAir };
        return { right: true, power: p, powerPressed: p };
      });
      expect(events.length, mode).toBeGreaterThanOrEqual(5);
      expect(events.some((e) => e.rowDone), mode).toBe(true);
    });
  }

  it('mashing one action button without a nav button gives nothing (except Power in the air)', () => {
    for (const mode of PRACTICE_MODES) {
      for (const action of ['jump', 'power'] as const) {
        const { events } = play(mode, 5000, (now) => {
          const p = tapEvery(now, 100);
          return action === 'jump' ? { jump: p, jumpPressed: p } : { power: p, powerPressed: p };
        });
        expect(events, `${mode} ${action}`).toEqual([]);
      }
    }
    const { events } = play('everything', 3000, (now) => {
      const p = tapEvery(now, 100);
      return { airborne: true, power: p, powerPressed: p };
    });
    expect(events.length).toBeGreaterThan(0);
  });

  it('mashing all four buttons cannot fill the row faster than the minimum gap allows', () => {
    for (const mode of PRACTICE_MODES) {
      const { events, t } = play(mode, 10000, (_now, i) => ({
        left: i % 3 === 0,
        right: i % 2 === 0,
        jump: i % 2 === 1,
        jumpPressed: i % 2 === 1,
        power: i % 2 === 0,
        powerPressed: i % 2 === 0,
        airborne: i % 50 > 10,
      }));
      for (let k = 1; k < events.length; k++) expect(events[k].at - events[k - 1].at).toBeGreaterThanOrEqual(COMBO.minGapMs);
      expect(events.length).toBeLessThanOrEqual(Math.floor(10000 / COMBO.minGapMs) + 1);
      // The first row takes at least four gaps.
      const fifth = events.find((e) => e.rowDone);
      if (fifth) expect(fifth.at - events[0].at).toBeGreaterThanOrEqual(4 * COMBO.minGapMs);
      expect(t.ignored).toBeGreaterThan(0);
    }
  });
});

describe('CoachTimer (Task 011)', () => {
  /** Steps the coach frame by frame; `combos` are times a combo counts. */
  function run(ms: number, opts: { playFrom?: number; possible?: (now: number) => boolean; combos?: number[] } = {}) {
    const c = new CoachTimer();
    const shows: number[] = [];
    const hides: number[] = [];
    const combos = [...(opts.combos ?? [])];
    for (let now = 0; now < ms; now += FRAME) {
      if (combos.length && now >= combos[0]) {
        combos.shift();
        if (c.combo(now) === 'hide') hides.push(now);
      }
      const ev = c.step({ now, playing: now >= (opts.playFrom ?? 0), possible: opts.possible?.(now) ?? true });
      if (ev === 'show') shows.push(now);
      if (ev === 'hide') hides.push(now);
    }
    return { c, shows, hides };
  }

  it('shows after about 8 s without a combo, for about 2.5 s, then stays quiet for 20 s', () => {
    const { shows, hides } = run(60000);
    expect(shows[0]).toBeGreaterThanOrEqual(COACH.idleMs);
    expect(shows[0]).toBeLessThan(COACH.idleMs + 50);
    expect(hides[0] - shows[0]).toBeGreaterThanOrEqual(COACH.showMs - 1);
    expect(hides[0] - shows[0]).toBeLessThan(COACH.showMs + 50);
    for (let i = 1; i < shows.length; i++) expect(shows[i] - hides[i - 1]).toBeGreaterThanOrEqual(COACH.quietMs);
    expect(shows.length).toBe(3); // 8 s, then every 2.5 + 20 s: 30.5 s, 53 s
  });

  it('stops at once on a combo and never comes back within 20 s', () => {
    const { shows, hides } = run(40000, { combos: [9000] });
    expect(shows[0]).toBeLessThan(9000);
    expect(hides[0]).toBeGreaterThanOrEqual(9000);
    expect(hides[0]).toBeLessThan(9000 + FRAME);
    expect(hides[0] - shows[0]).toBeLessThan(COACH.showMs);
    expect(shows[1]).toBeGreaterThanOrEqual(hides[0] + COACH.quietMs);
  });

  it('combos keep it away: a combo every 5 s means no hint at all', () => {
    expect(run(60000, { combos: [4000, 9000, 14000, 19000, 24000, 29000, 34000, 39000, 44000, 49000, 54000] }).shows).toEqual([]);
  });

  it('never during the intro, and the clock starts with the run', () => {
    const { shows } = run(30000, { playFrom: 5000 });
    expect(shows[0]).toBeGreaterThanOrEqual(5000 + COACH.idleMs);
  });

  it('never while no combo is possible (over a gap, on the cloud); it ends at once when that starts', () => {
    const blocked = (now: number) => !(now > 7000 && now < 12000);
    const { shows, hides } = run(16000, { possible: blocked });
    expect(shows[0]).toBeGreaterThanOrEqual(12000);
    const cut = run(30000, { possible: (now) => !(now > 9000 && now < 9500) });
    expect(cut.shows[0]).toBeLessThan(9000);
    expect(cut.hides[0]).toBeGreaterThan(9000);
    expect(cut.hides[0]).toBeLessThan(9000 + 40);
    expect(hides.length).toBeLessThanOrEqual(shows.length);
  });

  it('the tapping finger shows the focus action', () => {
    expect(coachTaps('walk-shoot', 0)).toEqual(['power', 'power']);
    expect(coachTaps('walk-jump', 3)).toEqual(['jump', 'jump']);
    expect(coachTaps('jump-shoot', 0)).toEqual(['jump', 'power']);
    expect(coachTaps('everything', 0)).toEqual(['power', 'power']);
    expect(coachTaps('everything', 1)).toEqual(['jump', 'jump']);
  });
});

describe('StickyWalk walk assist (Task 011)', () => {
  /** Feeds (time, left, right) steps; returns the direction after each. */
  const feed = (s: StickyWalk, steps: Array<[number, boolean, boolean]>) => steps.map(([t, l, r]) => s.step(t, l, r));

  it('a quick tap on Right latches walking right; a second tap stops', () => {
    const s = new StickyWalk();
    expect(feed(s, [[0, false, true], [100, false, false], [500, false, false]])).toEqual([1, 1, 1]);
    expect(s.latch).toBe(1);
    expect(feed(s, [[1000, false, true], [1100, false, false], [1200, false, false]])).toEqual([1, 0, 0]);
    expect(s.latch).toBe(0);
  });

  it('tapping the other button reverses', () => {
    const s = new StickyWalk();
    feed(s, [[0, true, false], [80, false, false]]);
    expect(s.latch).toBe(-1);
    expect(feed(s, [[500, false, true], [600, false, false], [700, false, false]])).toEqual([1, 1, 1]);
    expect(s.latch).toBe(1);
  });

  it('a long hold walks while held and stops on release (as always), and cancels any latch', () => {
    const s = new StickyWalk();
    expect(feed(s, [[0, false, true], [STICKY.tapMs + 50, false, true], [900, false, false]])).toEqual([1, 1, 0]);
    expect(s.latch).toBe(0);
    feed(s, [[1000, true, false], [1050, false, false]]);
    expect(s.latch).toBe(-1);
    // Hold Right while latched left: walks right while held, the latch is gone, release stops.
    expect(feed(s, [[2000, false, true], [2400, false, true], [2500, false, false]])).toEqual([1, 1, 0]);
    expect(s.latch).toBe(0);
  });

  it('a press exactly at the limit is still a tap; just past it is a hold', () => {
    const s = new StickyWalk();
    feed(s, [[0, false, true], [STICKY.tapMs, false, false]]);
    expect(s.latch).toBe(1);
    const u = new StickyWalk();
    feed(u, [[0, false, true], [STICKY.tapMs + 1, false, false]]);
    expect(u.latch).toBe(0);
  });

  it('both held stands still; a fall cancels the latch', () => {
    const s = new StickyWalk();
    feed(s, [[0, false, true], [50, false, false]]);
    expect(s.step(100, true, true)).toBe(0);
    s.step(150, false, false);
    const t = new StickyWalk();
    feed(t, [[0, false, true], [50, false, false]]);
    t.cancel();
    expect(t.step(100, false, false)).toBe(0);
    expect(t.latch).toBe(0);
  });

  it('without taps it is exactly the normal walk (hold = move, release = stop)', () => {
    const s = new StickyWalk();
    expect(feed(s, [[0, false, false], [100, true, false], [800, true, false], [900, false, false], [1000, false, true], [1700, false, true], [1800, false, false]])).toEqual([0, -1, -1, 0, 1, 1, 0]);
  });
});
