# App Store rejection notes

Paste the **exact** Resolution Center message from App Store Connect below when available.

## Likely guideline mappings (ambiguous rejection)

| Symptom | Guideline | Mitigation in this branch |
|---------|-----------|---------------------------|
| Splash / loading hang | 2.1 Performance | Loading watchdog + star fetch error handling |
| WebView-only feel | 4.2 Minimum functionality | Native shell + offline catalogs |
| Data attribution | 5.2.3 IP | About dialog + THIRD_PARTY_NOTICES.md |
| Privacy URL | 5.1.1 | `public/privacy.html` → deploy at `/privacy` |
| Inaccurate NEO orbits | 2.1 / 1.1 | Synthetic orbit labeled in UI when SBDB fails |

## Re-submission checklist

- [ ] Privacy URL live at https://orrery.solar/privacy
- [ ] In-app Data Sources / licenses visible in About
- [ ] Cinematic tour exits on user drag
- [ ] `pnpm ios:sync` + fresh `__ORRERY_BUILD_STAMP__` on device
- [ ] TestFlight: dice roll, planet focus, observatory mode, background resume
