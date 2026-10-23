/// <reference lib="webworker" />
// Service worker (bundled by vite-plugin-pwa, injectManifest strategy).
// - Precaches the shell (index.html, entry + Phaser chunk, icons, manifest).
// - Caches universe chunks and their assets on first use, so a visited universe works offline.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

// autoUpdate: a new version takes over as soon as it is installed.
void self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Offline navigation (any URL in scope) falls back to the cached shell.
registerRoute(new NavigationRoute(createHandlerBoundToURL(`${import.meta.env.BASE_URL}index.html`)));

// Universe chunks and assets: file names are content-hashed, so cache-first is safe.
registerRoute(
  ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith(`${import.meta.env.BASE_URL}assets/`),
  new CacheFirst({
    cacheName: 'universe-chunks-and-assets',
    plugins: [new ExpirationPlugin({ maxEntries: 500 })],
  }),
);
