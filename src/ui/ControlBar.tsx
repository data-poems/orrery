/*
 * Control Bar — a minimalist bottom-center expander (DOM overlay, no R3F).
 *
 * Collapsed: one small primary element. Hover (pointer) / tap (touch) extends
 * the control icons symmetrically to each side along the bottom edge. Items
 * with sub-options (Layers, View) pop their choices in a row just above the
 * bar. Idle-fades via the `visible` prop. Replaces the sun-fan entirely.
 */
import { useState } from 'react';
import { PREFERS_REDUCED_MOTION } from '../lib/motion';

export interface ControlBarProps {
  visible: boolean;
  accent: string;
  accentRgb: string;
  onAction: (action: string, arg?: string) => void;
  layerState: Record<string, boolean>;
}

interface Item { k: string; label: string; icon: string; action?: string; arg?: string; layerKey?: string; sub?: 'layers' | 'view' }

// Inner → outer on each side of the centered primary. Frequent actions
// (zoom, dice) sit nearest the center.
const LEFT: ReadonlyArray<Item> = [
  { k: 'zout', label: 'Zoom out', icon: '−', action: 'zoom', arg: 'out' },
  { k: 'layers', label: 'Layers', icon: '☰', sub: 'layers' },
  { k: 'sky', label: 'Sky', icon: '✦', action: 'toggleSky', layerKey: 'sky' },
];
const RIGHT: ReadonlyArray<Item> = [
  { k: 'zin', label: 'Zoom in', icon: '+', action: 'zoom', arg: 'in' },
  { k: 'dice', label: 'Dice', icon: '⚄', action: 'dice' },
  { k: 'view', label: 'View', icon: '◎', sub: 'view' },
  { k: 'info', label: 'About', icon: 'i', action: 'info' },
];

const LAYER_SUBS: ReadonlyArray<{ label: string; arg: string; layerKey: string }> = [
  { label: 'NEOs', arg: 'neo', layerKey: 'neo' },
  { label: 'Dwarf', arg: 'dwarf', layerKey: 'dwarf' },
  { label: 'Comets', arg: 'comets', layerKey: 'comets' },
  { label: 'Meteors', arg: 'meteors', layerKey: 'meteors' },
  { label: 'Satellites', arg: 'satellites', layerKey: 'satellites' },
  { label: 'Deep space', arg: 'deepSpace', layerKey: 'deepSpace' },
  { label: 'Asterisms', arg: 'asterisms', layerKey: 'asterisms' },
];
const VIEW_SUBS: ReadonlyArray<{ label: string }> = [
  { label: 'Inner' }, { label: 'System' }, { label: 'Outer' }, { label: 'Kuiper' }, { label: 'Oort' },
];

export default function ControlBar({ visible, accent, accentRgb, onAction, layerState }: ControlBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [sub, setSub] = useState<'layers' | 'view' | null>(null);

  const collapse = () => { setExpanded(false); setSub(null); };

  const pillBase: React.CSSProperties = {
    height: 44, minWidth: 44, padding: '0 8px', borderRadius: 22,
    display: 'grid', placeItems: 'center', cursor: 'pointer',
    background: 'rgba(10,14,28,0.7)', border: '1px solid rgba(255,255,255,0.18)',
    color: '#eaf0ff', fontFamily: 'inherit', fontSize: 20,
    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    transition: PREFERS_REDUCED_MOTION ? 'none' : 'opacity 0.3s, transform 0.3s, background 0.2s, border-color 0.2s',
  };

  const renderItem = (it: Item) => {
    const lit = it.layerKey ? layerState[it.layerKey] : false;
    return (
      <button
        key={it.k}
        type="button"
        aria-label={it.label}
        title={it.label}
        onClick={() => {
          if (it.sub) { setSub(s => (s === it.sub ? null : it.sub!)); return; }
          if (it.action) onAction(it.action, it.arg);
          if (it.action !== 'toggleSky' && it.action !== 'zoom') collapse();
        }}
        style={{
          ...pillBase,
          background: lit || sub === it.sub ? `rgba(${accentRgb},0.28)` : pillBase.background,
          borderColor: lit || sub === it.sub ? accent : 'rgba(255,255,255,0.18)',
          color: lit || sub === it.sub ? accent : '#eaf0ff',
          opacity: expanded ? 1 : 0,
          transform: expanded ? 'scale(1)' : 'scale(0.4)',
          pointerEvents: expanded ? 'auto' : 'none',
        }}
      >
        <span aria-hidden="true">{it.icon}</span>
      </button>
    );
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={collapse}
      style={{
        position: 'fixed', left: '50%', bottom: 'calc(env(safe-area-inset-bottom,0px) + 22px)',
        transform: 'translateX(-50%)', zIndex: 35,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.6s ease',
        fontFamily: "'Cormorant Garamond','Garamond','Georgia',serif",
      }}
    >
      {/* sub-option row, popped above the bar */}
      {expanded && sub && (
        <div style={{
          display: 'flex', gap: 8, padding: '6px 10px', borderRadius: 18,
          background: 'rgba(6,9,18,0.82)', border: '1px solid rgba(255,255,255,0.14)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}>
          {sub === 'layers'
            ? LAYER_SUBS.map(s => (
              <button key={s.arg} type="button" aria-label={s.label} title={s.label}
                onClick={() => onAction('layer', s.arg)}
                style={{
                  ...pillBase, fontSize: 11, letterSpacing: 0.4, height: 36, padding: '0 12px',
                  opacity: 1, transform: 'none', pointerEvents: 'auto',
                  background: layerState[s.layerKey] ? `rgba(${accentRgb},0.28)` : pillBase.background,
                  borderColor: layerState[s.layerKey] ? accent : 'rgba(255,255,255,0.18)',
                  color: layerState[s.layerKey] ? accent : '#eaf0ff',
                }}>
                {s.label}
              </button>
            ))
            : VIEW_SUBS.map(s => (
              <button key={s.label} type="button" aria-label={s.label} title={s.label}
                onClick={() => { onAction('preset', s.label); collapse(); }}
                style={{ ...pillBase, fontSize: 11, letterSpacing: 0.4, height: 36, padding: '0 12px', opacity: 1, transform: 'none', pointerEvents: 'auto' }}>
                {s.label}
              </button>
            ))}
        </div>
      )}

      {/* the bar: left icons · primary · right icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {[...LEFT].reverse().map(renderItem)}
        <button
          type="button"
          aria-label={expanded ? 'Controls' : 'Open controls'}
          onClick={() => (expanded ? collapse() : setExpanded(true))}
          style={{
            ...pillBase, width: 48, height: 48, minWidth: 48, borderRadius: 24,
            opacity: 1, transform: 'none', pointerEvents: 'auto',
            background: `rgba(${accentRgb},0.16)`, border: `1px solid rgba(${accentRgb},0.5)`,
            color: accent, fontSize: 22,
          }}
        >
          <span aria-hidden="true">{expanded ? '×' : '☰'}</span>
        </button>
        {RIGHT.map(renderItem)}
      </div>
    </div>
  );
}
