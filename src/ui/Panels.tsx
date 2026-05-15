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
import { useTheme } from '../lib/themes';
import { bokehCard, useIsMobile, Z, BLUR, ACTIVE_ALPHA } from './styles';
import type { CometDef } from '../data/comets';
import type { MeteorShower } from '../scene/Meteors';
import type { SatellitePosition } from '../lib/satellites';
import { MYTHOLOGY, CONSTELLATION_NAMES } from '../data/mythology';
import { OBSERVATORY_MODE } from '../lib/mode';
import { ASTERISMS } from '../data/asterisms';

/** Distance from top of viewport below notch / status bar (iOS safe area). */
function safeAreaTop(extraPx: number): string {
  return `calc(env(safe-area-inset-top, 0px) + ${extraPx}px)`;
}

/** Distance from bottom of viewport above home indicator (iOS safe area). */
function safeAreaBottom(extraPx: number): string {
  return `calc(env(safe-area-inset-bottom, 0px) + ${extraPx}px)`;
}

/** Distance from right viewport edge inside notch / rounded-corner inset. */
function safeAreaRight(extraPx: number): string {
  return `calc(env(safe-area-inset-right, 0px) + ${extraPx}px)`;
}

/** Distance from left viewport edge inside notch / rounded-corner inset. */
function safeAreaLeft(extraPx: number): string {
  return `calc(env(safe-area-inset-left, 0px) + ${extraPx}px)`;
}

// Group MYTHOLOGY entries into Northern-hemisphere season buckets. Constellations
// whose season string is "Spring (S)" etc. fall back to their literal first word.
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

// ─── Zoom controls (jumps between camera scale-level presets) ───────────────────

const ZOOM_LEVEL_LABELS = ['Sun', 'Inner', 'System', 'Outer', 'Kuiper', 'Oort', 'Stellar'] as const;

function ZoomControls({ cams, cameraDistance, onPresetSelect, mobile }: {
  cams: CamPreset[];
  cameraDistance: number;
  onPresetSelect: (i: number) => void;
  mobile: boolean;
}) {
  const levels = ZOOM_LEVEL_LABELS
    .map(label => {
      const idx = cams.findIndex(c => c.label === label);
      if (idx < 0) return null;
      const [x, y, z] = cams[idx].pos;
      return { idx, dist: Math.sqrt(x * x + y * y + z * z) };
    })
    .filter((v): v is { idx: number; dist: number } => v !== null);

  const currentLevel = levels.reduce((best, cur, i) => {
    const diff = Math.abs(Math.log10(cur.dist) - Math.log10(Math.max(0.01, cameraDistance)));
    return diff < best.diff ? { i, diff } : best;
  }, { i: 0, diff: Infinity }).i;

  const zoom = useCallback((direction: number) => {
    const next = Math.max(0, Math.min(levels.length - 1, currentLevel + direction));
    if (next !== currentLevel) onPresetSelect(levels[next].idx);
  }, [currentLevel, levels, onPresetSelect]);

  const atMin = currentLevel === 0;
  const atMax = currentLevel === levels.length - 1;

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: disabled ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.7)',
    width: 44,
    height: 44,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
    fontFamily: 'inherit',
    fontSize: 18,
    fontWeight: 400,
    backdropFilter: `blur(${BLUR.chip}px)`,
    WebkitBackdropFilter: `blur(${BLUR.chip}px)`,
    transition: 'color 0.18s ease, border-color 0.18s ease',
    pointerEvents: 'auto',
  });

  return (
    <div style={{
      position: mobile ? 'fixed' : 'absolute',
      top: mobile ? safeAreaTop(104) : 'auto',
      bottom: mobile ? 'auto' : safeAreaBottom(20),
      right: safeAreaRight(12),
      display: 'flex', flexDirection: 'column', gap: 4,
      zIndex: Z.canvasOverlay,
      pointerEvents: 'none',
    }}>
      <button onClick={() => zoom(-1)} disabled={atMin} aria-label="Zoom in to next scale level" style={btnStyle(atMin)}>
        <span aria-hidden="true">+</span>
      </button>
      <button onClick={() => zoom(1)} disabled={atMax} aria-label="Zoom out to next scale level" style={btnStyle(atMax)}>
        <span aria-hidden="true">−</span>
      </button>
    </div>
  );
}

