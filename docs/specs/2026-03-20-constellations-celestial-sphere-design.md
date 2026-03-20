# Constellations & Celestial Sphere — Design Spec

## Overview

Add a star field, constellation overlays, Milky Way band, and a theme system to the orrery. Architect for a future galactic zoom feature. Build shared data infrastructure in `~/data/celestial/` for reuse across projects.

## Phase 1: Star Field (Celestial Sphere)

### Rendering

- Single `THREE.Points` BufferGeometry on a sphere at r=300 AU
- Load `stars.8.json` (~42,000 stars, 5.2 MB) on all devices
- Star size attenuated by apparent magnitude (brighter = larger point)
- Star color derived from B-V color index:
  - B-V < 0.0 → blue-white (#aaccff)
  - B-V 0.0–0.5 → white (#ffffff)
  - B-V 0.5–1.0 → yellow (#ffeecc)
  - B-V > 1.0 → orange-red (#ffaa77)
- Sphere tilted 23.4 deg to match ecliptic-to-equatorial offset
- No parallax — stars are an infinitely distant backdrop
- Toggle: keyboard `S`, UI button "STR"

### Data Pipeline

- Source: `~/data/celestial/d3-celestial/stars.8.json` (GeoJSON)
- At build time or runtime: parse RA/Dec from GeoJSON coordinates, convert to unit sphere positions
- RA/Dec to 3D: `x = cos(dec) * cos(ra)`, `y = sin(dec)`, `z = -cos(dec) * sin(ra)`
- Store real 3D positions from HYG database (parsecs) in the data model for future galactic zoom

### New File: `src/scene/Stars.tsx`

```
StarField component:
  - BufferGeometry with position, size, color attributes
  - ShaderMaterial or PointsMaterial with sizeAttenuation
  - 42K points, one draw call

ConstellationLines component:
  - THREE.LineSegments from constellations.lines.json
  - Default opacity ~0.08, hover brightens to ~0.4
  - Color from active theme

MilkyWayBand component:
  - Mesh from mw.json polygons on the sphere
  - Very subtle glow (opacity ~0.03)

ConstellationLabels component:
  - drei Html labels at constellation centroids
  - Visible only when within angular distance of camera look direction
  - Font: Cormorant Garamond italic
```

## Phase 2: Constellation Interaction

### Behavior

- Faint lines always visible (opacity ~0.08)
- Hover over a constellation region: lines brighten, name label appears
- Click: opens info card (same glass panel style as planet cards)
- Card content:
  - Name (Latin + English)
  - Mythology snippet (2-3 sentences)
  - Brightest star with magnitude
  - Best viewing season
  - Area (square degrees)
  - Zodiac indicator if on ecliptic
- Zodiac constellations subtly highlighted along the ecliptic plane

### Data

- Line coordinates: `constellations.lines.json` (27 KB, coordinates embedded)
- Names/metadata: `constellations.json` (50 KB, multilingual)
- Star names: `starnames.json` (665 KB)
- Mythology: curated in `src/data/constellations.ts` (~88 entries, hand-written)

### New File: `src/data/constellations.ts`

Constellation metadata array with:
- `id`: 3-letter IAU abbreviation
- `name`: Latin name
- `nameEn`: English name
- `mythology`: 2-3 sentence description
- `brightestStar`: name and magnitude
- `season`: best viewing season
- `area`: square degrees
- `zodiac`: boolean

## Phase 3: Milky Way Band

- `mw.json` polygons rendered as a faint mesh on the celestial sphere
- Opacity ~0.03, color from theme (warm white or cool white)
- Provides the visual foundation for galactic zoom later
- No interaction — purely atmospheric

## Phase 4: Theme System

### Architecture

- New file: `src/lib/themes.ts`
- React context + hook: `useTheme()` returns current theme object
- Theme stored in localStorage for persistence
- Theme affects: constellation lines, UI accent, panel borders, active states
- Star colors (B-V physical data) stay constant across themes

### Themes (4 curated, colorblind-safe)

| Theme | Constellation Lines | UI Accent | Panel Border | Notes |
|-------|-------------------|-----------|--------------|-------|
| **Brass** | `#c8a86e` | `#00ffcc` | `rgba(255,255,255,0.08)` | Default. Warm gold vs cool teal. |
| **Silver** | `#8899bb` | `#66bbff` | `rgba(255,255,255,0.08)` | Cool monochrome. |
| **High Contrast** | `#ffffff` | `#ffff00` | `rgba(255,255,255,0.15)` | Universal fallback. |
| **Ember** | `#cc7744` | `#44ccaa` | `rgba(255,255,255,0.08)` | Warm orange + seafoam. |

All four verified distinguishable under protanopia, deuteranopia, and tritanopia.

### UI

- Theme picker: cycle button in toggle bar, or dropdown in HUD
- Keyboard shortcut: `T` to cycle themes

## Phase 5: Planet Zoom Enhancement

### Current State

Camera presets include Earth (3) and Jupiter (6) follows. Clicking any planet auto-focuses. But camera presets only cover 2 of 11 bodies.

### Enhancement

- Add all planets + dwarf planets to camera preset list, OR
- Add a "planet list" panel (toggleable) showing all bodies with click-to-zoom
- When focused on a planet, constellations behind it should be visible and labeled
- This connects the planetary and stellar layers

## Data Infrastructure (Shared)

### Downloaded to `~/data/celestial/`

| Directory | Contents | Size |
|-----------|----------|------|
| `d3-celestial/` | Stars (6/8/14 mag), constellations, Milky Way | 22 MB |
| `hyg/` | HYG v4.1 full star database with 3D positions | 33 MB |
| `mpc/` | TNOs (6,972), Comets (942) | 1.6 MB |
| `meteors/` | IAU established showers (112) | 416 KB |
| `deepsky/` | OpenNGC catalog (13,970 objects) | 3.7 MB |
| `exoplanets/` | NASA Exoplanet Archive (6,150 confirmed) | 701 KB |

### Shared Client: `~/shared/data_fetching/celestial_client.py`

```python
class CelestialClient:
    def get_stars(mag_limit=8, format='geojson')
    def get_constellation_lines(format='geojson')
    def get_constellation_metadata()
    def get_star_names()
    def get_milky_way()
    def get_deep_sky(type_filter=None, mag_limit=14)
    def get_exoplanets()
    def get_tnos()
    def get_comets()
    def get_meteor_showers()
    def ra_dec_to_cartesian(ra, dec, distance=1.0)
    def refresh_catalog(catalog_name)  # re-download from source
```

### Not Yet Downloaded

- **MPCORB.DAT** (1.5M asteroids, 87 MB gz) — needs pre-processing pipeline
- **Gaia DR3 subset** — query via archive for future galactic zoom
- **Spacecraft ephemerides** — pre-generate via JPL Horizons API

## Future: Galactic Zoom Path

The architecture supports seamless scale transition:

1. HYG database has real x/y/z positions in parsecs for 120K stars
2. Replace celestial sphere with 3D point cloud at real positions
3. Add logarithmic distance scaling (AU → parsec → kiloparsec)
4. Constellation lines dissolve as camera leaves solar neighborhood
5. Milky Way structure emerges from star density clustering
6. Exoplanet host stars become clickable at stellar neighborhood scale
7. Deep sky objects (galaxies, nebulae) render as faint patches

## New Files Summary

| File | Purpose |
|------|---------|
| `src/scene/Stars.tsx` | Star field, constellation lines, Milky Way, labels |
| `src/data/constellations.ts` | Constellation metadata (mythology, brightest stars) |
| `src/lib/themes.ts` | Theme definitions, context, hook, localStorage |
| `~/shared/data_fetching/celestial_client.py` | Shared catalog access client |

## Modified Files

| File | Changes |
|------|---------|
| `src/scene/Scene.tsx` | Add StarField, ConstellationLines, MilkyWayBand |
| `src/ui/Panels.tsx` | Add STR/CON toggles, theme picker, planet list |
| `src/Orrery.tsx` | Add showStars, showConstellations, theme state |
| `src/index.css` | Theme CSS custom properties |
| `src/data/planets.ts` | Camera presets for all planets |

## Toggle Summary

| Key | Button | Controls |
|-----|--------|----------|
| S | STR | Star field visibility |
| C | CON | Constellation lines + labels |
| T | — | Cycle theme |
| H | HUD | Simulation data overlay |
| N | NEO | Near-Earth objects panel |
| D | DWF | Dwarf planets |
| F | Full | Fullscreen |
| Space | Pause | Play/pause simulation |
| 1-8 | Pills | Camera presets |
