# PROJECT_PLAN.md

## Current Objectives

1. Keep Orrery iOS release-ready from this repository.
2. Maintain synchronized App Store submission materials alongside code.
3. Ensure iOS branding assets (icon/splash) and metadata can be shipped without ad-hoc docs.
4. Keep Android APK/AAB releases reproducible, version-aligned, and safe to
   build with or without local signing credentials.
5. Ship iOS 1.2.2/build 777 with bundled ice-giant textures, a first-visit-only
   cinematic, a returning-user interactive view, and a deliberate review-request
   policy.

## Current Architecture Snapshot

- Frontend: Vite + React + TypeScript + Three.js (`src/`)
- Native shells: Capacitor iOS (`ios/App/`) and Android (`android/`)
- iOS asset catalogs:
  - `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
  - `ios/App/App/Assets.xcassets/Splash.imageset/`
- iOS sync pipeline:
  - `pnpm build:ios`
  - `pnpm ios:sync`
  - optional compile gate: `pnpm ios:compile`
- Android release pipeline:
  - `pnpm build:android`
  - `pnpm android:sync`
  - `pnpm android:release`
  - versioned APK/AAB, signing status, and SHA-256 sums in `dist/android/`
- Native version source:
  - marketing version: `package.json`, enforced against iOS
  - build number: iOS `CURRENT_PROJECT_VERSION`, reused as Android `versionCode`
- Android rendering retains its low-GPU WebView profile: mobile catalog, 2K
  textures, and reduced blended star-point scaling.

## App Store Kit Deliverables (Added)

- `app-store/APP_STORE_PACK.md`
- `app-store/APP_STORE_CONNECT_PASTE_SHEET.md`
- `app-store/app-store-listing.md`

## Outstanding Tasks

- Verify privacy policy URL endpoint intended for submission (`https://orrery.solar/orrery/privacy.html`) is live.
- Capture current iPhone/iPad screenshots from the 1.2.2/build 777 release candidate.
- Validate Android/Fire tablet 1.2.2 build 781. Build 778 introduced the
  explicit required-touchscreen boundary, 779 preserved readable toggle names,
  and 780 makes Android hardware Back dismiss the current in-app surface before
  leaving the app. Build 781 fixes row overlap and scale overflow at 200% text,
  but its completed Fire observation failed the memory-stability criterion
  (graphics PSS grew from 436 MB to 1.40 GB). The September 5 investigation
  reproduced and corrected a selection-triggered ambient-tour timer restart
  loop; its debug comparison is in `android/FIRE-GRAPHICS-INVESTIGATION.md`.
  Complete memory validation of that fix,
  advance the shared native build, and earn fresh exact-byte device evidence
  before the remaining exploration, spoken-navigation, and screenshot gates.
- Paste the 1.2.2 release notes into App Store Connect and re-verify the privacy questionnaire.
- Validate iPad panel behavior in portrait, landscape, and split view after safe-area/close-button patch.
- Verify first-install cinematic, returning launch, Replay Cinematic Tour, and
  the DEBUG review-force hook on a developer-signed physical iOS device.
- Run a physical-device VoiceOver pass. Primary HUD controls, drawer rows,
  scale presets, and body-detail actions now use 44-point-or-larger targets,
  with labels, focus indicators, and reduced-motion handling. The full 3D and
  auxiliary-control experience has not been certified as screen-reader accessible.
- Revisit Milky Way backdrop rendering after launch with seam-safe triangulation or texture-based replacement.
- Configure and back up an Android release keystore before store staging.
- Run a TalkBack, keyboard, touch-target, and sustained-GPU pass on a physical
  Android device before marking the Android track device-tested.

## Future: Stellar Neighborhood Mode

The current dice tour skips deep-sky objects, nearby stars, and Local Group
galaxies because their rendering scheme (camera-pinned celestial sphere or
fixed beyond any preset's reach) means a "fly to" arrival lands the camera in
empty space. Removing them from the tour was the cheap fix.

The right long-term fix is a separate **Stellar Neighborhood Mode** that:

1. Promotes a selected nearby star (e.g. Sirius, Alpha Centauri, Polaris) to
   a "system origin" — render it as a real Sun analog (color/temp/luminosity
   from its spectral class) at fixed cosmic position.
2. Renders any known exoplanets/companion stars at their real orbital
   geometry around it.
3. Switches the camera coordinate system to that star (so AU grid, motion,
   and zoom scaling all work naturally around the new origin).
4. Returns to Sol on exit without losing user state.

Same pattern can host "Galaxy Mode" later (Andromeda, M51) if the rendering
budget permits it. Until then, the existing decoration toggles remain so
users can browse the sky-pinned markers without the tour pretending it can
visit them.

## Recent Launch Stabilization Work

- Removed sky-pinned constellations, nearby stars, and galaxies from automatic
  destinations after camera arrivals landed in empty sphere coordinates. Active
  spacecraft remain in the pool because they have reachable heliocentric
  positions. See "Future: Stellar Neighborhood Mode" for the long-term fix.
- The one-shot dice and ambient tour now share an explicit pool of scale presets,
  planets, moons, and active spacecraft. Constellations, nearby stars, and
  galaxies remain direct-pick experiences and are not automatic destinations.
- The cinematic auto-plays only until it has been seen. Returning visits start
  in the interactive Full System view, and Controls exposes Replay Cinematic Tour.
- Added an iOS-only review gate based on four distinct manual destinations across
  three sessions and seven days, with once-per-version and 120-day limits. Dice,
  ambient tour, and cinematic destinations never count.
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
- Split automatic exploration into a one-shot dice jump and an explicit ambient
  tour toggle with a 10-second cadence; cinematic playback remains separate.

## Update Rule

When iOS behavior, metadata, privacy posture, or branding assets change:
1. Update `app-store/APP_STORE_PACK.md` first.
2. Mirror required copy updates into `APP_STORE_CONNECT_PASTE_SHEET.md` and `app-store-listing.md`.
3. Reflect high-level changes in `README.md` and this plan file.
