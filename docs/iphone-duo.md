# iPhone Duo

November 14, 2026. Not released or uploaded.

## What changes

- **Tabletop** (inner screen upright, half-open like a laptop, fold across the
  middle): the 3D scene fills only the upper half, so the Sun no longer sits on
  the crease. The control strip, the planet chip and its details card, and the
  bottom-anchored info panels stay on the lower half, the part resting on the
  table. Lying flat, the scene fills the screen again.
- **Book** (inner screen sideways, fold down the middle) and **fully open
  sideways**: the scene still fills the screen but centers on the left page, so
  the Sun is off the crease. The control strip, the planet chip and its details
  card move to the center of the right page. Both stay put when the hinge opens
  fully, so nothing jumps.
- Everything else, on every other screen, is unchanged.

## How

- `ios/App/App/DuoBridge.swift` and `duo-fold.js` are byte-identical copies of
  lukeslp/snippets `mobile-capacitor/duo-bridge` (the bridge files as of
  19154ce). Change them there first. `AppViewController` makes the bridge in
  `capacitorDidLoad()` on `webView.configuration` and refreshes it on layout. A
  bridge made in `webViewConfiguration(for:)` never reaches the page in
  Capacitor 8.
- `src/lib/duoFold.ts` turns the fold state into a layout: tabletop needs an
  active horizontal fold with both halves at least 280 px; book needs an active
  vertical fold (or a sideways inner screen lying flat) with both pages at least
  340 px. Without `window.DuoFold`, which only the iOS shell provides, it
  returns null and nothing changes.
- `scene/DuoViewOffset.tsx` centers the scene in book pose with a camera view
  offset (`bookViewOffset`): the canvas is a window into a wider virtual view
  whose optical axis lands on the left page's center. The height, so the field
  of view and object sizes, stay the same; picking and scene labels follow the
  projection matrix. While it's on, the camera is marked `manual` so the canvas
  resize handler doesn't reset its aspect.
- `Orrery.tsx` caps the canvas height in tabletop. `BottomCluster` and
  `BodyStats` take the right-page center in book. `BodyStats` and the
  bottom-anchored panels in `Panels.tsx` cap their height above the fold in
  tabletop.

## Checks

- `pnpm test` (67, including 11 in `duoFold.test.ts`), `pnpm lint`, `tsc -b`.
- WebKit (Playwright 1.65.1, WebKit 27.2) with the real shim fed the Duo
  simulator's fold regions, main vs this branch, three states each (start, Sun
  selected, Sun details open). At 402 × 874, 466 × 678 (Duo outer, closed),
  956 × 440, 951 × 669 with no bridge, 1024 × 768 and 1280 × 800 the canvas,
  control strip, chip, details card and side card are in exactly the same place.
  On the simulated inner screen no button crosses the fold in any state (before:
  Zoom in, Sky and the Sun chip did, in book and fully open).
- Scene centering, read from the Sun's own label (drei places it at the Sun's
  projection): in book pose and fully open sideways it sits at x 222 to 227, the
  left page's center being 227.75 (before: 470, on the crease); in tabletop at
  y 203 to 226, in the upper half. At the other sizes it stays at the screen
  center, as before. Tapping the Sun at its shifted position in book pose
  selects it, so picking follows the offset.
- Xcode 27.2 Debug build on an "Orrery Duo 20261114" simulator (folded): it
  launches and shows the scene. A temporary page probe (not committed) read
  `shim: true`, `handler: true`, `DuoFold.state` `{hinge: true, status: "closed"}`.
  Give a fresh install about 30 s before the scene paints.

## Not checked

- The real inner screen. The simulator needs a Device Hub click to unfold;
  `capture-inner.sh` in the snippets bridge folder captures it while someone
  changes poses.
- The hinge angle as a time control (the "desk orrery" idea in the Duo review)
  is not built.

## Rollback

Revert the merge commit. No stored data changes.
