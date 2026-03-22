# CODEX Recommendations

Last updated: 2026-03-21

## Snapshot

The project is visually strong and functionally interesting, but it is not yet engineering-clean. The current state is best described as a polished prototype or portfolio-grade demo with clear next steps before it should be treated as stable production code.

Validation status:

- `pnpm build`: passes
- `pnpm lint`: fails
- Tests: none present

## Highest Priority

### 1. Fix the failing lint and React 19/compiler issues

Why this matters:

- The repo currently fails its own quality gate.
- Several lint findings are not cosmetic; they point to render-loop and state-management patterns that can hurt runtime performance.

Main problem areas:

- `src/Orrery.tsx`
  - synchronous state updates inside effects
  - loose `any` usage in external API parsing
- `src/scene/Scene.tsx`
  - mutable scene updates flagged by the current React hooks rules
  - weak typing on control refs
- `src/scene/Stars.tsx`
  - mutable shader uniform updates flagged by lint
  - `any`-typed GeoJSON parsing
  - state updates inside `useFrame`

Recommended outcome:

- `pnpm lint` passes cleanly
- external API responses are typed
- frame-driven visuals avoid React state churn

### 2. Remove frame-rate React rerenders in constellation labels

Why this matters:

- `ConstellationLabels` currently calls React state setters during `useFrame`.
- That can force React rerenders every animation frame whenever labels are active.

Recommended changes:

- move rapidly changing opacity/visibility concerns to refs or Three.js object mutation
- avoid allocating fresh `Vector3` objects inside the per-frame loop where possible
- keep React state for coarse UI state, not per-frame scene updates

Expected payoff:

- smoother label rendering
- lower CPU overhead
- better behavior on weaker devices

### 3. Make loading state reflect actual asset readiness

Why this matters:

- The loading overlay disappears when the canvas is created, not when textures and fetched scene data are ready.
- Users can see visible pop-in.

Recommended changes:

- track readiness for key async assets
- dismiss the loader only when the initial scene is materially ready
- add a fallback UI for failed textures or remote data

## Medium Priority

### 4. Reduce initial bundle size

Current state:

- production build emits a large main JS chunk and Vite warns about it

Likely contributors:

- eager loading of deep-space visuals
- large scene modules imported up front
- all features bundled into the initial path

Recommended changes:

- lazy-load `DeepSpace` features
- consider splitting star/constellation-heavy modules if that does not hurt UX
- verify whether all cinematic-only assets must be in the first chunk

### 5. Improve resilience against remote dependency failures

Current state:

- texture assets are loaded from external CDN URLs
- live NOAA/NASA requests are made client-side
- there is no error boundary around the scene

Risks:

- broken or slow third-party assets degrade first load
- API errors leave the app in a reduced but lightly explained state

Recommended changes:

- host critical textures locally under `public/`
- wrap the canvas in an error boundary
- show clearer degraded-state messaging for failed external data

### 6. Split up the largest source files

Current state:

- `src/ui/Panels.tsx` is very large
- `src/Orrery.tsx` still owns a lot of orchestration logic
- `src/scene/Stars.tsx` combines loading, shaders, labels, and line rendering

Why this matters:

- these files are still manageable now, but they are at the point where small feature changes will increasingly create regressions

Recommended changes:

- extract panel sections into smaller components
- separate API/data hooks from UI orchestration
- isolate star data loading from label rendering

## Lower Priority

### 7. Bring docs back in sync with the code

Current issues:

- `README.md` still reflects older preset counts and shortcut behavior
- version references are stale relative to `package.json`
- some CSS selectors no longer match the rendered markup

Recommended changes:

- update `README.md` to match the actual camera presets, shortcuts, and current toolchain
- remove dead selectors and stray UI leftovers
- treat `HANDOFF.md` as the more accurate source until README is refreshed

### 8. Add a basic test baseline

Current state:

- no tests
- no test script

Recommended minimum:

- unit tests for orbital math in `src/lib/kepler.ts`
- a small smoke test for the main app render
- one behavior-level test for key UI state transitions

Why this matters:

- the project has enough interaction complexity that regressions are now likely

### 9. Tighten accessibility and interaction details

The app already shows clear accessibility intent, but it still needs verification:

- test with an actual screen reader
- verify dialog behavior for detail cards
- verify click-outside and keyboard interactions across mobile and desktop
- confirm focus management around drawer and overlay states

## Recommended Execution Order

1. Make `pnpm lint` pass without weakening the rules.
2. Refactor the constellation-label frame loop to stop React rerenders during animation.
3. Improve loader readiness and failure handling.
4. Add code-splitting for deep-space and other non-critical heavy paths.
5. Update README and remove doc/UI drift.
6. Add a minimal automated test baseline.

## Practical Goal

If the immediate goal is polish for public presentation, start with lint cleanup, load behavior, and bundle reduction.

If the immediate goal is long-term maintainability, start with lint cleanup, file decomposition, and tests.
