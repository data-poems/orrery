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

## Update Rule

When iOS behavior, metadata, privacy posture, or branding assets change:
1. Update `app-store/APP_STORE_PACK.md` first.
2. Mirror required copy updates into `APP_STORE_CONNECT_PASTE_SHEET.md` and `app-store-listing.md`.
3. Reflect high-level changes in `README.md` and this plan file.
