# Changelog

All notable changes to Orrery are documented here.

## Unreleased

### Fixed

- Android build 783: the launcher icon is the orrery artwork instead of the
  Android Studio template.
- Android: the bands behind the status and navigation bars are black in light
  and dark mode, with light icons, instead of white or dark gray.
- The asteroid belt, comet, meteor shower and satellite layers load their data
  once when shown. They used to reload it on every render, about 40 times a
  second, including during the opening tour.
- The opening tour's text lines no longer overlap on a phone.
- The JPL orbit lookup for a near-Earth object works in the iPhone, iPad and
  Android apps. It used a parameter JPL rejects and a request the web view was
  not allowed to read. The website still shows the approximate orbit.
- The About panel and loading screen give counts that match the bundled data.
- Bundled the Uranus and Neptune textures so iPhone and iPad no longer depend
  on a CloudFront origin that returns 403 responses.

### Added

- An explicit Replay Cinematic Tour action in Controls.
- An iOS-only, outcome-based StoreKit review gate with unit-tested session,
  version, and cooldown rules plus a native DEBUG force hook.
- Reproducible Android release staging for versioned APK and AAB artifacts.
- Optional gitignored keystore configuration with signed APK/AAB verification.
- SHA-256 checksum and explicit signing-status files for staged Android builds.
- Android release commands and signing guidance in the project documentation.

### Changed

- The opening cinematic now auto-plays only until it has been seen; returning
  visits start in the interactive Full System view.
- The app keeps dice and ambient destinations separate from manual exploration,
  so automatic movement never advances review eligibility.
- Release metadata now uses marketing version 1.2.2 and native build 777, above
  the current global App Store Connect build floor of 22.
- Android now reads the marketing version from `package.json`, verifies it
  matches iOS, and reuses the iOS native build number as `versionCode`.
- Android Capacitor builds have a dedicated relative-path build command while
  preserving the existing low-GPU Android rendering profile.
