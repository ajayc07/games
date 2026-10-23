import { registerSW } from 'virtual:pwa-register';

/** Registers the service worker (production builds only). Updates apply automatically. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  registerSW({ immediate: true });
}
