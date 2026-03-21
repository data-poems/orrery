# Orrery — Project Handoff

Last updated: 2026-03-21

## What This Is

Interactive 3D solar system built with React 19 + TypeScript + Three.js (@react-three/fiber + @react-three/drei) + Vite 8. Deployed at `https://dr.eamer.dev/orrery/`. Production files served as static from `~/html/orrery/`.

## Current State

**Working and deployed.** All core features functional:

- 8 planets + 3 dwarf planets (Ceres, Pluto, Eris) with JPL J2000 Keplerian orbital elements
- 46 moons across all bodies (Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Eris)
- Procedural Saturn rings (custom ShaderMaterial with C/B/A Ring, Cassini Division, Encke Gap)
- Asteroid belt (3,000 instanced particles with Kirkwood gaps at 2.50/2.82/2.95 AU)
- Near-Earth Object tracking (NASA NeoWs API for daily data, NASA SBDB for on-demand orbital elements)
- Star field (41K stars from d3-celestial HYG catalog with B-V color index)
- 88 constellation stick figures with per-constellation colors (golden-angle hue spread, colorblind-safe)
- Milky Way band (procedural shader on celestial sphere with galactic center brightening)
- Deep space: Oort Cloud (5,000 sparse points), Galaxy disc (procedural spiral shader + 8,000 scattered stars)
- 4 colorblind-safe themes: Brass, Silver, High Contrast (WCAG AAA), Ember
- Full cinematic intro tour (17 steps, loops) + interactive exploration
- Responsive design (mobile bottom sheets, 44px touch targets, safe areas)
- WCAG accessibility (ARIA labels, focus-visible, sr-only announcements, prefers-reduced-motion)

## Architecture

```
src/
  Orrery.tsx          ← All state lives here. Single source of truth.
  App.tsx             ← Thin wrapper (just <Orrery />)
  main.tsx            ← Entry point
  index.css           ← Global reset, a11y utilities

  lib/
    kepler.ts         ← Orbital mechanics: Kepler equation solver, Julian dates,
                         heliocentric XYZ conversion, moon phase, orbit path generation
    themes.tsx        ← Theme context provider, 4 theme definitions, localStorage persistence

  data/
    planets.ts        ← PlanetDef type, PLANETS (8), DWARF_PLANETS (3), ALL_BODIES (11),
                         texture URLs (TEX), camera presets (CAMS, 8 presets)
    moons.ts          ← MoonDef type, MOONS (46 satellites), getMoonsForPlanet()
    constellations.ts ← ConstellationMeta type, 88 entries with mythology (CURRENTLY UNUSED)

  scene/
    Scene.tsx         ← 3D composition: CamCtrl (unified camera controller), AUGrid,
                         planet/moon/NEO rendering, layer visibility orchestration
    Bodies.tsx         ← Sun, Planet, EarthClouds, SaturnRings, Satellite, SatelliteOrbit, OrbitRing
    Asteroids.tsx     ← AsteroidBelt (instanced), NeoDot, AsteroidOrbitLine
    Stars.tsx         ← StarField, ConstellationLines, ConstellationLabels, MilkyWayBand
    DeepSpace.tsx     ← ScaleMarkers, OortCloud, GalaxyDisc, GalaxyStars

  ui/
    Panels.tsx        ← All HUD overlays: cinematic overlay, top bar (time/speed/presets),
                         side drawer (bodies/layers/theme/NEO/about), planet info card,
                         NEO detail card, scale indicator, screen reader announcements
    LoadingScreen.tsx ← Fade-in loading overlay
    styles.ts         ← Shared CSS-in-JS objects (glass, bokehCard, drawerPanel), useIsMobile()
```

### Data Flow

```
Orrery.tsx (all state)
  ├── Scene (3D, receives props)
  │     ├── CamCtrl (camera transitions, settling logic)
  │     ├── Bodies (planets, moons, orbit rings)
  │     ├── Asteroids (belt, NEOs)
  │     ├── Stars (star field, constellations, Milky Way)
  │     └── DeepSpace (scale markers, Oort Cloud, galaxy)
  ├── Panels (HTML overlay, receives props)
  └── LoadingScreen
```

Planet positions are computed in Scene.tsx from `planetXYZ()` (Kepler solver), then bubbled up to Orrery.tsx via `onPositionsUpdate` callback into `positionsRef`. This ref is used by cinematic step logic to set camera focus targets.

