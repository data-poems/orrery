/*
 * Solar Arc — the summoned radial control surface (DOM overlay, no R3F).
 *
 * Ported from the verified sunhub/bottom-bloom prototypes
 * (prototypes/controls/). A hub anchored at lower-center blooms its primary
 * controls in an upward arc; selecting a primary with sub-options replaces the
 * arc in place with that primary's sub-options (the hub becomes Back). Built
 * and verified with headless-Chrome screenshots of the running app.
 *
 * Contract: the parent owns dismissal. onAction emits semantic strings; the
 * parent decides whether to close (navigation) or keep open (toggles).
 */
import { useEffect, useState } from 'react';
import { PREFERS_REDUCED_MOTION } from '../lib/motion';

export interface SolarArcProps {
  open: boolean;
  onDismiss: () => void;
  accent: string;
  accentRgb: string;
  onAction: (action: string, arg?: string) => void;
  layerState: Record<string, boolean>;
}

interface Sub { k: string; label: string; action: string; arg?: string; layerKey?: string }
interface Primary { k: string; label: string; icon: string; action?: string; subs?: Sub[]; layerKey?: string }

const PRIMARIES: ReadonlyArray<Primary> = [
  { k: 'tour', label: 'Tour', icon: '▶', action: 'tour' },
  { k: 'dice', label: 'Dice', icon: '⚄', action: 'dice' },
  { k: 'sky', label: 'Sky', icon: '✦', action: 'toggleSky', layerKey: 'sky' },
  { k: 'view', label: 'View', icon: '◎', subs: [
    { k: 'inner', label: 'Inner', action: 'preset', arg: 'Inner' },
    { k: 'system', label: 'System', action: 'preset', arg: 'System' },
    { k: 'outer', label: 'Outer', action: 'preset', arg: 'Outer' },
    { k: 'kuiper', label: 'Kuiper', action: 'preset', arg: 'Kuiper' },
    { k: 'oort', label: 'Oort', action: 'preset', arg: 'Oort' },
  ] },
  { k: 'layers', label: 'Layers', icon: '☰', subs: [
    { k: 'neo', label: 'NEOs', action: 'layer', arg: 'neo', layerKey: 'neo' },
    { k: 'dwarf', label: 'Dwarf', action: 'layer', arg: 'dwarf', layerKey: 'dwarf' },
    { k: 'comets', label: 'Comets', action: 'layer', arg: 'comets', layerKey: 'comets' },
    { k: 'meteors', label: 'Meteors', action: 'layer', arg: 'meteors', layerKey: 'meteors' },
    { k: 'sats', label: 'Satellites', action: 'layer', arg: 'satellites', layerKey: 'satellites' },
    { k: 'deep', label: 'Deep space', action: 'layer', arg: 'deepSpace', layerKey: 'deepSpace' },
    { k: 'aster', label: 'Asterisms', action: 'layer', arg: 'asterisms', layerKey: 'asterisms' },
  ] },
  { k: 'info', label: 'Info', icon: 'i', subs: [
    { k: 'about', label: 'About', action: 'info' },
    { k: 'shortcuts', label: 'Keys', action: 'shortcuts' },
  ] },
];

const R = 150;            // arc radius, px
const SPAN = 150;         // arc angular span, degrees (bows upward over the hub)

