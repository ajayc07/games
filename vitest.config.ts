import { defineConfig } from 'vitest/config';

// Unit tests for pure logic only (D-014). Kept separate from vite.config.ts so the PWA plugin is not loaded.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
