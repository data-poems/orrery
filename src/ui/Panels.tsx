/*
 * All HUD panels — overlay UI for the orrery
 *
 * Unified command strip: Viewpoints + Bodies + Layers in one vertical nav.
 * Responsive: mobile gets a bottom bar; desktop gets a left rail.
 * Theme-aware: all accent colors come from the active theme.
 */

import { useState } from 'react';
import type { NEO, FocusTarget, CamPreset } from '../lib/kepler';
import { ALL_BODIES } from '../data/planets';
import { getMoonsForPlanet } from '../data/moons';
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

// ─── Scale indicator ────────────────────────────────────────────────────────────

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

// ─── Section header ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      color: 'rgba(255,255,255,0.25)', fontSize: 8, letterSpacing: 2.5,
      textTransform: 'uppercase', fontWeight: 400, padding: '8px 0 4px',
      borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 4,
    }}>
      {children}
    </div>
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
  neos: NEO[]; selNeo: NEO | null; setSelNeo: (n: NEO | null) => void;
  showNeo: boolean; setShowNeo: (fn: (p: boolean) => boolean) => void;
  showDwarf: boolean; setShowDwarf: (fn: (p: boolean) => boolean) => void;
  showStars: boolean; setShowStars: (fn: (p: boolean) => boolean) => void;
  showConstellations: boolean; setShowConstellations: (fn: (p: boolean) => boolean) => void;
  showPlanetList: boolean; setShowPlanetList: (fn: (p: boolean) => boolean) => void;
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
    focusTarget, setFocusTarget,
    selPlanet, setSelPlanet, neos, selNeo, setSelNeo,
    showNeo, setShowNeo,
    showDwarf, setShowDwarf,
    showStars, setShowStars,
    showConstellations, setShowConstellations,
    positionsRef,
    cinematic,
    navStack, navigateBack,
    selMoonIdx, cameraDistance,
    cams, camIdx, onPresetSelect,
  } = props;

  const { theme, cycleTheme } = useTheme();
  const accent = theme.uiAccent;
  const accentRgb = theme.uiAccentRgb;
  const mobile = useIsMobile();
  const sp = selPlanet !== null ? ALL_BODIES[selPlanet] : null;

  // Expanded section tracking (only one open at a time on mobile)
  const [expandedSection, setExpandedSection] = useState<'views' | 'bodies' | 'layers' | null>(null);

  // Selected moon info
  const selectedMoon = selPlanet !== null && selMoonIdx !== null
    ? getMoonsForPlanet(selPlanet)[selMoonIdx]
    : null;

  // Moons for selected planet
  const moons = selPlanet !== null ? getMoonsForPlanet(selPlanet) : [];

  const toggleSection = (s: 'views' | 'bodies' | 'layers') => {
    setExpandedSection(prev => prev === s ? null : s);
  };

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

  // ─── Layer toggle item ─────────────────────────────────────────────────────
  const LayerToggle = ({ label, shortcut, on, onToggle, ariaLabel }: {
    label: string; shortcut?: string; on: boolean; onToggle: () => void; ariaLabel: string;
  }) => (
    <button
      onClick={onToggle}
      aria-label={ariaLabel}
      aria-pressed={on}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: mobile ? '8px 6px' : '4px 6px',
        background: 'transparent', border: 'none',
        cursor: 'pointer', fontFamily: 'inherit',
        minHeight: mobile ? 40 : 'auto',
      }}
    >
      <span style={{
        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
        border: `1px solid ${on ? `rgba(${accentRgb},0.5)` : 'rgba(255,255,255,0.15)'}`,
        background: on ? `rgba(${accentRgb},0.15)` : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
        fontSize: 9, color: accent, lineHeight: 1,
      }}>
        {on ? '\u2713' : ''}
      </span>
      <span style={{ color: on ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 300, flex: 1, textAlign: 'left' }}>
        {label}
      </span>
      {shortcut && !mobile && (
        <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 9, fontStyle: 'italic' }}>{shortcut}</span>
      )}
    </button>
  );

  // ─── Body item ─────────────────────────────────────────────────────────────
  const BodyItem = ({ body, idx }: { body: typeof ALL_BODIES[0]; idx: number }) => {
    const isSelected = selPlanet === idx;
    const bodyMoons = getMoonsForPlanet(idx);
    return (
      <div>
        <button
          onClick={() => setSelPlanet(idx)}
          aria-label={`Focus on ${body.name}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: mobile ? '8px 6px' : '4px 6px',
            background: isSelected ? `rgba(${accentRgb},0.07)` : 'transparent',
            border: 'none',
            borderLeft: isSelected ? `2px solid ${accent}` : '2px solid transparent',
            cursor: 'pointer', fontFamily: 'inherit',
            minHeight: mobile ? 40 : 'auto',
            transition: 'all 0.15s',
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: body.color, flexShrink: 0,
          }} />
          <span style={{
            color: isSelected ? '#fff' : 'rgba(255,255,255,0.5)',
            fontSize: 11, fontWeight: isSelected ? 500 : 300, textAlign: 'left',
            flex: 1,
          }}>
            {body.name}
          </span>
          {body.isDwarf && (
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 8, fontStyle: 'italic' }}>dwf</span>
          )}
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>{body.distAU}</span>
        </button>
        {/* Inline moon list when planet is selected */}
        {isSelected && bodyMoons.length > 0 && (
          <div style={{ paddingLeft: 20 }}>
            {bodyMoons.map((m, mIdx) => (
              <button
                key={m.name}
                onClick={(e) => {
                  e.stopPropagation();
                  if (props.onMoonSelect) props.onMoonSelect(idx, mIdx);
                }}
                aria-label={`Focus on ${m.name}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', padding: mobile ? '6px 4px' : '3px 4px',
                  background: selMoonIdx === mIdx ? `rgba(${accentRgb},0.07)` : 'transparent',
                  border: 'none',
                  borderLeft: selMoonIdx === mIdx ? `1px solid rgba(${accentRgb},0.4)` : '1px solid transparent',
                  cursor: 'pointer', fontFamily: 'inherit',
                  minHeight: mobile ? 36 : 'auto',
                  transition: 'all 0.12s',
                }}
              >
                <span style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: m.color, flexShrink: 0, opacity: 0.7,
                }} />
                <span style={{
                  color: selMoonIdx === mIdx ? accent : 'rgba(255,255,255,0.35)',
                  fontSize: 10, fontWeight: 300, fontStyle: 'italic',
                }}>
                  {m.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Preset item ───────────────────────────────────────────────────────────
  const PresetItem = ({ cam, idx }: { cam: CamPreset; idx: number }) => {
    const active = camIdx === idx && selPlanet === null;
    return (
      <button
        onClick={() => onPresetSelect(idx)}
        aria-label={`Camera: ${cam.label} (${cam.key})`}
        aria-pressed={active}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: mobile ? '8px 6px' : '4px 6px',
          background: active ? `rgba(${accentRgb},0.07)` : 'transparent',
          border: 'none',
          borderLeft: active ? `2px solid ${accent}` : '2px solid transparent',
          cursor: 'pointer', fontFamily: 'inherit',
          minHeight: mobile ? 40 : 'auto',
          transition: 'all 0.15s',
        }}
      >
        {!mobile && (
          <span style={{
            color: active ? accent : 'rgba(255,255,255,0.15)',
            fontSize: 9, fontWeight: 400, width: 10, textAlign: 'right', flexShrink: 0,
          }}>
            {cam.key}
          </span>
        )}
        <span style={{
          color: active ? '#fff' : 'rgba(255,255,255,0.45)',
          fontSize: 11, fontWeight: active ? 500 : 300, textAlign: 'left',
        }}>
          {cam.label}
        </span>
        {cam.follow !== undefined && (
          <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 8, marginLeft: 'auto', fontStyle: 'italic' }}>track</span>
        )}
        {cam.autoRotate && (
          <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 8, marginLeft: 'auto', fontStyle: 'italic' }}>auto</span>
        )}
      </button>
    );
  };

  // ─── Section toggle button ─────────────────────────────────────────────────
  const SectionToggle = ({ label, section, icon }: { label: string; section: 'views' | 'bodies' | 'layers'; icon: string }) => {
    const open = expandedSection === section;
    return (
      <button
        onClick={() => toggleSection(section)}
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          width: '100%', padding: mobile ? '10px 6px' : '6px 6px',
          background: 'transparent', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit',
          minHeight: mobile ? 44 : 'auto',
        }}
      >
        <span style={{ color: open ? accent : 'rgba(255,255,255,0.3)', fontSize: 13, width: 16, textAlign: 'center' }}>{icon}</span>
        <span style={{
          color: open ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
          fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 400, flex: 1, textAlign: 'left',
        }}>
          {label}
        </span>
        <span style={{
          color: 'rgba(255,255,255,0.15)', fontSize: 9,
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
        }}>
          {'\u203a'}
        </span>
      </button>
    );
  };

  // Visible bodies based on dwarf toggle
  const visibleBodies = showDwarf ? ALL_BODIES : ALL_BODIES.filter(b => !b.isDwarf);

  // ─── MOBILE LAYOUT ─────────────────────────────────────────────────────────
  if (mobile) {
    return (
      <>
        {/* Top bar: date/time */}
        <div
          role="status"
          aria-label="Simulation time"
          style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 8,
            ...glass, padding: '6px 12px', zIndex: 10,
            maxWidth: 'calc(100vw - 24px)',
          }}
        >
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 300, letterSpacing: 3, fontFamily: "'Cormorant', serif" }}>{fmtTime(simTime)}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontStyle: 'italic', fontWeight: 300 }}>{fmtDate(simTime)}</span>
          <span style={{ fontSize: 13 }}>{moon.emoji}</span>
          {speed !== 1 && <span style={{ color: accent, fontSize: 11, fontWeight: 400 }}>{speedLabel(speed)}</span>}
        </div>

        {/* Scale indicator */}
        <ScaleIndicator cameraDistance={cameraDistance} />

        {/* Bottom nav bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          ...glass, borderRadius: '12px 12px 0 0',
          padding: '4px 8px', paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
          zIndex: 15, display: 'flex', gap: 2,
        }}>
          <button onClick={() => toggleSection('views')} aria-label="Camera views" style={{
            flex: 1, padding: '10px 0', background: 'none', border: 'none',
            color: expandedSection === 'views' ? accent : 'rgba(255,255,255,0.35)',
            fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: 'inherit', minHeight: 44,
          }}>
            Views
          </button>
          <button onClick={() => toggleSection('bodies')} aria-label="Celestial bodies" style={{
            flex: 1, padding: '10px 0', background: 'none', border: 'none',
            color: expandedSection === 'bodies' ? accent : 'rgba(255,255,255,0.35)',
            fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: 'inherit', minHeight: 44,
          }}>
            Bodies
          </button>
          <button onClick={() => toggleSection('layers')} aria-label="Layer toggles" style={{
            flex: 1, padding: '10px 0', background: 'none', border: 'none',
            color: expandedSection === 'layers' ? accent : 'rgba(255,255,255,0.35)',
            fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: 'inherit', minHeight: 44,
          }}>
            Layers
          </button>
          <button onClick={() => setShowNeo(p => !p)} aria-label="Near-Earth objects" style={{
            flex: 1, padding: '10px 0', background: 'none', border: 'none',
            color: showNeo ? accent : 'rgba(255,255,255,0.35)',
            fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: 'inherit', minHeight: 44,
          }}>
            NEO
          </button>
          <button onClick={cycleTheme} aria-label={`Theme: ${theme.name}`} style={{
            padding: '10px 8px', background: 'none', border: 'none',
            cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center',
          }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: accent, opacity: 0.6 }} />
          </button>
        </div>

        {/* Mobile expanded panels (slide up from bottom bar) */}
        {expandedSection && (
          <div style={{
            position: 'absolute', bottom: 56, left: 0, right: 0,
            maxHeight: '50vh', overflowY: 'auto',
            ...glass, borderRadius: '12px 12px 0 0',
            padding: '8px 10px', paddingBottom: 8,
            zIndex: 14,
          }}>
            {expandedSection === 'views' && (
              <>
                {cams.map((cam, i) => <PresetItem key={cam.key} cam={cam} idx={i} />)}
                {selPlanet !== null && (
                  <button
                    onClick={() => { setSelPlanet(null); setFocusTarget(null); }}
                    style={{
                      width: '100%', padding: '8px 6px', marginTop: 4,
                      background: `rgba(${accentRgb},0.07)`, border: `1px solid rgba(${accentRgb},0.2)`,
                      borderRadius: 3, color: accent, fontSize: 11,
                      cursor: 'pointer', fontFamily: 'inherit', minHeight: 40,
                    }}
                  >
                    Release: {ALL_BODIES[selPlanet].name}
                  </button>
                )}
              </>
            )}
            {expandedSection === 'bodies' && visibleBodies.map(body => {
              const idx = ALL_BODIES.indexOf(body);
              return <BodyItem key={body.name} body={body} idx={idx} />;
            })}
            {expandedSection === 'layers' && (
              <>
                <LayerToggle label="Stars" shortcut="S" on={showStars} onToggle={() => setShowStars(p => !p)} ariaLabel="Toggle star field" />
                <LayerToggle label="Constellations" shortcut="C" on={showConstellations} onToggle={() => setShowConstellations(p => !p)} ariaLabel="Toggle constellation lines" />
                <LayerToggle label="Dwarf planets" shortcut="D" on={showDwarf} onToggle={() => setShowDwarf(p => !p)} ariaLabel="Toggle dwarf planets" />
              </>
            )}
          </div>
        )}

        {/* Mobile back button */}
        {navStack.length > 1 && (
          <button
            onClick={navigateBack}
            aria-label="Navigate back"
            style={{
              position: 'absolute', top: 48, left: 8,
              ...glass, padding: '8px 14px',
              fontSize: 18, cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)',
              minWidth: 48, minHeight: 48,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, fontFamily: 'inherit', fontWeight: 300,
            }}
          >
            {'\u2190'}
          </button>
        )}

        {/* Info cards */}
        {selectedMoon && (
          <MoonCard moon={selectedMoon} parentName={sp?.name || ''} onClose={navigateBack} mobile={mobile} />
        )}
        {sp && !selectedMoon && (
          <PlanetCard
            planet={sp} selPlanet={selPlanet!}
            focusTarget={focusTarget} setFocusTarget={setFocusTarget} setSelPlanet={setSelPlanet}
            positionsRef={positionsRef} accent={accent} accentRgb={accentRgb} mobile={mobile}
          />
        )}

        {/* NEO panel */}
        <NeoPanel
          neos={neos} selNeo={selNeo} setSelNeo={setSelNeo}
          showNeo={showNeo} setShowNeo={setShowNeo}
          accent={accent} accentRgb={accentRgb} mobile={mobile}
        />

        {/* NEO detail */}
        {selNeo && <NeoDetail neo={selNeo} setSelNeo={setSelNeo} accent={accent} accentRgb={accentRgb} mobile={mobile} />}

        {/* Title watermark */}
        <div aria-hidden="true" style={{ position: 'absolute', top: 10, left: 10, color: 'rgba(255,255,255,0.15)', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', zIndex: 5, fontWeight: 300 }}>
          Orrery
        </div>

        {/* SR announcements */}
        <SrAnnouncements sp={sp} selectedMoon={selectedMoon} selNeo={selNeo} navStack={navStack} />
      </>
    );
  }

  // ─── DESKTOP LAYOUT ────────────────────────────────────────────────────────
  return (
    <>
      {/* Top bar: date/time/moon */}
      <div
        role="status"
        aria-label="Simulation time"
        style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 12,
          ...glass, padding: '6px 16px', zIndex: 10,
        }}
      >
        <span style={{ color: '#fff', fontSize: 22, fontWeight: 300, letterSpacing: 3, fontFamily: "'Cormorant', serif" }}>{fmtTime(simTime)}</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontStyle: 'italic', fontWeight: 300 }}>{fmtDate(simTime)}</span>
        <span style={{ fontSize: 15 }}>{moon.emoji}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontStyle: 'italic', fontWeight: 300 }}>{moon.name} · {moon.ill}%</span>
        {speed !== 1 && <span style={{ color: accent, fontSize: 11, fontWeight: 400 }}>{speedLabel(speed)}</span>}
      </div>

      {/* Scale indicator */}
      <ScaleIndicator cameraDistance={cameraDistance} />

      {/* ── Left command rail ── */}
      <nav
        aria-label="Navigation"
        style={{
          position: 'absolute', top: 56, left: 12, bottom: 56,
          width: expandedSection ? 200 : 200,
          ...glass, padding: '6px 8px', zIndex: 15,
          overflowY: 'auto', overflowX: 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.08) transparent',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Viewpoints section */}
        <SectionToggle label="Viewpoints" section="views" icon={'\u2316'} />
        {expandedSection === 'views' && (
          <div style={{ padding: '0 0 4px' }}>
            {cams.map((cam, i) => <PresetItem key={cam.key} cam={cam} idx={i} />)}
            {selPlanet !== null && (
              <button
                onClick={() => { setSelPlanet(null); setFocusTarget(null); }}
                aria-label="Release camera focus"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', padding: '4px 6px', marginTop: 2,
                  background: `rgba(${accentRgb},0.07)`, border: `1px solid rgba(${accentRgb},0.2)`,
                  borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
                  color: accent, fontSize: 10,
                }}
              >
                {'\u2715'} {ALL_BODIES[selPlanet].name}
              </button>
            )}
          </div>
        )}

        {/* Bodies section */}
        <SectionToggle label="Bodies" section="bodies" icon={'\u2609'} />
        {expandedSection === 'bodies' && (
          <div style={{ padding: '0 0 4px' }}>
            <SectionLabel>Planets</SectionLabel>
            {ALL_BODIES.filter(b => !b.isDwarf).map(body => {
              const idx = ALL_BODIES.indexOf(body);
              return <BodyItem key={body.name} body={body} idx={idx} />;
            })}
            <SectionLabel>Dwarf Planets</SectionLabel>
            {ALL_BODIES.filter(b => b.isDwarf).map(body => {
              const idx = ALL_BODIES.indexOf(body);
              return <BodyItem key={body.name} body={body} idx={idx} />;
            })}
          </div>
        )}

        {/* Layers section */}
        <SectionToggle label="Layers" section="layers" icon={'\u25a1'} />
        {expandedSection === 'layers' && (
          <div style={{ padding: '0 0 4px' }}>
            <LayerToggle label="Stars" shortcut="S" on={showStars} onToggle={() => setShowStars(p => !p)} ariaLabel="Toggle star field" />
            <LayerToggle label="Constellations" shortcut="C" on={showConstellations} onToggle={() => setShowConstellations(p => !p)} ariaLabel="Toggle constellation lines" />
            <LayerToggle label="Dwarf planets" shortcut="D" on={showDwarf} onToggle={() => setShowDwarf(p => !p)} ariaLabel="Toggle dwarf planets" />
            <LayerToggle label="Near-Earth objects" shortcut="N" on={showNeo} onToggle={() => setShowNeo(p => !p)} ariaLabel="Toggle NEO panel" />
          </div>
        )}

        {/* Theme cycle */}
        <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <button
            onClick={cycleTheme}
            aria-label={`Theme: ${theme.name}. Click to cycle.`}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '4px 6px',
              background: 'transparent', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, opacity: 0.6 }} />
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: 1, fontWeight: 300 }}>{theme.name}</span>
          </button>
        </div>
      </nav>

      {/* ── Info cards (right side for desktop when rail is on left) ── */}
      {selectedMoon && (
        <MoonCard moon={selectedMoon} parentName={sp?.name || ''} onClose={navigateBack} mobile={mobile} />
      )}
      {sp && !selectedMoon && (
        <PlanetCard
          planet={sp} selPlanet={selPlanet!} moons={moons}
          focusTarget={focusTarget} setFocusTarget={setFocusTarget} setSelPlanet={setSelPlanet}
          positionsRef={positionsRef} accent={accent} accentRgb={accentRgb} mobile={mobile}
        />
      )}

      {/* ── NEO panel ── */}
      <NeoPanel
        neos={neos} selNeo={selNeo} setSelNeo={setSelNeo}
        showNeo={showNeo} setShowNeo={setShowNeo}
        accent={accent} accentRgb={accentRgb} mobile={mobile}
      />

      {/* ── Selected NEO detail ── */}
      {selNeo && <NeoDetail neo={selNeo} setSelNeo={setSelNeo} accent={accent} accentRgb={accentRgb} mobile={mobile} />}

      {/* ── Keyboard hints ── */}
      <div style={{
        position: 'absolute', bottom: 14, right: showNeo ? 264 : 14,
        color: 'rgba(255,255,255,0.12)', fontSize: 9, lineHeight: 1.8, textAlign: 'right', fontStyle: 'italic', fontWeight: 300,
        transition: 'right 0.3s', zIndex: 10,
      }}>
        <div>1-8 camera presets · click planet to focus · Esc back</div>
        <div>S stars · C constellations · D dwarf · N neo · F cinematic</div>
        <div>Space pause</div>
      </div>

      {/* ── Title watermark ── */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', top: 14, left: 14, color: 'rgba(255,255,255,0.15)', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', zIndex: 5, fontWeight: 300 }}
      >
        Orrery
      </div>

      {/* ── SR announcements ── */}
      <SrAnnouncements sp={sp} selectedMoon={selectedMoon} selNeo={selNeo} navStack={navStack} />
    </>
  );
}