export default function SolarArc({ open, onDismiss, accent, accentRgb, onAction, layerState }: SolarArcProps) {
  // level: null = primaries; otherwise the key of the open primary.
  const [level, setLevel] = useState<string | null>(null);
  const [focus, setFocus] = useState(0);
  // reset to top level whenever the arc (re)opens — render-time guard avoids
  // setState-in-effect (the repo's lint forbids it).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) { setLevel(null); setFocus(0); }
  }

  const activePrimary = level ? PRIMARIES.find(p => p.k === level) ?? null : null;
  const items: Array<{ k: string; label: string; icon?: string; lit?: boolean }> =
    activePrimary?.subs
      ? activePrimary.subs.map(s => ({ k: s.k, label: s.label, lit: s.layerKey ? layerState[s.layerKey] : false }))
      : PRIMARIES.map(p => ({ k: p.k, label: p.label, icon: p.icon, lit: p.layerKey ? layerState[p.layerKey] : false }));

  const select = (idx: number) => {
    if (activePrimary?.subs) {
      const sub = activePrimary.subs[idx];
      if (sub) onAction(sub.action, sub.arg);
      return;
    }
    const p = PRIMARIES[idx];
    if (!p) return;
    if (p.subs) { setLevel(p.k); setFocus(0); return; }
    if (p.action) onAction(p.action, undefined);
  };

  const back = () => {
    if (level) { setLevel(null); setFocus(0); }
    else onDismiss();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); back(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); setFocus(f => (f + 1) % items.length); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setFocus(f => (f - 1 + items.length) % items.length); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(focus); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focus, level, items.length]);

  if (!open) return null;

  const n = items.length;
  // Spread items across an upward-bowing arc centered on straight-up (-90deg).
  const startDeg = -90 - SPAN / 2;
  const step = n > 1 ? SPAN / (n - 1) : 0;

  return (
    <div
      role="menu"
      aria-label="Solar System controls"
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 40,
        background: 'rgba(2,3,8,0.32)',
        backdropFilter: 'blur(1.5px)', WebkitBackdropFilter: 'blur(1.5px)',
        fontFamily: "'Cormorant Garamond','Garamond','Georgia',serif",
      }}
    >
      {/* anchor: lower-center; the arc bows up from here */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', left: '50%',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
          width: 0, height: 0,
        }}
      >
        {/* hub: sun glow; acts as Back (in a submenu) or Close (top level) */}
        <button
          type="button"
          onClick={back}
          aria-label={level ? 'Back' : 'Close controls'}
          style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
            width: 58, height: 58, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'radial-gradient(circle at 38% 34%, #ffe9b8, #f0a338 60%, #c8761b)',
            boxShadow: '0 0 22px rgba(240,163,56,0.5), 0 0 52px rgba(240,163,56,0.22)',
            display: 'grid', placeItems: 'center', color: '#3a2406', fontSize: 18,
          }}
        >
          <span aria-hidden="true">{level ? '‹' : ''}</span>
        </button>
        {/* breadcrumb label for the open submenu */}
        {activePrimary && (
          <div style={{
            position: 'absolute', left: '50%', top: 'calc(50% + 40px)', transform: 'translateX(-50%)',
            fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', whiteSpace: 'nowrap',
            color: `rgba(${accentRgb},0.85)`,
          }}>{activePrimary.label}</div>
        )}
        {items.map((it, i) => {
          const ang = (startDeg + step * i) * Math.PI / 180;
          const x = Math.cos(ang) * R;
          const y = Math.sin(ang) * R;
          const focused = i === focus;
          return (
            <button
              key={it.k}
              type="button"
              role="menuitem"
              aria-label={it.label}
              onClick={() => select(i)}
              onMouseEnter={() => setFocus(i)}
              style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                width: 54, height: 54, borderRadius: '50%', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
                background: it.lit ? `rgba(${accentRgb},0.26)` : 'rgba(255,255,255,0.06)',
                border: `1px solid ${focused || it.lit ? accent : 'rgba(255,255,255,0.18)'}`,
                boxShadow: focused ? `0 0 0 2px rgba(${accentRgb},0.5), 0 0 20px rgba(${accentRgb},0.45)` : 'none',
                color: it.lit ? accent : '#eaf0ff',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                fontSize: it.icon ? 19 : 12, fontFamily: 'inherit',
                letterSpacing: it.icon ? 0 : 0.5,
                transition: PREFERS_REDUCED_MOTION ? 'none' : 'box-shadow 0.2s, border-color 0.2s, background 0.2s',
              }}
            >
              <span aria-hidden={it.icon ? 'true' : undefined} style={it.icon ? undefined : { padding: '0 4px', textAlign: 'center', lineHeight: 1.05, fontSize: 11 }}>
                {it.icon ?? it.label}
              </span>
              {it.icon && (
                <span style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)',
                  fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', whiteSpace: 'nowrap',
                  color: 'rgba(255,255,255,0.55)', opacity: focused ? 1 : 0, transition: 'opacity 0.2s',
                }}>{it.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