### Coordinate System

Heliocentric ecliptic mapped to Three.js: `[x, z, -y]` where y-up is ecliptic normal. Distances in AU (1 AU = 1 scene unit). Celestial sphere (stars, constellations) tilted 23.4 degrees to align with ecliptic.

## Camera System

**Unified settling approach** — cinematic and interactive use identical zoom behavior:

1. On focus/preset change: `settling = true`, target position (`tPos`) and look-at (`tLook`) are set
2. Each frame: `camera.position.lerp(tPos, 0.03)` — smooth approach
3. When `camera.distanceTo(tPos) < 0.1`: `settling = false`, camera locks to target
4. While locked to a planet: camera tracks orbital motion via delta-offset

The `computeFocusOffset` function places the camera at `planet.radius * 5` distance from the planet surface (moons use `moon.radius * 15`), at a fixed angle of 0.7 radians azimuth and 0.4 radians elevation.

When a planet is selected (`selPlanet !== null`), non-selected orbit rings dim to opacity 0.08 (from 0.25), and the selected ring highlights at 0.6 with the theme's `selectedRing` color. A radial gradient dark overlay also appears behind the info card for readability.

## Cinematic Mode

Starts on load. 17 steps in a loop, two phases:

**Phase 1 (quick zoom-out, ~20s):** Inner Planets → Solar System → Outer Planets → Kuiper Belt → Oort Cloud → Galaxy. Progressively reveals layers (asteroid belt, constellations, dwarf planets, Milky Way, deep space).

**Phase 2 (extended planet tour):** Earth → Mars → Jupiter → Saturn → Constellations (showcase) → Uranus → Neptune → Mercury → Venus → Ecliptic Plane → back to Solar System.

Each step has: `duration` (ms), `label`, `desc` (shown in overlay), optional layer toggles, optional `constellationFocus` flag.

Implemented as a `setInterval` polling loop (500ms) that checks elapsed time against the current step's duration. Robust against React re-renders.

Exit: click anywhere, press any key, or use the drawer.

## Layer Toggle System

8 toggleable layers controlled from the side drawer and keyboard:

| Layer | Key | Default | Notes |
|-------|-----|---------|-------|
| Stars | S | on | 41K-star field |
| Constellations | C | off | Stick figures + labels |
| Stargazer | G | off | Focus mode: boosts constellation opacity |
| Dwarf Planets | D | off | Ceres, Pluto, Eris |
| NEO | N | off | Near-Earth objects (NASA API) |
| Asteroid Belt | - | off | 3,000 instanced particles |
| Milky Way | - | off | Procedural shader band |
| Deep Space | - | off | Oort Cloud + Galaxy disc |

Cinematic controls these programmatically per step. On cinematic exit, all layers turn on.

## External APIs

- **NASA NeoWs** (`api.nasa.gov/neo/rest/v1/feed`): Fetched on mount for today's NEOs. Uses `DEMO_KEY`. Cached in `sessionStorage`.
- **NASA SBDB** (`ssd-api.jpl.nasa.gov/sbdb.api`): Fetched on-demand when a NEO is clicked. Returns Keplerian elements for orbit visualization.
- **NOAA SWPC** (`services.swpc.noaa.gov/products/summary/solar-wind-speed.json`): Solar wind speed for cinematic overlay. No auth.

## Known Issues / Rough Edges

1. **Chunk size warning**: Production bundle is ~1.18 MB (Three.js is heavy). Could benefit from code splitting or lazy-loading deep space components.

2. **`constellations.ts` is entirely unused**: Contains 88 IAU constellation entries with mythology text, brightest star, season, area, and zodiac flag. Neither `CONSTELLATIONS` nor `findConstellation` is imported anywhere. Also has a duplicate Crux entry (id 'Crx' at one location and id 'Cru' at another). This data could be wired to constellation labels to show mythology on hover/click.

3. **Moon orbits are simplified**: All moons use circular orbits (no eccentricity). The `a` values are visual approximations, not to astronomical scale. Moon inclinations are optional and only some moons specify them.

4. **NEO fallback positioning**: Before SBDB orbital elements load, NEOs are placed using a hash-based approximation near Earth. Position jumps to correct orbit once elements arrive.

