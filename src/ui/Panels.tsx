/*
 * All HUD panels — overlay UI for the orrery
 *
 * Layout: collapsible side panel for controls, with scene overlays kept minimal.
 *
 * Responsive: mobile gets larger touch targets, bottom sheets, safe-area insets.
 * Theme-aware: all accent colors come from the active theme.
 * No emoji anywhere.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { NEO, CamPreset } from '../lib/kepler';
import { ALL_BODIES } from '../data/planets';
import { getMoonsForPlanet } from '../data/moons';
import { useTheme, THEMES } from '../lib/themes';
import { bokehCard, drawerPanel, drawerTab, bottomSheet, useIsMobile } from './styles';
import type { CometDef } from '../data/comets';
import type { MeteorShower } from '../scene/Meteors';
import type { SatellitePosition } from '../lib/satellites';
import { MYTHOLOGY } from '../data/mythology';

// ─── Tiny UI primitives ─────────────────────────────────────────────────────────

function Btn({ children, onClick, style, label }: {
  children: React.ReactNode; onClick: () => void; style?: React.CSSProperties; label?: string;
}) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
      fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
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
      <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 300 }}>{label}</div>
      <div style={{ color: c || '#fff', fontSize: 15, marginTop: 1 }}>{val}</div>
    </div>
  );
}

// ─── Speed label formatter ──────────────────────────────────────────────────────

function speedLabel(s: number) {
  if (s === 1) return 'Real-time';
  if (s <= 60) return `${s}\u00d7`;
  if (s < 3600) return `${Math.round(s / 60)} min/s`;
  if (s < 86400) return `${(s / 3600).toFixed(1)} hr/s`;
  if (s < 86400 * 30) return `${(s / 86400).toFixed(1)} day/s`;
  if (s < 86400 * 365) return `${(s / (86400 * 30)).toFixed(1)} mo/s`;
  if (s < 86400 * 365 * 100) return `${(s / (86400 * 365)).toFixed(1)} yr/s`;
  return `${(s / (86400 * 365 * 100)).toFixed(0)} cent/s`;
}

const SPEED_PRESETS = [
  { label: '1\u00d7', value: 1 },
  { label: '1 hr/s', value: 3600 },
  { label: '1 day/s', value: 86400 },
  { label: '1 mo/s', value: 86400 * 30 },
  { label: '1 yr/s', value: 86400 * 365 },
  { label: '10 yr/s', value: 86400 * 365 * 10 },
  { label: '100 yr/s', value: 86400 * 365 * 100 },
];

// ─── Zoom controls (dispatches wheel events on the canvas) ──────────────────────

function ZoomControls() {
  const zoom = useCallback((direction: number) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    canvas.dispatchEvent(new WheelEvent('wheel', {
      deltaY: direction * 120,
      bubbles: true,
    }));
  }, []);

  const btnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    color: 'rgba(255,255,255,0.7)',
    width: 36, height: 36,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
    fontFamily: 'inherit',
    backdropFilter: 'blur(8px)',
  };

  return (
    <div style={{
      position: 'absolute', bottom: 20, right: 14,
      display: 'flex', flexDirection: 'column', gap: 4,
      zIndex: 5,
    }}>
      <button onClick={() => zoom(-1)} aria-label="Zoom in" style={btnStyle}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="7" cy="7" r="5" />
          <line x1="7" y1="5" x2="7" y2="9" />
          <line x1="5" y1="7" x2="9" y2="7" />
          <line x1="10.5" y1="10.5" x2="14" y2="14" />
        </svg>
      </button>
      <button onClick={() => zoom(1)} aria-label="Zoom out" style={btnStyle}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="7" cy="7" r="5" />
          <line x1="5" y1="7" x2="9" y2="7" />
          <line x1="10.5" y1="10.5" x2="14" y2="14" />
        </svg>
      </button>
    </div>
  );
}

// ─── Date formatter ─────────────────────────────────────────────────────────────

function fmtDate(d: Date) { return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
function fmtTime(d: Date) { return d.toLocaleTimeString('en-US', { hour12: false }); }

// ─── Scale indicator labels ─────────────────────────────────────────────────────

const SCALE_LANDMARKS = [
  { dist: 2, label: 'Inner' },
  { dist: 10, label: 'Outer' },
  { dist: 50, label: 'Kuiper' },
  { dist: 1500, label: 'Oort' },
  { dist: 20000, label: 'Stellar' },
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
            fontSize: 8, color: 'rgba(255,255,255,0.7)',
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

// ─── Info panel (shared by constellation & spacecraft detail views) ──────────────

function InfoPanel({
  sectionTitle, title, subtitle, description, accent, onClose, closeLabel, children,
}: {
  sectionTitle: string; title: string; subtitle: string; description: string;
  accent: string; onClose: () => void; closeLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <AccordionSection title={sectionTitle} accent={accent} defaultOpen>
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            aria-label={closeLabel}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)', fontSize: 14, fontFamily: 'inherit',
              padding: '0 0 4px', lineHeight: 1,
            }}
          >
            {'\u00d7'}
          </button>
        </div>
        <div style={{ color: accent, fontSize: 17, fontWeight: 500, letterSpacing: 1 }}>{title}</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 300, marginTop: 2, letterSpacing: 1 }}>{subtitle}</div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: 300, marginTop: 10, lineHeight: 1.6, fontStyle: 'italic' }}>{description}</div>
        {children}
      </div>
    </AccordionSection>
  );
}

// ─── Body tree item (shared by planets and dwarfs) ──────────────────────────────

function BodyTreeItem({
  body, idx, selPlanet, accent, accentRgb, mobile,
  setSelPlanet, onMoonSelect,
}: {
  body: { name: string; color: string }; idx: number; selPlanet: number | null;
  accent: string; accentRgb: string; mobile: boolean;
  setSelPlanet: (i: number | null) => void;
  onMoonSelect?: (planetIdx: number, moonIdx: number) => void;
}) {
  const moons = getMoonsForPlanet(idx);
  return (
    <div role="treeitem">
      <button
        onClick={() => setSelPlanet(idx)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: mobile ? '10px 16px' : '6px 16px',
          background: selPlanet === idx ? `rgba(${accentRgb},0.08)` : 'transparent',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          color: selPlanet === idx ? accent : 'rgba(255,255,255,0.7)',
          fontSize: mobile ? 14 : 13, fontWeight: selPlanet === idx ? 500 : 300,
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
            fontFamily: 'inherit', color: 'rgba(255,255,255,0.65)',
            fontSize: mobile ? 15 : 14, fontStyle: 'italic', fontWeight: 300,
            minHeight: mobile ? 40 : 'auto', textAlign: 'left',
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: moon.color, flexShrink: 0 }} />
          {moon.name}
        </button>
      ))}
    </div>
  );
}

// ─── Section header (used in drawer) ────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      color: 'rgba(255,255,255,0.65)', fontSize: 11, letterSpacing: 2,
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

const PANEL_FONT_SCALE_KEY = 'orrery-panel-font-scale';

function loadPanelFontScale() {
  try {
    const raw = localStorage.getItem(PANEL_FONT_SCALE_KEY);
    const value = raw ? Number(raw) : 1;
    if (Number.isFinite(value) && value >= 0.92 && value <= 1.12) return value;
  } catch { /* ignore */ }
  return 1;
}

