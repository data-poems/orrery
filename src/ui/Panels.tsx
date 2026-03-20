/*
 * All HUD panels — overlay UI for the orrery
 *
 * Responsive: adapts to mobile (iPhone/Android) with larger touch targets,
 * bottom sheets, and safe-area insets.
 *
 * Theme-aware: all accent colors come from the active theme.
 */

import type { NEO, CamPreset, FocusTarget } from '../lib/kepler';
import { ALL_BODIES } from '../data/planets';
import { useTheme } from '../lib/themes';
import { glass, useIsMobile } from './styles';

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

// ─── Panel props ────────────────────────────────────────────────────────────────

export interface PanelProps {
  simTime: Date;
  moon: { name: string; emoji: string; ill: number };
  speed: number; setSpeed: (fn: (s: number) => number) => void;
  playing: boolean; setPlaying: (fn: (p: boolean) => boolean) => void;
  camIdx: number; setCamIdx: (i: number) => void;
  cams: CamPreset[];
  focusTarget: FocusTarget | null; setFocusTarget: (f: FocusTarget | null) => void;
  selPlanet: number | null; setSelPlanet: (i: number | null) => void;
  neos: NEO[]; selNeo: NEO | null; setSelNeo: (n: NEO | null) => void;
  showNeo: boolean; setShowNeo: (fn: (p: boolean) => boolean) => void;
  showHud: boolean; setShowHud: (fn: (p: boolean) => boolean) => void;
  showDwarf: boolean; setShowDwarf: (fn: (p: boolean) => boolean) => void;
  showStars: boolean; setShowStars: (fn: (p: boolean) => boolean) => void;
  showConstellations: boolean; setShowConstellations: (fn: (p: boolean) => boolean) => void;
  showPlanetList: boolean; setShowPlanetList: (fn: (p: boolean) => boolean) => void;
  setSimTime: (fn: (d: Date) => Date) => void;
  jd: number; T: number;
  positionsRef: React.MutableRefObject<Map<number, [number, number, number]>>;
}

