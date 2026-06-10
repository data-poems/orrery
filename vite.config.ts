import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ISO stamp baked into every production bundle — check Safari Web Inspector → Console
// on device to confirm you are running the JS you just built (not a cached copy).
const buildStamp = new Date().toISOString()

// https://vite.dev/config/
export default defineConfig({
  define: {
    __ORRERY_BUILD_STAMP__: JSON.stringify(buildStamp),
  },
  plugins: [react()],
  base: '/orrery/',
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
