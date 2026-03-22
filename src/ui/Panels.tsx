/*
 * All HUD panels — overlay UI for the orrery
 *
 * Layout: minimal top HUD (info bar + camera presets), side drawer for everything else.
 * Drawer starts closed, slides from right on desktop, bottom sheet on mobile.
 *
 * Responsive: mobile gets larger touch targets, bottom sheets, safe-area insets.
 * Theme-aware: all accent colors come from the active theme.
 * No emoji anywhere.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { NEO, CamPreset } from '../lib/kepler';
import { ALL_BODIES } from '../data/planets';
import { getMoonsForPlanet } from '../data/moons';
import { useTheme, THEMES } from '../lib/themes';
import { glass, bokehCard, drawerPanel, drawerTab, bottomSheet, useIsMobile } from './styles';

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
    const fn = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    };
    document.addEventListener('mousedown', fn);
    document.addEventListener('touchstart', fn, { passive: true });
    return () => {
      document.removeEventListener('mousedown', fn);
      document.removeEventListener('touchstart', fn);
    };
  }, [ref, handler]);
}

// ─── Section header (used in drawer) ────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: 2,
      textTransform: 'uppercase', fontWeight: 300,
      padding: '12px 16px 6px',
    }}>
      {children}
    </div>
  );
}

const sectionDivider: React.CSSProperties = {
  height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0',
};

// ─── Side Drawer ────────────────────────────────────────────────────────────────

function SideDrawer({
  open, accent, accentRgb, mobile,
  selPlanet, setSelPlanet, onMoonSelect,
  neos, neoStatus, selNeo, setSelNeo,
  showNeo, showStars, showConstellations, constellationFocus, showDwarf,
  showAsteroidBelt, showMilkyWay, showDeepSpace,
  setShowNeo, setShowStars, setShowConstellations, setConstellationFocus,
  setShowDwarf, setShowAsteroidBelt, setShowMilkyWay, setShowDeepSpace,
}: {
  open: boolean;
  accent: string;
  accentRgb: string;
  mobile: boolean;
  selPlanet: number | null;
  setSelPlanet: (i: number | null) => void;
  onMoonSelect?: (planetIdx: number, moonIdx: number) => void;
  neos: NEO[];
  neoStatus: 'loading' | 'loaded' | 'error';
  selNeo: NEO | null;
  setSelNeo: (n: NEO | null) => void;
  showNeo: boolean; setShowNeo: (fn: (p: boolean) => boolean) => void;
  showStars: boolean; setShowStars: (fn: (p: boolean) => boolean) => void;
  showConstellations: boolean; setShowConstellations: (fn: (p: boolean) => boolean) => void;
  constellationFocus: boolean; setConstellationFocus: (fn: (p: boolean) => boolean) => void;
  showDwarf: boolean; setShowDwarf: (fn: (p: boolean) => boolean) => void;
  showAsteroidBelt: boolean; setShowAsteroidBelt: (fn: (p: boolean) => boolean) => void;
  showMilkyWay: boolean; setShowMilkyWay: (fn: (p: boolean) => boolean) => void;
  showDeepSpace: boolean; setShowDeepSpace: (fn: (p: boolean) => boolean) => void;
}) {
  const { theme, setTheme } = useTheme();

  const planets = ALL_BODIES.slice(0, 8);
  const dwarfs = ALL_BODIES.slice(8);

  const neoLabel = neoStatus === 'loaded' ? `NEO (${neos.length})` :
                   neoStatus === 'error' ? 'NEO (unavailable)' : 'NEO (loading)';

  const layers = [
    { label: 'Stars', key: 'S', on: showStars, fn: () => setShowStars(p => !p) },
    { label: 'Constellations', key: 'C', on: showConstellations, fn: () => setShowConstellations(p => !p) },
    { label: 'Stargazer', key: 'G', on: constellationFocus, fn: () => setConstellationFocus(p => !p) },
    { label: 'Dwarf Planets', key: 'D', on: showDwarf, fn: () => setShowDwarf(p => !p) },
    { label: neoLabel, key: 'N', on: showNeo, fn: () => setShowNeo(p => !p) },
    { label: 'Asteroid Belt', key: null, on: showAsteroidBelt, fn: () => setShowAsteroidBelt(p => !p) },
    { label: 'Milky Way', key: null, on: showMilkyWay, fn: () => setShowMilkyWay(p => !p) },
    { label: 'Deep Space', key: null, on: showDeepSpace, fn: () => setShowDeepSpace(p => !p) },
  ];

  // Shared styles
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
    <div
      role="complementary"
      aria-label="Side panel"
      aria-hidden={!open}
      style={mobile ? {
        ...drawerPanel,
        ...bottomSheet('70vh'),
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.25s ease',
        overflowY: 'auto',
        zIndex: 30,
        padding: '8px 0 0',
      } : {
        ...drawerPanel,
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: 300,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        overflowY: 'auto',
        zIndex: 30,
        padding: '8px 0 0',
      }}
    >
      {/* ── Bodies ── */}
      <SectionHeader>Bodies</SectionHeader>
      <div role="tree" aria-label="Celestial bodies">
        {planets.map((body, idx) => {
          const moons = getMoonsForPlanet(idx);
          return (
            <div key={body.name} role="treeitem">
              <button
                onClick={() => setSelPlanet(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: mobile ? '10px 16px' : '6px 16px',
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
                  onClick={() => onMoonSelect?.(idx, mIdx)}
                  role="treeitem"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: mobile ? '8px 16px 8px 36px' : '4px 16px 4px 34px',
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
          padding: '8px 16px 4px', fontSize: 9, letterSpacing: 2,
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
                onClick={() => setSelPlanet(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: mobile ? '10px 16px' : '6px 16px',
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
                  onClick={() => onMoonSelect?.(idx, mIdx)}
                  role="treeitem"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: mobile ? '8px 16px 8px 36px' : '4px 16px 4px 34px',
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

      <div style={sectionDivider} />

      {/* ── Layers ── */}
      <SectionHeader>Layers</SectionHeader>
      <div role="group" aria-label="Display layers">
        {layers.map(l => (
          <button
            key={l.label}
            onClick={l.fn}
            aria-pressed={l.on}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: mobile ? '10px 16px' : '6px 16px',
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
            }} />
            <span style={{ flex: 1 }}>{l.label}</span>
            {l.key && !mobile && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 300 }}>{l.key}</span>
            )}
          </button>
        ))}
      </div>

      <div style={sectionDivider} />

      {/* ── Theme ── */}
      <SectionHeader>Theme</SectionHeader>
      <div role="radiogroup" aria-label="Color theme">
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => setTheme(t)}
            role="radio"
            aria-checked={theme.id === t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: mobile ? '10px 16px' : '6px 16px',
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

      <div style={sectionDivider} />

      {/* ── NEO (when layer is on) ── */}
      {showNeo && (
        <>
          <SectionHeader>NEO Today</SectionHeader>
          <div style={{ padding: '0 16px' }}>
            {neoStatus === 'loading' && (
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontStyle: 'italic', padding: '8px 0' }}>Loading NASA data...</div>
            )}
            {neoStatus === 'error' && (
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontStyle: 'italic', padding: '8px 0' }}>
                NASA API rate limited -- try again later
              </div>
            )}
            {neoStatus === 'loaded' && (
              <div style={{ color: accent, fontSize: 10, marginBottom: 6 }}>{neos.length} today</div>
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
                  padding: mobile ? '10px 0' : '5px 0', cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
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
            <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9, marginTop: 8, fontStyle: 'italic', fontWeight: 300 }}>Source: NASA JPL NeoWs / SBDB</div>
          </div>
          <div style={sectionDivider} />
        </>
      )}

      {/* ── About ── */}
      <SectionHeader>About</SectionHeader>
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase' }}>Orrery</div>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontStyle: 'italic', fontWeight: 300, marginTop: 2 }}>Interactive Solar System</div>

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
          <div style={kbdRow}><span style={kbd}>G</span> Stargazer {'\u00b7'} <span style={kbd}>D</span> Dwarf planets</div>
          <div style={kbdRow}><span style={kbd}>N</span> NEO {'\u00b7'} <span style={kbd}>F</span> Tour</div>
          <div style={kbdRow}><span style={kbd}>Space</span> Pause {'\u00b7'} <span style={kbd}>Esc</span> Back/Deselect</div>
          <div style={kbdRow}><span style={kbd}>M</span> Toggle panel</div>
        </div>
      </div>
    </div>
  );
}

