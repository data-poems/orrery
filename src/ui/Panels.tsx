/*
 * All HUD panels — overlay UI for the orrery
 *
 * Layout: collapsible side panel for controls, with scene overlays kept minimal.
 *
 * Responsive: mobile gets larger touch targets, bottom sheets, safe-area insets.
 * Theme-aware: all accent colors come from the active theme.
 * No emoji anywhere.
 */

import { useEffect, useState, useRef, Fragment } from 'react';
import type { NEO, CamPreset } from '../lib/kepler';
import { ALL_BODIES } from '../data/planets';
import { getMoonsForPlanet } from '../data/moons';
import { useTheme } from '../lib/themes';
import { bokehCard, useIsMobile, Z, BLUR } from './styles';
import { PREFERS_REDUCED_MOTION } from '../lib/motion';
import BodyStats from './BodyStats';
import type { CometDef } from '../data/comets';
import type { MeteorShower } from '../scene/Meteors';
import type { SatellitePosition } from '../lib/satellites';
import { MYTHOLOGY, CONSTELLATION_NAMES } from '../data/mythology';
import { OBSERVATORY_MODE } from '../lib/mode';
import { ASTERISMS } from '../data/asterisms';
import type { NearStar, GalaxyMarker } from '../data/deepspace';

/** Distance from top of viewport below notch / status bar (iOS safe area). */
function safeAreaTop(extraPx: number): string {
  return `calc(env(safe-area-inset-top, 0px) + ${extraPx}px)`;
}

