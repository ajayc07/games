// DOM wiring for the auto-pause (Task 027, D-070): pauses the game loop, releases the screen wake lock, and shows a big
// play button; the next tap (or key) wakes everything. The tap that wakes it is not passed on to the game.
import type Phaser from 'phaser';
import { IdleWatch, idleSecondsFrom } from './idle';
import { setScreenAwakeAllowed } from './wakeLock';

export function installIdleSleep(game: Phaser.Game, search: string = location.search): void {
  const seconds = idleSecondsFrom(search);
  if (!Number.isFinite(seconds)) return;
  const watch = new IdleWatch(seconds * 1000, performance.now());

  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'button');
  overlay.setAttribute('aria-label', 'Tap to play');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:50;display:none;align-items:center;justify-content:center;background:rgba(10,20,50,0.6);touch-action:none;cursor:pointer;';
  overlay.innerHTML =
    '<div style="width:min(34vmin,220px);height:min(34vmin,220px);border-radius:50%;background:#43a047;border:8px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(0,0,0,.35)">' +
    '<div style="margin-left:8%;width:0;height:0;border-top:min(9vmin,58px) solid transparent;border-bottom:min(9vmin,58px) solid transparent;border-left:min(15vmin,96px) solid #fff"></div></div>';
  document.body.appendChild(overlay);

  const hook = { sleeping: false };
  if (new URLSearchParams(search).has('debug')) (window as unknown as { __idle: typeof hook }).__idle = hook;

  const wake = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (!watch.sleeping) return;
    watch.wake(performance.now());
    overlay.style.display = 'none';
    setScreenAwakeAllowed(true);
    game.loop.wake();
    hook.sleeping = false;
  };
  overlay.addEventListener('pointerdown', wake);
  // While asleep a key press wakes it too, and goes no further (the game is paused anyway).
  window.addEventListener(
    'keydown',
    (e) => {
      if (watch.sleeping) wake(e);
    },
    true,
  );

  const now = () => performance.now();
  window.addEventListener('pointerdown', () => watch.down(now()), { passive: true, capture: true });
  window.addEventListener('pointerup', () => watch.up(now()), { passive: true, capture: true });
  window.addEventListener('pointercancel', () => watch.up(now()), { passive: true, capture: true });
  window.addEventListener('pointermove', () => watch.touch(now()), { passive: true, capture: true });
  window.addEventListener('keydown', () => watch.touch(now()), { passive: true, capture: true });
  window.addEventListener('keyup', () => watch.touch(now()), { passive: true, capture: true });

  window.setInterval(
    () => {
      if (!watch.shouldSleep(now())) return;
      watch.sleep();
      hook.sleeping = true;
      overlay.style.display = 'flex';
      setScreenAwakeAllowed(false);
      game.loop.sleep();
    },
    Math.min(2000, Math.max(250, (seconds * 1000) / 4)),
  );
}
