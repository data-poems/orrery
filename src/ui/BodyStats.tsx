/*
 * BodyStats — selected-body readout.
 *
 * Desktop: a quiet transparent column down the LEFT edge (name + type + stat
 * rows). Mobile: a full-width info BAR pinned to the bottom (above the control
 * cluster) with the stats laid out horizontally and scrollable — keeps the
 * whole center of the screen open. Clearing the selection is via empty-space
 * click / Escape (handled by the parent) or the close ×; closing leaves the
 * camera where it is (no zoom-out).
 */
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
  mobile: boolean;
}

const shadow = '0 1px 10px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)';

export default function BodyStats({ name, subtitle, color, stats, onBack, mobile }: BodyStatsProps) {
  const dot = <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />;

  // ── Mobile: bottom info bar ─────────────────────────────────────────────────
  if (mobile) {
    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', zIndex: 28, pointerEvents: 'auto',
          left: 'calc(env(safe-area-inset-left,0px) + 8px)',
          right: 'calc(env(safe-area-inset-right,0px) + 8px)',
          bottom: 'calc(env(safe-area-inset-bottom,0px) + 84px)',
          padding: '9px 12px 8px',
          background: 'rgba(8,11,22,0.62)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          fontFamily: "'Cormorant Garamond','Garamond','Georgia',serif",
          animation: PREFERS_REDUCED_MOTION ? undefined : 'orrery-fade-in 0.4s ease both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {dot}
          <span style={{ color: '#fff', fontSize: 19, fontWeight: 400, letterSpacing: 0.8, textShadow: shadow, flexShrink: 0 }}>{name}</span>
          <span style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12, fontStyle: 'italic', textShadow: shadow, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onBack(); }}
            aria-label="Close"
            style={{
              flexShrink: 0, width: 40, height: 40, margin: '-8px -6px -8px 0', padding: 0,
              display: 'grid', placeItems: 'center', background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit', fontSize: 22, lineHeight: 1, textShadow: shadow,
            }}
          >
            <span aria-hidden="true">{'×'}</span>
          </button>
        </div>

        {/* stats — horizontal, scrollable so the bar stays short */}
        <div style={{ display: 'flex', gap: 18, overflowX: 'auto', marginTop: 7, paddingBottom: 1, WebkitOverflowScrolling: 'touch' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ flexShrink: 0 }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', textShadow: shadow }}>{s.label}</div>
              <div style={{ color: '#fff', fontSize: 14, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', marginTop: 1, textShadow: shadow }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
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
        padding: '18px 20px',
        background: 'rgba(8,11,22,0.42)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        fontFamily: "'Cormorant Garamond','Garamond','Georgia',serif",
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
