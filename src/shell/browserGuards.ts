/**
 * Extra mobile safety on top of the CSS in index.html: no pinch-zoom, no double-tap zoom,
 * no long-press menu, no page scroll. Phaser still receives input on the canvas.
 */
export function installBrowserGuards(): void {
  const prevent = (e: Event) => e.preventDefault();
  document.addEventListener('contextmenu', prevent);
  document.addEventListener('gesturestart', prevent); // iOS Safari pinch
  document.addEventListener('gesturechange', prevent);
  document.addEventListener('dblclick', prevent);
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.cancelable) e.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) e.preventDefault(); // trackpad pinch-zoom on desktop
    },
    { passive: false },
  );
}
