/*
 * SidePanel — the full controls as a slide-in panel from the right edge.
 *
 * Opened by the bottom cluster's ≡ tile (or the `m` key) via the
 * `orrery:toggle-controls` window event — there's no edge handle anymore. A
 * light backdrop closes on click-out; Escape closes and restores focus. The
 * common controls (zoom, tour, dice, sky) live on the BottomCluster; this panel
 * holds the rest: scale presets, sky, the layer toggles, and About.
 *
 * Interior is a single aligned grid: every row is [glyph | label | indicator]
 * so labels and ●/○ markers line up regardless of text length.
 */
import { useState, useEffect } from 'react';
import { PREFERS_REDUCED_MOTION } from '../lib/motion';

export interface SidePanelProps {
  accent: string;
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

export default function SidePanel({ accent, onAction, layerState }: SidePanelProps) {
  const [open, setOpen] = useState(false);

  // Open/close via the shared window event (bottom-cluster ≡ tile, m key).
  useEffect(() => {
    const onToggle = () => setOpen(o => !o);
    window.addEventListener('orrery:toggle-controls', onToggle);
    return () => window.removeEventListener('orrery:toggle-controls', onToggle);
  }, []);

  // While open: focus into the panel, trap Tab, close on Escape, restore focus.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const root = document.getElementById('orrery-controls-panel');
    const focusables = () => root
      ? Array.from(root.querySelectorAll<HTMLElement>(
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
      prev?.focus?.();
    };
  }, [open]);

  const heading: React.CSSProperties = {
    color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: 2, fontWeight: 400,
    textTransform: 'uppercase', margin: '20px 0 8px',
  };
  // Aligned 3-column row: [28px glyph][flex label][22px indicator].
  const row = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', height: 48,
    padding: '0 4px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    background: 'transparent', border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    color: active ? accent : 'rgba(255,255,255,0.85)',
    transition: PREFERS_REDUCED_MOTION ? 'none' : 'color 0.18s',
  });
  const glyphCell: React.CSSProperties = { width: 28, flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 15 };
  const labelCell: React.CSSProperties = { flex: 1, fontSize: 14, letterSpacing: 0.4 };
  const markCell: React.CSSProperties = { width: 22, flexShrink: 0, textAlign: 'center', fontSize: 15 };

  const act = (a: string, arg?: string, close = false) => { onAction(a, arg); if (close) setOpen(false); };

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(2,3,8,0.35)' }}
        />
      )}

      <aside
        id="orrery-controls-panel"
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
            style={{
              width: 44, height: 44, borderRadius: 8, cursor: 'pointer', display: 'grid', placeItems: 'center',
              background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)',
              fontFamily: 'inherit', fontSize: 22,
            }}>
            <span aria-hidden="true">{'×'}</span>
          </button>
        </div>

        <h3 style={heading}>Explore</h3>
        <button type="button" style={row(false)} onClick={() => act('tour', undefined, true)}>
          <span aria-hidden="true" style={glyphCell}>▶</span>
          <span style={labelCell}>Cinematic tour</span>
          <span style={markCell} />
        </button>

        <h3 style={heading}>Scale</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {VIEW_PRESETS.map(p => (
            <button key={p} type="button" onClick={() => act('preset', p, true)}
              style={{
                height: 34, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 11.5, letterSpacing: 0.3,
                background: 'transparent', border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.85)',
              }}>{p}</button>
          ))}
        </div>

        <h3 style={heading}>Sky</h3>
        <button type="button" style={row(!!layerState.sky)} onClick={() => act('toggleSky')} aria-pressed={!!layerState.sky}>
          <span aria-hidden="true" style={glyphCell}>✦</span>
          <span style={labelCell}>Sky / constellations</span>
          <span aria-hidden="true" style={markCell}>{layerState.sky ? '●' : '○'}</span>
        </button>

        <h3 style={heading}>Layers</h3>
        <div>
          {LAYERS.map(l => (
            <button key={l.arg} type="button" style={row(!!layerState[l.arg])} onClick={() => act('layer', l.arg)} aria-pressed={!!layerState[l.arg]}>
              <span aria-hidden="true" style={glyphCell} />
              <span style={labelCell}>{l.label}</span>
              <span aria-hidden="true" style={markCell}>{layerState[l.arg] ? '●' : '○'}</span>
            </button>
          ))}
        </div>

        <h3 style={heading}>About</h3>
        <div>
          <button type="button" style={row(false)} onClick={() => act('info', undefined, true)}>
            <span aria-hidden="true" style={glyphCell}>{'ⓘ'}</span>
            <span style={labelCell}>About &amp; data sources</span>
            <span style={markCell} />
          </button>
          <button type="button" style={row(false)} onClick={() => act('shortcuts', undefined, true)}>
            <span aria-hidden="true" style={glyphCell}>{'⌘'}</span>
            <span style={labelCell}>Keyboard shortcuts</span>
            <span style={markCell} />
          </button>
        </div>
      </aside>
    </>
  );
}
