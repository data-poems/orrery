# Orrery Fire tablet evidence

Target: Orrery 1.2.2 (780), package `solar.orrery.android`.

## Automated release evidence — 2026-09-04

- [x] Signed APK/AAB staged and checksums recorded.
- [x] Package/version, manifest, dependency graph, and certificate verified.
- [x] Web tests, lint, Android unit tests, and Android lint pass.

- APK: `dist/android/orrery-1.2.2-780-signed.apk`
- APK SHA-256: `48652e8c45fcd60f2143dd7d374bd80d506e5fa52d785fe38ffb78a40e5c7e7b`
- AAB SHA-256: `36760d7d0103fbcc4f9249f2dbc4c34ada3efe39ddfb2f6b7cbd19d16ab3168c`
- Certificate SHA-256: `52320cb3df703842ea9a349cba6825349a04cbf7d6b33181b12be544d0fc772e`
- Package/version: `solar.orrery.android`, 1.2.2 (780).
- Manifest/dependencies: touchscreen required, ordinary launcher, no Leanback
  launcher, and no Google Play Services entries.
- Automated results: 30 web tests across 9 files, ESLint, Android release unit
  tests including the native Back-result contract, Android lint, APK/AAB
  assembly, and signature verification pass. The web regression proves the
  controls panel is rendered from the same parent-owned state Android Back
  closes.

## Superseded build 779 evidence — 2026-09-04

- APK SHA-256: `88658e2e884417d0fd1c4ed0992aef8e92b4381d514f56f76bdc3f6086e9337b`
- AAB SHA-256: `799c242b20d881f53e22bb3343e5e613cfd2aa752021df0ed1524a70136d12fc`
- Certificate SHA-256: `52320cb3df703842ea9a349cba6825349a04cbf7d6b33181b12be544d0fc772e`

Supplemental non-Fire accessibility preflight, 2026-09-04: the exact signed
779 APK installed on a Pixel 9a (Android 16), was pulled back byte-for-byte with
the recorded APK hash, and exposed zero `NAF` nodes in the Android accessibility
tree. The two rebuilt toggle controls expose the names “Stargaze — sky and
constellations” and “Start ambient tour.” This validates the regression fix but
does not satisfy any Fire-specific checkbox below.

The exact 779 APK was also installed and pulled back byte-for-byte on Amazon
KFRASWI, Fire OS 8 / Android 11 build `0030132734852`. Its offline bundled
scene, touch navigation, planet/moon details, Sky/constellations, cinematic
date/time, Oort/Deep Space scales, New Horizons destination, VoiceView speech
and focus, large text, orientation, Home/resume, sleep/wake, and target sizes
passed. Hardware Back from a visibly open controls panel exited to Fire Launcher
instead of dismissing the panel, so the partial soak and all screenshot evidence
were invalidated. Build 780 adds the AndroidX Back dispatcher boundary.

## Superseded build 778 evidence — 2026-09-04

- APK SHA-256: `3002bb2a380d6c13ccdbc42929670e29a2c0ccacf47f13e40417029af951b799`
- AAB SHA-256: `028a22aaa6f164201a13c88980a5f5d7198f57e62cc4e30857801332150b4485`
- Certificate SHA-256: `52320cb3df703842ea9a349cba6825349a04cbf7d6b33181b12be544d0fc772e`

Build 778 passed signing, package/version, required-touchscreen, ordinary
launcher, no-Leanback, no-Google-Play, test, lint, and supplemental Pixel 9a
checks. Its Android accessibility-tree preflight exposed the Stargaze and
ambient-tour toggle buttons as unnamed focusable controls despite their ARIA
labels. Build 779 kept redundant in-control text alternatives for Android
WebView. No 778 device or screenshot evidence transferred to later bytes.

## Final build 780 Fire device gate — 2026-09-04

- [x] APK/AAB SHA-256 and certificate SHA-256 recorded.
- [x] Signed APK installed and pulled back byte-for-byte on Amazon KFRASWI,
  Fire OS 8 / Android 11 build `0030132734852`.
- [x] Offline cold launch renders the bundled scene with Wi-Fi disabled and no
  crash or ANR; unavailable live sources do not block exploration.
- [x] Touch exploration, Earth detail, Sky/constellations, cinematic tour,
  Oort/Deep Space, a spacecraft destination, portrait/landscape,
  Home/resume, sleep/wake, and the full Back chain pass.
- [x] VoiceView is bound as the active Fire OS screen reader and exposes visible
  focus for the labeled controls; 44 px controls satisfy the target-size gate.
- [ ] Large text and reduced-motion first-launch behavior pass.
- [ ] 60-minute WebGL/thermal stability run passes without crash or ANR.

Five exact-build screenshots are recorded with SHA-256 provenance in
`android/amazon-listing/ASSET-MAP.md`.

Two monitor attempts were deliberately excluded from evidence. The first
included time with the display asleep after the lifecycle check. The restarted
monitor held the display awake and began with PID `16711`, PSS 269,383 KB,
37.2 °C, thermal status 0, and an empty crash buffer, but the Fire tablet
disconnected from USB before the first ten-minute sample. Neither partial run
satisfies the 60-minute gate.

Build 777 evidence is not transferable because 778 changed the manifest
device-targeting bytes; 778 evidence is not transferable because 779 changed
the accessibility bytes; 779 evidence is not transferable because 780 changes
the Back-navigation bytes.
