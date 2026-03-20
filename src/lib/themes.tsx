/*
 * Theme system — colorblind-safe palettes for the orrery
 *
 * Four themes: Brass (warm default), Silver (cool), High Contrast (WCAG AAA), Ember (warm alt)
 * All palettes tested against protanopia, deuteranopia, and tritanopia.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// ─── Theme definition ────────────────────────────────────────────────────────

export interface OrreryTheme {
  id: string;
  name: string;
  constellationLine: string;
  uiAccent: string;
  uiAccentRgb: string;          // r,g,b for rgba() usage
  panelBorder: string;
  milkyWay: string;
  selectedRing: string;         // planet selection ring color
}

export const THEMES: OrreryTheme[] = [
  {
    id: 'brass',
    name: 'Brass',
    constellationLine: '#c8a86e',
    uiAccent: '#00ffcc',
    uiAccentRgb: '0,255,204',
    panelBorder: 'rgba(255,255,255,0.08)',
    milkyWay: '#e8e0d0',
    selectedRing: '#00ffcc',
  },
  {
    id: 'silver',
    name: 'Silver',
    constellationLine: '#8899bb',
    uiAccent: '#66bbff',
    uiAccentRgb: '102,187,255',
    panelBorder: 'rgba(255,255,255,0.08)',
    milkyWay: '#c0c8d8',
    selectedRing: '#66bbff',
  },
  {
    id: 'highcontrast',
    name: 'High Contrast',
    constellationLine: '#ffffff',
    uiAccent: '#ffff00',
    uiAccentRgb: '255,255,0',
    panelBorder: 'rgba(255,255,255,0.15)',
    milkyWay: '#ffffff',
    selectedRing: '#ffff00',
  },
  {
    id: 'ember',
    name: 'Ember',
    constellationLine: '#cc7744',
    uiAccent: '#44ccaa',
    uiAccentRgb: '68,204,170',
    panelBorder: 'rgba(255,255,255,0.08)',
    milkyWay: '#d8c0a8',
    selectedRing: '#44ccaa',
  },
];

const STORAGE_KEY = 'orrery-theme';

function loadTheme(): OrreryTheme {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    if (id) {
      const found = THEMES.find(t => t.id === id);
      if (found) return found;
    }
  } catch { /* SSR or private browsing */ }
  return THEMES[0];
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: OrreryTheme;
  setTheme: (theme: OrreryTheme) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES[0],
  setTheme: () => {},
  cycleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<OrreryTheme>(loadTheme);

  const setTheme = useCallback((t: OrreryTheme) => {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t.id); } catch { /* ignore */ }
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState(prev => {
      const idx = THEMES.findIndex(t => t.id === prev.id);
      const next = THEMES[(idx + 1) % THEMES.length];
      try { localStorage.setItem(STORAGE_KEY, next.id); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Set CSS custom properties on :root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', theme.uiAccent);
    root.style.setProperty('--accent-rgb', theme.uiAccentRgb);
    root.style.setProperty('--panel-border', theme.panelBorder);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
