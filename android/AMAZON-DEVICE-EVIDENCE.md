# Orrery Fire tablet evidence

Target: Orrery 1.2.2 (779), package `solar.orrery.android`.

## Automated release evidence — 2026-09-04

- [x] Signed APK/AAB staged and checksums recorded.
- [x] Package/version, manifest, dependency graph, and certificate verified.
- [x] Web tests, lint, Android unit tests, and Android lint pass.

- APK: `dist/android/orrery-1.2.2-779-signed.apk`
- APK SHA-256: `88658e2e884417d0fd1c4ed0992aef8e92b4381d514f56f76bdc3f6086e9337b`
- AAB SHA-256: `799c242b20d881f53e22bb3343e5e613cfd2aa752021df0ed1524a70136d12fc`
- Certificate SHA-256: `52320cb3df703842ea9a349cba6825349a04cbf7d6b33181b12be544d0fc772e`
- Package/version: `solar.orrery.android`, 1.2.2 (779).
- Manifest/dependencies: touchscreen required, ordinary launcher, no Leanback
  launcher, and no Google Play Services entries.
- Automated results: 29 web tests across 8 files, ESLint, Android release unit
  tests, Android lint, APK/AAB assembly, and signature verification pass.

Supplemental non-Fire accessibility preflight, 2026-09-04: the exact signed
779 APK installed on a Pixel 9a (Android 16), was pulled back byte-for-byte with
the recorded APK hash, and exposed zero `NAF` nodes in the Android accessibility
tree. The two rebuilt toggle controls expose the names “Stargaze — sky and
constellations” and “Start ambient tour.” This validates the regression fix but
does not satisfy any Fire-specific checkbox below.

## Superseded build 778 evidence — 2026-09-04

- APK SHA-256: `3002bb2a380d6c13ccdbc42929670e29a2c0ccacf47f13e40417029af951b799`
- AAB SHA-256: `028a22aaa6f164201a13c88980a5f5d7198f57e62cc4e30857801332150b4485`
- Certificate SHA-256: `52320cb3df703842ea9a349cba6825349a04cbf7d6b33181b12be544d0fc772e`

Build 778 passed signing, package/version, required-touchscreen, ordinary
launcher, no-Leanback, no-Google-Play, test, lint, and supplemental Pixel 9a
checks. Its Android accessibility-tree preflight exposed the Stargaze and
ambient-tour toggle buttons as unnamed focusable controls despite their ARIA
labels. Build 779 keeps redundant in-control text alternatives for Android
WebView. No 778 device or screenshot evidence transfers to the rebuilt bytes.

- [x] APK/AAB SHA-256 and certificate SHA-256 recorded.
- [ ] Signed APK installed on a named Fire model and Fire OS version.
- [ ] Offline bundled scene and live-data fallbacks pass.
- [ ] Touch, search, planet navigation, orientation, lifecycle, and Back pass.
- [ ] VoiceView, large text, reduced motion, and target-size checks pass.
- [ ] 60-minute WebGL/thermal stability run passes without crash or ANR.

Build 777 evidence is not transferable because 778 changed the manifest
device-targeting bytes; build 778 evidence is not transferable because 779
changes the accessibility bytes.