// ─── Panel props ────────────────────────────────────────────────────────────────

export interface PanelProps {
  simTime: Date;
  moon: { name: string; ill: number };
  solarWind: string | null;
  speed: number; setSpeed: (fn: (s: number) => number) => void;
  playing: boolean; setPlaying: (fn: (p: boolean) => boolean) => void;
  selPlanet: number | null; setSelPlanet: (i: number | null) => void;
  neos: NEO[]; neoStatus: 'loading' | 'loaded' | 'error'; selNeo: NEO | null; setSelNeo: (n: NEO | null) => void;
  showNeo: boolean; setShowNeo: (fn: (p: boolean) => boolean) => void;
  showDwarf: boolean; setShowDwarf: (fn: (p: boolean) => boolean) => void;
  showStars: boolean; setShowStars: (fn: (p: boolean) => boolean) => void;
  showConstellations: boolean; setShowConstellations: (fn: (p: boolean) => boolean) => void;
  constellationFocus: boolean; setConstellationFocus: (fn: (p: boolean) => boolean) => void;
  showAsteroidBelt: boolean; setShowAsteroidBelt: (fn: (p: boolean) => boolean) => void;
  showMilkyWay: boolean; setShowMilkyWay: (fn: (p: boolean) => boolean) => void;
  showDeepSpace: boolean; setShowDeepSpace: (fn: (p: boolean) => boolean) => void;
  drawerOpen: boolean; setDrawerOpen: (fn: boolean | ((p: boolean) => boolean)) => void;
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
    simTime, moon, solarWind, speed,
    selPlanet, setSelPlanet, neos, neoStatus, selNeo, setSelNeo,
    showNeo, setShowNeo,
    showDwarf, setShowDwarf,
    showStars, setShowStars,
    showConstellations, setShowConstellations,
    constellationFocus, setConstellationFocus,
    showAsteroidBelt, setShowAsteroidBelt,
    showMilkyWay, setShowMilkyWay,
    showDeepSpace, setShowDeepSpace,
    drawerOpen, setDrawerOpen,
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const [viewOpen, setViewOpen] = useState(false);

