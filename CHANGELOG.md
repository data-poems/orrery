# Changelog

All notable changes to Orrery are documented here.

## Unreleased

### Added

- Reproducible Android release staging for versioned APK and AAB artifacts.
- Optional gitignored keystore configuration with signed APK/AAB verification.
- SHA-256 checksum and explicit signing-status files for staged Android builds.
- Android release commands and signing guidance in the project documentation.

### Changed

- Android now reads the marketing version from `package.json`, verifies it
  matches iOS, and reuses the iOS native build number as `versionCode`.
- Android Capacitor builds have a dedicated relative-path build command while
  preserving the existing low-GPU Android rendering profile.