// ─── About dialog (accessible modal) ────────────────────────────────────────────

function AboutDialog({ open, onClose, accent, accentRgb }: {
  open: boolean;
  onClose: () => void;
  accent: string;
  accentRgb: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: Z.modal,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: `blur(${BLUR.card}px)`, WebkitBackdropFilter: `blur(${BLUR.card}px)`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24, overflow: 'auto',
        fontFamily: "'Cormorant Garamond','Garamond','Baskerville','Georgia',serif",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 360, width: '100%' }}
      >
        <h2 id="about-dialog-title" style={{ color: '#fff', fontSize: 22, fontWeight: 300, letterSpacing: 6, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16, margin: 0 }}>About</h2>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 16, marginBottom: 20 }}>Real data. Real time.</div>

        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Catalog Data</div>
        {[
          '41,119 stars · HYG Database',
          '88 constellations · IAU / d3-celestial',
          '8 planets + 3 dwarf planets · JPL Horizons',
          '32 moons · JPL Horizons',
          '3,000 main-belt asteroids · Minor Planet Center',
          '110+ deep sky objects · OpenNGC',
          '20+ comets · Minor Planet Center',
          '14 meteor showers · IAU Meteor Data Center',
          '5 spacecraft · NASA/JPL',
          '2K/4K textures · Solar System Scope (CC BY 4.0)',
        ].map(s => (
          <div key={s} style={{ color: 'rgba(255,255,255,0.72)', fontSize: 14, fontWeight: 300, lineHeight: 1.8 }}>{s}</div>
        ))}

        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 }}>Live Data</div>
        {[
          'Near-Earth objects · NASA NeoWs API',
          'Asteroid orbits · JPL Small-Body Database',
          'Solar wind · NOAA SWPC',
          'Satellite TLEs · CelesTrak',
        ].map(s => (
          <div key={s} style={{ color: `rgba(${accentRgb},0.7)`, fontSize: 14, fontWeight: 300, lineHeight: 1.8 }}>{s}</div>
        ))}

        <div style={{ marginTop: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a href="https://lukesteuber.com" target="_blank" rel="noopener noreferrer" style={{ color: accent, fontSize: 14, textDecoration: 'none', fontWeight: 400 }}>lukesteuber.com</a>
          <a href="https://datapoems.io" target="_blank" rel="noopener noreferrer" style={{ color: accent, fontSize: 14, textDecoration: 'none', fontWeight: 400 }}>datapoems.io</a>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            style={{
              background: 'none',
              border: `1px solid rgba(${accentRgb},0.3)`,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13,
              fontFamily: 'inherit',
              padding: '10px 24px',
              minHeight: 44,
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Info panel — floating bokehCard for clicked sky / spacecraft objects ──────

function InfoPanel({
  sectionTitle, title, subtitle, description, accent, accentRgb, mobile, onClose, closeLabel, children,
}: {
  sectionTitle: string; title: string; subtitle: string; description: string;
  accent: string; accentRgb: string; mobile: boolean;
  onClose: () => void; closeLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      style={mobile ? {
        position: 'fixed', left: 8, right: 8, bottom: 12, top: 'auto',
        maxHeight: '40vh', borderRadius: 12, overflowY: 'auto',
        ...bokehCard, padding: '14px 18px', zIndex: Z.dialog,
        pointerEvents: 'auto', touchAction: 'manipulation',
      } : {
        position: 'absolute', bottom: 16, right: 16,
        maxWidth: 360, width: '30vw', minWidth: 280,
        maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
        ...bokehCard, padding: '14px 20px', zIndex: Z.dialog,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{
          color: `rgba(${accentRgb},0.8)`, fontSize: 10, letterSpacing: 2,
          textTransform: 'uppercase', fontWeight: 400,
        }}>{sectionTitle}</div>
        <Btn onClick={onClose} label={closeLabel}>{'\u00d7'}</Btn>
      </div>
      <div style={{ color: accent, fontSize: 18, fontWeight: 500, letterSpacing: 1 }}>{title}</div>
      {subtitle && (
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 300, marginTop: 2, letterSpacing: 1 }}>{subtitle}</div>
      )}
      {description && (
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 300, marginTop: 10, lineHeight: 1.5, fontStyle: 'italic' }}>{description}</div>
      )}
      {children}
    </div>
  );
}

// ─── Deep Sky info popup (fetches deepsky.json on demand) ──────────────────

interface DeepSkyEntry {
  id: string; name: string; type: string; ra: number; dec: number;
  mag: number; con: string; size: number;
}

let deepSkyCache: DeepSkyEntry[] | null = null;
let deepSkyPromise: Promise<DeepSkyEntry[]> | null = null;

function loadDeepSky(): Promise<DeepSkyEntry[]> {
  if (deepSkyCache) return Promise.resolve(deepSkyCache);
  if (deepSkyPromise) return deepSkyPromise;
  deepSkyPromise = fetch(import.meta.env.BASE_URL + 'data/deepsky.json')
    .then(r => r.json() as Promise<DeepSkyEntry[]>)
    .then(d => { deepSkyCache = d; return d; });
  return deepSkyPromise;
}

const DEEP_SKY_TYPE_LABEL: Record<string, string> = {
  galaxy: 'Galaxy', globular: 'Globular cluster',
  open: 'Open cluster', nebula: 'Nebula',
};

function DeepSkyInfo({ selDeepSky, accent, accentRgb, mobile, onClose }: {
  selDeepSky: string; accent: string; accentRgb: string; mobile: boolean; onClose: () => void;
}) {
  const [obj, setObj] = useState<DeepSkyEntry | null>(null);
  useEffect(() => {
    let alive = true;
    loadDeepSky().then(d => {
      if (alive) setObj(d.find(o => o.id === selDeepSky) ?? null);
    });
    return () => { alive = false; };
  }, [selDeepSky]);
  if (!obj) return null;
  const constellationName = CONSTELLATION_NAMES[obj.con] ?? obj.con;
  const typeLabel = DEEP_SKY_TYPE_LABEL[obj.type] ?? obj.type;
  return (
    <InfoPanel
      sectionTitle="Deep Sky"
      title={obj.name || obj.id}
      subtitle={`${typeLabel} · in ${constellationName}`}
      description="" accent={accent} accentRgb={accentRgb} mobile={mobile}
      onClose={onClose} closeLabel="Close deep sky info"
    >
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px',
        marginTop: 10, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 300,
      }}>
        {obj.id !== obj.name && <div>Catalog <span style={{ color: '#fff' }}>{obj.id}</span></div>}
        <div>Magnitude <span style={{ color: '#fff' }}>{obj.mag.toFixed(1)}</span></div>
        {obj.size > 0 && <div>Size <span style={{ color: '#fff' }}>{obj.size.toFixed(1)}′</span></div>}
      </div>
    </InfoPanel>
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
  selAsterism: string | null; setSelAsterism: (name: string | null) => void;
  selDeepSky: string | null; setSelDeepSky: (id: string | null) => void;
  panelOpen: boolean; setPanelOpen: (fn: boolean | ((p: boolean) => boolean)) => void;
  cinematic: boolean;
  pulseSkyToggle?: boolean;
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
    simTime: _simTime, moon, solarWind, speed: _speed,
    selPlanet, setSelPlanet: _setSelPlanet, neos: _neos, neoStatus: _neoStatus, selNeo, setSelNeo,
    setShowNeo: _setShowNeo,
    setShowDwarf: _setShowDwarf,
    showStars: _showStars, setShowStars,
    showConstellations: _showConstellations, setShowConstellations,
    setShowAsterisms: _setShowAsterisms,
    constellationFocus, setConstellationFocus,
    setShowAsteroidBelt: _setShowAsteroidBelt,
    setShowComets: _setShowComets,
    setShowMeteors: _setShowMeteors,
    setShowSatellites: _setShowSatellites,
    showDeepSky: _showDeepSky, setShowDeepSky,
    selConstellation, setSelConstellation,
    selAsterism, setSelAsterism,
    selDeepSky, setSelDeepSky,
    panelOpen: _panelOpen, setPanelOpen: _setPanelOpen,
    cinematic,
    pulseSkyToggle = false,
    navStack,
    selMoonIdx, cameraDistance,
    cams, onPresetSelect,
    selComet, selMeteor, selSatellite,
    setShowDeepSpace: _setShowDeepSpace,
    selSpacecraft, setSelSpacecraft,
  } = props;
  void _setShowNeo; void _simTime; void _speed; void _setSelPlanet; void _neos; void _neoStatus; void _setShowDwarf; void _showStars; void _showConstellations;
  void _setShowAsterisms; void _setShowAsteroidBelt; void _setShowComets;
  void _setShowMeteors; void _setShowSatellites; void _showDeepSky;
  void _panelOpen; void _setPanelOpen; void _setShowDeepSpace;

  const observatoryMode = OBSERVATORY_MODE;
  const { theme } = useTheme();
  const accent = theme.uiAccent;
  const accentRgb = theme.uiAccentRgb;
  const mobile = useIsMobile();
  const [cardMinimized, setCardMinimized] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const sp = selPlanet !== null ? ALL_BODIES[selPlanet] : null;
  const mobilePanelOffset = '12px';
  const detailsBodyId = 'planet-details-card-body';
  const controlChipStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.35)',
    color: 'rgba(255,255,255,0.58)',
    fontFamily: 'inherit',
    fontSize: 16,
    fontWeight: 300,
    cursor: 'pointer',
    backdropFilter: `blur(${BLUR.chip}px)`,
    WebkitBackdropFilter: `blur(${BLUR.chip}px)`,
    transition: 'border-color 0.18s ease, color 0.18s ease, background 0.18s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  };

  const toggleStargazer = useCallback(() => {
    setConstellationFocus((prev) => {
      const next = !prev;
      if (next) {
        setShowStars(() => true);
        setShowConstellations(() => true);
        setShowDeepSky(() => true);
        // Entering sky mode should reset single-object selection so the full sky can glow.
        setSelConstellation(null);
        setSelAsterism(null);
        setSelDeepSky(null);
      }
      return next;
    });
  }, [setConstellationFocus, setShowStars, setShowConstellations, setShowDeepSky, setSelConstellation, setSelAsterism, setSelDeepSky]);

  // Selected moon info
  const selectedMoon = selPlanet !== null && selMoonIdx !== null
    ? getMoonsForPlanet(selPlanet)[selMoonIdx]
    : null;
  const planetStats = !selectedMoon && sp ? [
    { label: 'Distance', value: `${sp.distAU} AU` },
    { label: 'Period', value: sp.period < 365 ? `${sp.period.toFixed(0)} days` : `${(sp.period / 365.25).toFixed(1)} years` },
    sp.gravity ? { label: 'Gravity', value: sp.gravity } : null,
    sp.surfaceTemp ? { label: 'Temp', value: sp.surfaceTemp } : null,
    { label: 'Moons', value: String(sp.moons) },
  ].filter((item): item is { label: string; value: string } => item !== null) : [];
  const moonStats = selectedMoon ? [
    { label: 'Orbital period', value: selectedMoon.period < 1 ? `${(selectedMoon.period * 24).toFixed(1)} hours` : `${selectedMoon.period.toFixed(1)} days` },
    { label: 'Parent', value: sp!.name },
  ] : [];

  // ─── Cinematic mode overlay ─────────────────────────────────────────────────
  // Current body label from nav stack
  const cinematicLabel = navStack[navStack.length - 1] || '';

  // ─── Cinematic overlay (rendered above main UI when active) ──────────────────
  const cinematicOverlay = cinematic ? (() => {
    const dim: React.CSSProperties = {
      color: 'rgba(255,255,255,0.7)', fontSize: mobile ? 16 : 18, fontWeight: 300,
      letterSpacing: 1.5, fontStyle: 'italic',
    };
    return (
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: Z.controls,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(0.5px)',
          WebkitBackdropFilter: 'blur(0.5px)',
          pointerEvents: 'none',
        }}
      >
        <div style={{
          marginTop: mobile ? safeAreaTop(20) : safeAreaTop(32),
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: mobile ? 8 : 12,
            opacity: 0.45,
          }}>
            <span style={{ ...dim, fontSize: mobile ? 11 : 12 }}>{moon.name}, {moon.ill}%</span>
            {solarWind && (
              <>
                <span style={{ ...dim, fontSize: mobile ? 11 : 12, color: 'rgba(255,255,255,0.12)' }}>{'\u00b7'}</span>
                <span style={{ ...dim, fontSize: mobile ? 11 : 12 }}>{solarWind}</span>
              </>
            )}
          </div>
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
          position: 'absolute', bottom: mobile ? safeAreaBottom(48) : safeAreaBottom(56),
          color: 'rgba(255,255,255,0.72)', fontSize: mobile ? 16 : 18,
          letterSpacing: 3, fontWeight: 300, fontStyle: 'italic',
        }}        >
          {mobile ? 'tap' : 'click'} to explore
        </div>
      </div>
    );
  })() : null;

  const observatorySpotlightActive = observatoryMode && selConstellation !== null;

  return (
    <>
      {cinematicOverlay}
      {/* Observatory spotlight vignette: dim the sky edges when a constellation is selected, focusing attention on the selection */}
      {observatoryMode && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, zIndex: Z.canvasOverlay - 1, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.32) 78%, rgba(0,0,0,0.55) 100%)',
            opacity: observatorySpotlightActive ? 1 : 0,
            transition: 'opacity 0.45s ease',
          }}
        />
      )}
      {/* ── Sky-object info cards (rendered as floating bokehCards) ── */}
      {selConstellation && MYTHOLOGY[selConstellation] && !cinematic && (() => {
        const info = MYTHOLOGY[selConstellation];
        return (
          <InfoPanel
            sectionTitle="Constellation"
            title={CONSTELLATION_NAMES[selConstellation] ?? selConstellation}
            subtitle={`${info.origin} \u00b7 Best: ${info.season}`}
            description="" accent={accent} accentRgb={accentRgb} mobile={mobile}
            onClose={() => setSelConstellation(null)} closeLabel="Close constellation info"
          >
            {info.objects.length > 0 && (
              <>
                <div style={{
                  color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 2,
                  textTransform: 'uppercase', fontWeight: 300, marginTop: 14, marginBottom: 4,
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

      {selAsterism && !cinematic && (() => {
        const ast = ASTERISMS.find(a => a.name === selAsterism);
        if (!ast) return null;
        return (
          <InfoPanel
            sectionTitle="Asterism" title={ast.name}
            subtitle={`${ast.stars.length} stars`}
            description={ast.description} accent={accent} accentRgb={accentRgb} mobile={mobile}
            onClose={() => setSelAsterism(null)} closeLabel="Close asterism info"
          />
        );
      })()}

      {selDeepSky && !cinematic && (
        <DeepSkyInfo selDeepSky={selDeepSky} accent={accent} accentRgb={accentRgb} mobile={mobile} onClose={() => setSelDeepSky(null)} />
      )}

      {selSpacecraft && !cinematic && (
        <InfoPanel
          sectionTitle="Spacecraft" title={selSpacecraft.name}
          subtitle={`${selSpacecraft.status === 'active' ? 'Active' : 'Inactive'} \u00b7 Launched ${selSpacecraft.launchYear}`}
          description="" accent={accent} accentRgb={accentRgb} mobile={mobile}
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

      {/* ── Background blur overlay when body selected (hidden in observatory / cinematic) ── */}
      {sp && !observatoryMode && !cinematic && (
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
            zIndex: Z.hud,
            transition: 'opacity 0.3s',
          }}
        />
      )}

      {/* ── Planet/Moon info card (hidden in observatory / cinematic — tour sets selPlanet for camera) ── */}
      {!cinematic && !observatoryMode && (sp || selectedMoon) && (
        <div
          role="dialog"
          aria-label={selectedMoon ? `${selectedMoon.name} details` : `${sp!.name} details`}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          style={mobile ? {
            position: 'fixed',
            left: 8, right: 8, bottom: mobilePanelOffset, top: 'auto',
            maxHeight: '28vh',
            borderRadius: 12,
            overflowY: 'auto',
            ...bokehCard,
            padding: '12px 14px 14px',
            zIndex: Z.dialog,
            pointerEvents: 'auto',
            touchAction: 'manipulation',
          } : {
            position: 'absolute',
            bottom: 16, left: 16,
            maxWidth: 400, width: '36vw', minWidth: 300,
            ...bokehCard,
            padding: '12px 14px',
            zIndex: Z.dialog,
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <button
              type="button"
              aria-label="Toggle details visibility"
              aria-expanded={!cardMinimized}
              aria-controls={detailsBodyId}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
              onClick={(e) => { e.stopPropagation(); setCardMinimized(m => !m); }}
            >
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
                <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: 300, fontStyle: 'italic', letterSpacing: 0.5 }}>
                  {selectedMoon ? `Moon of ${sp!.name}` : sp!.type}
                </div>
              </div>
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.navigateBack(); }}
              onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); props.navigateBack(); }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); props.navigateBack(); }}
              style={{
                background: `rgba(${accentRgb},0.12)`,
                border: `1px solid rgba(${accentRgb},0.3)`,
                borderRadius: 4, padding: mobile ? '7px 12px' : '6px 10px',
                color: accent, fontSize: mobile ? 12 : 11,
                fontFamily: 'inherit', fontWeight: 400, letterSpacing: 0.5,
                cursor: 'pointer', whiteSpace: 'nowrap',
                minHeight: mobile ? 36 : 30,
              }}
            >
              {'\u2190'} Back
            </button>
          </div>

          {/* Collapsible body */}
          {!cardMinimized && (
            <div id={detailsBodyId}>
              {/* Stats grid */}
              {!selectedMoon && planetStats.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, marginTop: 8 }}>
                  {planetStats.map((item) => (
                    <div key={item.label} style={{ padding: '6px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 9, letterSpacing: 1.1, textTransform: 'uppercase' }}>{item.label}</div>
                      <div style={{ color: '#fff', fontSize: 13, marginTop: 2, lineHeight: 1.1 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              )}
              {selectedMoon && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                  {moonStats.map((item) => (
                    <div key={item.label} style={{ padding: '6px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 9, letterSpacing: 1.1, textTransform: 'uppercase' }}>{item.label}</div>
                      <div style={{ color: '#fff', fontSize: 13, marginTop: 2, lineHeight: 1.1 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Breadcrumb nav */}
              <div style={{ display: 'flex', gap: 4, marginTop: 8, overflowX: 'auto', paddingBottom: 2 }}>
                {navStack.map((crumb, i) => (
                  <span key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: 300 }}>
                    {i > 0 && <span style={{ margin: '0 4px' }}>{'\u203a'}</span>}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); props.navigateToLevel(i); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          props.navigateToLevel(i);
                        }
                      }}
                      style={{ cursor: i < navStack.length - 1 ? 'pointer' : 'default', color: i === navStack.length - 1 ? accent : 'rgba(255,255,255,0.25)' }}
                    >{crumb}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Selected NEO detail (hidden during cinematic tour) ── */}
      {selNeo && !cinematic && (
        <div
          role="dialog"
          aria-label={`${selNeo.name} details`}
          style={{
            position: 'absolute', bottom: mobile ? 64 : 56,
            left: '50%', transform: 'translateX(-50%)',
            ...bokehCard, padding: '12px 18px', maxWidth: 420,
            width: mobile ? 'calc(100vw - 16px)' : '90%', zIndex: Z.controls,
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

      {/* ── About / info (subtle; replaces duplicate top title watermark) ── */}
      {!cinematic && (
        <div
          style={{
            position: 'absolute',
            top: safeAreaTop(12),
            left: safeAreaLeft(12),
            zIndex: Z.hud,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            aria-label="About and data sources"
            onClick={() => setShowInfo(true)}
            style={controlChipStyle}
          >
            i
          </button>
          {!observatoryMode && (
            <button
              className={pulseSkyToggle ? 'sky-toggle-blink' : undefined}
              onClick={toggleStargazer}
              aria-label="Sky mode"
              aria-pressed={constellationFocus}
              aria-keyshortcuts="g"
              title="Sky mode (G)"
              style={{
                ...controlChipStyle,
                background: constellationFocus ? `rgba(${accentRgb},${ACTIVE_ALPHA.bg})` : controlChipStyle.background,
                border: `1px solid ${constellationFocus ? `rgba(${accentRgb},${ACTIVE_ALPHA.border})` : 'rgba(255,255,255,0.12)'}`,
                color: constellationFocus ? accent : 'rgba(255,255,255,0.58)',
                fontSize: 15,
                fontWeight: 400,
              }}
            >
              <span aria-hidden="true" style={{ lineHeight: 1 }}>{'\u2726'}</span>
            </button>
          )}
        </div>
      )}

      {/* ── Zoom controls ── */}
      {!cinematic && (
        <ZoomControls cams={cams} cameraDistance={cameraDistance} onPresetSelect={onPresetSelect} mobile={mobile} />
      )}

      {/* ── About dialog ── */}
      <AboutDialog
        open={showInfo}
        onClose={() => setShowInfo(false)}
        accent={accent}
        accentRgb={accentRgb}
      />
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
