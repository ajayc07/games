import { describe, expect, it } from 'vitest';
import { BOSS, BOSS_COINS, bossBeaten, bossErrors, bossFromSearch, bossHitCircle, bossPose, bossSpeed, bossTouches, crystalLight, shotHitsBoss } from './boss';
import { BugBump } from './bugs';
import { PHYSICS } from './physics';
import { SHOT, SHOT_HEIGHT } from './shots';

const T = 64;
const GROUND = 640; // the top of the ground in a 720 px screen with two ground rows
const BODY_H = PHYSICS.body.height;

describe('Cave Guardian numbers (Task 040, D-085)', () => {
  it('takes 10 hits, drops 2 coins a hit and 20 on the crumble (40 in all), walks 10 tiles at 35% of his walk', () => {
    expect(BOSS.hits).toBe(10);
    expect(BOSS.coinsPerHit).toBe(2);
    expect(BOSS.finishCoins).toBe(20);
    expect(BOSS_COINS).toBe(40);
    expect(BOSS.walk.patrolTiles).toBe(10);
    expect(bossSpeed()).toBeCloseTo(PHYSICS.walkSpeed * 0.35, 5);
    expect(bossBeaten(9)).toBe(false);
    expect(bossBeaten(10)).toBe(true);
  });

  it('the crystal gets brighter with every hit, never past 1', () => {
    const lights = Array.from({ length: 12 }, (_, i) => crystalLight(i));
    for (let i = 1; i < lights.length; i++) expect(lights[i]).toBeGreaterThanOrEqual(lights[i - 1]);
    expect(lights[0]).toBe(0);
    expect(lights[10]).toBe(1);
    expect(lights[11]).toBe(1);
  });

  it('walks inside its 10 tiles all the time, slowly, with a pause at each end', () => {
    const half = (BOSS.walk.patrolTiles * T) / 2;
    let prev = bossPose(0, T).dx;
    let top = 0;
    let pauses = 0;
    for (let t = 0; t < 40_000; t += 16) {
      const p = bossPose(t, T);
      expect(Math.abs(p.dx)).toBeLessThanOrEqual(half + 0.001);
      top = Math.max(top, Math.abs(p.dx - prev) / 0.016);
      if (!p.moving) pauses++;
      prev = p.dx;
    }
    expect(top).toBeLessThanOrEqual(bossSpeed() + 1);
    expect(pauses).toBeGreaterThan(0);
  });

  it('a standing robot and a robot at the top of a jump both reach the chest crystal from a distance (test of the data)', () => {
    const golemX = 1000;
    for (const dist of [60, 200, 380]) {
      for (const up of [SHOT_HEIGHT.standing.min, SHOT_HEIGHT.standing.max, SHOT_HEIGHT.jumpPeak.min, SHOT_HEIGHT.jumpPeak.max]) {
        // A shot flies level at the muzzle height; check it touches the circle somewhere along its path to the golem.
        let hit = false;
        for (let x = golemX - dist; x <= golemX; x += 8) hit = hit || shotHitsBoss(x, GROUND - up, SHOT.radius, golemX, GROUND, T);
        expect(hit, `muzzle ${up}px up at ${dist}px`).toBe(true);
      }
    }
    // A shot over its head (a rocket-boots shot 330 px up) does not, so the crystal still has to be aimed at a little.
    expect(shotHitsBoss(golemX - 100, GROUND - 330, SHOT.radius, golemX, GROUND, T)).toBe(false);
  });

  it('the shot range (640 px) is enough to hit it from 350 px away, so he can shoot from a distance', () => {
    const c = bossHitCircle(1000, GROUND, T);
    expect(SHOT.range).toBeGreaterThan(350 + c.r);
  });

  it('a touch is only the body: he stands clear 130+ px from the middle, and bumping starts when he is within the body', () => {
    const body = (cx: number) => ({ left: cx - 20, right: cx + 20, top: GROUND - BODY_H, bottom: GROUND });
    expect(bossTouches(body(1000 - 160), 1000, GROUND, T)).toBe(false);
    expect(bossTouches(body(1000 - 70), 1000, GROUND, T)).toBe(true);
    // Not high above it either (a jump over the golem is not possible, but the circle is bounded).
    expect(bossTouches({ left: 980, right: 1020, top: GROUND - 520, bottom: GROUND - 436 }, 1000, GROUND, T)).toBe(false);
  });

  it('the bump never traps him: from the left wall he can stand clear of the whole walk', () => {
    // Level of the task: walk centre col 20 (px 1312), left end col 15 -> middle at 992. Touch reach (circle 80 + half body 20) = 100.
    const leftMost = 15.5 * T - 5 * 0; // the golem's left turning point (middle of col 15)
    const clear = leftMost - (BOSS.touchRadius * T + PHYSICS.body.width / 2);
    expect(clear).toBeGreaterThan(12 * T); // the orbs (cols 8 and 11) are safe from a touch
    // And a bump from a touch always slides away from the golem for 300 ms (the Bolt Bug's rule).
    const bump = new BugBump();
    expect(bump.touch(0, 900, 1000, 1)).toBe(true);
    expect(bump.move(100)).toBe(-1);
    expect(bump.touch(500, 900, 1000, 1)).toBe(false); // grace
  });

  it('?boss=0 opens the gate without a fight', () => {
    expect(bossFromSearch('')).toBe(true);
    expect(bossFromSearch('?boss=1')).toBe(true);
    expect(bossFromSearch('?boss=0')).toBe(false);
  });
});