5. **Auto-rotate in cinematic**: OrbitControls has `autoRotate` enabled during cinematic mode at 0.5 speed. This gives a gentle orbital view but may conflict with the settling camera logic in edge cases (the camera is being lerped while also being auto-rotated). No bugs observed, but worth watching.

6. **Planet textures are external URLs**: All textures load from `www.solarsystemscope.com` CDN. If that CDN goes down, planets render as flat-colored spheres (the `planet.color` fallback). Consider hosting textures locally.

7. **No error boundary**: If Three.js or a texture fails to load, the whole app can white-screen. An ErrorBoundary around the Canvas would improve resilience.

## Next Steps (Suggested)

### High Impact
- **Wire up `constellations.ts` mythology data**: Show constellation details (mythology, brightest star, season) when a constellation label is clicked or hovered. The data is already authored — just needs UI.
- **Code-split deep space**: `DeepSpace.tsx` (Galaxy disc shader, Oort Cloud, scale markers) is only visible at extreme zoom. Lazy-load it with `React.lazy()`.
- **Host textures locally**: Download planet/moon textures to `public/textures/` to remove CDN dependency.

### Medium Impact
- **Moon eccentricity**: Add `e` to `MoonDef` and use proper elliptical orbits in `Satellite` position computation. Triton's retrograde orbit is especially inaccurate.
- **Constellation click interaction**: When constellations are visible, clicking a constellation label could show a card with mythology, area, and brightest star info (using the unused `constellations.ts` data).
- **Improved NEO visuals**: NEO dots could have trails or velocity vectors. Currently they're static colored spheres.
- **Time controls improvements**: Add a date picker to jump to specific dates. Currently time only advances via speed multiplier buttons.

### Low Impact / Polish
- **ErrorBoundary**: Wrap the Canvas in an error boundary with a graceful fallback message.
- **Remove duplicate Crux from constellations.ts**: The file has Crux listed twice with different IDs ('Crx' and 'Cru').
- **Keyboard shortcut discoverability**: The side drawer shows shortcuts in the About section, but new users may not find them. Consider a "?" hotkey that shows an overlay.
- **Performance monitoring**: Add FPS counter or Three.js stats panel behind a debug flag.
- **Accessibility testing**: Run through with an actual screen reader. ARIA labels exist but flow hasn't been tested end-to-end.
- **Touch zoom on mobile**: OrbitControls pinch-to-zoom works but sensitivity may need tuning for the logarithmic depth range (0.05 to 100,000 AU).

## Build & Deploy

```bash
pnpm dev          # Dev server at http://localhost:5173
pnpm build        # tsc -b && vite build → dist/
pnpm lint         # ESLint

# Deploy: copy dist/ to production
cp -r dist/* ~/html/orrery/
```

Vite config: `base: '/orrery/'`. Caddy serves static files at `dr.eamer.dev/orrery/*`.

## File Sizes (for context)

| File | Lines | Role |
|------|-------|------|
| Panels.tsx | 980 | Largest file. All HUD/overlay UI. |
| Stars.tsx | 569 | Star field, constellations, Milky Way shaders |
| Orrery.tsx | 489 | Main state + cinematic logic |
| Bodies.tsx | 305 | Planet/moon/ring rendering |
| Scene.tsx | 298 | 3D composition + camera controller |
| DeepSpace.tsx | 264 | Galaxy disc + Oort Cloud shaders |
| constellations.ts | 450 | Unused mythology data (88 entries) |
| planets.ts | ~200 | Planet definitions + camera presets |
| kepler.ts | ~180 | Orbital mechanics |
| Asteroids.tsx | 134 | Asteroid belt + NEO rendering |
| moons.ts | 74 | Moon definitions (46 moons) |

## Dependencies

```json
"@react-three/drei": "^10.0.3"    // Three.js React helpers (OrbitControls, Html, Line)
"@react-three/fiber": "^9.1.2"    // React renderer for Three.js
"react": "^19.0.0"
"three": "^0.174.0"
"typescript": "~5.8.3"
"vite": "^8.0.0"
```

No backend. No database. Pure client-side app with API calls to NASA and NOAA.

## User Preferences

- User is colorblind — all palettes must be accessible. Always offer theme options.
- User works from mobile SSH, so tolerate typos in instructions.
- Credit Luke Steuber as author, never "Claude" or "AI".
- No emoji in code or content.
