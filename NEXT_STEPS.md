# Orrery — Next Steps & Roadmap

## Recent Achievements
- **Constellation Rendering Fix:** Removed the "string of pearls" artifact by deleting discrete point rendering along curved lines.
- **Themed Constellations:** Implemented a categorical coloring system (Zodiac, Classical, Southern, etc.) for better visual depth.
- **Real-Data Milky Way:** Replaced procedural shader with real GeoJSON galactic outlines and a soft "dusty" noise shader.
- **Loading Feedback:** Added a real-time progress bar tracking the completion of all major data-fetching tasks.
- **Tour Smoothness:** Implemented time-based easing for cinematic camera transitions, eliminating jarring movement.
- **Asterism Separation:** Decoupled informal star patterns from formal IAU constellations to resolve visual clutter.
- **Architectural Cleanup:** Centralized coordinate conversion math and constants (`raDecTo3D`, `ECLIPTIC_TILT`, `DEG`) in `kepler.ts`.
- **Orbit Rings:** Standardized on a high-contrast grayscale/white-black theme for planetary orbits.
- **Dead Code Removal:** Deleted unused `src/data/constellations.ts` and resolved several React 19 linting errors.

## High Priority
- [ ] **Milky Way Interaction:** Add labels or selection logic for specific regions of the galactic band (e.g., Galactic Center, Cygnus Rift).
- [ ] **Deep Space Expansion:** Integrate more Local Group galaxies and refine spacecraft trajectory projections.
- [ ] **Mobile Optimization:** Further refine HUD panels and touch controls for smaller viewports.
- [ ] **Event System:** Add notifications or visual markers for astronomical events like planetary conjunctions or eclipses.

## Visual Improvements
- [ ] **Atmospheric Shaders:** Implement Rayleigh scattering for Earth and other planets with significant atmospheres.
- [ ] **Dynamic Lighting:** Ensure the Sun's light interacts correctly with planetary tilt and rotation for accurate day/night cycles.
- [ ] **Star Magnitude Scaling:** Refine star point sizes based on actual apparent magnitude data more aggressively.

## Technical Tasks
- [ ] **Unit Testing:** Implement tests for Keplerian math and coordinate conversions in `kepler.ts`.
- [ ] **Texture Compression:** Convert large planet textures to WebP or use specialized 3D texture compression (Basis/KTX2).
- [ ] **Documentation:** Create a comprehensive API guide for adding new celestial layers or data sources.