/** Distance from bottom of viewport above home indicator (iOS safe area). */
function safeAreaBottom(extraPx: number): string {
  return `calc(env(safe-area-inset-bottom, 0px) + ${extraPx}px)`;
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

const EARTH_ORBITAL_PERIOD_DAYS = 365.25;
const EARTH_GRAVITY_MPS2 = 9.80665;

function formatEarthRelativePeriod(periodDays: number): string {
  const earthYears = periodDays / EARTH_ORBITAL_PERIOD_DAYS;
  if (!Number.isFinite(earthYears) || earthYears <= 0) return '—';
  if (earthYears < 0.1) return `${earthYears.toFixed(2)}x Earth year`;
  if (earthYears < 10) return `${earthYears.toFixed(1)}x Earth year`;
  return `${earthYears.toFixed(0)}x Earth year`;
}

function formatEarthRelativeGravity(gravity: string | undefined): string {
  if (!gravity) return '—';
  const match = gravity.match(/-?\d+(\.\d+)?/);
  if (!match) return gravity;
  const mps2 = Number(match[0]);
  if (!Number.isFinite(mps2)) return gravity;
  const g = mps2 / EARTH_GRAVITY_MPS2;
  if (g < 0.1) return `${g.toFixed(2)}x Earth`;
  if (g < 10) return `${g.toFixed(1)}x Earth`;
  return `${g.toFixed(0)}x Earth`;
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

  const sourceLinkStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 14,
    fontWeight: 300,
    lineHeight: 1.8,
    textDecoration: 'none',
    borderBottom: `1px solid rgba(${accentRgb},0.24)`,
  };
  const liveLinkStyle: React.CSSProperties = {
    ...sourceLinkStyle,
    color: `rgba(${accentRgb},0.78)`,
  };

  const licenseNotes = [
    { label: 'HYG star catalog · CC BY-SA 4.0', href: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    { label: 'd3-celestial constellations · BSD-3-Clause', href: 'https://github.com/ofrohn/d3-celestial/blob/master/LICENSE' },
    { label: 'Solar System Scope textures · CC BY 4.0', href: 'https://creativecommons.org/licenses/by/4.0/' },
  ] as const;

  const catalogSources = [
    { label: '41,119 stars · HYG Database', href: 'https://astronexus.com/projects/hyg' },
    { label: '88 constellations · IAU / d3-celestial', href: 'https://github.com/ofrohn/d3-celestial' },
    { label: '8 planets + 3 dwarf planets · JPL Horizons', href: 'https://ssd.jpl.nasa.gov/horizons/' },
    { label: '32 moons · JPL Horizons', href: 'https://ssd.jpl.nasa.gov/horizons/' },
    { label: '5,000 main-belt asteroids · synthetic Kirkwood model', href: 'https://en.wikipedia.org/wiki/Kirkwood_gap' },
    { label: '2,000 distant objects · MPC Distant.txt', href: 'https://minorplanetcenter.net/iau/MPCORB.html' },
    { label: '20+ comets · MPC CometEls.txt', href: 'https://minorplanetcenter.net/iau/Ephemerides/Comets/Soft03Cmt.txt' },
    { label: '14 meteor showers · IAU Meteor Data Center', href: 'https://www.ta3.sk/IAUC22DB/MDC2007/' },
    { label: '5 spacecraft · NASA/JPL mission tracking', href: 'https://eyes.nasa.gov/apps/solar-system/#/home' },
    { label: '2K/4K textures · Solar System Scope (CC BY 4.0)', href: 'https://www.solarsystemscope.com/textures/' },
  ] as const;
  const liveSources = [
    { label: 'Near-Earth objects · NASA NeoWs API', href: 'https://api.nasa.gov/' },
    { label: 'Asteroid orbits · JPL Small-Body Database', href: 'https://ssd-api.jpl.nasa.gov/doc/sbdb.html' },
    { label: 'Solar wind · NOAA SWPC', href: 'https://services.swpc.noaa.gov/' },
    { label: 'Satellite TLEs · CelesTrak', href: 'https://celestrak.org/NORAD/elements/' },
  ] as const;

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
        style={{ maxWidth: 360, width: '100%', position: 'relative' }}
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Close about dialog"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 22,
            fontFamily: 'inherit',
            padding: '4px 8px',
            minWidth: 44,
            minHeight: 44,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span aria-hidden="true">{'\u00d7'}</span>
        </button>
        <h2 id="about-dialog-title" style={{ color: '#fff', fontSize: 22, fontWeight: 300, letterSpacing: 6, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16, margin: 0 }}>About</h2>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 16, marginBottom: 20 }}>Real data. Real time.</div>

        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Catalog Data</div>
        {catalogSources.map((source) => (
          <div key={source.label}>
            <a href={source.href} target="_blank" rel="noopener noreferrer" style={sourceLinkStyle}>
              {source.label}
            </a>
          </div>
        ))}

        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 }}>Live Data</div>
        {liveSources.map((source) => (
          <div key={source.label}>
            <a href={source.href} target="_blank" rel="noopener noreferrer" style={liveLinkStyle}>
              {source.label}
            </a>
          </div>
        ))}

        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 }}>Licenses</div>
        {licenseNotes.map((source) => (
          <div key={source.label}>
            <a href={source.href} target="_blank" rel="noopener noreferrer" style={sourceLinkStyle}>
              {source.label}
            </a>
          </div>
        ))}

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <a href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noopener noreferrer" style={liveLinkStyle}>
            Privacy policy
          </a>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a href="https://lukesteuber.com" target="_blank" rel="noopener noreferrer" style={{ color: accent, fontSize: 14, textDecoration: 'none', fontWeight: 400 }}>lukesteuber.com</a>
          <a href="https://datapoems.io" target="_blank" rel="noopener noreferrer" style={{ color: accent, fontSize: 14, textDecoration: 'none', fontWeight: 400 }}>datapoems.io</a>
        </div>

      </div>
    </div>
  );
}

// ─── Keyboard shortcuts sheet ──────────────────────────────────────────────────

const SHORTCUTS: ReadonlyArray<{ keys: string; label: string }> = [
  { keys: 'F', label: 'Cinematic tour' },
  { keys: 'G', label: 'Sky / constellation mode' },
  { keys: 'Space', label: 'Play / pause time' },
  { keys: '1 – =', label: 'Jump to a scale preset' },
  { keys: 'M', label: 'Toggle the side drawer' },
  { keys: 'Esc', label: 'Back / clear selection' },
  { keys: 'N · D', label: 'Near-Earth objects · dwarf planets' },
  { keys: 'S · L · A', label: 'Stars · constellation lines · asterisms' },
  { keys: 'C · R · I', label: 'Comets · meteor showers · satellites' },
  { keys: 'O', label: 'Deep space (spacecraft, galaxies)' },
];

