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

// Dropdown panel: glass with slightly more background
export const dropdownPanel: React.CSSProperties = {
  ...glass,
  background: 'rgba(0,0,0,0.75)',
  borderRadius: 8,
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
};

// About modal: larger blur for prominence
export const aboutModal: React.CSSProperties = {
  ...bokehCard,
  backdropFilter: 'blur(40px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(40px) saturate(1.4)',
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