export default function Panels(props: PanelProps) {
  const {
    simTime, moon, speed, setSpeed, playing, setPlaying,
    camIdx, setCamIdx, cams, focusTarget, setFocusTarget,
    selPlanet, setSelPlanet, neos, selNeo, setSelNeo,
    showNeo, setShowNeo, showHud, setShowHud,
    showDwarf, setShowDwarf,
    showStars, setShowStars,
    showConstellations, setShowConstellations,
    showPlanetList, setShowPlanetList,
    setSimTime, jd, T, positionsRef,
  } = props;

  const { theme, cycleTheme } = useTheme();
  const accent = theme.uiAccent;
  const accentRgb = theme.uiAccentRgb;
  const mobile = useIsMobile();
  const sp = selPlanet !== null ? ALL_BODIES[selPlanet] : null;

  return (
    <>
      {/* ── Top bar: date/time/moon ── */}
      <div
        role="status"
        aria-label="Simulation time"
        style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: mobile ? 8 : 12,
          ...glass, padding: mobile ? '8px 12px' : '6px 16px', zIndex: 10,
          maxWidth: mobile ? 'calc(100vw - 24px)' : 'none',
        }}
      >
        <span style={{ color: '#fff', fontSize: mobile ? 18 : 22, fontWeight: 300, letterSpacing: 3, fontFamily: "'Cormorant', serif" }}>{fmtTime(simTime)}</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: mobile ? 10 : 12, fontStyle: 'italic', fontWeight: 300 }}>{fmtDate(simTime)}</span>
        <span style={{ fontSize: mobile ? 13 : 15 }}>{moon.emoji}</span>
        {!mobile && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontStyle: 'italic', fontWeight: 300 }}>{moon.name} · {moon.ill}%</span>}
        {speed !== 1 && <span style={{ color: accent, fontSize: 11, fontWeight: 400 }}>{speedLabel(speed)}</span>}
      </div>

      {/* ── Camera preset pills ── */}
      <nav
        role="navigation"
        aria-label="Camera presets"
        style={{
          position: 'absolute', top: mobile ? 52 : 56,
          left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 3, zIndex: 10,
          maxWidth: mobile ? 'calc(100vw - 24px)' : 'none',
          overflowX: mobile ? 'auto' : 'visible',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        {cams.map((c, i) => (
          <button
            key={c.key}
            aria-label={`Camera: ${c.label}`}
            aria-pressed={camIdx === i && !focusTarget}
            onClick={() => { setCamIdx(i); setFocusTarget(null); setSelPlanet(null); }}
            style={{
              ...glass, padding: mobile ? '8px 12px' : '4px 10px',
              fontSize: mobile ? 12 : 11, cursor: 'pointer', fontFamily: 'inherit',
              whiteSpace: 'nowrap', fontWeight: 400, letterSpacing: 0.5,
              minHeight: mobile ? 44 : 'auto',
              color: camIdx === i && !focusTarget ? accent : 'rgba(255,255,255,0.4)',
              borderColor: camIdx === i && !focusTarget ? `rgba(${accentRgb},0.4)` : 'rgba(255,255,255,0.07)',
              background: camIdx === i && !focusTarget ? `rgba(${accentRgb},0.1)` : 'rgba(0,0,0,0.5)',
              transition: 'all 0.15s',
            }}
          >
            {c.key} {c.label}
          </button>
        ))}
        {focusTarget !== null && (
          <button
            aria-label={`Focused on ${ALL_BODIES[focusTarget.planetIdx].name}. Click to release.`}
            onClick={() => { setFocusTarget(null); setSelPlanet(null); }}
            style={{ ...glass, padding: mobile ? '8px 12px' : '4px 10px', fontSize: mobile ? 12 : 11, cursor: 'pointer', fontFamily: 'inherit', color: accent, borderColor: `rgba(${accentRgb},0.4)`, background: `rgba(${accentRgb},0.1)`, minHeight: mobile ? 44 : 'auto', whiteSpace: 'nowrap' }}
          >
            {ALL_BODIES[focusTarget.planetIdx].name} {'\u2715'}
          </button>
        )}
      </nav>

      {/* ── Time controls (bottom center) ── */}
      <div
        role="toolbar"
        aria-label="Simulation speed controls"
        style={{
          position: 'absolute', bottom: mobile ? 20 : 14,
          left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 4,
          ...glass, padding: mobile ? '8px 16px' : '5px 12px', zIndex: 10,
          paddingBottom: mobile ? 'max(8px, env(safe-area-inset-bottom))' : '5px',
        }}
      >
        <Btn onClick={() => setSpeed(s => Math.max(1, s / 10))} label="Slow down" style={{ fontSize: 11, fontStyle: 'italic' }}>slower</Btn>
        <Btn
          onClick={() => setPlaying(p => !p)}
          label={playing ? 'Pause simulation' : 'Resume simulation'}
          style={{ color: playing ? accent : '#ff6644', fontSize: 14, padding: '0 8px', fontWeight: 600 }}
        >
          {playing ? 'II' : '\u25b6'}
        </Btn>
        <Btn onClick={() => setSpeed(s => Math.min(86400 * 365, s * 10))} label="Speed up" style={{ fontSize: 11, fontStyle: 'italic' }}>faster</Btn>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: mobile ? 12 : 11, minWidth: 56, textAlign: 'center', fontWeight: 300 }}>
          {speedLabel(speed)}
        </span>
        <Btn onClick={() => { setSimTime(() => new Date()); setSpeed(() => 1); }} style={{ color: '#ffcc44', marginLeft: 4 }} label="Reset to current time">NOW</Btn>
      </div>

      {/* ── Toggle buttons (bottom right) ── */}
      <div
        role="toolbar"
        aria-label="Display toggles"
        style={{
          position: 'absolute', bottom: mobile ? 20 : 14, right: mobile ? 8 : 14,
          display: 'flex', gap: 3, zIndex: 10,
          flexWrap: 'wrap', justifyContent: 'flex-end',
          paddingBottom: mobile ? 'env(safe-area-inset-bottom)' : 0,
        }}
      >
        {[
          { l: 'HUD', on: showHud, fn: () => setShowHud(p => !p), a: 'Toggle simulation HUD' },
          { l: 'NEO', on: showNeo, fn: () => setShowNeo(p => !p), a: 'Toggle near-Earth objects panel' },
          { l: 'DWF', on: showDwarf, fn: () => setShowDwarf(p => !p), a: 'Toggle dwarf planets' },
          { l: 'STR', on: showStars, fn: () => setShowStars(p => !p), a: 'Toggle star field' },
          { l: 'CON', on: showConstellations, fn: () => setShowConstellations(p => !p), a: 'Toggle constellation lines' },
          { l: theme.name.slice(0, 3).toUpperCase(), on: false, fn: cycleTheme, a: `Theme: ${theme.name}. Click to cycle.` },
          { l: '\u26f6', on: false, fn: () => document.documentElement.requestFullscreen?.(), a: 'Toggle fullscreen' },
        ].map(b => (
          <button
            key={b.l}
            onClick={b.fn}
            aria-label={b.a}
            aria-pressed={'on' in b ? b.on : undefined}
            style={{
              ...glass,
              padding: mobile ? '10px 14px' : '5px 10px',
              fontSize: mobile ? 12 : 11,
              cursor: 'pointer', fontFamily: 'inherit',
              minWidth: mobile ? 44 : 'auto',
              minHeight: mobile ? 44 : 'auto',
              color: b.on ? accent : 'rgba(255,255,255,0.35)',
              borderColor: b.on ? `rgba(${accentRgb},0.35)` : 'rgba(255,255,255,0.07)',
              background: b.on ? `rgba(${accentRgb},0.08)` : 'rgba(0,0,0,0.5)',
              transition: 'all 0.15s',
            }}
          >
            {b.l}
          </button>
        ))}
      </div>

      {/* ── Planet list panel ── */}
      {showPlanetList && (
        <div
          role="navigation"
          aria-label="Planet list"
          style={{
            position: 'absolute',
            ...(mobile
              ? { left: 0, right: 0, bottom: 0, top: 'auto', maxHeight: '50vh', borderRadius: '12px 12px 0 0' }
              : { top: 96, left: 14, width: 180 }),
            ...glass, padding: '10px 10px', zIndex: 20,
            overflowY: 'auto',
            paddingBottom: mobile ? 'max(10px, env(safe-area-inset-bottom))' : '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 300 }}>Bodies</span>
            <Btn onClick={() => setShowPlanetList(p => !p)} label="Close planet list">{'\u2715'}</Btn>
          </div>
          {ALL_BODIES.map((body, idx) => (
            <button
              key={body.name}
              onClick={() => { setSelPlanet(idx); setShowPlanetList(() => false); }}
              aria-label={`Focus on ${body.name}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: mobile ? '10px 8px' : '5px 8px',
                background: selPlanet === idx ? `rgba(${accentRgb},0.07)` : 'transparent',
                border: selPlanet === idx ? `1px solid rgba(${accentRgb},0.2)` : '1px solid transparent',
                borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
                minHeight: mobile ? 44 : 'auto',
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: body.color, flexShrink: 0,
              }} />
              <span style={{ color: '#fff', fontSize: mobile ? 12 : 11, textAlign: 'left' }}>
                {body.name}
              </span>
              {body.isDwarf && (
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 8, marginLeft: 'auto', fontStyle: 'italic' }}>dwarf</span>
              )}
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, marginLeft: body.isDwarf ? 0 : 'auto' }}>
                {body.distAU} AU
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Selected planet info card ── */}
      {sp && !showPlanetList && (
        <div
          role="dialog"
          aria-label={`${sp.name} information`}
          style={{
            position: 'absolute',
            ...(mobile
              ? { bottom: 80, left: 8, right: 8, width: 'auto', maxHeight: '40vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }
              : { top: 96, left: 14, width: 205 }),
            ...glass, padding: '12px 14px', zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 600, letterSpacing: 1.5 }}>{sp.name}</span>
            {sp.isDwarf && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, border: '1px solid rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: 2, fontStyle: 'italic', fontWeight: 300, letterSpacing: 1 }}>dwarf</span>}
            <Btn onClick={() => { setSelPlanet(null); setFocusTarget(null); }} label="Close planet info">{'\u2715'}</Btn>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, lineHeight: 1.6, marginBottom: 8, fontStyle: 'italic', fontWeight: 300 }}>{sp.desc}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
            <Stat label="Type" val={sp.type} />
            <Stat label="Moons" val={sp.moons} />
            <Stat label="Distance" val={`${sp.distAU} AU`} />
            <Stat label="Period" val={`${(sp.period / 365.25).toFixed(2)} yr`} />
            <Stat label="Eccentricity" val={sp.e.toFixed(4)} />
            <Stat label="Inclination" val={`${sp.I.toFixed(2)}\u00b0`} />
            <Stat label="Gravity" val={sp.gravity} />
            <Stat label="Temp" val={sp.surfaceTemp} />
          </div>
          <button
            onClick={() => {
              const pos = positionsRef.current.get(selPlanet!);
              setFocusTarget(focusTarget?.planetIdx === selPlanet ? null : { planetIdx: selPlanet!, pos: pos || [0, 0, 0] });
            }}
            aria-label={focusTarget?.planetIdx === selPlanet ? 'Release camera focus' : `Focus camera on ${sp.name}`}
            style={{
              marginTop: 10, width: '100%', padding: mobile ? '10px 0' : '6px 0', fontSize: 11, cursor: 'pointer',
              fontFamily: 'inherit', borderRadius: 3, border: `1px solid rgba(${accentRgb},0.3)`,
              background: focusTarget?.planetIdx === selPlanet ? `rgba(${accentRgb},0.15)` : 'transparent',
              color: accent, transition: 'all 0.15s',
              minHeight: mobile ? 44 : 'auto',
            }}
          >
            {focusTarget?.planetIdx === selPlanet ? 'Focused \u2014 tap to release' : 'Focus Camera'}
          </button>
        </div>
      )}

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
          <span style={{ color: accent, fontSize: 11 }}>{neos.length} today</span>
        </div>
        {neos.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', marginTop: 20, fontStyle: 'italic' }}>Loading NASA data{'\u2026'}</div>
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
              {neo.missLunar.toFixed(1)} LD · {neo.velKms.toFixed(1)} km/s · {Math.round(neo.dMin)}{'\u2013'}{Math.round(neo.dMax)} m
            </div>
          </div>
        ))}
        <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9, marginTop: 8, textAlign: 'center', fontStyle: 'italic', fontWeight: 300 }}>Source: NASA JPL NeoWs · SBDB</div>
      </div>

      {/* ── Selected NEO detail ── */}
      {selNeo && (
        <div
          role="dialog"
          aria-label={`${selNeo.name} details`}
          style={{
            position: 'absolute', bottom: mobile ? 80 : 56,
            left: '50%', transform: 'translateX(-50%)',
            ...glass, padding: '10px 16px', maxWidth: 420,
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

      {/* ── Simulation HUD ── */}
      {showHud && (
        <div
          role="region"
          aria-label="Simulation data"
          style={{ position: 'absolute', bottom: mobile ? 80 : 56, left: mobile ? 8 : 14, ...glass, padding: '10px 14px', fontSize: 11, zIndex: 15 }}
        >
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase', fontWeight: 300 }}>Simulation</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 14px' }}>
            <Stat label="Julian Date" val={jd.toFixed(2)} />
            <Stat label="T (centuries)" val={T.toFixed(4)} />
            <Stat label="Sim speed" val={speedLabel(speed)} />
            <Stat label="Moon phase" val={`${moon.name} ${moon.ill}%`} />
            <Stat label="NEOs loaded" val={neos.length} />
            <Stat label="Playing" val={playing ? 'Yes' : 'Paused'} c={playing ? accent : '#ff6644'} />
          </div>
        </div>
      )}

      {/* ── Keyboard hints (desktop only) ── */}
      {!mobile && (
        <div style={{
          position: 'absolute', bottom: 56, right: showNeo ? 264 : 14,
          color: 'rgba(255,255,255,0.12)', fontSize: 9, lineHeight: 1.8, textAlign: 'right', fontStyle: 'italic', fontWeight: 300,
          transition: 'right 0.3s', zIndex: 10,
        }}>
          <div>1{'\u2013'}8 cameras · click planet to focus · P planet list</div>
          <div>S stars · C constellations · T theme · D dwarf</div>
          <div>H hud · N neo · F fullscreen · Space pause</div>
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
        {selNeo ? `Selected asteroid ${selNeo.name}. Miss distance: ${selNeo.missLunar.toFixed(1)} lunar distances.` : ''}
      </div>
    </>
  );
}
