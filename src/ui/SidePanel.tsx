/*
 * SidePanel — the controls as a slide-in panel from the right edge.
 *
 * At rest: a slim handle on the right edge (idle-fades via `visible`). Tapping
 * it slides a panel in from the right holding the controls grouped into
 * sections; a light backdrop closes on click-out. Right edge keeps it clear of
 * the left-edge BodyStats readout. Replaces the bottom ControlBar.
 */
import { useState } from 'react';
import { PREFERS_REDUCED_MOTION } from '../lib/motion';

export interface SidePanelProps {
  visible: boolean;
  accent: string;
  accentRgb: string;
  onAction: (action: string, arg?: string) => void;
  layerState: Record<string, boolean>;
}

const VIEW_PRESETS = ['Inner', 'System', 'Outer', 'Kuiper', 'Oort'] as const;
const LAYERS: ReadonlyArray<{ label: string; arg: string }> = [
  { label: 'Near-Earth objects', arg: 'neo' },
  { label: 'Dwarf planets', arg: 'dwarf' },
  { label: 'Comets', arg: 'comets' },
  { label: 'Meteor showers', arg: 'meteors' },
  { label: 'Satellites', arg: 'satellites' },
  { label: 'Deep space', arg: 'deepSpace' },
  { label: 'Asterisms', arg: 'asterisms' },
];

export default function SidePanel({ visible, accent, accentRgb, onAction, layerState }: SidePanelProps) {
  const [open, setOpen] = useState(false);

  const sectionLabel: React.CSSProperties = {
    color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: 2,
    textTransform: 'uppercase', margin: '18px 0 8px',
  };
  const rowBtn = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
    padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 14, letterSpacing: 0.4, textAlign: 'left',
    background: active ? `rgba(${accentRgb},0.22)` : 'rgba(255,255,255,0.05)',
    border: `1px solid ${active ? accent : 'rgba(255,255,255,0.12)'}`,
    color: active ? accent : '#eaf0ff',
    transition: PREFERS_REDUCED_MOTION ? 'none' : 'background 0.18s, border-color 0.18s, color 0.18s',
  });
  const iconBtn: React.CSSProperties = {
    width: 44, height: 44, borderRadius: 8, cursor: 'pointer', display: 'grid', placeItems: 'center',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)', color: '#eaf0ff',
    fontFamily: 'inherit', fontSize: 18,
  };

  const act = (a: string, arg?: string, close = false) => { onAction(a, arg); if (close) setOpen(false); };

  return (
    <>
      {/* edge handle (idle-fades; hidden while open) */}
      {!open && (
        <button
          type="button"
          aria-label="Open controls"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          style={{
            position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 36,
            width: 30, height: 64, borderRadius: '10px 0 0 10px',
            background: `rgba(${accentRgb},0.16)`, border: `1px solid rgba(${accentRgb},0.42)`, borderRight: 'none',
            color: accent, cursor: visible ? 'pointer' : 'default', display: 'grid', placeItems: 'center',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            opacity: visible ? 0.9 : 0, pointerEvents: visible ? 'auto' : 'none',
            transition: 'opacity 0.6s ease', fontFamily: "'Cormorant Garamond',serif", fontSize: 18,
          }}
        >
          <span aria-hidden="true">‹</span>
        </button>
      )}

      {/* backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(2,3,8,0.35)' }}
        />
      )}

      {/* the panel */}
      <aside
        role="dialog"
        aria-label="Controls"
        aria-hidden={!open}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 46,
          width: 'min(86vw, 320px)',
          padding: '20px 18px calc(env(safe-area-inset-bottom,0px) + 20px)',
          paddingTop: 'calc(env(safe-area-inset-top,0px) + 20px)',
          background: 'rgba(8,11,22,0.92)', borderLeft: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          overflowY: 'auto',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: PREFERS_REDUCED_MOTION ? 'none' : 'transform 0.32s cubic-bezier(0.22,1,0.36,1)',
          fontFamily: "'Cormorant Garamond','Garamond','Georgia',serif",
          color: '#eaf0ff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 20, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>Controls</span>
          <button type="button" aria-label="Close controls" onClick={() => setOpen(false)}
            style={{ ...iconBtn, width: 40, height: 40, fontSize: 22, color: 'rgba(255,255,255,0.7)' }}>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div style={sectionLabel}>Explore</div>
        <div style={{ display: 'grid', gap: 8 }}>
          <button type="button" style={rowBtn(false)} onClick={() => act('tour', undefined, true)}>Cinematic tour <span aria-hidden="true">▶</span></button>
          <button type="button" style={rowBtn(false)} onClick={() => act('dice', undefined, true)}>Random destination <span aria-hidden="true">⚄</span></button>
        </div>

        <div style={sectionLabel}>Scale</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" aria-label="Zoom out" style={iconBtn} onClick={() => act('zoom', 'out')}>−</button>
          <button type="button" aria-label="Zoom in" style={iconBtn} onClick={() => act('zoom', 'in')}>+</button>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
            {VIEW_PRESETS.map(p => (
              <button key={p} type="button" onClick={() => act('preset', p, true)}
                style={{ ...iconBtn, width: 'auto', height: 30, padding: '0 10px', fontSize: 12, letterSpacing: 0.5 }}>{p}</button>
            ))}
          </div>
        </div>

        <div style={sectionLabel}>Sky</div>
        <button type="button" style={rowBtn(layerState.sky)} onClick={() => act('toggleSky')}>Sky / constellations <span aria-hidden="true">✦</span></button>

        <div style={sectionLabel}>Layers</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {LAYERS.map(l => (
            <button key={l.arg} type="button" style={rowBtn(!!layerState[l.arg])} onClick={() => act('layer', l.arg)}>
              {l.label} <span aria-hidden="true">{layerState[l.arg] ? '●' : '○'}</span>
            </button>
          ))}
        </div>

        <div style={sectionLabel}>About</div>
        <div style={{ display: 'grid', gap: 8 }}>
          <button type="button" style={rowBtn(false)} onClick={() => act('info', undefined, true)}>About &amp; data sources</button>
          <button type="button" style={rowBtn(false)} onClick={() => act('shortcuts', undefined, true)}>Keyboard shortcuts</button>
        </div>
      </aside>
    </>
  );
}
