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
- **110+ deep sky objects** (Messier + bright NGC/IC from OpenNGC)
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
- Stargazer mode with zodiac glyphs and constellation labels
- Click any planet to zoom in, click its moons to drill down
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

## Data sources

| Source | What |
|--------|------|
| [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) | Planetary orbital elements |
| [HYG Database](https://astronexus.com/projects/hyg) | Star catalog (41K stars) |
| [d3-celestial](https://github.com/ofrohn/d3-celestial) | Constellation lines, Milky Way outline |
| [OpenNGC](https://github.com/mattiaverga/OpenNGC) | Deep sky objects |
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