  // Close view dropdown on click outside
  useEffect(() => {
    if (!viewOpen) return;
    const close = () => setViewOpen(false);
    const timer = setTimeout(() => document.addEventListener('click', close), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', close); };
  }, [viewOpen]);

  // Selected moon info
  const selectedMoon = selPlanet !== null && selMoonIdx !== null
    ? getMoonsForPlanet(selPlanet)[selMoonIdx]
    : null;

  // Close drawer on click outside (desktop only)
  const handleDrawerClickOutside = useCallback(() => {
    if (!mobile && drawerOpen) setDrawerOpen(false);
  }, [mobile, drawerOpen, setDrawerOpen]);
  useClickOutside(drawerRef, handleDrawerClickOutside);

  // ─── Cinematic mode overlay ─────────────────────────────────────────────────
  // Current body label from nav stack
  const cinematicLabel = navStack[navStack.length - 1] || '';

  if (cinematic) {
    const dim: React.CSSProperties = {
      color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 300,
      letterSpacing: 1.5, fontStyle: 'italic',
    };
    return (
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        {/* Top cluster: time, date, celestial data */}
        <div style={{
          marginTop: mobile ? 20 : 32,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <span style={{
            fontSize: mobile ? 32 : 44, fontWeight: 300, letterSpacing: 6,
            color: 'rgba(255,255,255,0.85)',
            fontFamily: "'Cormorant Garamond','Garamond','Baskerville','Georgia',serif",
          }}>
            {fmtTime(simTime)}
          </span>
          <span style={{
            fontSize: mobile ? 11 : 13, fontWeight: 300, letterSpacing: 2,
            color: 'rgba(255,255,255,0.55)', fontStyle: 'italic',
          }}>
            {fmtDate(simTime)}
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: mobile ? 10 : 16,
            marginTop: 6,
          }}>
            <span style={dim}>{moon.name}, {moon.ill}%</span>
            {solarWind && (
              <>
                <span style={{ ...dim, color: 'rgba(255,255,255,0.12)' }}>{'\u00b7'}</span>
                <span style={dim}>Solar wind {solarWind}</span>
              </>
            )}
          </div>
          {/* Current zoom label -- below time cluster */}
          <div style={{
            marginTop: mobile ? 8 : 12,
            fontSize: mobile ? 14 : 18, fontWeight: 300, letterSpacing: 4,
            color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase',
          }}>
            {cinematicLabel}
          </div>
        </div>

        {/* Exit hint */}
        <div style={{
          position: 'absolute', bottom: mobile ? 60 : 56,
          color: 'rgba(255,255,255,0.3)', fontSize: 11,
          letterSpacing: 2, fontWeight: 300, fontStyle: 'italic',
        }}>
          click or press any key to explore
        </div>
        {/* Watermark */}
        <div style={{
          position: 'absolute', bottom: mobile ? 24 : 32,
          color: 'rgba(255,255,255,0.12)', fontSize: 11,
          letterSpacing: 6, textTransform: 'uppercase', fontWeight: 300,
        }}>
          Orrery
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Top bar: info + presets ── */}
      <div style={{
        position: 'absolute', top: 8, left: 8, right: mobile ? 8 : 40, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 6,
        alignItems: 'center',
      }}>
        {/* Info bar: time, date, moon phase, speed controls */}
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
          {!mobile && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontStyle: 'italic', fontWeight: 300 }}>{moon.name}, {moon.ill}%</span>}
          {speed !== 1 && <span style={{ color: accent, fontSize: 10, fontWeight: 400 }}>{speedLabel(speed)}</span>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 4 }}>
            <button
              onClick={() => props.setSpeed(s => Math.max(1, Math.round(s / 10) || 1))}
              aria-label="Slow down"
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: '2px 5px',
                minWidth: 28, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >{'\u00ab'}</button>
            <button
              onClick={() => props.setPlaying(p => !p)}
              aria-label={props.playing ? 'Pause simulation' : 'Play simulation'}
              style={{
                background: 'none', border: 'none', color: props.playing ? accent : 'rgba(255,255,255,0.5)',
                fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', padding: '2px 5px',
                minWidth: 28, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                letterSpacing: props.playing ? 2 : 0,
              }}
            >{props.playing ? 'II' : '>'}</button>
            <button
              onClick={() => props.setSpeed(s => Math.min(86400 * 365, s * 10))}
              aria-label="Speed up"
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: '2px 5px',
                minWidth: 28, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >{'\u00bb'}</button>
          </div>
        </div>

        {/* Camera presets */}
        <div
          role="toolbar"
          aria-label="Camera presets"
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
        </div>
      </div>

      {/* ── Drawer toggle tab ── */}
      <div
        ref={drawerRef}
        style={{ display: 'contents' }}
      >
        <button
          onClick={() => setDrawerOpen((p: boolean) => !p)}
          aria-label={drawerOpen ? 'Close panel' : 'Open panel'}
          aria-expanded={drawerOpen}
          style={{
            ...drawerTab,
            ...(mobile ? {
              top: 'auto', bottom: 80, right: 0,
              transform: 'none',
              width: 44, height: 44,
              borderRadius: '6px 0 0 6px',
            } : {}),
            color: 'rgba(255,255,255,0.4)',
            fontSize: 12,
            fontFamily: 'inherit',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRight: 'none',
          }}
        >
          {drawerOpen ? '>' : '<'}
        </button>

        {/* ── Side drawer ── */}
        <SideDrawer
          open={drawerOpen}
          accent={accent}
          accentRgb={accentRgb}
          mobile={mobile}
          selPlanet={selPlanet}
          setSelPlanet={setSelPlanet}
          onMoonSelect={onMoonSelect}
          neos={neos}
          neoStatus={neoStatus}
          selNeo={selNeo}
          setSelNeo={setSelNeo}
          showNeo={showNeo} setShowNeo={setShowNeo}
          showStars={showStars} setShowStars={setShowStars}
          showConstellations={showConstellations} setShowConstellations={setShowConstellations}
          constellationFocus={constellationFocus} setConstellationFocus={setConstellationFocus}
          showDwarf={showDwarf} setShowDwarf={setShowDwarf}
          showAsteroidBelt={showAsteroidBelt} setShowAsteroidBelt={setShowAsteroidBelt}
          showMilkyWay={showMilkyWay} setShowMilkyWay={setShowMilkyWay}
          showDeepSpace={showDeepSpace} setShowDeepSpace={setShowDeepSpace}
        />
      </div>

      {/* ── Background blur overlay when body selected ── */}
      {sp && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            background: mobile
              ? 'radial-gradient(ellipse at 50% 80%, rgba(0,0,0,0.45) 0%, transparent 60%)'
              : 'radial-gradient(ellipse at 15% 60%, rgba(0,0,0,0.45) 0%, transparent 55%)',
            ...(mobile ? {} : { backdropFilter: 'blur(1.5px)', WebkitBackdropFilter: 'blur(1.5px)' }),
            pointerEvents: 'none',
            zIndex: 19,
            transition: 'opacity 0.3s',
          }}
        />
      )}

      {/* ── Planet/Moon info card ── */}
      {(sp || selectedMoon) && (
        <div
          role="dialog"
          aria-label={selectedMoon ? `${selectedMoon.name} details` : `${sp!.name} details`}
          style={mobile ? {
            position: 'fixed',
            left: 0, right: 0, bottom: 0, top: 'auto',
            maxHeight: '45vh',
            borderRadius: '12px 12px 0 0',
            overflowY: 'auto',
            ...bokehCard,
            padding: '16px 20px',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            zIndex: 20,
          } : {
            position: 'absolute',
            bottom: 16, left: 16,
            maxWidth: 340, width: '30vw', minWidth: 260,
            ...bokehCard,
            padding: '14px 20px',
            zIndex: 20,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 12, height: 12, borderRadius: '50%',
                background: selectedMoon ? selectedMoon.color : sp!.color,
                boxShadow: `0 0 8px ${selectedMoon ? selectedMoon.color : sp!.color}`,
                flexShrink: 0,
              }} />
              <div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, letterSpacing: 1 }}>
                  {selectedMoon ? selectedMoon.name : sp!.name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 300, fontStyle: 'italic', letterSpacing: 0.5 }}>
                  {selectedMoon ? `Moon of ${sp!.name}` : sp!.type}
                </div>
              </div>
            </div>
            <Btn onClick={() => setSelPlanet(null)} label="Close info card">{'\u2715'}</Btn>
          </div>

          {/* Description */}
          <p style={{
            color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.6, fontWeight: 300,
            margin: '10px 0', fontStyle: 'italic',
          }}>
            {selectedMoon ? selectedMoon.desc : sp!.desc}
          </p>

          {/* Stats grid */}
          {!selectedMoon && sp && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              <Stat label="Distance" val={`${sp.distAU} AU`} />
              <Stat label="Period" val={sp.period < 365 ? `${sp.period.toFixed(0)} days` : `${(sp.period / 365.25).toFixed(1)} years`} />
              {sp.surfaceTemp && <Stat label="Surface temp" val={sp.surfaceTemp} />}
              {sp.gravity && <Stat label="Gravity" val={sp.gravity} />}
              <Stat label="Moons" val={sp.moons} />
            </div>
          )}
          {selectedMoon && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              <Stat label="Orbital period" val={selectedMoon.period < 1 ? `${(selectedMoon.period * 24).toFixed(1)} hours` : `${selectedMoon.period.toFixed(1)} days`} />
              <Stat label="Parent" val={sp!.name} />
            </div>
          )}

          {/* Breadcrumb nav */}
          <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
            {navStack.map((crumb, i) => (
              <span key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 300 }}>
                {i > 0 && <span style={{ margin: '0 4px' }}>{'\u203a'}</span>}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => props.navigateToLevel(i)}
                  onKeyDown={e => { if (e.key === 'Enter') props.navigateToLevel(i); }}
                  style={{ cursor: i < navStack.length - 1 ? 'pointer' : 'default', color: i === navStack.length - 1 ? accent : 'rgba(255,255,255,0.25)' }}
                >{crumb}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Scale indicator ── */}
      <ScaleIndicator cameraDistance={cameraDistance} />

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
              <div style={{ gridColumn: '1/-1', color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>Loading orbital elements...</div>
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
