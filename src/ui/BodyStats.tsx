/*
 * BodyStats — selected-body readout.
 *
 * Desktop (> tablet): a quiet transparent column down the LEFT edge.
 * Mobile / tablet: a tiny name CHIP pinned to the bottom (above the control
 * cluster) — tap it to expand into a compact info bar with the stats laid out
 * horizontally, tap the chevron to collapse. Keeps the whole center open until
 * you want detail. Closing (×, empty-space tap, Escape) leaves the camera where
 * it is — no zoom-out. Starts collapsed on each new selection (keyed by parent).
 */
import { useState } from 'react';
import { PREFERS_REDUCED_MOTION } from '../lib/motion';

export interface BodyStat { label: string; value: string }

export interface BodyStatsProps {
  name: string;
  subtitle: string;
  color: string;
  stats: ReadonlyArray<BodyStat>;
  accent: string;
  accentRgb: string;
  onBack: () => void;
  /** Compact (mobile/tablet) chip+bar form vs the desktop left-edge column. */
  compact: boolean;
}

const shadow = '0 1px 10px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)';
const surface = {
  background: 'rgba(8,11,22,0.62)', border: '1px solid rgba(255,255,255,0.12)',
  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  fontFamily: "'Cormorant Garamond','Garamond','Georgia',serif",
} as const;

export default function BodyStats({ name, subtitle, color, stats, onBack, compact }: BodyStatsProps) {
  const [expanded, setExpanded] = useState(false);
  const dot = <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />;

  // ── Mobile / tablet: collapsible chip ───────────────────────────────────────
  if (compact) {
    const wrap = (children: React.ReactNode) => (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', zIndex: 28, pointerEvents: 'auto',
          left: '50%', transform: 'translateX(-50%)',
          bottom: 'calc(env(safe-area-inset-bottom,0px) + 84px)',
          maxWidth: 'min(94vw, 560px)',
          animation: PREFERS_REDUCED_MOTION ? undefined : 'orrery-fade-in 0.4s ease both',
        }}
      >
        {children}
      </div>
    );

    if (!expanded) {
      return wrap(
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          aria-label={`${name} — show details`}
          aria-expanded={false}
          style={{
            ...surface, display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '8px 14px', borderRadius: 22, cursor: 'pointer',
            color: '#fff', fontSize: 16, letterSpacing: 0.5, textShadow: shadow,
          }}
        >
          {dot}
          <span style={{ whiteSpace: 'nowrap' }}>{name}</span>
          <span aria-hidden="true" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginLeft: 2 }}>{'⌄'}</span>
        </button>,
      );
    }

    return wrap(
      <div style={{ ...surface, padding: '9px 12px 8px', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {dot}
          <span style={{ color: '#fff', fontSize: 18, letterSpacing: 0.8, textShadow: shadow, flexShrink: 0 }}>{name}</span>
          <span style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12, fontStyle: 'italic', textShadow: shadow, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</span>
          <button type="button" onClick={(e) => { e.stopPropagation(); setExpanded(false); }} aria-label="Collapse" aria-expanded={true}
            style={{ flexShrink: 0, width: 44, height: 44, margin: '-9px 0', padding: 0, display: 'grid', placeItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit', fontSize: 16, textShadow: shadow }}>
            <span aria-hidden="true">{'⌃'}</span>
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onBack(); }} aria-label="Close"
            style={{ flexShrink: 0, width: 44, height: 44, margin: '-9px -8px -9px 0', padding: 0, display: 'grid', placeItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit', fontSize: 22, lineHeight: 1, textShadow: shadow }}>
            <span aria-hidden="true">{'×'}</span>
          </button>
        </div>
        <div style={{ display: 'flex', gap: 18, overflowX: 'auto', marginTop: 7, paddingBottom: 1, WebkitOverflowScrolling: 'touch' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ flexShrink: 0 }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', textShadow: shadow }}>{s.label}</div>
              <div style={{ color: '#fff', fontSize: 14, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', marginTop: 1, textShadow: shadow }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>,
    );
  }

  // ── Desktop: left-edge column ───────────────────────────────────────────────
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', left: 'calc(env(safe-area-inset-left,0px) + 26px)', top: '50%',
        transform: 'translateY(-50%)', zIndex: 28, maxWidth: 280, pointerEvents: 'auto',
        padding: '18px 20px', borderRadius: 14, ...surface,
        background: 'rgba(8,11,22,0.42)',
        animation: PREFERS_REDUCED_MOTION ? undefined : 'orrery-fade-in 0.5s ease both',
      }}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onBack(); }}
        aria-label="Close"
        style={{
          position: 'absolute', top: 4, right: 4, width: 44, height: 44,
          display: 'grid', placeItems: 'center', padding: 0,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit', fontSize: 22, lineHeight: 1, textShadow: shadow,
        }}
      >
        <span aria-hidden="true">{'×'}</span>
      </button>

      <div style={{ paddingRight: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 2 }}>
          {dot}
          <span style={{ color: '#fff', fontSize: 34, fontWeight: 400, letterSpacing: 1.5, textShadow: shadow }}>{name}</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, fontStyle: 'italic', letterSpacing: 0.5, marginBottom: 14, textShadow: shadow }}>
          {subtitle}
        </div>
      </div>

      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 16, rowGap: 6 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ display: 'contents' }}>
            <dt style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', whiteSpace: 'nowrap', textShadow: shadow }}>{s.label}</dt>
            <dd style={{ margin: 0, color: '#fff', fontSize: 15, fontVariantNumeric: 'tabular-nums', textShadow: shadow }}>{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