function AccordionSection({
  title,
  accent,
  defaultOpen = false,
  children,
}: {
  title: React.ReactNode;
  accent: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      <button
        onClick={() => setOpen(p => !p)}
        aria-expanded={open}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <SectionHeader>{title}</SectionHeader>
        <span
          aria-hidden="true"
          style={{
            paddingRight: 16,
            color: open ? accent : 'rgba(255,255,255,0.32)',
            fontSize: 14,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease, color 0.18s ease',
          }}
        >
          {'\u203a'}
        </span>
      </button>
      {open && children}
      <div style={sectionDivider} />
    </>
  );
}

function MiniAccordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: 6 }}>
      <button
        onClick={() => setOpen(p => !p)}
        aria-expanded={open}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 6,
          padding: '7px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          fontFamily: 'inherit',
          color: 'rgba(255,255,255,0.72)',
          fontSize: 12,
        }}
      >
        <span>{title}</span>
        <span
          aria-hidden="true"
          style={{
            color: 'rgba(255,255,255,0.72)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease',
          }}
        >
          {'\u203a'}
        </span>
      </button>
      {open && <div style={{ paddingTop: 8 }}>{children}</div>}
    </div>
  );
}

// ─── Side Drawer ────────────────────────────────────────────────────────────────

function SideDrawer({
  open,
  accent, accentRgb, mobile,
  simTime, moon, solarWind, speed, setSpeed, playing, setPlaying,
  cams, camIdx, onPresetSelect,
  selPlanet, setSelPlanet, onMoonSelect,
  neos, neoStatus, selNeo, setSelNeo,
  showNeo, showStars, showConstellations, showAsterisms: _showAsterisms, constellationFocus: _constellationFocus, showDwarf,
  showAsteroidBelt, showComets, showMeteors, showSatellites: _showSatellites, showDeepSky,
  showDeepSpace,
  setShowNeo, setShowStars, setShowConstellations, setShowAsterisms: _setShowAsterisms, setConstellationFocus: _setConstellationFocus,
  setShowDwarf, setShowAsteroidBelt, setShowComets, setShowMeteors, setShowSatellites: _setShowSatellites, setShowDeepSky,
  setShowDeepSpace,
  selConstellation, setSelConstellation,
  selSpacecraft, setSelSpacecraft,
  onHoverStart,
  onHoverEnd,
  panelFontScale,
}: {
  open: boolean;
  accent: string;
  accentRgb: string;
  mobile: boolean;
  simTime: Date;
  moon: { name: string; ill: number };
  solarWind: string | null;
  speed: number;
  setSpeed: (fn: (s: number) => number) => void;
  playing: boolean;
  setPlaying: (fn: (p: boolean) => boolean) => void;
  cams: CamPreset[];
  camIdx: number;
  onPresetSelect: (i: number) => void;
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
  showAsterisms: boolean; setShowAsterisms: (fn: (p: boolean) => boolean) => void;
  constellationFocus: boolean; setConstellationFocus: (fn: (p: boolean) => boolean) => void;
  showDwarf: boolean; setShowDwarf: (fn: (p: boolean) => boolean) => void;
  showAsteroidBelt: boolean; setShowAsteroidBelt: (fn: (p: boolean) => boolean) => void;
  showComets: boolean; setShowComets: (fn: (p: boolean) => boolean) => void;
  showMeteors: boolean; setShowMeteors: (fn: (p: boolean) => boolean) => void;
  showSatellites: boolean; setShowSatellites: (fn: (p: boolean) => boolean) => void;
  showDeepSky: boolean; setShowDeepSky: (fn: (p: boolean) => boolean) => void;
  showDeepSpace: boolean; setShowDeepSpace: (fn: (p: boolean) => boolean) => void;
  selConstellation: string | null; setSelConstellation: (id: string | null) => void;
  selSpacecraft: import('../data/deepspace').Spacecraft | null;
  setSelSpacecraft: (s: import('../data/deepspace').Spacecraft | null) => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  panelFontScale: number;
}) {
  const { theme, setTheme } = useTheme();

  const planets = ALL_BODIES.slice(0, 8);
  const dwarfs = ALL_BODIES.slice(8);

  const neoLabel = neoStatus === 'loaded' ? `NEO (${neos.length})` :
                   neoStatus === 'error' ? 'NEO (unavailable)' : 'NEO (loading)';

  const layers = [
    { label: 'Stars', key: 'S', on: showStars, fn: () => setShowStars(p => !p) },
    { label: 'Constellations', key: 'L', on: showConstellations, fn: () => setShowConstellations(p => !p) },
    { label: 'Deep Sky', key: 'K', on: showDeepSky, fn: () => setShowDeepSky(p => !p) },
    { label: 'Dwarf Planets', key: 'D', on: showDwarf, fn: () => setShowDwarf(p => !p) },
    { label: neoLabel, key: 'N', on: showNeo, fn: () => setShowNeo(p => !p) },
    { label: 'Asteroid Belt', key: null, on: showAsteroidBelt, fn: () => setShowAsteroidBelt(p => !p) },
    { label: 'Comets', key: 'C', on: showComets, fn: () => setShowComets(p => !p) },
    { label: 'Meteor Showers', key: 'R', on: showMeteors, fn: () => setShowMeteors(p => !p) },
    { label: 'Oort Cloud', key: 'O', on: showDeepSpace, fn: () => setShowDeepSpace(p => !p) },
  ];

  const sourceItem: React.CSSProperties = {
    color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 1.8, fontWeight: 300,
  };

  const kbdRow: React.CSSProperties = {
    display: 'flex', gap: 12, fontSize: 13, color: 'rgba(255,255,255,0.7)',
    fontWeight: 300, lineHeight: 1.8,
  };

  const kbd: React.CSSProperties = {
    color: 'rgba(255,255,255,0.7)', fontWeight: 400, minWidth: 28, display: 'inline-block',
  };
  const openCore = !mobile;
  const sourceLink: React.CSSProperties = {
    color: accent,
    textDecoration: 'none',
    borderBottom: `1px solid rgba(${accentRgb},0.24)`,
  };
  const statusText: React.CSSProperties = {
    color: 'rgba(255,255,255,0.75)', fontSize: 12, lineHeight: 1.65, fontWeight: 300,
  };
  const liveSources = [
    { label: 'NOAA SWPC solar wind summary', url: 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json', note: 'Live solar-wind speed in the HUD.' },
    { label: 'NASA NeoWs API', url: 'https://api.nasa.gov/', note: 'Today’s near-Earth objects are fetched live by date.' },
    { label: 'JPL SBDB API', url: 'https://ssd-api.jpl.nasa.gov/doc/sbdb.html', note: 'Asteroid orbit details are fetched on demand when you select an NEO.' },
    { label: 'CelesTrak stations / GP elements', url: 'https://celestrak.org/NORAD/elements/', note: 'Current station TLEs are used when the remote fetch succeeds; otherwise the bundled local fallback is used.' },
  ];
  const catalogSources = [
    { label: 'JPL Horizons', url: 'https://ssd.jpl.nasa.gov/horizons/' },
    { label: 'Solar System Scope textures', url: 'https://www.solarsystemscope.com/textures/' },
    { label: 'd3-celestial', url: 'https://github.com/ofrohn/d3-celestial' },
    { label: 'HYG star database', url: 'https://astronexus.com/projects/hyg' },
    { label: 'OpenNGC', url: 'https://github.com/mattiaverga/OpenNGC' },
    { label: 'Minor Planet Center data', url: 'https://minorplanetcenter.net/data' },
    { label: 'IAU Meteor Data Center', url: 'https://www.ta3.sk/IAUC22DB/MDC2007/' },
  ];

  return (
    <div
      role="complementary"
      aria-label="Side panel"
      aria-hidden={!open}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      style={mobile ? {
        ...drawerPanel,
        ...bottomSheet('70vh'),
        background: `linear-gradient(180deg, rgba(${accentRgb},0.18) 0%, rgba(10,12,18,0.88) 22%, rgba(6,8,14,0.94) 100%)`,
        maxHeight: '38vh',
        overflowY: 'auto',
        zIndex: 30,
        padding: '8px 0 0',
        borderRadius: '14px 14px 0 0',
        borderLeft: 'none',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.25s ease',
        ...({ zoom: panelFontScale } as React.CSSProperties),
      } : {
        ...drawerPanel,
        background: `linear-gradient(180deg, rgba(${accentRgb},0.12) 0%, rgba(10,12,18,0.82) 14%, rgba(6,8,14,0.9) 100%)`,
        position: 'fixed',
        top: 12, right: 12, bottom: 12,
        width: 320,
        overflowY: 'auto',
        zIndex: 30,
        padding: '8px 0 0',
        borderRadius: 12,
        borderRight: `1px solid rgba(${accentRgb},0.24)`,
        boxShadow: `0 18px 48px rgba(0,0,0,0.38), 0 0 0 1px rgba(${accentRgb},0.08)`,
        transform: open ? 'translateX(0)' : 'translateX(calc(100% + 24px))',
        transition: 'transform 0.25s ease',
        ...({ zoom: panelFontScale } as React.CSSProperties),
      }}
    >
      {!mobile && <AccordionSection title="Status" accent={accent} defaultOpen>
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{ color: '#fff', fontSize: mobile ? 22 : 26, fontWeight: 300, letterSpacing: 2, fontFamily: "'Cormorant', serif" }}>
            {fmtTime(simTime)}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontStyle: 'italic', fontWeight: 300 }}>
            {fmtDate(simTime)}
          </div>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
            <Stat label="Moon" val={`${moon.name}, ${moon.ill}%`} c={accent} />
            <Stat label="View" val={camIdx >= 0 && camIdx < cams.length ? cams[camIdx].label : 'Focused'} />
            <Stat label="Rate" val={speedLabel(speed)} />
            {solarWind ? <Stat label="Solar Wind" val={solarWind} /> : <Stat label="Solar Wind" val="Unavailable" />}
          </div>
        </div>
      </AccordionSection>}

      <AccordionSection title="Speed" accent={accent} defaultOpen={openCore}>
        <div style={{ padding: '0 16px 8px' }}>
          <button
            onClick={() => setPlaying(p => !p)}
            style={{
              background: playing ? `rgba(${accentRgb},0.16)` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${playing ? `rgba(${accentRgb},0.35)` : 'rgba(255,255,255,0.08)'}`,
              color: playing ? accent : 'rgba(255,255,255,0.65)',
              fontSize: 12, fontFamily: 'inherit', fontWeight: 400,
              padding: '6px 12px', borderRadius: 4, cursor: 'pointer', minHeight: mobile ? 38 : 30,
            }}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 16px 8px' }}>
          {SPEED_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => setSpeed(() => p.value)}
              style={{
                background: speed === p.value ? `rgba(${accentRgb},0.2)` : 'rgba(255,255,255,0.04)',
                border: speed === p.value ? `1px solid rgba(${accentRgb},0.3)` : '1px solid rgba(255,255,255,0.08)',
                color: speed === p.value ? accent : 'rgba(255,255,255,0.5)',
                fontSize: 12, fontFamily: 'inherit', fontWeight: speed === p.value ? 500 : 300,
                padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
                minHeight: mobile ? 36 : 28,
              }}
            >{p.label}</button>
          ))}
        </div>
      </AccordionSection>

      <AccordionSection title="Go To" accent={accent} defaultOpen={openCore}>
        {(() => {
        // Group presets logically: close → system → far → special
        const groups: { title: string; items: { label: string; idx: number }[] }[] = [
          { title: 'Close', items: ['Sun', 'Inner', 'Belt'].map(l => ({ label: l, idx: cams.findIndex(c => c.label === l) })).filter(x => x.idx >= 0) },
          { title: 'System', items: ['System', 'Top', 'Ecliptic'].map(l => ({ label: l, idx: cams.findIndex(c => c.label === l) })).filter(x => x.idx >= 0) },
          { title: 'Deep', items: ['Outer', 'Kuiper', 'Oort', 'Stellar'].map(l => ({ label: l, idx: cams.findIndex(c => c.label === l) })).filter(x => x.idx >= 0) },
          { title: 'Views', items: ['Screensaver', 'Stargazer'].map(l => ({ label: l, idx: cams.findIndex(c => c.label === l) })).filter(x => x.idx >= 0) },
        ];
        const btnStyle = {
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.6)',
          fontSize: 12, fontFamily: 'inherit', fontWeight: 300,
          padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
          minHeight: mobile ? 36 : 28,
        };
        return (
          <div style={{ padding: '0 16px 6px' }}>
            {groups.map(g => (
              <MiniAccordion key={g.title} title={g.title} defaultOpen={!mobile && (g.title === 'Close' || g.title === 'Views')}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {g.items.map(item => (
                    <button key={item.label} onClick={() => onPresetSelect(item.idx)} style={btnStyle}>{item.label}</button>
                  ))}
                </div>
              </MiniAccordion>
            ))}
          </div>
        );
      })()}
      </AccordionSection>

      <AccordionSection title="Bodies" accent={accent} defaultOpen={false}>
        <div role="tree" aria-label="Celestial bodies">
        {/* Sun */}
        <div role="treeitem">
          <button
            onClick={() => onPresetSelect(cams.findIndex(c => c.label === 'Sun'))}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: mobile ? '10px 16px' : '6px 16px',
              background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              color: 'rgba(255,220,160,0.9)', fontSize: mobile ? 14 : 13, fontWeight: 400,
              minHeight: mobile ? 44 : 'auto', textAlign: 'left',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffdd88', flexShrink: 0 }} />
            Sol
          </button>
        </div>
        {planets.map((body, idx) => (
          <BodyTreeItem key={body.name} body={body} idx={idx} selPlanet={selPlanet}
            accent={accent} accentRgb={accentRgb} mobile={mobile}
            setSelPlanet={setSelPlanet} onMoonSelect={onMoonSelect} />
        ))}

        {/* Dwarf planets separator */}
        <div style={{
          padding: '8px 16px 4px', fontSize: 9, letterSpacing: 2,
          color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 300,
        }}>
          Dwarf Planets
        </div>
        {dwarfs.map((body, i) => (
          <BodyTreeItem key={body.name} body={body} idx={8 + i} selPlanet={selPlanet}
            accent={accent} accentRgb={accentRgb} mobile={mobile}
            setSelPlanet={setSelPlanet} onMoonSelect={onMoonSelect} />
        ))}
        </div>
      </AccordionSection>

      <AccordionSection title="Layers" accent={accent} defaultOpen={openCore}>
        <div role="group" aria-label="Display layers">
        {layers.filter(l => !mobile || ['Stars', 'Constellations', 'Deep Sky', 'Oort Cloud'].includes(l.label) || l.label.startsWith('NEO')).map(l => (
          <button
            key={l.label}
            onClick={l.fn}
            aria-pressed={l.on}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: mobile ? '10px 16px' : '6px 16px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: mobile ? 14 : 13,
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
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 300 }}>{l.key}</span>
            )}
          </button>
        ))}
        </div>
      </AccordionSection>

      {mobile ? (
      <AccordionSection title="More" accent={accent} defaultOpen={false}>
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Status</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 12 }}>
            <Stat label="Moon" val={`${moon.name}, ${moon.ill}%`} c={accent} />
            <Stat label="Rate" val={speedLabel(speed)} />
            {solarWind && <Stat label="Solar Wind" val={solarWind} />}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Theme</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {THEMES.map(t => (
              <button key={t.id} onClick={() => setTheme(t)} aria-label={t.name} style={{
                width: 24, height: 24, borderRadius: '50%', background: t.uiAccent, border: theme.id === t.id ? '2px solid #fff' : '2px solid transparent',
                cursor: 'pointer', padding: 0,
              }} />
            ))}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>All Layers</div>
          {layers.filter(l => !['Stars', 'Constellations', 'Deep Sky', 'Oort Cloud'].includes(l.label) && !l.label.startsWith('NEO')).map(l => (
            <button key={l.label} onClick={l.fn} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '8px 0', background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13,
              color: l.on ? accent : 'rgba(255,255,255,0.45)', fontWeight: l.on ? 400 : 300, textAlign: 'left',
            }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, border: `1.5px solid ${l.on ? accent : 'rgba(255,255,255,0.2)'}`, background: l.on ? `rgba(${accentRgb},0.15)` : 'transparent' }} />
              {l.label}
            </button>
          ))}
        </div>
      </AccordionSection>
      ) : (
      <>
      <AccordionSection title="Theme" accent={accent} defaultOpen={false}>
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
              fontFamily: 'inherit', fontSize: mobile ? 15 : 14,
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
      </AccordionSection>

      <AccordionSection title="Settings" accent={accent} defaultOpen={false}>
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 8 }}>
            Panel Text Size
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { label: 'Small', value: 0.94 },
              { label: 'Default', value: 1 },
              { label: 'Large', value: 1.08 },
            ].map(option => (
              <button
                key={option.label}
                onClick={() => {
                  try { localStorage.setItem(PANEL_FONT_SCALE_KEY, String(option.value)); } catch { /* ignore */ }
                  window.dispatchEvent(new CustomEvent('orrery-panel-font-scale', { detail: option.value }));
                }}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  padding: '6px 10px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  minHeight: mobile ? 36 : 28,
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 1.5, marginTop: 8 }}>
            Keeps the panel denser on mobile without changing the 3D scene.
          </div>
        </div>
      </AccordionSection>

      {/* ── NEO (when layer is on) ── */}
      {showNeo && (
        <AccordionSection title="NEO Today" accent={accent} defaultOpen={false}>
          <div style={{ padding: '0 16px' }}>
            {neoStatus === 'loading' && (
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontStyle: 'italic', padding: '8px 0' }}>Loading NASA data...</div>
            )}
            {neoStatus === 'error' && (
              <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 11, fontStyle: 'italic', padding: '8px 0' }}>
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
                  <span style={{ color: '#fff', fontSize: mobile ? 14 : 13 }}>{neo.name.replace(/[()]/g, '')}</span>
                  {neo.orbit?.loaded && <span style={{ color: accent, fontSize: 9, marginLeft: 'auto', fontStyle: 'italic' }}>orbit</span>}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 10, marginTop: 2, fontWeight: 300 }}>
                  {neo.missLunar.toFixed(1)} LD {'\u00b7'} {neo.velKms.toFixed(1)} km/s {'\u00b7'} {Math.round(neo.dMin)}{'\u2013'}{Math.round(neo.dMax)} m
                </div>
              </div>
            ))}
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 8, fontStyle: 'italic', fontWeight: 300 }}>Source: NASA JPL NeoWs / SBDB</div>
          </div>
        </AccordionSection>
      )}

      {/* ── Constellation Info (when selected) ── */}
      {selConstellation && MYTHOLOGY[selConstellation] && (() => {
        const info = MYTHOLOGY[selConstellation];
        return (
          <InfoPanel
            sectionTitle="Constellation" title={selConstellation}
            subtitle={`${info.origin} \u00b7 Best: ${info.season}`}
            description="" accent={accent}
            onClose={() => setSelConstellation(null)} closeLabel="Close constellation info"
          >
            {info.objects.length > 0 && (
              <>
                <div style={{
                  color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 2,
                  textTransform: 'uppercase', fontWeight: 300, marginTop: 12, marginBottom: 4,
                }}>
                  Notable Objects
                </div>
                {info.objects.map(obj => (
                  <div key={obj} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 300, lineHeight: 1.6 }}>
                    {obj}
                  </div>
                ))}
              </>
            )}
          </InfoPanel>
        );
      })()}

      {/* ── Spacecraft Info (when selected) ── */}
      {selSpacecraft && (
        <InfoPanel
          sectionTitle="Spacecraft" title={selSpacecraft.name}
          subtitle={`${selSpacecraft.status === 'active' ? 'Active' : 'Inactive'} \u00b7 Launched ${selSpacecraft.launchYear}`}
          description="" accent={accent}
          onClose={() => setSelSpacecraft(null)} closeLabel="Close spacecraft info"
        >
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px',
            marginTop: 12, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 300,
          }}>
            <div>Distance <span style={{ color: '#fff', fontWeight: 400 }}>{selSpacecraft.distAU} AU</span></div>
            <div>Speed <span style={{ color: '#fff', fontWeight: 400 }}>{selSpacecraft.speedAUyr} AU/yr</span></div>
            <div>Light-hours <span style={{ color: '#fff', fontWeight: 400 }}>{(selSpacecraft.distAU / 7.2).toFixed(1)}</span></div>
            <div>Light-years <span style={{ color: '#fff', fontWeight: 400 }}>{(selSpacecraft.distAU / 63241).toFixed(4)}</span></div>
          </div>
        </InfoPanel>
      )}

      <AccordionSection title="About" accent={accent} defaultOpen={false}>
        <div style={{ padding: '0 16px 20px' }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase' }}>Orrery</div>
        <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, fontStyle: 'italic', fontWeight: 300, marginTop: 2 }}>Interactive Solar System</div>

        <MiniAccordion title="Data Status" defaultOpen={!mobile}>
          <div style={statusText}>This scene uses real astronomical datasets throughout.</div>
          <div style={{ ...statusText, marginTop: 8 }}>
            Live/current where available: solar wind, today’s NASA NEO feed, on-demand JPL asteroid orbit details, and current station TLEs.
          </div>
          <div style={{ ...statusText, marginTop: 8 }}>
            Catalog/prebaked but still real data: planetary elements, star catalogs, constellations, comets, meteor showers, and deep-sky objects.
          </div>
        </MiniAccordion>

        <MiniAccordion title="Live / Current Sources" defaultOpen={false}>
          {liveSources.map(source => (
            <div key={source.label} style={{ marginBottom: 10 }}>
              <a href={source.url} target="_blank" rel="noreferrer" style={sourceLink}>{source.label}</a>
              <div style={statusText}>{source.note}</div>
            </div>
          ))}
        </MiniAccordion>

        <MiniAccordion title="Catalog Sources" defaultOpen={false}>
          {catalogSources.map(source => (
            <div key={source.label} style={{ ...sourceItem, marginBottom: 8 }}>
              <a href={source.url} target="_blank" rel="noreferrer" style={sourceLink}>{source.label}</a>
            </div>
          ))}
        </MiniAccordion>

        <MiniAccordion title="Technology" defaultOpen={false}>
          <div style={sourceItem}>React {'\u00b7'} Three.js {'\u00b7'} TypeScript</div>
        </MiniAccordion>

        <MiniAccordion title="Keyboard Shortcuts" defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={kbdRow}><span style={kbd}>1-0</span> Camera presets {'\u00b7'} <span style={kbd}>-</span> Stargazer</div>
            <div style={kbdRow}><span style={kbd}>S</span> Stars {'\u00b7'} <span style={kbd}>L</span> Constellations</div>
            <div style={kbdRow}><span style={kbd}>G</span> Stargazer {'\u00b7'} <span style={kbd}>D</span> Dwarf planets</div>
            <div style={kbdRow}><span style={kbd}>K</span> Deep Sky {'\u00b7'} <span style={kbd}>N</span> NEO</div>
            <div style={kbdRow}><span style={kbd}>C</span> Comets {'\u00b7'} <span style={kbd}>R</span> Radiants</div>
            <div style={kbdRow}><span style={kbd}>I</span> Satellites {'\u00b7'} <span style={kbd}>O</span> Deep Space</div>
            <div style={kbdRow}><span style={kbd}>F</span> Tour {'\u00b7'} <span style={kbd}>Space</span> Pause</div>
            <div style={kbdRow}><span style={kbd}>Esc</span> Back/Deselect</div>
          </div>
        </MiniAccordion>
        </div>
      </AccordionSection>

      {/* Built By — always visible, not collapsible */}
      <div style={{ padding: '12px 16px 6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 400 }}>Luke Steuber</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <a href="https://lukesteuber.com" target="_blank" rel="noopener noreferrer" style={{ color: accent, fontSize: 11, textDecoration: 'none', fontWeight: 300 }}>lukesteuber.com</a>
          <a href="https://datapoems.io" target="_blank" rel="noopener noreferrer" style={{ color: accent, fontSize: 11, textDecoration: 'none', fontWeight: 300 }}>datapoems.io</a>
        </div>
      </div>

      </>
      )}
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
  showAsterisms: boolean; setShowAsterisms: (fn: (p: boolean) => boolean) => void;
  constellationFocus: boolean; setConstellationFocus: (fn: (p: boolean) => boolean) => void;
  showAsteroidBelt: boolean; setShowAsteroidBelt: (fn: (p: boolean) => boolean) => void;
  showComets: boolean; setShowComets: (fn: (p: boolean) => boolean) => void;
  showMeteors: boolean; setShowMeteors: (fn: (p: boolean) => boolean) => void;
  showSatellites: boolean; setShowSatellites: (fn: (p: boolean) => boolean) => void;
  showDeepSky: boolean; setShowDeepSky: (fn: (p: boolean) => boolean) => void;
  selConstellation: string | null; setSelConstellation: (id: string | null) => void;
  panelOpen: boolean; setPanelOpen: (fn: boolean | ((p: boolean) => boolean)) => void;
  cinematic: boolean;
  navStack: string[];
  navigateBack: () => void;
  navigateToLevel: (level: number) => void;
  selMoonIdx: number | null;
  cameraDistance: number;
  cams: CamPreset[];
  camIdx: number;
  onPresetSelect: (i: number) => void;
  onMoonSelect?: (planetIdx: number, moonIdx: number) => void;
  selComet: CometDef | null; setSelComet: (c: CometDef | null) => void;
  selMeteor: MeteorShower | null; setSelMeteor: (m: MeteorShower | null) => void;
  selSatellite: SatellitePosition | null; setSelSatellite: (s: SatellitePosition | null) => void;
  showDeepSpace: boolean; setShowDeepSpace: (fn: (p: boolean) => boolean) => void;
  selSpacecraft: import('../data/deepspace').Spacecraft | null;
  setSelSpacecraft: (s: import('../data/deepspace').Spacecraft | null) => void;
}

export default function Panels(props: PanelProps) {
  const {
    simTime, moon, solarWind, speed,
    selPlanet, setSelPlanet, neos, neoStatus, selNeo, setSelNeo,
    showNeo, setShowNeo,
    showDwarf, setShowDwarf,
    showStars, setShowStars,
    showConstellations, setShowConstellations,
    showAsterisms, setShowAsterisms,
    constellationFocus, setConstellationFocus,
    showAsteroidBelt, setShowAsteroidBelt,
    showComets, setShowComets,
    showMeteors, setShowMeteors,
    showSatellites, setShowSatellites,
    showDeepSky, setShowDeepSky,
    selConstellation, setSelConstellation,
    panelOpen, setPanelOpen,
    cinematic,
    navStack,
    selMoonIdx, cameraDistance,
    cams, camIdx, onPresetSelect,
    onMoonSelect,
    selComet, selMeteor, selSatellite,
    showDeepSpace, setShowDeepSpace,
    selSpacecraft, setSelSpacecraft,
  } = props;

  const { theme } = useTheme();
  const accent = theme.uiAccent;
  const accentRgb = theme.uiAccentRgb;
  const mobile = useIsMobile();
  const [panelPeek, setPanelPeek] = useState(false);
  const peekTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPeek = useCallback(() => { if (peekTimeout.current) clearTimeout(peekTimeout.current); setPanelPeek(true); }, []);
  const endPeek = useCallback(() => { peekTimeout.current = setTimeout(() => setPanelPeek(false), 400); }, []);
  const [cardMinimized, setCardMinimized] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [panelNudge, setPanelNudge] = useState(false);
  const [panelFontScale, setPanelFontScale] = useState(loadPanelFontScale);
  const sp = selPlanet !== null ? ALL_BODIES[selPlanet] : null;
  const mobilePanelHeight = '38vh';
  const mobilePanelOffset = '12px';
  const panelVisible = panelOpen || (!mobile && panelPeek);
  const showPanelNudge = panelNudge && !mobile && !panelVisible;

  useEffect(() => {
    if (mobile || panelOpen || panelPeek) return;
    const start = window.setTimeout(() => setPanelNudge(true), 1600);
    const stop = window.setTimeout(() => setPanelNudge(false), 2600);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [mobile, panelOpen, panelPeek]);

  useEffect(() => {
    const handleScale = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail;
      if (typeof detail === 'number') setPanelFontScale(detail);
    };
    window.addEventListener('orrery-panel-font-scale', handleScale as EventListener);
    return () => window.removeEventListener('orrery-panel-font-scale', handleScale as EventListener);
  }, []);

  // Selected moon info
  const selectedMoon = selPlanet !== null && selMoonIdx !== null
    ? getMoonsForPlanet(selPlanet)[selMoonIdx]
    : null;

  // ─── Cinematic mode overlay ─────────────────────────────────────────────────
  // Current body label from nav stack
  const cinematicLabel = navStack[navStack.length - 1] || '';

  useEffect(() => {
    if (!cinematic) return;
  }, [cinematic]);

  // ─── Cinematic overlay (rendered above main UI when active) ──────────────────
  const cinematicOverlay = cinematic ? (() => {
    const dim: React.CSSProperties = {
      color: 'rgba(255,255,255,0.7)', fontSize: mobile ? 16 : 18, fontWeight: 300,
      letterSpacing: 1.5, fontStyle: 'italic',
    };
    return (
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(0.5px)',
          WebkitBackdropFilter: 'blur(0.5px)',
          pointerEvents: 'none',
        }}
      >
        {/* Top cluster: time, date, celestial data */}
        <div style={{
          marginTop: mobile ? 20 : 32,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <span style={{
            fontSize: mobile ? 42 : 56, fontWeight: 300, letterSpacing: 8,
            color: 'rgba(255,255,255,0.85)',
            fontFamily: "'Cormorant Garamond','Garamond','Baskerville','Georgia',serif",
          }}>
            {fmtTime(simTime)}
          </span>
          <span style={{
            fontSize: mobile ? 18 : 22, fontWeight: 300, letterSpacing: 3,
            color: 'rgba(255,255,255,0.72)', fontStyle: 'italic',
          }}>
            {fmtDate(simTime)}
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: mobile ? 8 : 12,
            marginTop: 4, opacity: 0.4,
          }}>
            <span style={{ ...dim, fontSize: mobile ? 11 : 12 }}>{moon.name}, {moon.ill}%</span>
            {solarWind && (
              <>
                <span style={{ ...dim, fontSize: mobile ? 11 : 12, color: 'rgba(255,255,255,0.12)' }}>{'\u00b7'}</span>
                <span style={{ ...dim, fontSize: mobile ? 11 : 12 }}>{solarWind}</span>
              </>
            )}
          </div>
          {/* Current zoom label -- below time cluster */}
          <div style={{
            marginTop: mobile ? 10 : 14,
            fontSize: mobile ? 18 : 22, fontWeight: 300, letterSpacing: 5,
            color: 'rgba(255,255,255,0.72)',
            textTransform: 'uppercase',
          }}>
            {cinematicLabel}
          </div>
        </div>

        {/* Exit hint */}
        <div style={{
          position: 'absolute', bottom: mobile ? 48 : 56,
          color: 'rgba(255,255,255,0.72)', fontSize: mobile ? 16 : 18,
          letterSpacing: 3, fontWeight: 300, fontStyle: 'italic',
        }}>
          {mobile ? 'tap' : 'click'} to explore
        </div>
        {/* Watermark */}
        <div style={{
          position: 'absolute', bottom: mobile ? 20 : 28,
          color: 'rgba(255,255,255,0.12)', fontSize: mobile ? 14 : 16,
          letterSpacing: 8, textTransform: 'uppercase', fontWeight: 300,
        }}>
          Orrery
        </div>
      </div>
    );
  })() : null;

  return (
    <>
      {cinematicOverlay}
      {/* Panel drawer tab (desktop only — mobile uses bottom toolbar gear) */}
      {!mobile && <button
        onClick={() => setPanelOpen((p: boolean) => !p)}
        onMouseEnter={() => { if (!mobile) startPeek(); }}
        onMouseLeave={() => { if (!mobile && !panelOpen) endPeek(); }}
        aria-label={panelOpen ? 'Collapse panel' : 'Open panel'}
        aria-expanded={panelOpen}
        style={{
          ...drawerTab,
          ...(false // mobile branch removed — desktop only now
            ? {
                top: 'auto',
                bottom: 16,
                right: 12,
                transform: 'none',
                width: 44,
                height: 44,
                borderRadius: 999,
                borderRight: '1px solid rgba(255,255,255,0.08)',
              }
            : {
                top: '50%',
                right: 0,
                transform: `translateY(-50%) translateX(${showPanelNudge ? -8 : 0}px)`,
                width: 36,
                height: 76,
                borderRadius: '12px 0 0 12px',
                borderRight: 'none',
              }),
          color: panelVisible ? accent : 'rgba(255,255,255,0.72)',
          background: panelVisible
            ? `linear-gradient(180deg, rgba(${accentRgb},0.18) 0%, rgba(0,0,0,0.78) 100%)`
            : `linear-gradient(180deg, rgba(${accentRgb},0.12) 0%, rgba(0,0,0,0.66) 100%)`,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: `1px solid rgba(${accentRgb},${panelVisible ? '0.26' : '0.14'})`,
          borderRight: mobile ? `1px solid rgba(${accentRgb},0.16)` : 'none',
          zIndex: 31,
          transition: 'transform 0.28s ease, background 0.2s ease, color 0.2s ease, border-color 0.2s ease',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          aria-hidden="true"
          style={{ display: 'block' }}
        >
          <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 4.5h12" />
            <path d="M3 9h12" />
            <path d="M3 13.5h12" />
            <circle cx="6" cy="4.5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="9" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="8" cy="13.5" r="1.5" fill="currentColor" stroke="none" />
          </g>
        </svg>
      </button>}
      <SideDrawer
        open={panelVisible && !mobile}
        accent={accent}
        accentRgb={accentRgb}
        mobile={mobile}
        simTime={simTime}
        moon={moon}
        solarWind={solarWind}
        speed={speed}
        setSpeed={props.setSpeed}
        playing={props.playing}
        setPlaying={props.setPlaying}
        cams={cams}
        camIdx={camIdx}
        onPresetSelect={onPresetSelect}
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
        showAsterisms={showAsterisms} setShowAsterisms={setShowAsterisms}
        constellationFocus={constellationFocus} setConstellationFocus={setConstellationFocus}
        showDwarf={showDwarf} setShowDwarf={setShowDwarf}
        showAsteroidBelt={showAsteroidBelt} setShowAsteroidBelt={setShowAsteroidBelt}
        showComets={showComets} setShowComets={setShowComets}
        showMeteors={showMeteors} setShowMeteors={setShowMeteors}
        showSatellites={showSatellites} setShowSatellites={setShowSatellites}
        showDeepSky={showDeepSky} setShowDeepSky={setShowDeepSky}
        showDeepSpace={showDeepSpace} setShowDeepSpace={setShowDeepSpace}
        selConstellation={selConstellation} setSelConstellation={setSelConstellation}
        selSpacecraft={selSpacecraft} setSelSpacecraft={setSelSpacecraft}
        onHoverStart={() => { if (!mobile) startPeek(); }}
        onHoverEnd={() => { if (!mobile && !panelOpen) endPeek(); }}
        panelFontScale={panelFontScale}
      />

      {/* ── Background blur overlay when body selected ── */}
      {sp && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            background: mobile
              ? 'radial-gradient(ellipse at 50% 80%, rgba(0,0,0,0.45) 0%, transparent 60%)'
              : 'radial-gradient(ellipse at 15% 60%, rgba(0,0,0,0.45) 0%, transparent 55%)',
            backdropFilter: 'blur(0.5px)',
            WebkitBackdropFilter: 'blur(0.5px)',
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
            left: 8, right: 8, bottom: mobilePanelOffset, top: 'auto',
            maxHeight: '30vh',
            borderRadius: 12,
            overflowY: 'auto',
            ...bokehCard,
            padding: '16px 20px',
            paddingBottom: '20px',
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
          {/* Header — tap to collapse/expand */}
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); setCardMinimized(m => !m); }}
          >
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
                {!cardMinimized && (
                  <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: 300, fontStyle: 'italic', letterSpacing: 0.5 }}>
                    {selectedMoon ? `Moon of ${sp!.name}` : sp!.type}
                  </div>
                )}
              </div>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, padding: '4px 8px', fontWeight: 300 }}>{cardMinimized ? '\u25b8' : '\u25be'}</span>
          </div>

          {/* Collapsible body */}
          {!cardMinimized && (
            <>
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
                  <span key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: 300 }}>
                    {i > 0 && <span style={{ margin: '0 4px' }}>{'\u203a'}</span>}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); props.navigateToLevel(i); }}
                      onKeyDown={e => { if (e.key === 'Enter') props.navigateToLevel(i); }}
                      style={{ cursor: i < navStack.length - 1 ? 'pointer' : 'default', color: i === navStack.length - 1 ? accent : 'rgba(255,255,255,0.25)' }}
                    >{crumb}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Scale indicator ── */}
      {!mobile && <ScaleIndicator cameraDistance={cameraDistance} />}

      {/* ── Selected NEO detail ── */}
      {selNeo && (
        <div
          role="dialog"
          aria-label={`${selNeo.name} details`}
          style={{
            position: 'absolute', bottom: mobile ? (panelOpen ? `calc(${mobilePanelHeight} + 16px)` : 64) : 56,
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
              <div style={{ gridColumn: '1/-1', color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>Loading orbital elements...</div>
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


      {/* ── Title watermark (clickable → info overlay) ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowInfo(p => !p)}
        onKeyDown={e => { if (e.key === 'Enter') setShowInfo(p => !p); }}
        style={{ position: 'absolute', top: 14, left: 14, color: 'rgba(255,255,255,0.7)', fontSize: mobile ? 14 : 15, letterSpacing: 5, textTransform: 'uppercase', zIndex: 5, fontWeight: 300, cursor: 'pointer' }}
      >
        Orrery
      </div>

      {/* ── Zoom controls + stargazer toggle (desktop only) ── */}
      {!mobile && <ZoomControls />}
      {!mobile && !cinematic && (
        <button
          onClick={() => {
            setConstellationFocus(p => !p);
            if (!constellationFocus) {
              setShowStars(() => true);
              setShowConstellations(() => true);
              setShowDeepSky(() => true);
            }
          }}
          aria-label="Stargazer mode"
          aria-pressed={constellationFocus}
          style={{
            position: 'absolute', bottom: 104, right: 14,
            background: constellationFocus ? `rgba(${accentRgb},0.15)` : 'rgba(255,255,255,0.06)',
            border: `1px solid ${constellationFocus ? `rgba(${accentRgb},0.3)` : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 6, width: 36, height: 36,
            color: constellationFocus ? accent : 'rgba(255,255,255,0.5)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit', fontSize: 14, zIndex: 5,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}
        >{'\u2726'}</button>
      )}

      {/* ── Mobile floating top controls ── */}
      {mobile && !cinematic && (
        <div style={{
          position: 'fixed', top: 32, left: 10, right: 10,
          display: 'flex', alignItems: 'center', gap: 4,
          zIndex: 15,
        }}>
          {['Inner', 'System', 'Outer', 'Oort'].map(label => {
            const idx = cams.findIndex(c => c.label === label);
            if (idx < 0) return null;
            const active = camIdx === idx;
            return (
              <button key={label} onClick={() => onPresetSelect(idx)} style={{
                padding: '6px 0', flex: 1,
                fontSize: 9, fontFamily: 'inherit', fontWeight: active ? 500 : 300,
                letterSpacing: 1, textTransform: 'uppercase',
                color: active ? accent : 'rgba(255,255,255,0.4)',
                background: active ? `rgba(${accentRgb},0.12)` : 'rgba(0,0,0,0.3)',
                border: `1px solid ${active ? `rgba(${accentRgb},0.25)` : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 3, cursor: 'pointer',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              }}>{label}</button>
            );
          })}
          <button
            onClick={() => {
              setConstellationFocus(p => !p);
              if (!constellationFocus) {
                setShowStars(() => true);
                setShowConstellations(() => true);
                setShowDeepSky(() => true);
              }
            }}
            aria-label="Stargazer mode"
            aria-pressed={constellationFocus}
            style={{
              padding: '6px 10px',
              fontSize: 9, fontFamily: 'inherit', fontWeight: constellationFocus ? 500 : 300,
              color: constellationFocus ? accent : 'rgba(255,255,255,0.4)',
              background: constellationFocus ? `rgba(${accentRgb},0.12)` : 'rgba(0,0,0,0.3)',
              border: `1px solid ${constellationFocus ? `rgba(${accentRgb},0.25)` : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 3, cursor: 'pointer',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            }}
          >{'\u2726'}</button>
          <button
            onClick={() => setShowInfo(p => !p)}
            aria-label="About this orrery"
            style={{
              padding: '6px 8px',
              fontSize: 10, fontFamily: 'inherit', fontWeight: showInfo ? 500 : 300,
              color: showInfo ? accent : 'rgba(255,255,255,0.4)',
              background: showInfo ? `rgba(${accentRgb},0.12)` : 'rgba(0,0,0,0.3)',
              border: `1px solid ${showInfo ? `rgba(${accentRgb},0.25)` : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 3, cursor: 'pointer',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            }}
          >?</button>
        </div>
      )}

      {/* ── Info overlay (mobile ? button) ── */}
      {showInfo && (
        <div
          onClick={() => setShowInfo(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 24, overflow: 'auto',
            fontFamily: "'Cormorant Garamond','Garamond','Baskerville','Georgia',serif",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 360, width: '100%' }}>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 300, letterSpacing: 6, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 }}>Orrery</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginBottom: 20 }}>Real data. Real time.</div>

            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Catalog Data</div>
            {[
              '41,119 stars \u2014 HYG Database',
              '88 constellations \u2014 IAU / d3-celestial',
              '8 planets + 3 dwarf planets \u2014 JPL Horizons',
              '32 moons \u2014 JPL Horizons',
              '3,000 main-belt asteroids \u2014 Minor Planet Center',
              '110+ deep sky objects \u2014 OpenNGC',
              '20+ comets \u2014 Minor Planet Center',
              '14 meteor showers \u2014 IAU Meteor Data Center',
              '5 spacecraft \u2014 NASA/JPL',
              '2K/4K textures \u2014 Solar System Scope (CC BY 4.0)',
            ].map(s => (
              <div key={s} style={{ color: 'rgba(255,255,255,0.72)', fontSize: 14, fontWeight: 300, lineHeight: 1.8 }}>{s}</div>
            ))}

            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 }}>Live Data</div>
            {[
              'Near-Earth objects \u2014 NASA NeoWs API',
              'Asteroid orbits \u2014 JPL Small-Body Database',
              'Solar wind \u2014 NOAA SWPC',
              'Satellite TLEs \u2014 CelesTrak',
            ].map(s => (
              <div key={s} style={{ color: `rgba(${accentRgb},0.7)`, fontSize: 14, fontWeight: 300, lineHeight: 1.8 }}>{s}</div>
            ))}

            <div style={{ marginTop: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="https://lukesteuber.com" target="_blank" rel="noopener noreferrer" style={{ color: accent, fontSize: 14, textDecoration: 'none', fontWeight: 400 }}>lukesteuber.com</a>
              <a href="https://datapoems.io" target="_blank" rel="noopener noreferrer" style={{ color: accent, fontSize: 14, textDecoration: 'none', fontWeight: 400 }}>datapoems.io</a>
            </div>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <button onClick={() => setShowInfo(false)} style={{
                background: 'none', border: `1px solid rgba(${accentRgb},0.2)`, color: 'rgba(255,255,255,0.6)',
                fontSize: 12, fontFamily: 'inherit', padding: '8px 20px', borderRadius: 4, cursor: 'pointer',
              }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Screen reader announcements ── */}
      <div aria-live="polite" className="sr-only" role="status">
        {sp ? `Selected ${sp.name}, ${sp.type}.` : ''}
        {selectedMoon ? `Selected moon ${selectedMoon.name}.` : ''}
        {selNeo ? `Selected asteroid ${selNeo.name}. Miss distance: ${selNeo.missLunar.toFixed(1)} lunar distances.` : ''}
        {selComet ? `Selected comet ${selComet.name}. Perihelion: ${selComet.q.toFixed(3)} AU.` : ''}
        {selMeteor ? `Selected meteor shower ${selMeteor.name}. Velocity: ${selMeteor.vg.toFixed(1)} km per second.` : ''}
        {selSatellite ? `Selected satellite ${selSatellite.name}. Altitude: ${selSatellite.alt.toFixed(0)} km.` : ''}
        {selSpacecraft ? `Selected spacecraft ${selSpacecraft.name}. Distance: ${selSpacecraft.distAU} AU.` : ''}
        {navStack.length > 1 ? `Navigated to ${navStack[navStack.length - 1]}` : ''}
      </div>
    </>
  );
}
