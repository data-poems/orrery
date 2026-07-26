import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';

const packageVersion = (JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }).version;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
  define: {
    'import.meta.env.BASE_URL': JSON.stringify('/'),
    'import.meta.env.VITE_NEO_FEED_URL': JSON.stringify(''),
    'import.meta.env.VITE_NASA_API_KEY': JSON.stringify(''),
    __ORRERY_APP_VERSION__: JSON.stringify(packageVersion),
  },
});
