/**
 * Minimal placeholder audio for Task 001: unlock Web Audio on the first gesture and play a
 * generated beep. Task 002 replaces this with the full AudioManager.
 */
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/** Call from inside a user gesture handler. Safe to call many times. */
export function unlockAudio(): void {
  const c = getContext();
  if (c && c.state === 'suspended') void c.resume().catch(() => undefined);
}

/** Short, soft sine blip. Overlapping calls are fine (mashing is harmless). */
export function beep(frequency = 660, durationMs = 140): void {
  const c = getContext();
  if (!c) return;
  const now = c.currentTime;
  const end = now + durationMs / 1000;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(end + 0.02);
}
