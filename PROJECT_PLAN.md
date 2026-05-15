# PROJECT_PLAN.md

## Current Objectives

1. Keep Orrery iOS release-ready from this repository.
2. Maintain synchronized App Store submission materials alongside code.
3. Ensure iOS branding assets (icon/splash) and metadata can be shipped without ad-hoc docs.

## Current Architecture Snapshot

- Frontend: Vite + React + TypeScript + Three.js (`src/`)
- Native shell: Capacitor iOS project (`ios/App/`)
- iOS asset catalogs:
  - `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
  - `ios/App/App/Assets.xcassets/Splash.imageset/`
- iOS sync pipeline:
  - `pnpm build:ios`
  - `pnpm ios:sync`
  - optional compile gate: `pnpm ios:compile`

## App Store Kit Deliverables (Added)

- `app-store/APP_STORE_PACK.md`
- `app-store/APP_STORE_CONNECT_PASTE_SHEET.md`
- `app-store/app-store-listing.md`

## Outstanding Tasks

- Verify privacy policy URL endpoint intended for submission (`https://orrery.solar/privacy`) is live.
- Capture final iPhone/iPad screenshots from current shipping build.
- Confirm final category/keyword strategy prior to first production submit.
- Paste finalized copy into App Store Connect and complete privacy questionnaire.
- Validate iPad panel behavior in portrait, landscape, and split view after safe-area/close-button patch.
- Revisit Milky Way backdrop rendering after launch with seam-safe triangulation or texture-based replacement.

## Recent Launch Stabilization Work

- Separated `Deep Sky` and `Deep Space` UI toggles to prevent accidental deep-space side effects.
- Added explicit right-panel close control and disabled hover-peek behavior on touch-only devices.
- Removed Milky Way backdrop runtime path and prefetch from launch build to eliminate startup streak artifacts.
- Reduced the Sky toggle footprint and colocated it with the top-left info control so both controls share the same compact chrome.
- Added persistent zoom step controls across mobile and desktop with explicit +/− affordances.
- Updated sky immersion behavior so enabling Sky mode clears object selections and restores full constellation/starfield emphasis; only off-mode or single-constellation selection now dims surrounding layers.
- Condensed the planet detail card layout for smaller screens with denser stat tiles, tighter header actions, and horizontal breadcrumb overflow.
- Synced Sky-mode entry behavior across chip click and keyboard `g` shortcut to prevent divergent dimming/selection states.
- Raised HUD hit targets to touch-friendly sizing, added left safe-area anchoring for top controls, and prevented the zoom wrapper from intercepting canvas interactions.
- Improved keyboard semantics for collapsed body details and breadcrumb navigation (`Enter` + `Space` activation).
- Split HUD corner controls: info (`i`) upper-left, Sky toggle upper-right with inline constellation SVG icon.
- Standardized About dialog close affordance to icon-style `×` with linked catalog and live data sources.
- Added billboard pick proxies in deep space for spacecraft, nearby stars, and Local Group galaxies.
- Threaded near-star and galaxy selection through Orrery/Scene/Panels with left-placed info cards and jump-to-view buttons.
- Made Sol selectable with enlarged invisible tap target; moons remain clickable across all parent planets.
- Replaced the random destination button with a dice-icon toggle that runs an ongoing random tour across presets, planets, moons, constellations, spacecraft, nearby stars, and Local Group galaxies (~7s cadence; double-click for one-shot jump; cinematic mode auto-stops the tour).

## Update Rule

When iOS behavior, metadata, privacy posture, or branding assets change:
1. Update `app-store/APP_STORE_PACK.md` first.
2. Mirror required copy updates into `APP_STORE_CONNECT_PASTE_SHEET.md` and `app-store-listing.md`.
3. Reflect high-level changes in `README.md` and this plan file.
