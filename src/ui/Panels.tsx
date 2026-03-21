/*
 * All HUD panels — overlay UI for the orrery
 *
 * Layout: unified toolbar (top) with camera presets, Bodies dropdown,
 * Layers dropdown, About button. Info cards + NEO panel below.
 *
 * Responsive: mobile gets larger touch targets, bottom sheets, safe-area insets.
 * Theme-aware: all accent colors come from the active theme.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { NEO, FocusTarget, CamPreset } from '../lib/kepler';
import { ALL_BODIES } from '../data/planets';
import { getMoonsForPlanet } from '../data/moons';
import { useTheme, THEMES } from '../lib/themes';
import { glass, bokehCard, dropdownPanel, aboutModal, bottomSheet, useIsMobile } from './styles';

// ─── Tiny UI primitives ─────────────────────────────────────────────────────────

function Btn({ children, onClick, style, label }: {
  children: React.ReactNode; onClick: () => void; style?: React.CSSProperties; label?: string;
}) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
      fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
      padding: '4px 8px', lineHeight: 1.4, minWidth: 44, minHeight: 44,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}>
      {children}
    </button>
  );
}

function Stat({ label, val, c }: { label: string; val: string | number; c?: string }) {
  return (
    <div>
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 300 }}>{label}</div>
      <div style={{ color: c || '#fff', fontSize: 12, marginTop: 1 }}>{val}</div>
    </div>
  );
}

// ─── Speed label formatter ──────────────────────────────────────────────────────

function speedLabel(s: number) {
  if (s === 1) return '1\u00d7';
  if (s < 1000) return `${s}\u00d7`;
  if (s < 86400) return `${(s / 3600).toFixed(1)}h/s`;
  if (s < 86400 * 365) return `${(s / 86400).toFixed(1)}d/s`;
  return `${(s / (86400 * 365)).toFixed(1)}yr/s`;
}

// ─── Date formatter ─────────────────────────────────────────────────────────────

function fmtDate(d: Date) { return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
function fmtTime(d: Date) { return d.toLocaleTimeString('en-US', { hour12: false }); }

// ─── Scale indicator labels ─────────────────────────────────────────────────────

const SCALE_LANDMARKS = [
  { dist: 2, label: 'Inner' },
  { dist: 10, label: 'Outer' },
  { dist: 50, label: 'Kuiper' },
  { dist: 5000, label: 'Oort' },
  { dist: 60000, label: 'Galaxy' },
];

function ScaleIndicator({ cameraDistance }: { cameraDistance: number }) {
  const minLog = Math.log10(0.1);
  const maxLog = Math.log10(200000);
  const range = maxLog - minLog;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', left: 8, top: '20%', bottom: '20%',
        width: 24, zIndex: 5, pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}
    >
      <div style={{
        position: 'absolute', left: 10, top: 0, bottom: 0, width: 1,
        background: 'rgba(255,255,255,0.08)',
      }} />
      <div style={{
        position: 'absolute', left: 6, width: 9, height: 2,
        background: 'rgba(255,255,255,0.4)',
        borderRadius: 1,
        top: `${Math.max(0, Math.min(100, ((Math.log10(Math.max(0.1, cameraDistance)) - minLog) / range) * 100))}%`,
        transition: 'top 0.3s ease-out',
      }} />
      {SCALE_LANDMARKS.map(lm => {
        const pct = ((Math.log10(lm.dist) - minLog) / range) * 100;
        return (
          <div key={lm.label} style={{
            position: 'absolute', left: 16, top: `${pct}%`,
            transform: 'translateY(-50%)',
            fontSize: 8, color: 'rgba(255,255,255,0.15)',
            whiteSpace: 'nowrap', fontWeight: 300, letterSpacing: 0.5,
          }}>
            <span style={{
              position: 'absolute', left: -8, top: '50%', width: 5, height: 1,
              background: 'rgba(255,255,255,0.1)',
            }} />
            {lm.label}
          </div>
        );
      })}
    </div>
  );
}

// ─── useClickOutside hook ────────────────────────────────────────────────────────

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ref, handler]);
}

// ─── Bodies Dropdown ─────────────────────────────────────────────────────────────

function BodiesDropdown({ selPlanet, setSelPlanet, accent, accentRgb, mobile, onMoonSelect }: {
  selPlanet: number | null;
  setSelPlanet: (i: number | null) => void;
  accent: string;
  accentRgb: string;
  mobile: boolean;
  onMoonSelect?: (planetIdx: number, moonIdx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open]);

  const handleSelect = useCallback((idx: number) => {
    setSelPlanet(idx);
    setOpen(false);
  }, [setSelPlanet]);

  const handleMoonClick = useCallback((planetIdx: number, moonIdx: number) => {
    if (onMoonSelect) onMoonSelect(planetIdx, moonIdx);
    setOpen(false);
  }, [onMoonSelect]);

  // Build planet tree: planets with their moons
  const planets = ALL_BODIES.slice(0, 8); // main planets
  const dwarfs = ALL_BODIES.slice(8);     // dwarf planets

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(p => !p)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Select celestial body"
        style={{
          background: selPlanet !== null ? `rgba(${accentRgb},0.1)` : 'transparent',
          border: `1px solid ${selPlanet !== null ? `rgba(${accentRgb},0.35)` : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 4,
          padding: mobile ? '5px 10px' : '4px 10px',
          fontSize: mobile ? 10 : 12,
          cursor: 'pointer', fontFamily: 'inherit',
          color: selPlanet !== null ? accent : 'rgba(255,255,255,0.5)',
          fontWeight: selPlanet !== null ? 500 : 300,
          letterSpacing: 0.5,
          minHeight: mobile ? 32 : 28,
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all 0.15s',
        }}
      >
        {selPlanet !== null && (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ALL_BODIES[selPlanet].color, flexShrink: 0 }} />
        )}
        {selPlanet !== null ? ALL_BODIES[selPlanet].name : 'Bodies'}
        <span style={{ fontSize: 8, opacity: 0.6, marginLeft: 2 }}>{open ? '\u25b2' : '\u25bc'}</span>
      </button>

      {open && (
        <>
          {/* Backdrop for mobile */}
          {mobile && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }} onClick={() => setOpen(false)} />}
          <div
            role="tree"
            aria-label="Celestial bodies"
            style={mobile ? {
              ...dropdownPanel,
              ...bottomSheet('60vh'),
              padding: '12px 0',
            } : {
              ...dropdownPanel,
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              minWidth: 200, maxHeight: 400, overflowY: 'auto',
              padding: '8px 0', zIndex: 100,
            }}
          >
            {/* Planets */}
            {planets.map((body, idx) => {
              const moons = getMoonsForPlanet(idx);
              return (
                <div key={body.name} role="treeitem">
                  <button
                    onClick={() => handleSelect(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: mobile ? '10px 16px' : '6px 14px',
                      background: selPlanet === idx ? `rgba(${accentRgb},0.08)` : 'transparent',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      color: selPlanet === idx ? accent : 'rgba(255,255,255,0.7)',
                      fontSize: mobile ? 13 : 12, fontWeight: selPlanet === idx ? 500 : 300,
                      minHeight: mobile ? 44 : 'auto', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: body.color, flexShrink: 0 }} />
                    {body.name}
                  </button>
                  {/* Moons */}
                  {moons.map((moon, mIdx) => (
                    <button
                      key={moon.name}
                      onClick={() => handleMoonClick(idx, mIdx)}
                      role="treeitem"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: mobile ? '8px 16px 8px 36px' : '4px 14px 4px 32px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontFamily: 'inherit', color: 'rgba(255,255,255,0.45)',
                        fontSize: mobile ? 12 : 11, fontStyle: 'italic', fontWeight: 300,
                        minHeight: mobile ? 40 : 'auto', textAlign: 'left',
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: moon.color, flexShrink: 0 }} />
                      {moon.name}
                    </button>
                  ))}
                </div>
              );
            })}

            {/* Dwarf planets separator */}
            <div style={{
              padding: '8px 14px 4px', fontSize: 9, letterSpacing: 2,
              color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', fontWeight: 300,
            }}>
              Dwarf Planets
            </div>
            {dwarfs.map((body, i) => {
              const idx = 8 + i;
              const moons = getMoonsForPlanet(idx);
              return (
                <div key={body.name} role="treeitem">
                  <button
                    onClick={() => handleSelect(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: mobile ? '10px 16px' : '6px 14px',
                      background: selPlanet === idx ? `rgba(${accentRgb},0.08)` : 'transparent',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      color: selPlanet === idx ? accent : 'rgba(255,255,255,0.7)',
                      fontSize: mobile ? 13 : 12, fontWeight: selPlanet === idx ? 500 : 300,
                      minHeight: mobile ? 44 : 'auto', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: body.color, flexShrink: 0 }} />
                    {body.name}
                  </button>
                  {moons.map((moon, mIdx) => (
                    <button
                      key={moon.name}
                      onClick={() => handleMoonClick(idx, mIdx)}
                      role="treeitem"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: mobile ? '8px 16px 8px 36px' : '4px 14px 4px 32px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontFamily: 'inherit', color: 'rgba(255,255,255,0.45)',
                        fontSize: mobile ? 12 : 11, fontStyle: 'italic', fontWeight: 300,
                        minHeight: mobile ? 40 : 'auto', textAlign: 'left',
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: moon.color, flexShrink: 0 }} />
                      {moon.name}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Layers Dropdown ─────────────────────────────────────────────────────────────

function LayersDropdown({ accent, accentRgb, mobile, neoStatus, neoCount, ...toggles }: {
  accent: string;
  accentRgb: string;
  mobile: boolean;
  neoStatus: 'loading' | 'loaded' | 'error';
  neoCount: number;
  showStars: boolean; setShowStars: (fn: (p: boolean) => boolean) => void;
  showConstellations: boolean; setShowConstellations: (fn: (p: boolean) => boolean) => void;
  showDwarf: boolean; setShowDwarf: (fn: (p: boolean) => boolean) => void;
  showNeo: boolean; setShowNeo: (fn: (p: boolean) => boolean) => void;
  showAsteroidBelt: boolean; setShowAsteroidBelt: (fn: (p: boolean) => boolean) => void;
  showMilkyWay: boolean; setShowMilkyWay: (fn: (p: boolean) => boolean) => void;
  showDeepSpace: boolean; setShowDeepSpace: (fn: (p: boolean) => boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  useClickOutside(ref, () => setOpen(false));

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open]);

  const neoLabel = neoStatus === 'loaded' ? `NEO (${neoCount})` :
                   neoStatus === 'error' ? 'NEO (unavailable)' : 'NEO (loading)';

  const layers = [
    { label: 'Stars', key: 'S', on: toggles.showStars, fn: () => toggles.setShowStars(p => !p) },
    { label: 'Constellations', key: 'C', on: toggles.showConstellations, fn: () => toggles.setShowConstellations(p => !p) },
    { label: 'Dwarf Planets', key: 'D', on: toggles.showDwarf, fn: () => toggles.setShowDwarf(p => !p) },
    { label: neoLabel, key: 'N', on: toggles.showNeo, fn: () => toggles.setShowNeo(p => !p) },
    { label: 'Asteroid Belt', key: null, on: toggles.showAsteroidBelt, fn: () => toggles.setShowAsteroidBelt(p => !p) },
    { label: 'Milky Way', key: null, on: toggles.showMilkyWay, fn: () => toggles.setShowMilkyWay(p => !p) },
    { label: 'Deep Space', key: null, on: toggles.showDeepSpace, fn: () => toggles.setShowDeepSpace(p => !p) },
  ];

  const anyActive = layers.some(l => l.on);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(p => !p)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Toggle display layers"
        style={{
          background: anyActive ? `rgba(${accentRgb},0.06)` : 'transparent',
          border: `1px solid ${anyActive ? `rgba(${accentRgb},0.2)` : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 4,
          padding: mobile ? '5px 10px' : '4px 10px',
          fontSize: mobile ? 10 : 12,
          cursor: 'pointer', fontFamily: 'inherit',
          color: anyActive ? accent : 'rgba(255,255,255,0.5)',
          fontWeight: 300, letterSpacing: 0.5,
          minHeight: mobile ? 32 : 28,
          display: 'flex', alignItems: 'center', gap: 4,
          transition: 'all 0.15s',
        }}
      >
        Layers
        <span style={{ fontSize: 8, opacity: 0.6 }}>{open ? '\u25b2' : '\u25bc'}</span>
      </button>

      {open && (
        <>
          {mobile && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }} onClick={() => setOpen(false)} />}
          <div
            role="group"
            aria-label="Display layers"
            style={mobile ? {
              ...dropdownPanel,
              ...bottomSheet('70vh'),
              padding: '12px 0',
            } : {
              ...dropdownPanel,
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              minWidth: 200, padding: '8px 0', zIndex: 100,
            }}
          >
            {/* Layer toggles */}
            {layers.map(l => (
              <button
                key={l.label}
                onClick={l.fn}
                aria-pressed={l.on}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: mobile ? '10px 16px' : '6px 14px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: mobile ? 13 : 12,
                  color: l.on ? accent : 'rgba(255,255,255,0.5)',
                  fontWeight: l.on ? 400 : 300, textAlign: 'left',
                  minHeight: mobile ? 44 : 'auto',
                  transition: 'color 0.1s',
                }}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${l.on ? accent : 'rgba(255,255,255,0.2)'}`,
                  background: l.on ? `rgba(${accentRgb},0.15)` : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: accent,
                }}>
                  {l.on ? '\u2713' : ''}
                </span>
                <span style={{ flex: 1 }}>{l.label}</span>
                {l.key && !mobile && (
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 300 }}>{l.key}</span>
                )}
              </button>
            ))}

            {/* Theme section */}
            <div style={{
              padding: '10px 14px 4px', fontSize: 9, letterSpacing: 2,
              color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', fontWeight: 300,
              borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4,
            }}>
              Theme
            </div>
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t)}
                aria-pressed={theme.id === t.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: mobile ? '10px 16px' : '6px 14px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: mobile ? 13 : 12,
                  color: theme.id === t.id ? t.uiAccent : 'rgba(255,255,255,0.5)',
                  fontWeight: theme.id === t.id ? 400 : 300, textAlign: 'left',
                  minHeight: mobile ? 44 : 'auto',
                }}
              >
                <span style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: t.uiAccent, flexShrink: 0,
                  border: theme.id === t.id ? '2px solid #fff' : '2px solid transparent',
                }} />
                {t.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── About Modal ─────────────────────────────────────────────────────────────────

function AboutModal({ open, onClose, mobile }: {
  open: boolean;
  onClose: () => void;
  mobile: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  if (!open) return null;

  const sectionTitle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 2,
    textTransform: 'uppercase', fontWeight: 300, marginTop: 16, marginBottom: 6,
  };

  const sourceItem: React.CSSProperties = {
    color: 'rgba(255,255,255,0.55)', fontSize: 11, lineHeight: 1.8, fontWeight: 300,
  };

  const kbdRow: React.CSSProperties = {
    display: 'flex', gap: 12, fontSize: 11, color: 'rgba(255,255,255,0.5)',
    fontWeight: 300, lineHeight: 1.8,
  };

  const kbd: React.CSSProperties = {
    color: 'rgba(255,255,255,0.7)', fontWeight: 400, minWidth: 28, display: 'inline-block',
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-label="About Orrery"
        aria-modal="true"
        style={mobile ? {
          ...aboutModal,
          ...bottomSheet('80vh'),
          padding: '20px 24px',
        } : {
          ...aboutModal,
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 380, maxHeight: '80vh', overflowY: 'auto',
          padding: '24px 28px', zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase' }}>Orrery</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontStyle: 'italic', fontWeight: 300, marginTop: 2 }}>Interactive Solar System</div>
          </div>
          <Btn onClick={onClose} label="Close about">{'\u2715'}</Btn>
        </div>

        <div style={sectionTitle}>Data Sources</div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: 10 }}>
          <div style={{ ...sectionTitle, marginTop: 0 }}>Orbital Elements</div>
          <div style={sourceItem}>JPL Horizons (J2000 epoch)</div>
          <div style={sourceItem}>NASA NeoWs API (NEO tracking)</div>
          <div style={sourceItem}>NASA SBDB API (asteroid orbits)</div>
          <div style={{ ...sectionTitle, marginTop: 10 }}>Visual Data</div>
          <div style={sourceItem}>Solar System Scope (CC BY 4.0)</div>
          <div style={sourceItem}>d3-celestial star catalogs</div>
          <div style={sourceItem}>HYG Database (bright stars)</div>
          <div style={sourceItem}>IAU constellation boundaries</div>
          <div style={{ ...sectionTitle, marginTop: 10 }}>Real-Time</div>
          <div style={sourceItem}>NASA Near-Earth Object feed</div>
          <div style={sourceItem}>Kepler solver (propagation)</div>
        </div>

        <div style={sectionTitle}>Technology</div>
        <div style={sourceItem}>React {'\u00b7'} Three.js {'\u00b7'} TypeScript</div>

        <div style={{ ...sectionTitle, marginTop: 16 }}>Built by</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 400 }}>Luke Steuber</div>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 300, fontStyle: 'italic' }}>lukesteuber.com</div>

        <div style={sectionTitle}>Keyboard Shortcuts</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={kbdRow}><span style={kbd}>1-9</span> Camera presets</div>
          <div style={kbdRow}><span style={kbd}>S</span> Stars {'\u00b7'} <span style={kbd}>C</span> Constellations</div>
          <div style={kbdRow}><span style={kbd}>D</span> Dwarf planets {'\u00b7'} <span style={kbd}>N</span> NEO</div>
          <div style={kbdRow}><span style={kbd}>F</span> Cinematic {'\u00b7'} <span style={kbd}>Space</span> Pause</div>
          <div style={kbdRow}><span style={kbd}>Esc</span> Back / Deselect</div>
        </div>
      </div>
    </>
  );
}

