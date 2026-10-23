import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/games/',
  build: {
    target: 'es2022',
    // Phaser alone is ~1.2 MB minified; that is expected for this project.
    chunkSizeWarningLimit: 1600,
    rolldownOptions: {
      output: {
        // Universe modules get a recognisable file name so the service worker can leave them
        // out of the precache and cache them on first visit instead (see workbox below).
        chunkFileNames: (chunk) =>
          (chunk.facadeModuleId ?? '').replace(/\\/g, '/').includes('/src/universes/')
            ? 'assets/universe-[name]-[hash].js'
            : 'assets/[name]-[hash].js',
      },
    },
  },
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false, // registered from src/shell/pwa.ts
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: "Athi's Game",
        short_name: 'Athi',
        description: 'A gentle platformer for little hands.',
        start_url: '/games/',
        scope: '/games/',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#6ec6ff',
        theme_color: '#6ec6ff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // injectManifest (own src/sw.ts) rather than generateSW: workbox's generated template
      // breaks when the project path contains an apostrophe (local folder "Athi's Game").
      injectManifest: {
        // Shell is precached. Universe chunks are left out and cached on first use by sw.ts.
        globPatterns: ['index.html', 'assets/*.{js,css}', 'icons/*.{png,svg}', '*.webmanifest'],
        globIgnores: ['assets/universe-*'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
});
