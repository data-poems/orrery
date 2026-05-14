/*
 * Shared UI styles and responsive helpers
 */

import { useState, useEffect } from 'react';

// ─── Glass panel style ──────────────────────────────────────────────────────────

export const glass: React.CSSProperties = {
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--panel-border, rgba(255,255,255,0.08))',
  borderRadius: 6,
};

// Bokeh-style card: heavier blur, softer background for info panels
export const bokehCard: React.CSSProperties = {
  background: 'rgba(0,0,0,0.45)',
  backdropFilter: 'blur(32px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(32px) saturate(1.4)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 10,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
};

// ─── Bottom sheet (mobile dropdowns/modals) ──────────────────────────────────

export function bottomSheet(maxHeight = '60vh'): React.CSSProperties {
  return {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    top: 'auto',
    maxHeight,
    borderRadius: '12px 12px 0 0',
    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
    overflowY: 'auto',
    zIndex: 100,
  };
}

// ─── Side drawer panel ──────────────────────────────────────────────────────────

export const drawerPanel: React.CSSProperties = {
  ...glass,
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: 0,
  borderRight: 'none',
  borderLeft: '1px solid rgba(255,255,255,0.06)',
};

export const drawerTab: React.CSSProperties = {
  position: 'fixed',
  right: 0,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 28,
  height: 80,
  ...glass,
  borderRadius: '6px 0 0 6px',
  borderRight: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  zIndex: 25,
  transition: 'opacity 0.15s',
};

// ─── Semantic tokens ────────────────────────────────────────────────────────────
// Use these in place of inline magic numbers so theme/density tweaks stay coherent.

/** Stacking order. Higher = nearer the viewer. Sky toggle sits at controls;
 *  drawer covers controls; drawerTab peeks above the drawer. */
export const Z = {
  canvasOverlay: 5,
  hud: 10,
  mobileNav: 15,
  controls: 20,
  drawer: 30,
  drawerTab: 31,
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
