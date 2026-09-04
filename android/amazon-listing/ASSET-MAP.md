# Amazon Appstore asset map — Orrery

Target binary: `solar.orrery.android` 1.2.2 (779), Fire tablets only.

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
| Fire-tablet screenshots | Capture from the exact signed 779 APK on the named Fire device | Open; do not reuse iOS, web, or 778 captures |
| Promotional image | Derive from a current 779 hero scene only if the console requires it | Open |

Capture at least five landscape or portrait frames that match the submitted
binary: full-system hero, planet detail, Sky/constellations, time controls, and
deep-space objects. Keep all text legible on the physical tablet and avoid
claims about live data in any frame captured offline.

## Integrity rule

Every screenshot must come from the same signed APK recorded in
`android/AMAZON-DEVICE-EVIDENCE.md`. If the APK bytes change, recapture the
screenshots and replace the evidence hashes before submission.
