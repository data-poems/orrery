# Orrery Fire tablet evidence

Target: Orrery 1.2.2 (778), package `solar.orrery.android`.

## Automated release evidence — 2026-09-04

- APK: `dist/android/orrery-1.2.2-778-signed.apk`
- APK SHA-256: `3002bb2a380d6c13ccdbc42929670e29a2c0ccacf47f13e40417029af951b799`
- AAB SHA-256: `028a22aaa6f164201a13c88980a5f5d7198f57e62cc4e30857801332150b4485`
- Certificate SHA-256: `52320cb3df703842ea9a349cba6825349a04cbf7d6b33181b12be544d0fc772e`
- Package/version inspection: `solar.orrery.android`, 1.2.2 (778).
- Manifest inspection: touchscreen required, ordinary launcher present, no
  Leanback launcher.
- Dependency inspection: no Google Play Services classes in the APK.
- Web tests: 29 passed; lint, Android unit tests, Android lint, signed APK/AAB
  staging, and signature verification passed.

- [x] APK/AAB SHA-256 and certificate SHA-256 recorded.
- [ ] Signed APK installed on a named Fire model and Fire OS version.
- [ ] Offline bundled scene and live-data fallbacks pass.
- [ ] Touch, search, planet navigation, orientation, lifecycle, and Back pass.
- [ ] VoiceView, large text, reduced motion, and target-size checks pass.
- [ ] 60-minute WebGL/thermal stability run passes without crash or ANR.

Build 777 evidence is not transferable because build 778 changes the manifest
device-targeting bytes.
