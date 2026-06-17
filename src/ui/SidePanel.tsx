/*
 * SidePanel — the controls as a slide-in panel from the right edge.
 *
 * At rest: a slim handle on the right edge (idle-fades via `visible`). Tapping
 * it slides a panel in from the right holding the controls grouped into
 * sections; a light backdrop closes on click-out. Right edge keeps it clear of
 * the left-edge BodyStats readout. Replaces the bottom ControlBar.
 */
import { useState, useEffect, useRef } from 'react';
import { PREFERS_REDUCED_MOTION } from '../lib/motion';

export interface SidePanelProps {
  visible: boolean;
  /** Briefly blink the edge handle (cinematic-landing "Sky mode" reveal cue). */
  pulse?: boolean;
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

export default function SidePanel({ visible, pulse, accent, accentRgb, onAction, layerState }: SidePanelProps) {
  const [open, setOpen] = useState(false);
  // The reveal pulse forces the handle visible even if the HUD has idle-faded.
  const handleVisible = visible || !!pulse;
  const asideRef = useRef<HTMLElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);

  // While open: focus into the panel, trap Tab, close on Escape, and restore
  // focus to the edge handle on close. Mirrors the AboutDialog dialog pattern.
  useEffect(() => {
    if (!open) return;
    const focusables = () => asideRef.current
      ? Array.from(asideRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      : [];
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // Intentionally the live handle: it remounts on close, so focus the
      // current node, not a snapshot from when the panel opened.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      handleRef.current?.focus();
    };
  }, [open]);

  const sectionLabel: React.CSSProperties = {
    color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: 2,
    textTransform: 'uppercase', margin: '18px 0 8px',
  };
  // Minimal rows: transparent at rest, hairline separators, accent only when
  // active. Avoids the heavy "menu of boxes" look.
  const rowBtn = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
    padding: '9px 2px', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 14, letterSpacing: 0.4, textAlign: 'left',
    background: 'transparent', border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    color: active ? accent : 'rgba(255,255,255,0.82)',
    transition: PREFERS_REDUCED_MOTION ? 'none' : 'color 0.18s',
  });
  const iconBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 8, cursor: 'pointer', display: 'grid', placeItems: 'center',
    background: 'transparent', border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.85)',
    fontFamily: 'inherit', fontSize: 18,
  };

  const act = (a: string, arg?: string, close = false) => { onAction(a, arg); if (close) setOpen(false); };

  return (
    <>
      {/* edge handle (idle-fades; hidden while open) */}
      {!open && (
        <button
          ref={handleRef}
          type="button"
          aria-label="Open controls"
          inert={!handleVisible}
          className={pulse ? 'sky-toggle-blink' : undefined}
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          style={{
            position: 'fixed', right: 'env(safe-area-inset-right, 0px)', top: '50%', transform: 'translateY(-50%)', zIndex: 36,
            width: 30, height: 64, borderRadius: '10px 0 0 10px',
            background: `rgba(${accentRgb},0.16)`, border: `1px solid rgba(${accentRgb},0.42)`, borderRight: 'none',
            color: accent, cursor: handleVisible ? 'pointer' : 'default', display: 'grid', placeItems: 'center',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            opacity: handleVisible ? 0.9 : 0, pointerEvents: handleVisible ? 'auto' : 'none',
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
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-label="Controls"
        aria-hidden={!open}
        inert={!open}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 46,
          width: 'min(86vw, 320px)',
          padding: '20px 18px calc(env(safe-area-inset-bottom,0px) + 20px)',
          paddingTop: 'calc(env(safe-area-inset-top,0px) + 20px)',
          paddingRight: 'calc(18px + env(safe-area-inset-right,0px))',
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
