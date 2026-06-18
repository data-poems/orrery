/*
 * Shared UI styles and responsive helpers
 */

import { useState, useEffect } from 'react';

// ─── Card surface ───────────────────────────────────────────────────────────────

// Bokeh-style card: heavy blur, softer background for floating info cards.
export const bokehCard: React.CSSProperties = {
  background: 'rgba(0,0,0,0.45)',
  backdropFilter: 'blur(32px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(32px) saturate(1.4)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 10,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
};

// ─── Semantic tokens ────────────────────────────────────────────────────────────
// Use these in place of inline magic numbers so theme/density tweaks stay coherent.

/** Stacking order. Higher = nearer the viewer. */
export const Z = {
  canvasOverlay: 5,
  hud: 10,
  controls: 20,
  dialog: 35,
  modal: 40,
  loading: 100,
} as const;

/** Backdrop blur tiers. chip is small floating controls; card is info bubbles;
 *  drawer is the side panel; modal/bokeh are heavy glass treatments. */
export const BLUR = {
  chip: 8,
  card: 12,
  drawer: 20,
  modal: 24,
  bokeh: 32,
} as const;

// ─── Responsive hook ────────────────────────────────────────────────────────────

export function useIsMobile(): boolean {
  return useMaxWidth(768);
}

/** True at or below tablet width — used for the compact body readout (chip). */
export function useIsCompact(): boolean {
  return useMaxWidth(1024);
}

function useMaxWidth(px: number): boolean {
  // matchMedia fires once per breakpoint crossing (not every resize pixel) and
  // is pinch-zoom safe on iOS, unlike window.innerWidth.
  const [match, setMatch] = useState(
    () => typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${px}px)`).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${px}px)`);
    const fn = (e: MediaQueryListEvent) => setMatch(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [px]);
  return match;
}