describe('arena rules (Task 040)', () => {
  const make = (patch: (rows: string[][]) => void = () => {}, width = 36): string[] => {
    const rows: string[][] = Array.from({ length: 11 }, (_, r) => Array.from({ length: width }, () => (r >= 9 ? '#' : '.')));
    rows[8][4] = 'S';
    rows[8][31] = 'F';
    rows[8][20] = 'G';
    patch(rows);
    return rows.map((r) => r.join(''));
  };
  it('a flat arena with the Guardian in the middle is fine; no G at all is fine too (other levels)', () => {
    expect(bossErrors(make())).toEqual([]);
    expect(bossErrors(['.....', '#####'])).toEqual([]);
  });
  it('rejects two Guardians, a narrow arena, a gap, blocks, and things in its walk', () => {
    expect(bossErrors(make((r) => (r[8][26] = 'G'))).join()).toContain('only have one');
    expect(bossErrors(make(() => {}, 24).concat()).join()).toContain('at least 28');
    expect(bossErrors(make((r) => (r[9][8] = '.', (r[10][8] = '.')))).join()).toContain('flat unbroken ground');
    expect(bossErrors(make((r) => (r[8][30] = 'B'))).join()).toContain('no blocks');
    expect(bossErrors(make((r) => (r[8][17] = 'c'))).join()).toContain('its walk must be empty');
    expect(bossErrors(make((r) => (r[5][22] = 'c'))).join()).toContain('its walk must be empty');
    expect(bossErrors(make((r) => (r[8][12] = 'P'))).join()).toContain('too close');
    expect(bossErrors(make((r) => (r[8][28] = 'F', (r[8][31] = '.')))).join()).toContain('too close');
  });
});

describe('a bot beats the Guardian (Task 040)', () => {
  const golemMiddle = 20.5 * T;
  /** Kinematic copy of the fight: the bot keeps 220-360 px from the golem, shoots every 300 ms (3 in flight) and is bumped on a touch. */
  function fight(opts: { quick?: boolean }) {
    const dt = 16;
    let x = 5 * T;
    let facing: 1 | -1 = 1;
    let hits = 0;
    let bumps = 0;
    let nextShot = 0;
    const shots: Array<{ x: number; dir: 1 | -1; up: number; start: number }> = [];
    const bump = new BugBump();
    let t = 0;
    for (; t < 90_000 && !bossBeaten(hits); t += dt) {
      const gx = golemMiddle + bossPose(t, T).dx;
      const forced = bump.move(t);
      let move: -1 | 0 | 1;
      if (forced !== 0) move = forced;
      else if (opts.quick) move = gx > x ? 1 : -1; // Mega, a car or Flash: walk into it
      else move = gx - x > 360 ? 1 : gx - x < 220 ? -1 : 0;
      x = Math.max(PHYSICS.body.width / 2, Math.min(36 * T - PHYSICS.body.width / 2, x + move * PHYSICS.walkSpeed * (dt / 1000)));
      if (forced === 0 && move !== 0) facing = move;
      if (forced === 0) facing = gx >= x ? 1 : -1;
      const body = { left: x - 20, right: x + 20, top: GROUND - BODY_H, bottom: GROUND };
      if (bossTouches(body, gx, GROUND, T) && bump.touch(t, x, gx, facing)) {
        bumps++;
        if (opts.quick) hits++;
      }
      if (!opts.quick && t >= nextShot && shots.length < SHOT.maxInFlight) {
        shots.push({ x: x + facing * 30, dir: facing, up: SHOT_HEIGHT.standing.min, start: x });
        nextShot = t + SHOT.cooldownMs;
      }
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.x += s.dir * SHOT.speed * (dt / 1000);
        if (shotHitsBoss(s.x, GROUND - s.up, SHOT.radius, gx, GROUND, T)) {
          hits++;
          shots.splice(i, 1);
        } else if (Math.abs(s.x - s.start) > SHOT.range) shots.splice(i, 1);
      }
    }
    return { hits, seconds: t / 1000, bumps, x };
  }

  it('by shooting from a distance: 10 hits in under 25 s and never bumped', () => {
    const r = fight({});
    expect(bossBeaten(r.hits)).toBe(true);
    expect(r.seconds).toBeLessThan(25);
    expect(r.bumps).toBe(0);
  });

  it('by walking into it as Mega, a car or Flash: each touch is one hit (never a one-touch kill), 10 hits take about 11 s each way', () => {
    const r = fight({ quick: true });
    expect(bossBeaten(r.hits)).toBe(true);
    expect(r.bumps).toBe(r.hits);
    expect(r.seconds).toBeGreaterThan(8); // not a one-touch kill: the grace time spaces the hits
    expect(r.seconds).toBeLessThan(80);
  });
});