// ─── Extracted sub-components ────────────────────────────────────────────────

function MoonCard({ moon, parentName, onClose, mobile }: {
  moon: ReturnType<typeof getMoonsForPlanet>[0]; parentName: string;
  onClose: () => void; mobile: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-label={`${moon.name} information`}
      style={{
        position: 'absolute',
        ...(mobile
          ? { bottom: 68, left: 8, right: 8, width: 'auto' }
          : { top: 56, right: 14, width: 220 }),
        ...glass, padding: '12px 14px', zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: '#fff', fontSize: 16, fontWeight: 600, letterSpacing: 1.5 }}>{moon.name}</span>
        <Btn onClick={onClose} label="Back to planet">{'\u2715'}</Btn>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, lineHeight: 1.6, marginBottom: 8, fontStyle: 'italic', fontWeight: 300 }}>{moon.desc}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
        <Stat label="Parent" val={parentName} />
        <Stat label="Orbit period" val={`${moon.period.toFixed(2)} days`} />
        <Stat label="Distance" val={`${moon.a} AU`} />
        {moon.i !== undefined && <Stat label="Inclination" val={`${moon.i}\u00b0`} />}
      </div>
    </div>
  );
}

function PlanetCard({ planet, selPlanet, focusTarget, setFocusTarget, setSelPlanet, positionsRef, accent, accentRgb, mobile }: {
  planet: typeof ALL_BODIES[0]; selPlanet: number;
  focusTarget: FocusTarget | null; setFocusTarget: (f: FocusTarget | null) => void;
  setSelPlanet: (i: number | null) => void;
  positionsRef: React.MutableRefObject<Map<number, [number, number, number]>>;
  accent: string; accentRgb: string; mobile: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-label={`${planet.name} information`}
      style={{
        position: 'absolute',
        ...(mobile
          ? { bottom: 68, left: 8, right: 8, width: 'auto', maxHeight: '40vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }
          : { top: 56, right: 14, width: 220 }),
        ...glass, padding: '12px 14px', zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: '#fff', fontSize: 16, fontWeight: 600, letterSpacing: 1.5 }}>{planet.name}</span>
        {planet.isDwarf && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, border: '1px solid rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: 2, fontStyle: 'italic', fontWeight: 300, letterSpacing: 1 }}>dwarf</span>}
        <Btn onClick={() => { setSelPlanet(null); setFocusTarget(null); }} label="Close planet info">{'\u2715'}</Btn>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, lineHeight: 1.6, marginBottom: 8, fontStyle: 'italic', fontWeight: 300 }}>{planet.desc}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
        <Stat label="Type" val={planet.type} />
        <Stat label="Moons" val={planet.moons} />
        <Stat label="Distance" val={`${planet.distAU} AU`} />
        <Stat label="Period" val={`${(planet.period / 365.25).toFixed(2)} yr`} />
        <Stat label="Eccentricity" val={planet.e.toFixed(4)} />
        <Stat label="Inclination" val={`${planet.I.toFixed(2)}\u00b0`} />
        <Stat label="Gravity" val={planet.gravity} />
        <Stat label="Temp" val={planet.surfaceTemp} />
      </div>
      <button
        onClick={() => {
          const pos = positionsRef.current.get(selPlanet);
          setFocusTarget(focusTarget?.planetIdx === selPlanet ? null : { planetIdx: selPlanet, pos: pos || [0, 0, 0] });
        }}
        aria-label={focusTarget?.planetIdx === selPlanet ? 'Release camera focus' : `Focus camera on ${planet.name}`}
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
  );
}

