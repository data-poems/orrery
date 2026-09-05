# Orrery Fire tablet evidence

Target: Orrery 1.2.2 (781), package `solar.orrery.android`.

## Build 781 — 2026-09-04 (local date)

Status: **Failed Fire stability gate**. Build 780 failed the Fire OS 200% text
check: fixed-height controls overlapped and its five-column scale row overflowed.
Build 781 uses content-height rows and wrapping scale buttons, but its exact
60-minute Fire run shows sustained graphics-memory growth without settling. It is not eligible
for the Amazon listing checkpoint. No prior binary's device or listing evidence
transfers to these bytes.

- APK: `dist/android/orrery-1.2.2-781-signed.apk`
- APK SHA-256: `e090498e8724af8ec300c88f5d4bba65f1eb8e41008942180e6fd0cdf360c99f`
- AAB SHA-256: `e711dcc0f00abafb7477ffd4bd5fa8544f7e29e1659f999876611a9181a53be2`
- Certificate SHA-256: `52320cb3df703842ea9a349cba6825349a04cbf7d6b33181b12be544d0fc772e`
- Device: Amazon KFRASWI / Fire OS 8, Android 11 build `0030132734852`,
  serial `GVW3T505623706SG`.

September 5 follow-up: the unchanged installed PID later fell to 581,195 KB PSS
while another app was foreground. This does not overturn the foreground failure,
but it does not support calling the allocation growth permanently unbounded.
The diagnostic build command cleared the local `dist/` staging shelf. The exact
781 APK was recovered from the installed device and its original SHA-256 verified;
the preserved copy is
`/Users/luke/Library/Caches/orrery-fire-evidence/orrery-1.2.2-781-signed.apk`.
The old AAB checksum above is historical; that staged AAB was not recovered.
Archive native artifacts outside `dist/` before running web-build commands.

Measured:

- [x] Regression test fails on fixed-height rows before the fix; all 31 web
  tests across nine files and ESLint pass afterward.
- [x] TypeScript, signed APK/AAB staging, Android release unit tests, and lint
  pass using JDK 21 and Android SDK 36.
- [x] Package 1.2.2 (781), unchanged certificate, required touchscreen, no
  Leanback targeting, and no GMS class markers verified.
- [x] Installed APK read back from Fire matches the staged SHA-256 exactly.

Observed on these bytes:

- [x] 200% system text: controls grow with labels, all five scale buttons wrap
  within the panel, and scrolling reaches the lower About/keyboard actions.
- [x] Fresh local test-data reset with animations disabled opens directly in
  Full System, without the automatic cinematic. Returning after restoring
  animations still opens exploration rather than replaying the intro.
- [x] Fresh offline launch renders bundled planets; Earth selection, scale
  navigation, portrait/landscape, Home/resume, and sleep/wake retain a usable
  scene. Sleep was explicitly observed as Asleep, followed by Awake and the
  same foreground app PID after dismissing the keyguard.
- [x] Hardware Back closes Controls, dismisses Earth to Inner System, then
  leaves the root to the prior Android task.
- [x] With VoiceView enabled, the controls expose names/roles/states in the
  accessibility tree. Tab/Enter opens Controls and focuses Close controls.
  This is limited exposure/focus evidence, not a complete spoken-navigation
  or screen-reader usability certification.
- [ ] Complete the remaining Sky/cinematic/deep-space exploration and final
  VoiceView spoken-navigation checks on 781.
- [ ] Recapture the five listing screenshots from 781.
- [x] Complete the uninterrupted 60-minute foreground observation.
- [ ] Pass the stability gate: the completed observation failed its memory
  criterion, so it is not device-certified.

The ambient-tour observation ran from `2026-09-05T03:03:09Z` through
`04:03:10Z` (September 4, 20:03–21:03 local), PID `21782`, with 61 samples.
The app remained awake and foreground throughout; there were no crash/ANR
events, and thermal status remained 0. Battery temperature rose from 33.3 °C
to 39.7 °C. Final touch verification opened Controls and exposed the expected
interactive rows after the run.

The run nevertheless **fails**: total PSS grew from 445,764 KB to 1,438,027 KB
and did not settle. A post-run measurement while the unchanged app remained
foreground was 1,508,938 KB; graphics accounted for the overwhelming share.
`graphics-investigation.md` records the limited source and desktop-WebGL lead:
continuous orbit-path updates cause repeated line geometry/program allocation.
That is an inference, not the established Fire root cause. A fix must use a new
version code and earn fresh exact-byte device evidence.

Samples, ten-minute frames, `memory-midrun.txt`, `memory-late-run.txt`, and the
diagnostic note are in `/Users/luke/Library/Caches/orrery-fire-evidence/781-soak/`.
The bounded runner was `/tmp/orrery781-fire-soak.py`; it restored the timeout
after completion. These files preserve the failure evidence and must not be
misrepresented as a passed stability gate.

The runner restores the temporary timeout from `2147483647` to `3600000` ms
if it still owns that setting. Wi-Fi is enabled, airplane mode is disabled,
font scale and animator duration are back to 1.0, and VoiceView is disabled.
The original plugged-in stay-awake value remains 7.

## Superseded build 780 automated evidence — 2026-09-04

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

## Superseded build 780 Fire device gate — 2026-09-04

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