// ─── Panel props ────────────────────────────────────────────────────────────────

export interface PanelProps {
  simTime: Date;
  moon: { name: string; emoji: string; ill: number };
  speed: number; setSpeed: (fn: (s: number) => number) => void;
  playing: boolean; setPlaying: (fn: (p: boolean) => boolean) => void;
  focusTarget: FocusTarget | null; setFocusTarget: (f: FocusTarget | null) => void;
  selPlanet: number | null; setSelPlanet: (i: number | null) => void;
  neos: NEO[]; neoStatus: 'loading' | 'loaded' | 'error'; selNeo: NEO | null; setSelNeo: (n: NEO | null) => void;
  showNeo: boolean; setShowNeo: (fn: (p: boolean) => boolean) => void;
  showDwarf: boolean; setShowDwarf: (fn: (p: boolean) => boolean) => void;
  showStars: boolean; setShowStars: (fn: (p: boolean) => boolean) => void;
  showConstellations: boolean; setShowConstellations: (fn: (p: boolean) => boolean) => void;
  showAsteroidBelt: boolean; setShowAsteroidBelt: (fn: (p: boolean) => boolean) => void;
  showMilkyWay: boolean; setShowMilkyWay: (fn: (p: boolean) => boolean) => void;
  showDeepSpace: boolean; setShowDeepSpace: (fn: (p: boolean) => boolean) => void;
  showAbout: boolean; setShowAbout: (a: boolean) => void;
  setSimTime: (fn: (d: Date) => Date) => void;
  positionsRef: React.MutableRefObject<Map<number, [number, number, number]>>;
  cinematic: boolean;
  setCinematic: (c: boolean) => void;
  navStack: string[];
  navigateBack: () => void;
  navigateToLevel: (level: number) => void;
  selMoonIdx: number | null;
  cameraDistance: number;
  cams: CamPreset[];
  camIdx: number;
  onPresetSelect: (i: number) => void;
  onMoonSelect?: (planetIdx: number, moonIdx: number) => void;
}

