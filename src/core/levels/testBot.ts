// A tiny kinematic copy of the level physics and a scripted bot, shared by the practice and variety tests (not shipped).
import { extractEntities } from './grid';
import { PHYSICS } from './physics';
import { bubbleSpecs, shotHitsBubble } from './bubbles';
import { PRACTICE, ROW } from './practice';
import { SHOT } from './shots';
import { edgeLimit, rampSpeed } from './walk';

export const T = PRACTICE.tileSize;
export const GRID_TOP = 720 - PRACTICE.rows * T;
export const GROUND_Y = GRID_TOP + ROW.ground * T;

/** Runs of missing ground in the row under the start. */
export function gapsOf(e: ReturnType<typeof extractEntities>): number[][] {
  const out: number[][] = [];
  e.solid[e.start.row + 1].forEach((s, c) => {
    if (s) return;
    const last = out[out.length - 1];
    if (last && last[last.length - 1] === c - 1) last.push(c);
    else out.push([c]);
  });
  return out;
}

/**
 * A tiny kinematic copy of the level physics (walk ramp, gravity, fixed jump, shots, coin pick-up) and a bot that plays
 * like a child who knows what to do: turn round and pop the pair behind the start, then walk right tapping Power, jump at
 * each gap edge, and jump under each high bubble pressing Power at the top. It checks what the generator promises: the
 * flag is reachable and every coin and bubble can be collected without a fall.
 */
export function runBot(e: ReturnType<typeof extractEntities>, opts: { jumpForCoins?: boolean } = {}) {
  const W = e.cols * T;
  const dtMs = 1000 / 60;
  const dt = dtMs / 1000;
  const half = PHYSICS.body.width / 2;
  const solidAt = (x: number) => {
    const c = Math.floor(x / T);
    return c < 0 || c >= e.cols ? true : e.solid[ROW.ground][c];
  };
  const supported = (x: number) => solidAt(x - half) || solidAt(x + half - 0.001);
  const gaps = gapsOf(e);
  const specs = bubbleSpecs(e.bubbles, T, GRID_TOP, e.solid).map((s) => ({ ...s, popped: false }));
  const coins = e.coins.map((c) => ({ x: c.col * T + T / 2, h: (ROW.ground - c.row) * T - T / 2, col: c.col, taken: false }));
  const shots: Array<{ x: number; h: number; dir: 1 | -1; travelled: number }> = [];
  let x = e.start.col * T + T / 2;
  let h = 0;
  let vy = 0;
  let v = 0;
  let grounded = true;
  let facing: 1 | -1 = 1;
  let lastShot = -1e9;
  let t = 0;
  let fell = false;
  let peakShotPending = false;
  const goalX = e.goal.col * T + T / 2;
  const fire = (shotH: number) => {
    if (t - lastShot < SHOT.cooldownMs || shots.length >= SHOT.maxInFlight) return false;
    lastShot = t;
    shots.push({ x: x + facing * 30, h: shotH, dir: facing, travelled: 0 });
    return true;
  };
  const behind = () => specs.some((s) => !s.popped && s.x < x);
  while (t < 90000) {
    t += dtMs;
    // Decide.
    let move: -1 | 0 | 1 = 1;
    let jump = false;
    const coinBehind = coins.find((c) => !c.taken && c.col < e.start.col);
    if (t < 6000 && coinBehind) {
      move = -1; // walk back for the coins behind the start
    } else if (t < 6000 && behind()) {
      move = facing === 1 ? -1 : 0; // turn round on the spot, then stand and shoot
      if (facing === -1) fire(h + 41);
    } else {
      if (grounded) {
        const g = gaps.find((gg) => gg[0] * T + T > x);
        if (g && x >= g[0] * T - 12 && x < g[0] * T) jump = true;
        const high = specs.find((s) => !s.popped && s.kind === 'high' && s.x > x && s.x - x <= 260);
        const landing = x + 190;
        const clear = !gaps.some((gg) => gg[gg.length - 1] * T + T > x - half && gg[0] * T < landing + half + 20);
        if (opts.jumpForCoins && !jump) {
          // Jump for a coin above head height that is not part of a gap arc (those are taken by the gap-edge jump).
          const aboveHead = (c: { h: number }) => c.h + T / 2 > 2 * T + 1;
          const arcCoin = (c: { col: number }) => gaps.some((gg) => gg.some((gc) => Math.abs(gc - c.col) <= 3));
          if (coins.some((c) => !c.taken && aboveHead(c) && !arcCoin(c) && c.x > x && c.x - x <= 28)) jump = true;
        }
        if (!jump && high && clear) {
          jump = true;
          peakShotPending = true;
        }
      }
      if (!peakShotPending) fire(h + 41);
    }
    // Move (walk ramp and soft level ends as in Player.step).
    v = rampSpeed(v, move * PHYSICS.walkSpeed, dtMs, PHYSICS.walkSpeed, PHYSICS.walkRampUpMs, PHYSICS.walkRampDownMs);
    if (move !== 0) facing = move;
    x += edgeLimit(x, v, half, W - half) * dt;
    if (grounded && jump) {
      vy = PHYSICS.jumpVelocity;
      grounded = false;
    }
    if (grounded && !supported(x)) grounded = false;
    if (!grounded) {
      const before = vy;
      vy -= PHYSICS.gravity * dt;
      h += vy * dt;
      if (peakShotPending && before > 0 && vy <= 0) peakShotPending = !fire(h + 41);
      if (h <= 0 && vy < 0) {
        if (supported(x)) {
          h = 0;
          vy = 0;
          grounded = true;
          peakShotPending = false;
        } else if (h < -60) {
          fell = true;
          break;
        }
      }
    }
    // Shots.
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      const step = SHOT.speed * dt;
      s.x += s.dir * step;
      s.travelled += step;
      const hitBubble = specs.find((b) => !b.popped && shotHitsBubble(s.x, GROUND_Y - s.h, SHOT.radius, b, b.x, b.y));
      if (hitBubble) hitBubble.popped = true;
      if (hitBubble || s.travelled >= SHOT.range) shots.splice(i, 1);
    }
    // Coins (the body rectangle against the coin's circle, as LevelScene.collectCoins).
    for (const c of coins) {
      if (c.taken) continue;
      const nx = Math.max(x - half, Math.min(c.x, x + half));
      const nh = Math.max(h, Math.min(c.h, h + PHYSICS.body.height));
      if ((c.x - nx) ** 2 + (c.h - nh) ** 2 <= 18 * 18) c.taken = true;
    }
    if (x >= goalX - half) break;
  }
  return {
    finished: !fell && x >= goalX - half,
    fell,
    x: Math.round(x),
    seconds: t / 1000,
    coinsLeft: coins.filter((c) => !c.taken).length,
    coinsLeftAt: coins.filter((c) => !c.taken).map((c) => c.col),
    bubblesLeft: specs.filter((s) => !s.popped).length,
    bubblesLeftAt: specs.filter((s) => !s.popped).map((s) => Math.floor(s.x / T)),
  };
}
