# Orrery App Store Pack

This document is the single source of truth for App Store and TestFlight submission assets, metadata, copy, and runbooks for the iOS listing.

## Scope

- iOS app listing: `solar.orrery`
- Platform shell: Capacitor iOS app wrapping the production Orrery web bundle
- App name in binary: `Solar Orrery`

## IDs and Platform Records

| Item | Value |
|---|---|
| Team ID | `596T7J7FB6` |
| iOS bundle ID | `solar.orrery` |
| Capacitor app ID | `solar.orrery` |
| Marketing version | `1.2.2` |
| Build number | `777` (global App Store Connect build floor: `22`) |

## App Store Metadata Pack

### iOS Listing

#### Name and Discoverability

- App Name: `Orrery`
- Subtitle: `Explore the solar system`
- Keywords (100-char target):
  - `space,astronomy,solar system,planets,stars,constellations,orbit,science,stargazing,education`

#### Promotional Text (170 chars max)

`Fly from deep space to Earth, explore planets and constellations, and scrub time across the solar system with a cinematic, touch-first astronomy experience.`

#### Full Description

Orrery is an interactive, real-time model of the solar system and nearby sky built for curiosity and wonder.

Start with a cinematic opening on your first visit, then return directly to an interactive view of planets, moons, constellations, and live orbital data. Replay the tour whenever you like.

Features:
- First-visit cinematic tour from deep space to Earth, replayable from Controls
- Interactive planets, dwarf planets, moons, asteroids, comets, and spacecraft
- 41,000+ stars and 88 constellation line patterns
- Time controls from real-time to accelerated simulation
- Touch-first camera controls for quick orbit, zoom, and focus
- Four color themes, including palettes designed for common color-vision differences
- Live feeds for near-Earth objects, solar wind, and satellite elements

Built for learners, stargazers, educators, and anyone who wants to explore scale and motion in the solar system.

Questions or feedback: luke@lukesteuber.com

#### What to Test (TestFlight)

- Launch app and verify splash transitions into the 3D scene.
- Let the cinematic intro complete and verify interactive HUD appears.
- Relaunch and verify the app starts in the interactive Full System view; use Controls -> Replay Cinematic Tour to replay the intro.
- Select Earth and other planets, then drill into moon-level views.
- Toggle Sky overlays and constellation labels.
- Toggle Deep Space layer (spacecraft / nearby star markers / galaxy markers) and verify no streak artifacts.
- Verify iPad sidebar opens and closes reliably with the in-panel close button.
- Use time controls and verify fast-forward updates without stalling.
- Verify orientation behavior in portrait and landscape.

## Privacy and Compliance Pack

### Privacy Nutrition Label (current expected answers)

- Data collection: `None` (verify before each submission cycle)
- Tracking: `No`
- Linked to user: `No`
- Used for tracking: `No`

### Encryption

- `ITSAppUsesNonExemptEncryption = false` is set in `ios/App/App/Info.plist`.
- Export compliance answer remains "No non-exempt encryption."

### URLs

- Support URL: `https://orrery.solar`
- Marketing URL: `https://orrery.solar`
- Privacy Policy URL: `https://orrery.solar/orrery/privacy.html`

Confirm all URLs are public and render before each submission cycle.

## Assets Pack

### App Icon

- iOS icon source in asset catalog:
  - `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` (1024x1024)

### Launch/Splash

- Launch storyboard uses:
  - `ios/App/App/Base.lproj/LaunchScreen.storyboard`
  - `ios/App/App/Assets.xcassets/Splash.imageset/`

### Launch Stability Overrides

- Milky Way backdrop in deep-space rendering is disabled for the current launch branch to avoid iPad startup streak artifacts.

### Screenshot Checklist

Prepare and upload these for iOS listing:

- iPhone 6.7" screenshot set (required)
- iPhone 6.5" screenshot set (if required by current ASC flow)
- iPad 12.9" screenshot set (if iPad support remains enabled)

Suggested sequence:
1. Cinematic hero view (space-to-Earth opening frame)
2. Planet detail view (Earth + moon context)
3. Sky mode with constellations
4. Time controls in use
5. Deep space / spacecraft orbits

Use one clear headline per screenshot and keep labels readable at phone scale.

## App Review Notes Pack

### iOS Review Notes (paste-ready)

- Orrery is a Capacitor-based iOS app that ships a bundled production web build for a touch-first 3D astronomy experience.
- No sign-in or account is required.
- Main flow on a fresh install: cinematic intro -> interactive orbit controls -> planet and sky exploration. Returning launches begin in the interactive Full System view, and the cinematic can be replayed from Controls.
- App supports portrait and landscape orientations.
- Core value is interactive visualization of planetary motion, constellations, and real-world orbital datasets.
- No demo credentials are needed.

## Submission Runbook

### Canonical Release Notes

- English (U.S.): `app-store/metadata/en-US/release_notes.txt`

### Preconditions

- App record exists in App Store Connect for `solar.orrery`.
- Bundle ID and signing are valid in Apple Developer portal.
- URLs (support, privacy) are live and final.
- Release metadata and screenshot set are prepared.

### Build and Upload

Run from repository root:

```bash
pnpm install
pnpm ios:sync
```

Then archive/upload in Xcode:

1. Open `ios/App/App.xcodeproj`
2. Scheme: `Orrery`
3. Destination: `Any iOS Device (arm64)`
4. Product -> Archive
5. Organizer -> Distribute App -> App Store Connect

### Post-upload Checklist

- Build appears in TestFlight processing queue.
- Export compliance confirmation complete.
- "What to Test" field is filled.
- Internal testing assigned and installed.
- External testing submitted (if applicable).

## Release Checklist (Single Pass)

- [ ] Metadata pasted (name, subtitle, promo text, description, keywords)
- [ ] Privacy answers completed and verified
- [ ] URLs verified live (support, marketing, privacy)
- [ ] Icon and splash validated in build
- [ ] Screenshots uploaded for required device classes
- [ ] Review notes pasted
- [ ] Archive uploaded and processed
- [ ] Internal TestFlight smoke pass complete

## Ownership and Update Rule

Whenever copy, assets, or submission flow changes, update this file first, then mirror concise updates into `README.md` and `PROJECT_PLAN.md`.
