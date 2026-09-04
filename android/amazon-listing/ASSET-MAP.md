# Amazon Appstore asset map — Orrery

Target binary: `solar.orrery.android` 1.2.2 (780), Fire tablets only.

## Copy

- Title: `Orrery`
- Short description: `Explore the solar system, planets, stars, and constellations.`
- Long description source: `app-store/app-store-listing.md`, with Apple-only
  references removed and the current Fire-tested behavior verified before paste.
- Support URL: `https://orrery.solar`
- Privacy URL: `https://orrery.solar/orrery/privacy.html`
- Reviewer credentials: none required.

## Visual assets

| Amazon field | Source | State |
|---|---|---|
| App icon | `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` | Source identified; export to Amazon's current dimensions without redesigning it |
| Fire-tablet screenshots | `screenshots/01-full-system.png` through `screenshots/05-deep-space.png`, captured from the exact signed 780 APK on Amazon KFRASWI | Complete; hashes below |
| Promotional image | Derive from a current 780 hero scene only if the console requires it | Open |

Capture at least five landscape or portrait frames that match the submitted
binary: full-system hero, planet detail, Sky/constellations, cinematic tour,
and deep-space objects. Keep all text legible on the physical tablet and avoid
claims about live data in any frame captured offline.

| Screenshot | SHA-256 |
|---|---|
| `01-full-system.png` | `2269c108ef838f56fb37b81d4545ec50dd6b0a69a9939c6da820903ed9d40da8` |
| `02-earth-detail.png` | `d182b88c3946e2eeec85554e3cab1d03fda469d755de00d287b68f7bcc199271` |
| `03-stargaze.png` | `5ee410eee49e7319204eae68b86aef68a7c920b6307dbc7453f4ef444b81516d` |
| `04-cinematic-date-time.png` | `61cada82da1513443ead6f73d7dfa11680b7ff00e6e5e720d44b648330a28426` |
| `05-deep-space.png` | `49b42fb851af7604863798f6f14ffe43d0332c7fa13abf80c49c4430396a5952` |

## Integrity rule

Every screenshot must come from the same signed APK recorded in
`android/AMAZON-DEVICE-EVIDENCE.md`. If the APK bytes change, recapture the
screenshots and replace the evidence hashes before submission.
