# Orrery

[![Live](https://img.shields.io/badge/live-orrery.solar-blue)](https://orrery.solar)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r183-black.svg)](https://threejs.org/)

From Earth to the Oort Cloud. Interactive, 41,000 stars, 88 constellations, real data, mostly live. Fake scales.

**[orrery.solar](https://orrery.solar)**

---

## What's in it

- **41,119 stars** from the HYG Database, plotted by magnitude and B-V color index
- **88 constellations** with IAU stick figures (d3-celestial)
- **8 planets + 3 dwarf planets + 32 moons** from JPL Horizons (J2000 Keplerian elements with secular rates)
- **3,000 main-belt asteroids** with Kirkwood gap distribution
- **20+ comets** from the Minor Planet Center
- **14 meteor shower radiants** from the IAU Meteor Data Center
- **5 interstellar spacecraft** (Voyager 1 at 165 AU, Voyager 2 at 139 AU, New Horizons, Pioneer 10/11)
- **Oort Cloud** particle shell (2,000-50,000 AU)

### Live data

- **Near-Earth objects** updated daily from NASA NeoWs
- **Asteroid orbits on demand** from JPL Small-Body Database
- **Solar wind speed** from NOAA Space Weather Prediction Center
- **Satellite TLEs** from CelesTrak (ISS + active stations, SGP4 propagation)

### Features

- Cinematic opening tour: deep space down to Earth
- Stargazer mode with immersive constellation + starfield emphasis
- Deep Space layer (Oort Cloud, spacecraft, nearby star markers, galaxy markers) can be toggled independently
- Click any planet to zoom in; click Sol or any moon to drill down
- Split HUD corners: info (`i`) upper-left, Sky mode (constellation icon) upper-right
- Subtle top-center area labels (Inner, Full System, Deep Space, etc.) stay visible above the canvas
- Persistent quick zoom controls (+/− step between scale presets) and a dice-button random tour (planets, moons, constellations, spacecraft, nearby stars, galaxies) on desktop and mobile
- Deep-space pick targets for spacecraft, nearby stars, and Local Group galaxies with jump-to-view actions
- Non-overlapping info panels for deep-space selections (left) vs constellation/spacecraft (right)
- Unified Sky-mode behavior across button and keyboard shortcut (`g`) for consistent immersive state transitions
- Touch-friendly HUD targets and improved keyboard accessibility for details navigation
- Time controls from real-time to 100 years per second
- 4 colorblind-accessible themes
- Mobile-first responsive design with touch controls
- 2K textures on mobile, 4K on desktop
- Pre-gzipped data files (82% savings)

## Running locally

```bash
pnpm install
pnpm dev
```

Opens at http://localhost:5173

```bash
pnpm build    # TypeScript check + Vite build + gzip data
pnpm lint     # ESLint
pnpm preview  # Serve production build
```

## Tech

React 19, TypeScript 5.9, Three.js (r183) via @react-three/fiber + @react-three/drei, Vite 8. No backend. All data from public APIs and bundled catalogs.

## iOS and App Store

- iOS sync pipeline: `pnpm ios:sync`
- Optional compile gate: `pnpm ios:compile`
- iPad panel updates: safe-area aligned right drawer with explicit close button
- Launch stability note: Milky Way backdrop is disabled in deep space to avoid iPad streak artifacts
- App Store submission kit:
  - `app-store/APP_STORE_PACK.md`
  - `app-store/APP_STORE_CONNECT_PASTE_SHEET.md`
  - `app-store/app-store-listing.md`

## Data sources

| Source | What |
|--------|------|
| [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) | Planetary orbital elements |
| [HYG Database](https://astronexus.com/projects/hyg) | Star catalog (41K stars) |
| [d3-celestial](https://github.com/ofrohn/d3-celestial) | Constellation lines, Milky Way outline |
| [Minor Planet Center](https://minorplanetcenter.net/data) | Asteroids, comets |
| [IAU MDC](https://www.ta3.sk/IAUC22DB/MDC2007/) | Meteor showers |
| [Solar System Scope](https://www.solarsystemscope.com/textures/) | Planet textures (CC BY 4.0) |
| [NASA NeoWs](https://api.nasa.gov/) | Live near-Earth objects |
| [JPL SBDB](https://ssd-api.jpl.nasa.gov/doc/sbdb.html) | Asteroid orbital elements |
| [NOAA SWPC](https://services.swpc.noaa.gov/) | Live solar wind |
| [CelesTrak](https://celestrak.org/NORAD/elements/) | Satellite TLEs |

## License

MIT. Planet textures are CC BY 4.0 (Solar System Scope). NASA/NOAA data is public domain.

## Author

**Luke Steuber** - [lukesteuber.com](https://lukesteuber.com) - [datapoems.io](https://datapoems.io)
