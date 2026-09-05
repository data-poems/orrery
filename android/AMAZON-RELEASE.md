# Amazon Appstore — Orrery Fire tablet

## Identity

| Field | Value |
|---|---|
| Package | `solar.orrery.android` |
| Version | `1.2.2 (781)` |
| Device family | Fire tablets only |
| Console state | No record as of 2026-09-04 |
| Direct-download state | 1.2.2 (777) remains unchanged |

The earlier signed 777 artifact did not explicitly require a touchscreen.
Build 778 introduced that filtering boundary; 779 preserved readable names
inside the two WebView toggle buttons after 778 exposed them as unnamed controls
on Android. Fire testing then showed that hardware Back left the app while the
controls panel was open. Build 780 routes Back through the web UI first and only
leaves the app when there is no dismissible in-app state. Build 781 fixes
overlapping controls and overflowing scale buttons at 200% system text. Its
60-minute Fire observation completed without crash or thermal escalation but
failed because graphics memory grew from 436 MB to 1.40 GB without settling.
Evidence tied to any predecessor cannot be reused; 781 must not be uploaded.

## Build and verification

```sh
cd /Users/luke/workspace/android-release-toolkit
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home \
ANDROID_HOME=/Users/luke/Library/Android/sdk \
scripts/android-release with-signing --profile orrery -- \
  /bin/sh -c 'cd /Users/luke/workspace/orrery-app && pnpm android:release'
```

Before device testing, verify APK and AAB signatures and checksums, package
`solar.orrery.android`, version code 781, required touchscreen targeting, and
absence of Google Play Services.

Listing copy and asset provenance are tracked in
`android/amazon-listing/ASSET-MAP.md`.

## Physical Fire gate

Record the exact APK hash, certificate, tablet model, Fire OS version, and date.
Verify:

- cold launch and bundled scene without a network connection;
- planet textures, mobile star catalog, labels, and touch navigation;
- graceful live-data fallback for NASA, JPL, NOAA, and CelesTrak sources;
- portrait/landscape reflow, Home/resume, sleep/wake, and Back;
- VoiceView focus and labels, large text, touch targets, and reduced motion;
- WebGL frame stability, memory, temperature, and battery behavior over a
  60-minute foreground session.

## Human console checkpoint

After a replacement candidate passes, create a standard tablet-only Amazon
record, upload the APK, inspect the generated supported-device list, complete
the listing/privacy/rating/reviewer fields, and submit. Repository tooling never
logs into Amazon.
