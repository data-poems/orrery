/*
 * Reduced-motion preference.
 *
 * The orrery's motion is almost entirely JS-driven (camera lerps, the cinematic
 * auto-tour, auto-rotate) — the CSS `prefers-reduced-motion` rule in index.css
 * can't reach any of it. This module exposes the OS preference so those paths
 * can honor it: skip the auto-tour on load, disable auto-rotate, and snap the
 * camera instead of easing. The orbital simulation itself keeps running — it's
 * the primary content, not decorative motion.
 *
 * Read once at module load; the preference effectively never changes mid-session
 * and gating it reactively isn't worth the churn.
 */
export const PREFERS_REDUCED_MOTION: boolean =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
