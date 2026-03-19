# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (default http://localhost:5173)
pnpm build        # Type-check (tsc -b) then bundle (vite build)
pnpm lint         # ESLint with typescript-eslint + react-hooks
pnpm preview      # Serve production build locally
```

## Architecture

Single-file React Three Fiber application. All logic lives in `src/Orrery.tsx` (~900 lines).

**Stack**: React 19 + TypeScript + Three.js (@react-three/fiber + @react-three/drei) + Vite 8

### File Structure

- `src/Orrery.tsx` — Entire application: orbital mechanics, 3D scene, camera system, UI overlays, NASA API integration
- `src/App.tsx` — Thin wrapper, just renders `<Orrery />`
- `src/main.tsx` — React entry point
- `src/index.css` — Global reset + scrollbar styling
- `public/favicon.svg`, `public/icons.svg` — SVG assets

### Key Sections in Orrery.tsx

The file is organized with comment headers (`// ───`):

1. **TEX** — CDN URLs for planet texture maps (Solar System Scope, CC BY 4.0)
2. **PLANETS array** — JPL J2000 Keplerian elements with secular rates for all 8 planets, plus display metadata (radius, description, moon count, etc.)
3. **Math helpers** — Julian date conversion, Kepler's equation solver (Newton-Raphson), heliocentric XYZ from orbital elements, orbit path generation
4. **3D Components** — `Skybox`, `Sun`, `Planet`, `Moon`, `OrbitRing`, `AsteroidOrbitLine`, `AUGrid`, `NeoDot`
5. **CamCtrl** — Camera controller with lerp-based smooth transitions, OrbitControls integration, planet follow mode
6. **Scene** — Composes all 3D components, manages hover state and planet positions
7. **Orrery (default export)** — Main component: time simulation loop, NASA NeoWs/SBDB API fetching, keyboard shortcuts, all HUD panels

### Coordinate System

Heliocentric ecliptic coordinates transformed to Three.js: `[x, z, -y]` where y-up is the ecliptic normal. Distances are in AU (1 AU = 1 unit in scene space).

### External APIs (no auth except DEMO_KEY)

- **NASA NeoWs** (`api.nasa.gov/neo/rest/v1/feed`) — Fetches today's near-Earth objects on mount
- **NASA SBDB** (`ssd-api.jpl.nasa.gov/sbdb.api`) — Fetches asteroid orbital elements on-demand when a NEO is clicked

### Camera System

7 preset camera positions (`CAMS` array) selectable via keyboard 1-7. Planet click-to-focus overrides presets with a `FocusTarget` that tracks the planet's position each frame. All transitions use `Vector3.lerp(target, 0.03)`.

### UI Pattern

All HUD elements are absolutely-positioned HTML overlays on top of the Canvas. Glassmorphism style via a shared `glass` CSS-in-JS object (`backdrop-filter: blur(12px)`). JetBrains Mono font throughout.

## Keyboard Shortcuts

`1-7` camera presets, `H` HUD, `N` NEO panel, `F` fullscreen, `Space` pause/resume, `Esc` deselect, click planet to focus.
