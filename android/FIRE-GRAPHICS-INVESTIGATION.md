# Fire graphics investigation — 2026-09-05

This is a debug-package comparison, not a signed release certification. Signed
781 remains blocked, and public direct-download 777 is unchanged.

## Reproduced defect

The ambient tour intends one immediate destination, then one every ten seconds.
Its effect depended on `goToTarget`, which depends on `handlePlanetSelect`, which
depends on `selPlanet`. A tour selection changes `selPlanet`, recreates those
callbacks, and restarts the effect. Each restart reshuffles and immediately jumps
again. The Fire trace shows multiple jumps separated by milliseconds.

`useAmbientTourClock.test.ts` reproduces the callback-identity transition: the old
effect immediately calls the new callback with `restart=true`. The fixed hook
uses an Effect Event to read the latest callback while making timer lifetime
depend only on activation. Tests cover the ten-second boundary, latest callback,
pause/restart, and unmount cleanup.

The earlier orbit-buffer optimization was set aside to isolate the scheduling
fix. `Bodies.tsx` and its Drei line renderer remain unchanged. The experimental
buffer implementation and its passing unit tests are retained only in the local
cache `orrery-fire-evidence/orbit-buffer-experiment/`, not in the release source.

## Comparison protocol

- Physical Amazon KFRASWI / Fire OS 8, serial `GVW3T505623706SG`.
- Isolated `solar.orrery.android.debug`; signed package remains installed.
- Same dependency installation and original orbit renderer in both runs.
- `VITE_ORRERY_GRAPHICS_PROBE=true` supplies a dedicated fixed-seed tour shuffle,
  independent of Three.js/procedural random calls. Ordinary builds remain random.
- `GraphicsTourTest` starts the tour, checks that it stays active, and keeps its
  activity awake without modifying permanent device timeout settings.
- `scripts/fire-graphics-probe.mjs` records installed APK bytes/hash, raw memory,
  foreground/PID, wakefulness, thermal state, screenshots, and retained route logs.
- Route output intentionally differs after the fix: the baseline repeatedly
  reshuffles instead of following the intended playlist. This is a comparison of
  the same seeded input, not a claim of identical rendered destinations.
- The Android log ring discarded early route entries. The baseline retains
  194 entries over its final ~208 seconds; the fix retains 36 over ~350 seconds.
  The runner now streams route logs for future runs to prevent this loss.

Baseline APK SHA-256:
`72ef42d68479e958617d9e61369870ce01b87afdfc743b38df764003105c28d8`.

Scheduler-fix APK SHA-256:
`6c3216549b3dbbf33914fe2b6276d21c9a04b25e73f9ceabf7d655912d877018`.

Raw evidence lives in `/Users/luke/Library/Caches/orrery-fire-evidence/` under
`graphics-seeded-baseline/` and `graphics-seeded-fixed/`. The earlier
`graphics-ab-baseline/` is exploratory, unseeded evidence only.

## Results

Both instrumentation tests completed successfully. All captured samples were
awake, foreground, thermal status 0, and retained one PID per run (baseline
11200, fix 13900). The legacy harness measured 600 seconds of sleep plus UI-call
overhead, so actual test durations were 633.301 and 796.424 seconds respectively.
The harness now uses elapsed wall time. Compare the matching ~600-second samples,
not the unequal final durations:

| Measurement | Baseline | Scheduler fix |
|---|---:|---:|
| PSS at ~600 seconds, KB | 841,620 | 662,088 |
| Graphics at ~600 seconds, KB | 647,928 | 483,160 |
| Peak PSS across captured run, KB | 848,665 | 735,382 |
| Retained route intervals below 1 second | 174 | 0 |
| Retained fixed-route interval range | — | 9,934–10,074 ms |

At the common ten-minute mark, total PSS was 21.3% lower and graphics 25.4% lower.
The fix's last sample at ~780 seconds was 704,497 KB PSS / 522,512 KB graphics.
Screenshots show the original rendered bodies/orbits, not a reduced-content scene.
This single short comparison confirms the cadence repair and supports reduced
memory pressure; it does not establish that the original hour-long failure is
fully resolved. Scene-dependent allocation and longer-term retention remain gates.

Automated verification: 34 web tests across 11 files, ESLint, TypeScript, Android
debug unit tests, test-APK assembly, and debug lint pass. The clock regression
failed before the fix and passes afterward. Test-only fixed-seed randomness also
has guards proving ordinary builds remain random and diagnostic sequences are
independent of other random allocations.

Repeat with a fresh output directory using an archived debug APK (each run folder
contains its exact `installed.apk`) and the instrumentation APK:

```sh
node scripts/fire-graphics-probe.mjs GVW3T505623706SG /absolute/new/evidence-directory 600
```

To build the current diagnostic app, set `VITE_ORRERY_GRAPHICS_PROBE=true` for
`pnpm android:sync`, then assemble debug and debugAndroidTest with Gradle. Never
use that environment flag for a submitted artifact. The discarded orbit-buffer
comparison switch is no longer part of the source.

The final release gate still requires a new native build number, an ordinary
non-diagnostic signed artifact, and fresh full-duration Fire/lifecycle/accessibility
and screenshot evidence. Do not publish or submit these debug APKs.
