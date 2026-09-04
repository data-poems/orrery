# Orrery

[![Live](https://img.shields.io/badge/live-orrery.solar-blue)](https://orrery.solar)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r183-black.svg)](https://threejs.org/)

From Earth to the Oort Cloud. Interactive, 41,000 stars, 88 constellations, real data, mostly live. Fake scales. Now in VR on Vision Pro, Quest, and more.

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

- WebXR immersive mode: an **Enter VR** button appears on any WebXR headset and drops you inside the system — Apple Vision Pro (Safari), Meta Quest, Pico, and PCVR — with motion controllers, hand tracking, or pinch-to-select, whichever the headset reports
- First-visit cinematic tour from deep space to Earth, with an explicit Replay Cinematic Tour action in Controls
- Stargazer mode with immersive constellation + starfield emphasis
- Deep Space layer (Oort Cloud, spacecraft, nearby star markers, galaxy markers) can be toggled independently
- Click any planet to zoom in; click Sol or any moon to drill down
- Split HUD corners: info (`i`) upper-left, Sky mode (constellation icon) upper-right
- Subtle top-center area labels (Inner, Full System, Deep Space, etc.) stay visible above the canvas
- Persistent quick zoom controls (+/− step between scale presets), one-shot dice jumps, and a separately controlled ambient tour across presets, planets, moons, and active spacecraft
- Deep-space pick targets for spacecraft, nearby stars, and Local Group galaxies with jump-to-view actions
- Non-overlapping info panels for deep-space selections (left) vs constellation/spacecraft (right)
- Unified Sky-mode behavior across button and keyboard shortcut (`g`) for consistent immersive state transitions
- Touch-friendly HUD targets and improved keyboard accessibility for details navigation
- Time controls from real-time to 100 years per second
- 4 color themes, including palettes designed for common color-vision differences
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
pnpm test     # Vitest suite
pnpm preview  # Serve production build
```

## Tech

React 19, TypeScript 5.9, Three.js (r183) via @react-three/fiber + @react-three/drei, Vite 8. No backend. All data from public APIs and bundled catalogs.

## iOS and App Store

- iOS sync pipeline: `pnpm ios:sync`
- Optional compile gate: `pnpm ios:compile`
- iPad panel updates: safe-area aligned right drawer with explicit close button
- Launch stability note: the current build disables the Milky Way backdrop in deep space to avoid iPad streak artifacts
- App Store submission kit:
  - `app-store/APP_STORE_PACK.md`
  - `app-store/APP_STORE_CONNECT_PASTE_SHEET.md`
  - `app-store/app-store-listing.md`

## Android release

Android build is in testing. The release pipeline has produced locally verified
signed APK and AAB artifacts; store upload and physical-device validation remain
manual release steps.

The Amazon Fire-tablet candidate advances the shared native build to **779** so
its manifest requires a physical touchscreen, excludes Fire TV, and its WebView
toggle buttons retain names in the Fire OS accessibility tree. It retains
marketing version 1.2.2 and does not change the public direct-download catalog.
See [`android/AMAZON-RELEASE.md`](android/AMAZON-RELEASE.md).

The Capacitor Android shell uses the same `1.2.2` marketing version as
`package.json` and iOS, and the same positive native build number as iOS
`CURRENT_PROJECT_VERSION`. Gradle stops if those values drift. Android keeps the
existing low-GPU profile: Android WebViews use 2K textures, reduced blended star
point scaling, and the mobile star catalog.

Prerequisites are JDK 17–21 and Android SDK platform 36. Build and stage a
release with:

```bash
pnpm android:release
```

This builds the relative-path Capacitor bundle, syncs it into Android, runs
`assembleRelease` and `bundleRelease`, then stages versioned artifacts in
`dist/android/`:

```text
orrery-<version>-<build>-signed.apk
orrery-<version>-<build>-signed.aab
SHA256SUMS.txt
SIGNING.txt
```

Release signing is optional for local reproducibility. The portfolio workflow
injects these variables from macOS Keychain for one release process:

```text
ORRERY_ANDROID_STORE_FILE
ORRERY_ANDROID_STORE_PASSWORD
ORRERY_ANDROID_KEY_ALIAS
ORRERY_ANDROID_KEY_PASSWORD
```

Do not export passwords manually or save them in a shell profile. To configure
a pre-existing local identity without putting secrets in source control:

```bash
cp android/keystore.properties.example android/keystore.properties
# Fill in an absolute or android/-relative keystore path and credentials.
pnpm android:release
```

Both `android/keystore.properties` and `*.keystore`/`*.jks` are ignored by Git.
When signing is configured, staging verifies the APK with `apksigner` and the
AAB with `jarsigner -verify`. Without signing configuration, the same
command stages explicitly `-unsigned` APK/AAB files, records that state in
`SIGNING.txt`, and still writes `SHA256SUMS.txt`.

Useful development gates:

```bash
pnpm android:sync                         # Build web assets and sync Capacitor
pnpm android:apk                          # Existing debug APK path
cd android && ./gradlew test lint         # Android unit tests and lint
cd android && ./gradlew assembleRelease   # Raw signed/unsigned release APK
```

Do not upload unsigned artifacts. Store upload, submission, and publishing are
manual steps outside this pipeline.

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
