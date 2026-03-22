# Gemini Project Recommendations: Orrery

Based on a comprehensive code review and architectural analysis, the following recommendations are proposed to enhance the performance, reliability, and educational depth of the Orrery project.

## 🔴 High Impact: Immediate Improvements

### 1. Wire Up Mythology Data (`src/data/constellations.ts`)
*   **Observation**: A rich dataset of 88 IAU constellations with mythology text and astronomical data exists in `src/data/constellations.ts` but is currently orphaned.
*   **Action**: Integrate this data into `src/scene/Stars.tsx`. When a constellation label is clicked or hovered, display an info card (similar to the `PlanetCard`) showing its mythology, brightest star, and visibility season.
*   **Benefit**: Significant increase in educational value and user engagement.

### 2. Localize Texture Assets
*   **Observation**: Planet and moon textures are currently fetched from a CloudFront CDN (`d2xsxph8kpxj0f.cloudfront.net`).
*   **Action**: Download the `2k_*` textures and host them locally in `public/textures/`. Update `src/data/planets.ts` to use relative paths.
*   **Benefit**: Removes an external point of failure, improves offline support, and prevents "flat-color" fallbacks if the CDN goes down.

### 3. Implement an Error Boundary
*   **Observation**: A failure in Three.js or a critical texture load currently causes a "white-screen" crash.
*   **Action**: Wrap the `<Canvas>` component in a custom `ErrorBoundary` in `src/Orrery.tsx`.
*   **Benefit**: Graceful recovery and user feedback (e.g., "WebGL context lost" or "Assets failed to load") instead of a total application failure.

---

## 🟡 Medium Impact: Refinement & Depth

### 1. Code-Split Deep Space Components
*   **Observation**: `DeepSpace.tsx` (Galaxy disc, Oort Cloud) is heavy but only visible at extreme zoom.
*   **Action**: Use `React.lazy()` to dynamically import `DeepSpace` and other scale-specific components.
*   **Benefit**: Reduces the initial 1.18MB bundle size, speeding up the first meaningful paint for mobile users.

### 2. Upgrade Moon Orbital Mechanics
*   **Observation**: All moons currently use simplified circular orbits (`Satellite` in `Bodies.tsx`).
*   **Action**: Add eccentricity (`e`) and inclination (`i`) to the `MoonDef` type and update the `Satellite` position logic to use the elliptical solver in `lib/kepler.ts`.
*   **Benefit**: Corrects inaccuracies (e.g., Triton's retrograde orbit) and improves scientific fidelity.

### 3. Enhance NEO Visuals
*   **Observation**: Near-Earth Objects are currently static dots.
*   **Action**: Add velocity vectors or trailing "comet-tail" particles to indicate their trajectory relative to Earth.
*   **Benefit**: Makes the live data feel more dynamic and "alive" within the simulation.

---

## 🟢 Low Impact: Polish & Maintenance

### 1. Keyboard Shortcut Discoverability
*   **Action**: Add a `?` hotkey or a prominent button in the side drawer to toggle a "Keyboard Shortcuts" overlay.
*   **Benefit**: Improves feature discoverability for power users.

### 2. Clean Up Redundant Constellation Data
*   **Action**: Remove the duplicate 'Crux' entry in `constellations.ts` (currently exists as both 'Crx' and 'Cru').
*   **Benefit**: Data integrity and minor memory savings.

### 3. Screen Reader Validation
*   **Action**: Conduct a formal audit using NVDA or VoiceOver. Ensure the `sr-only` announcements in `Panels.tsx` trigger correctly during the cinematic tour.
*   **Benefit**: Ensures the project meets its high accessibility goals.

---

## Technical Debt Summary
*   **Unused Files**: `src/data/constellations.ts` (Requires wiring).
*   **Redundancy**: `public/data/constellations.json` vs `src/data/constellations.ts`.
*   **Dependency Management**: Consider moving to `httpx<0.28.0` if any future AT Protocol integrations (Skymarshal) are planned, to maintain workspace consistency.