export default function Panels(props: PanelProps) {
  const {
    simTime, moon, speed,
    selPlanet, setSelPlanet, neos, neoStatus, selNeo, setSelNeo,
    showNeo, setShowNeo,
    showDwarf, setShowDwarf,
    showStars, setShowStars,
    showConstellations, setShowConstellations,
    showAsteroidBelt, setShowAsteroidBelt,
    showMilkyWay, setShowMilkyWay,
    showDeepSpace, setShowDeepSpace,
    showAbout, setShowAbout,
    cinematic,
    navStack,
    selMoonIdx, cameraDistance,
    cams, camIdx, onPresetSelect,
    onMoonSelect,
  } = props;

  const { theme } = useTheme();
  const accent = theme.uiAccent;
  const accentRgb = theme.uiAccentRgb;
  const mobile = useIsMobile();
  const sp = selPlanet !== null ? ALL_BODIES[selPlanet] : null;

  // Selected moon info
  const selectedMoon = selPlanet !== null && selMoonIdx !== null
    ? getMoonsForPlanet(selPlanet)[selMoonIdx]
    : null;

  // ─── Cinematic clock mode ──────────────────────────────────────────────────
  if (cinematic) {
    return (
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <div style={{
          fontSize: mobile ? 64 : 96, fontWeight: 200, letterSpacing: 6,
          color: '#fff', fontFamily: "'Cormorant Garamond','Garamond','Baskerville','Georgia',serif",
          textShadow: '0 0 40px rgba(0,0,0,0.8)',
        }}>
          {fmtTime(simTime)}
        </div>
        <div style={{
          fontSize: mobile ? 14 : 18, fontWeight: 300, letterSpacing: 3,
          color: 'rgba(255,255,255,0.4)', marginTop: 8,
          fontStyle: 'italic',
        }}>
          {fmtDate(simTime)}
        </div>
        <div style={{
          fontSize: mobile ? 16 : 20, marginTop: 12,
          display: 'flex', alignItems: 'center', gap: 8,
          color: 'rgba(255,255,255,0.3)',
        }}>
          <span>{moon.emoji}</span>
          <span style={{ fontSize: 12, fontWeight: 300, fontStyle: 'italic' }}>{moon.name}</span>
        </div>
        <div style={{
          position: 'absolute', bottom: mobile ? 24 : 32,
          color: 'rgba(255,255,255,0.06)', fontSize: 11,
          letterSpacing: 6, textTransform: 'uppercase', fontWeight: 300,
        }}>
          Orrery
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Top bar: date + controls row ── */}
      <div style={{
        position: 'absolute', top: 8, left: 8, right: 8, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 6,
        alignItems: 'center',
      }}>
        {/* Row 1: Date/time */}
        <div
          role="status"
          aria-label="Simulation time"
          style={{
            display: 'flex', alignItems: 'center', gap: mobile ? 8 : 12,
            ...glass, padding: mobile ? '6px 12px' : '5px 16px',
          }}
        >
          <span style={{ color: '#fff', fontSize: mobile ? 16 : 20, fontWeight: 300, letterSpacing: 3, fontFamily: "'Cormorant', serif" }}>{fmtTime(simTime)}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: mobile ? 9 : 11, fontStyle: 'italic', fontWeight: 300 }}>{fmtDate(simTime)}</span>
          <span style={{ fontSize: mobile ? 12 : 14 }}>{moon.emoji}</span>
          {!mobile && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontStyle: 'italic', fontWeight: 300 }}>{moon.name} {'\u00b7'} {moon.ill}%</span>}
          {speed !== 1 && <span style={{ color: accent, fontSize: 10, fontWeight: 400 }}>{speedLabel(speed)}</span>}
        </div>

        {/* Row 2: Camera presets | Bodies | Layers | About — unified toolbar */}
        <div
          role="toolbar"
          aria-label="Navigation controls"
          style={{
            display: 'flex', alignItems: 'center', gap: mobile ? 3 : 4,
            ...glass, padding: mobile ? '4px 8px' : '4px 10px',
            maxWidth: mobile ? 'calc(100vw - 16px)' : 'none',
            overflowX: mobile ? 'auto' : 'visible',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            flexWrap: mobile ? 'nowrap' : 'wrap',
            justifyContent: 'center',
          }}
        >
          {/* Camera preset buttons */}
          {cams.map((cam, i) => {
            const active = camIdx === i && selPlanet === null;
            return (
              <button
                key={cam.key}
                onClick={() => onPresetSelect(i)}
                aria-label={`Camera preset: ${cam.label} (${cam.key})`}
                aria-pressed={active}
                style={{
                  background: active ? `rgba(${accentRgb},0.12)` : 'transparent',
                  border: `1px solid ${active ? `rgba(${accentRgb},0.4)` : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 4,
                  padding: mobile ? '5px 8px' : '4px 10px',
                  fontSize: mobile ? 10 : 12,
                  cursor: 'pointer', fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  minWidth: mobile ? 40 : 'auto',
                  minHeight: mobile ? 32 : 28,
                  color: active ? accent : 'rgba(255,255,255,0.5)',
                  fontWeight: active ? 500 : 300,
                  letterSpacing: 0.5,
                  transition: 'all 0.15s',
                }}
              >
                {cam.label}
              </button>
            );
          })}

          {/* Divider */}
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

          {/* Bodies dropdown */}
          <BodiesDropdown
            selPlanet={selPlanet}
            setSelPlanet={setSelPlanet}
            accent={accent}
            accentRgb={accentRgb}
            mobile={mobile}
            onMoonSelect={onMoonSelect}
          />

          {/* Layers dropdown */}
          <LayersDropdown
            accent={accent}
            accentRgb={accentRgb}
            mobile={mobile}
            neoStatus={neoStatus}
            neoCount={neos.length}
            showStars={showStars} setShowStars={setShowStars}
            showConstellations={showConstellations} setShowConstellations={setShowConstellations}
            showDwarf={showDwarf} setShowDwarf={setShowDwarf}
            showNeo={showNeo} setShowNeo={setShowNeo}
            showAsteroidBelt={showAsteroidBelt} setShowAsteroidBelt={setShowAsteroidBelt}
            showMilkyWay={showMilkyWay} setShowMilkyWay={setShowMilkyWay}
            showDeepSpace={showDeepSpace} setShowDeepSpace={setShowDeepSpace}
          />

          {/* Divider */}
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

          {/* About button */}
          <button
            onClick={() => setShowAbout(true)}
            aria-label="About this orrery"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '50%',
              width: mobile ? 32 : 28,
              height: mobile ? 32 : 28,
              fontSize: mobile ? 12 : 13,
              cursor: 'pointer', fontFamily: 'inherit',
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            ?
          </button>
        </div>
      </div>

      {/* ── Scale indicator ── */}
      <ScaleIndicator cameraDistance={cameraDistance} />

      {/* ── About modal ── */}
      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} mobile={mobile} />

      {/* ── NEO panel ── */}
      <div
        role="complementary"
        aria-label="Near-Earth objects"
        aria-hidden={!showNeo}
        style={{
          position: 'absolute',
          ...(mobile
            ? { left: 0, right: 0, bottom: 0, top: 'auto', maxHeight: '50vh', borderRadius: '12px 12px 0 0' }
            : { top: 56, right: 0, bottom: 50, width: 250, borderRadius: '6px 0 0 6px', borderRight: 'none' }),
          ...glass,
          transform: showNeo ? 'translateY(0)' : (mobile ? 'translateY(100%)' : 'translateX(100%)'),
          transition: 'transform 0.3s ease',
          overflowY: 'auto', padding: '10px 8px', zIndex: 15,
          paddingBottom: mobile ? 'max(10px, env(safe-area-inset-bottom))' : '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 300 }}>Near-Earth Objects</span>
          <span style={{ color: accent, fontSize: 11 }}>
            {neoStatus === 'loaded' ? `${neos.length} today` : neoStatus === 'error' ? 'Rate limited' : 'Loading'}
          </span>
          <Btn onClick={() => setShowNeo(p => !p)} label="Close NEO panel">{'\u2715'}</Btn>
        </div>
        {neoStatus === 'loading' && (
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', marginTop: 20, fontStyle: 'italic' }}>Loading NASA data{'\u2026'}</div>
        )}
        {neoStatus === 'error' && (
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'center', marginTop: 20, fontStyle: 'italic' }}>
            NASA API rate limited {'\u2014'} try again later
          </div>
        )}
        {neos.map(neo => (
          <div
            key={neo.id}
            role="button"
            tabIndex={0}
            aria-label={`${neo.name.replace(/[()]/g, '')}: ${neo.missLunar.toFixed(1)} lunar distances${neo.hazardous ? ', potentially hazardous' : ''}`}
            onClick={() => setSelNeo(selNeo?.id === neo.id ? null : neo)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelNeo(selNeo?.id === neo.id ? null : neo); } }}
            style={{
              padding: mobile ? '10px 10px' : '6px 7px', marginBottom: 2, borderRadius: 4, cursor: 'pointer',
              background: selNeo?.id === neo.id ? `rgba(${accentRgb},0.07)` : 'transparent',
              border: selNeo?.id === neo.id ? `1px solid rgba(${accentRgb},0.2)` : '1px solid transparent',
              transition: 'all 0.15s',
              minHeight: mobile ? 44 : 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {neo.hazardous && <span style={{ color: '#ff4444', fontSize: 7 }} aria-label="Potentially hazardous">{'\u25cf'}</span>}
              <span style={{ color: '#fff', fontSize: mobile ? 12 : 11 }}>{neo.name.replace(/[()]/g, '')}</span>
              {neo.orbit?.loaded && <span style={{ color: accent, fontSize: 9, marginLeft: 'auto', fontStyle: 'italic' }}>orbit</span>}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2, fontWeight: 300 }}>
              {neo.missLunar.toFixed(1)} LD {'\u00b7'} {neo.velKms.toFixed(1)} km/s {'\u00b7'} {Math.round(neo.dMin)}{'\u2013'}{Math.round(neo.dMax)} m
            </div>
          </div>
        ))}
        <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9, marginTop: 8, textAlign: 'center', fontStyle: 'italic', fontWeight: 300 }}>Source: NASA JPL NeoWs {'\u00b7'} SBDB</div>
      </div>

      {/* ── Selected NEO detail ── */}
      {selNeo && (
        <div
          role="dialog"
          aria-label={`${selNeo.name} details`}
          style={{
            position: 'absolute', bottom: mobile ? 16 : 56,
            left: '50%', transform: 'translateX(-50%)',
            ...bokehCard, padding: '12px 18px', maxWidth: 420,
            width: mobile ? 'calc(100vw - 16px)' : '90%', zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{selNeo.name}</span>
            <Btn onClick={() => setSelNeo(null)} label="Close NEO details">{'\u2715'}</Btn>
          </div>
          {selNeo.hazardous && (
            <div style={{ color: '#ff4444', fontSize: 10, letterSpacing: 1.5, marginTop: 2, textTransform: 'uppercase', fontWeight: 400 }}>Potentially Hazardous</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginTop: 8 }}>
            <Stat label="Diameter" val={`${Math.round(selNeo.dMin)}\u2013${Math.round(selNeo.dMax)} m`} />
            <Stat label="Miss distance" val={`${selNeo.missLunar.toFixed(1)} LD`} />
            <Stat label="Velocity" val={`${selNeo.velKms.toFixed(1)} km/s`} />
            <Stat label="Close approach" val={selNeo.date} />
            {selNeo.orbit?.loaded && (
              <>
                <Stat label="Semi-major axis" val={`${selNeo.orbit.a.toFixed(3)} AU`} c={accent} />
                <Stat label="Eccentricity" val={selNeo.orbit.e.toFixed(4)} c={accent} />
                <Stat label="Inclination" val={`${selNeo.orbit.i.toFixed(2)}\u00b0`} c={accent} />
                <Stat label="Orbit shown" val="in scene" c={accent} />
              </>
            )}
            {selNeo.orbit && !selNeo.orbit.loaded && (
              <div style={{ gridColumn: '1/-1', color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>Loading orbital elements{'\u2026'}</div>
            )}
          </div>
          <a
            href={selNeo.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: 8, color: accent, fontSize: 9, textDecoration: 'none', borderBottom: `1px solid rgba(${accentRgb},0.3)` }}
          >
            View on NASA JPL {'\u2192'}
          </a>
        </div>
      )}

      {/* ── Title watermark ── */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', top: 14, left: 14, color: 'rgba(255,255,255,0.15)', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', zIndex: 5, fontWeight: 300 }}
      >
        Orrery
      </div>

      {/* ── Screen reader announcements ── */}
      <div aria-live="polite" className="sr-only" role="status">
        {sp ? `Selected ${sp.name}, ${sp.type}. ${sp.desc}` : ''}
        {selectedMoon ? `Selected moon ${selectedMoon.name}. ${selectedMoon.desc}` : ''}
        {selNeo ? `Selected asteroid ${selNeo.name}. Miss distance: ${selNeo.missLunar.toFixed(1)} lunar distances.` : ''}
        {navStack.length > 1 ? `Navigated to ${navStack[navStack.length - 1]}` : ''}
      </div>
    </>
  );
}