function NeoPanel({ neos, selNeo, setSelNeo, showNeo, setShowNeo, accent, accentRgb, mobile }: {
  neos: NEO[]; selNeo: NEO | null; setSelNeo: (n: NEO | null) => void;
  showNeo: boolean; setShowNeo: (fn: (p: boolean) => boolean) => void;
  accent: string; accentRgb: string; mobile: boolean;
}) {
  return (
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
        <Btn onClick={() => setShowNeo(p => !p)} label="Close NEO panel">{'\u2715'}</Btn>
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
  );
}

function NeoDetail({ neo, setSelNeo, accent, accentRgb, mobile }: {
  neo: NEO; setSelNeo: (n: NEO | null) => void;
  accent: string; accentRgb: string; mobile: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-label={`${neo.name} details`}
      style={{
        position: 'absolute', bottom: mobile ? 80 : 56,
        left: '50%', transform: 'translateX(-50%)',
        ...glass, padding: '10px 16px', maxWidth: 420,
        width: mobile ? 'calc(100vw - 16px)' : '90%', zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{neo.name}</span>
        <Btn onClick={() => setSelNeo(null)} label="Close NEO details">{'\u2715'}</Btn>
      </div>
      {neo.hazardous && (
        <div style={{ color: '#ff4444', fontSize: 10, letterSpacing: 1.5, marginTop: 2, textTransform: 'uppercase', fontWeight: 400 }}>Potentially Hazardous</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginTop: 8 }}>
        <Stat label="Diameter" val={`${Math.round(neo.dMin)}\u2013${Math.round(neo.dMax)} m`} />
        <Stat label="Miss distance" val={`${neo.missLunar.toFixed(1)} LD`} />
        <Stat label="Velocity" val={`${neo.velKms.toFixed(1)} km/s`} />
        <Stat label="Close approach" val={neo.date} />
        {neo.orbit?.loaded && (
          <>
            <Stat label="Semi-major axis" val={`${neo.orbit.a.toFixed(3)} AU`} c={accent} />
            <Stat label="Eccentricity" val={neo.orbit.e.toFixed(4)} c={accent} />
            <Stat label="Inclination" val={`${neo.orbit.i.toFixed(2)}\u00b0`} c={accent} />
            <Stat label="Orbit shown" val="in scene" c={accent} />
          </>
        )}
        {neo.orbit && !neo.orbit.loaded && (
          <div style={{ gridColumn: '1/-1', color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>Loading orbital elements{'\u2026'}</div>
        )}
      </div>
      <a
        href={neo.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-block', marginTop: 8, color: accent, fontSize: 9, textDecoration: 'none', borderBottom: `1px solid rgba(${accentRgb},0.3)` }}
      >
        View on NASA JPL {'\u2192'}
      </a>
    </div>
  );
}

function SrAnnouncements({ sp, selectedMoon, selNeo, navStack }: {
  sp: typeof ALL_BODIES[0] | null;
  selectedMoon: ReturnType<typeof getMoonsForPlanet>[0] | null;
  selNeo: NEO | null;
  navStack: string[];
}) {
  return (
    <div aria-live="polite" className="sr-only" role="status">
      {sp ? `Selected ${sp.name}, ${sp.type}. ${sp.desc}` : ''}
      {selectedMoon ? `Selected moon ${selectedMoon.name}. ${selectedMoon.desc}` : ''}
      {selNeo ? `Selected asteroid ${selNeo.name}. Miss distance: ${selNeo.missLunar.toFixed(1)} lunar distances.` : ''}
      {navStack.length > 1 ? `Navigated to ${navStack[navStack.length - 1]}` : ''}
    </div>
  );
}
