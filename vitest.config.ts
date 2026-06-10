import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
  define: {
    'import.meta.env.BASE_URL': JSON.stringify('/'),
    'import.meta.env.VITE_NEO_FEED_URL': JSON.stringify(''),
    'import.meta.env.VITE_NASA_API_KEY': JSON.stringify(''),
  },
});
