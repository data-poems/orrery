import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// ISO stamp baked into every production bundle — check Safari Web Inspector → Console
// on device to confirm you are running the JS you just built (not a cached copy).
// With SOURCE_DATE_EPOCH set (seconds, as reproducible-builds.org defines it) the stamp
// is that moment instead of now, so two builds of one commit come out byte-identical.
// The Android release command and the F-Droid recipe set it to the commit time.
const sourceDateEpoch = Number(process.env.SOURCE_DATE_EPOCH)
const buildStamp = (
  Number.isFinite(sourceDateEpoch) && sourceDateEpoch > 0
    ? new Date(sourceDateEpoch * 1000)
    : new Date()
).toISOString()
const packageVersion = (JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }).version

// https://vite.dev/config/
export default defineConfig({
  define: {
    __ORRERY_BUILD_STAMP__: JSON.stringify(buildStamp),
    __ORRERY_APP_VERSION__: JSON.stringify(packageVersion),
  },
  plugins: [react()],
  base: '/orrery/',
  build: {
    rollupOptions: {
      output: {
        // Peel satellite.js (only the Satellites layer needs it) into its own
        // chunk. NOTE: do not manualChunk @react-three/xr — it shares the three.js
        // graph, so grouping it drags all of three into the chunk rather than
        // isolating XR. Deferring XR needs a lazy import boundary, not a chunk.
        manualChunks(id: string) {
          if (id.includes('node_modules/satellite.js')) return 'satellite';
        },
      },
    },
  },
  server: {
    allowedHosts: true,
    host: true,
    // Avoid stale-module confusion while iterating on UI (esp. mobile Safari over LAN).
    headers: { 'Cache-Control': 'no-store' },
  },
  preview: {
    headers: { 'Cache-Control': 'no-store' },
  },
})