function ShortcutsSheet({ open, onClose, accent, accentRgb }: {
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
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); prevFocus?.focus?.(); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: Z.modal,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: `blur(${BLUR.card}px)`, WebkitBackdropFilter: `blur(${BLUR.card}px)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, overflow: 'auto',
        fontFamily: "'Cormorant Garamond','Garamond','Baskerville','Georgia',serif",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-dialog-title"
        onClick={e => e.stopPropagation()}
        style={{ ...bokehCard, maxWidth: 380, width: '100%', position: 'relative', padding: '24px 26px' }}
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Close keyboard shortcuts"
          style={{
            position: 'absolute', top: 14, right: 16,
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
            fontSize: 22, lineHeight: 1, cursor: 'pointer',
          }}
        >
          ×
        </button>
        <h2
          id="shortcuts-dialog-title"
          style={{ margin: '0 0 16px', color: accent, fontSize: 20, fontWeight: 500, letterSpacing: 1 }}
        >
          Keyboard shortcuts
        </h2>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 16, rowGap: 9 }}>
          {SHORTCUTS.map(s => (
            <Fragment key={s.keys}>
              <dt style={{
                color: `rgba(${accentRgb},0.92)`, fontSize: 14, fontWeight: 500,
                whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
              }}>
                {s.keys}
              </dt>
              <dd style={{ margin: 0, color: 'rgba(255,255,255,0.74)', fontSize: 14, fontWeight: 300 }}>
                {s.label}
              </dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </div>
  );
}

// ─── Info panel — floating bokehCard for clicked sky / spacecraft objects ──────

// Shared left-edge readout for selected sky objects \u2014 same quiet, transparent
// container as BodyStats (no bottom modal). Title + subtitle + description and
// optional children (stat rows).
const infoShadow = '0 1px 10px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)';
function InfoPanel({
  sectionTitle, title, subtitle, description, accentRgb, mobile, onClose, closeLabel, children,
}: {
  sectionTitle: string; title: string; subtitle: string; description: string;
  accent?: string; accentRgb: string; mobile: boolean;
  onClose: () => void; closeLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={`${title} details`}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      style={{
        position: 'fixed', zIndex: Z.dialog, pointerEvents: 'auto',
        left: mobile ? 'calc(env(safe-area-inset-left,0px) + 14px)' : 'calc(env(safe-area-inset-left,0px) + 26px)',
        top: mobile ? 'calc(env(safe-area-inset-top,0px) + 64px)' : '50%',
        transform: mobile ? 'none' : 'translateY(-50%)',
        maxWidth: mobile ? '70vw' : 290, maxHeight: mobile ? '62vh' : 'calc(100vh - 80px)', overflowY: 'auto',
        padding: mobile ? '14px 16px' : '18px 20px',
        background: 'rgba(8,11,22,0.42)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        fontFamily: "'Cormorant Garamond','Garamond','Georgia',serif",
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ color: `rgba(${accentRgb},0.85)`, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', textShadow: infoShadow }}>{sectionTitle}</div>
        <Btn onClick={onClose} label={closeLabel}>{'\u00d7'}</Btn>
      </div>
      <div style={{ color: '#fff', fontSize: mobile ? 24 : 30, fontWeight: 400, letterSpacing: 1, marginTop: 2, textShadow: infoShadow }}>{title}</div>
      {subtitle && (
        <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, fontStyle: 'italic', marginTop: 2, letterSpacing: 0.5, textShadow: infoShadow }}>{subtitle}</div>
      )}
      {description && (
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 300, marginTop: 12, lineHeight: 1.55, fontStyle: 'italic', textShadow: infoShadow }}>{description}</div>
      )}
      {children}
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
  selConstellation: string | null; setSelConstellation: (id: string | null) => void;
  selAsterism: string | null; setSelAsterism: (name: string | null) => void;
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
  selSun: boolean;
  selSpacecraft: import('../data/deepspace').Spacecraft | null;
  setSelSpacecraft: (s: import('../data/deepspace').Spacecraft | null) => void;
  selNearStar: NearStar | null;
  setSelNearStar: (s: NearStar | null) => void;
  selGalaxy: GalaxyMarker | null;
  setSelGalaxy: (g: GalaxyMarker | null) => void;
  currentAreaLabel: string;
  onRandomJump: () => void;
  onStartCinematic: () => void;
}

export default function Panels(props: PanelProps) {
  const {
    simTime: _simTime, moon, solarWind, speed: _speed,
    selPlanet, setSelPlanet: _setSelPlanet, neos: _neos, neoStatus, selNeo, setSelNeo,
    showNeo,
    setShowNeo: _setShowNeo,
    setShowDwarf: _setShowDwarf,
    showStars: _showStars, setShowStars: _setShowStars,
    showConstellations: _showConstellations, setShowConstellations: _setShowConstellations,
    setShowAsterisms: _setShowAsterisms,
    setConstellationFocus: _setConstellationFocus,
    setShowAsteroidBelt: _setShowAsteroidBelt,
    setShowComets: _setShowComets,
    setShowMeteors: _setShowMeteors,
    setShowSatellites: _setShowSatellites,
    selConstellation, setSelConstellation,
    selAsterism, setSelAsterism,
    panelOpen: _panelOpen, setPanelOpen: _setPanelOpen,
    cinematic,
    navStack,
    selMoonIdx, cameraDistance,
    selComet, selMeteor, selSatellite,
    setShowDeepSpace: _setShowDeepSpace,
    selSun,
    selSpacecraft, setSelSpacecraft,
    selNearStar, setSelNearStar,
    selGalaxy, setSelGalaxy,
    currentAreaLabel,
  } = props;
  void _setShowNeo; void _simTime; void _speed; void _setSelPlanet; void _neos; void _setShowDwarf; void _showStars; void _showConstellations;
  void _setShowAsterisms; void _setShowAsteroidBelt; void _setShowComets;
  void _setShowMeteors; void _setShowSatellites;
  void _panelOpen; void _setPanelOpen; void _setShowDeepSpace;
  void _setShowStars; void _setShowConstellations; void _setConstellationFocus;

  const observatoryMode = OBSERVATORY_MODE;
  const { theme } = useTheme();
  const accent = theme.uiAccent;
  const accentRgb = theme.uiAccentRgb;
  const mobile = useIsMobile();
  const [showInfo, setShowInfo] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Pale Blue Dot: a single quiet Sagan caption the first time you pull the
  // camera far enough out that the planets become a speck. Earned, not nagged —
  // fires once per session, auto-dismisses, never blocks input.
  const [paleBlueDot, setPaleBlueDot] = useState(false);
  const paleBlueShownRef = useRef(false);
  useEffect(() => {
    if (paleBlueShownRef.current || observatoryMode || cameraDistance <= 5000) return;
    paleBlueShownRef.current = true;
    // Defer past the synchronous effect body (avoids cascading-render lint and
    // lets the fade-in animation mount cleanly).
    const show = window.setTimeout(() => setPaleBlueDot(true), 0);
    const hide = window.setTimeout(() => setPaleBlueDot(false), 9000);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, [cameraDistance, observatoryMode]);
  // The Solar Arc + '?' shortcut open these dialogs via window events.
  useEffect(() => {
    const toggleShortcuts = () => setShowShortcuts(s => !s);
    const openInfo = () => setShowInfo(true);
    window.addEventListener('orrery:toggle-shortcuts', toggleShortcuts);
    window.addEventListener('orrery:open-info', openInfo);
    return () => {
      window.removeEventListener('orrery:toggle-shortcuts', toggleShortcuts);
      window.removeEventListener('orrery:open-info', openInfo);
    };
  }, []);
  const sp = selPlanet !== null ? ALL_BODIES[selPlanet] : null;

  // Selected moon info
  const selectedMoon = selPlanet !== null && selMoonIdx !== null
    ? getMoonsForPlanet(selPlanet)[selMoonIdx]
    : null;
  const planetStats = !selectedMoon && sp ? [
    { label: 'Type', value: sp.type },
    { label: 'Moons', value: String(sp.moons) },
    { label: 'Period', value: formatEarthRelativePeriod(sp.period) },
    { label: 'Gravity', value: formatEarthRelativeGravity(sp.gravity) },
    sp.surfaceTemp ? { label: 'Temp', value: sp.surfaceTemp } : null,
    // Distance kept in the least-prominent slot per UX request.
    { label: 'Distance', value: `${sp.distAU} AU` },
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

      {selNearStar && !cinematic && (
        <InfoPanel
          sectionTitle="Nearby Star"
          title={selNearStar.name}
          subtitle={`${(selNearStar.distPC * 3.262).toFixed(1)} ly \u00b7 ${selNearStar.spectral}`}
          description=""
          accent={accent}
          accentRgb={accentRgb}
          mobile={mobile}
          onClose={() => setSelNearStar(null)}
          closeLabel="Close nearby star info"
        >
          <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>
            Apparent magnitude <span style={{ color: '#fff' }}>{selNearStar.mag.toFixed(2)}</span>
          </div>
        </InfoPanel>
      )}

      {selGalaxy && !cinematic && (
        <InfoPanel
          sectionTitle="Galaxy Marker"
          title={selGalaxy.name}
          subtitle={`${selGalaxy.type} \u00b7 ${selGalaxy.distKpc >= 100 ? `${(selGalaxy.distKpc / 1000).toFixed(1)} Mpc` : `${selGalaxy.distKpc} kpc`}`}
          description=""
          accent={accent}
          accentRgb={accentRgb}
          mobile={mobile}
          onClose={() => setSelGalaxy(null)}
          closeLabel="Close galaxy info"
        >
          {selGalaxy.mag !== null && (
            <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>
              Apparent magnitude <span style={{ color: '#fff' }}>{selGalaxy.mag.toFixed(1)}</span>
            </div>
          )}
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
      {!cinematic && !observatoryMode && (selSun || sp || selectedMoon) && (
        <BodyStats
          name={selectedMoon ? selectedMoon.name : selSun ? 'Sun' : sp!.name}
          subtitle={selectedMoon ? `Moon of ${sp!.name}` : selSun ? 'G-type main-sequence star (Sol)' : sp!.type}
          color={selectedMoon ? selectedMoon.color : selSun ? '#ffca74' : sp!.color}
          stats={selectedMoon ? moonStats : selSun ? [
            { label: 'Type', value: 'G2V' },
            { label: 'Radius', value: '695,700 km' },
            { label: 'Mass', value: '1.989e30 kg' },
            { label: 'Surface', value: '5,778 K' },
          ] : planetStats}
          accent={accent}
          accentRgb={accentRgb}
          onBack={props.navigateBack}
          mobile={mobile}
        />
      )}

      {showNeo && neoStatus === 'error' && !cinematic && (
        <div
          role="status"
          style={{
            position: 'absolute', bottom: mobile ? 120 : 108, left: '50%', transform: 'translateX(-50%)',
            ...bokehCard, padding: '10px 16px', zIndex: Z.controls, maxWidth: 360, textAlign: 'center',
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 300 }}>
            Near-Earth object feed unavailable. Check your connection or try again later.
          </div>
        </div>
      )}

      {/* ── Selected NEO detail (hidden during cinematic tour) ── */}
      {selNeo && !cinematic && (
        <div
          role="region"
          aria-label={`${selNeo.name} details`}
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          style={{
            position: 'fixed', zIndex: Z.dialog, pointerEvents: 'auto',
            left: mobile ? 'calc(env(safe-area-inset-left,0px) + 14px)' : 'calc(env(safe-area-inset-left,0px) + 26px)',
            top: mobile ? 'calc(env(safe-area-inset-top,0px) + 64px)' : '50%',
            transform: mobile ? 'none' : 'translateY(-50%)',
            maxWidth: mobile ? '74vw' : 300, maxHeight: mobile ? '62vh' : 'calc(100vh - 80px)', overflowY: 'auto',
            padding: mobile ? '14px 16px' : '18px 20px',
            background: 'rgba(8,11,22,0.42)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            fontFamily: "'Cormorant Garamond','Garamond','Georgia',serif",
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#fff', fontSize: mobile ? 22 : 27, fontWeight: 400, letterSpacing: 0.8, textShadow: infoShadow }}>{selNeo.name}</span>
            <Btn onClick={() => setSelNeo(null)} label="Close NEO details">{'\u2715'}</Btn>
          </div>
          {selNeo.hazardous && (
            <div style={{ color: '#ff6a6a', fontSize: 10, letterSpacing: 1.5, marginTop: 2, textTransform: 'uppercase', fontWeight: 400, textShadow: infoShadow }}>Potentially Hazardous</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 10 }}>
            <Stat label="Diameter" val={`${Math.round(selNeo.dMin)}\u2013${Math.round(selNeo.dMax)} m`} />
            <Stat label="Miss distance" val={`${selNeo.missLunar.toFixed(1)} LD`} />
            <Stat label="Velocity" val={`${selNeo.velKms.toFixed(1)} km/s`} />
            <Stat label="Close approach" val={selNeo.date} />
            {selNeo.orbit?.loaded && !selNeo.orbit.synthetic && (
              <>
                <Stat label="Semi-major axis" val={`${selNeo.orbit.a.toFixed(3)} AU`} c={accent} />
                <Stat label="Eccentricity" val={selNeo.orbit.e.toFixed(4)} c={accent} />
                <Stat label="Inclination" val={`${selNeo.orbit.i.toFixed(2)}\u00b0`} c={accent} />
                <Stat label="Orbit shown" val="in scene" c={accent} />
              </>
            )}
            {selNeo.orbit?.loaded && selNeo.orbit.synthetic && (
              <div style={{ gridColumn: '1/-1', color: 'rgba(255,200,120,0.9)', fontSize: 11, fontStyle: 'italic', lineHeight: 1.4 }}>
                Approximate orbit — JPL SBDB unavailable
              </div>
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

      {!cinematic && currentAreaLabel && (
        <div
          aria-live="polite"
          style={{
            position: 'absolute',
            top: safeAreaTop(18),
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: Z.hud,
            pointerEvents: 'none',
            color: 'rgba(255,255,255,0.66)',
            fontSize: mobile ? 11 : 12,
            letterSpacing: 2.6,
            textTransform: 'uppercase',
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
            textShadow: '0 0 8px rgba(0,0,0,0.65)',
          }}
        >
          {currentAreaLabel}
        </div>
      )}

      {/* HUD chips retired — all controls now live in the summoned Solar Arc
          (rendered by Orrery). The About / Shortcuts dialogs below open via the
          'orrery:open-info' / 'orrery:toggle-shortcuts' window events. */}

      {/* ── About dialog ── */}
      <AboutDialog
        open={showInfo}
        onClose={() => setShowInfo(false)}
        accent={accent}
        accentRgb={accentRgb}
      />
      <ShortcutsSheet
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        accent={accent}
        accentRgb={accentRgb}
      />
      {/* ── Pale Blue Dot (deep zoom-out reward) ── */}
      {paleBlueDot && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)',
            transform: 'translateX(-50%)',
            zIndex: Z.controls,
            maxWidth: 'min(78vw, 520px)',
            textAlign: 'center',
            pointerEvents: 'none',
            color: 'rgba(255,255,255,0.82)',
            textShadow: '0 0 12px rgba(0,0,0,0.8)',
            animation: PREFERS_REDUCED_MOTION ? undefined : 'orrery-fade-in 1.4s ease both',
          }}
        >
          <p style={{ margin: 0, fontSize: mobile ? 16 : 19, fontStyle: 'italic', lineHeight: 1.5 }}>
            That&rsquo;s here. That&rsquo;s home. A mote of dust suspended in a sunbeam.
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: `rgba(${accentRgb},0.7)` }}>
            Carl Sagan · Pale Blue Dot
          </p>
        </div>
      )}

      {/* ── Screen reader announcements ── */}
      <div aria-live="polite" className="sr-only" role="status">
        {selSun ? 'Selected Sun.' : ''}
        {sp ? `Selected ${sp.name}, ${sp.type}.` : ''}
        {selectedMoon ? `Selected moon ${selectedMoon.name}.` : ''}
        {selNeo ? `Selected asteroid ${selNeo.name}. Miss distance: ${selNeo.missLunar.toFixed(1)} lunar distances.` : ''}
        {selComet ? `Selected comet ${selComet.name}. Perihelion: ${selComet.q.toFixed(3)} AU.` : ''}
        {selMeteor ? `Selected meteor shower ${selMeteor.name}. Velocity: ${selMeteor.vg.toFixed(1)} km per second.` : ''}
        {selSatellite ? `Selected satellite ${selSatellite.name}. Altitude: ${selSatellite.alt.toFixed(0)} km.` : ''}
        {selSpacecraft ? `Selected spacecraft ${selSpacecraft.name}. Distance: ${selSpacecraft.distAU} AU.` : ''}
        {selNearStar ? `Selected nearby star ${selNearStar.name}.` : ''}
        {selGalaxy ? `Selected galaxy marker ${selGalaxy.name}.` : ''}
        {navStack.length > 1 ? `Navigated to ${navStack[navStack.length - 1]}` : ''}
      </div>
    </>
  );
}
