# Changelog

All notable changes to Orrery are documented here.

## Unreleased

### Fixed

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
