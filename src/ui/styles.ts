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

/** White-on-dark alpha tiers for foreground text and dividers. */
export const ALPHA = {
  textPrimary: 1,
  textSecondary: 0.7,
  textTertiary: 0.5,
  textDisabled: 0.32,
  borderStrong: 0.2,
  borderSubtle: 0.08,
  dividerFaint: 0.04,
} as const;

/** Accent overlay alphas for selected/active states. */
export const ACTIVE_ALPHA = {
  border: 0.3,
  bg: 0.15,
} as const;

/** Transition timings: feedback for instant state, state for UI toggles,
 *  transform for layout-affecting movement. */
export const TIMING = {
  feedback: '0.1s',
  state: '0.18s',
  transform: '0.25s',
} as const;

// ─── Responsive hook ────────────────────────────────────────────────────────────

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}
