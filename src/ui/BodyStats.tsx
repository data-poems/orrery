/*
 * BodyStats — selected-body readout as quiet, unboxed text (no modal).
 *
 * The body's name + type and its stats run down the LEFT edge of the screen as
 * plain text laid directly over the scene (a soft text-shadow keeps it legible
 * against the starfield). The scene already labels the body in 3D; this is the
 * detail. Clearing the selection is via empty-space click / Escape (handled by
 * the parent), with a small inline Back affordance as a fallback.
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

export default function BodyStats({ name, subtitle, color, stats, accent, accentRgb, onBack, mobile }: BodyStatsProps) {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: mobile ? 'calc(env(safe-area-inset-left,0px) + 14px)' : 'calc(env(safe-area-inset-left,0px) + 26px)',
        top: mobile ? 'calc(env(safe-area-inset-top,0px) + 64px)' : '50%',
        transform: mobile ? 'none' : 'translateY(-50%)',
        zIndex: 28,
        maxWidth: mobile ? '70vw' : 280,
        pointerEvents: 'auto',
        // Subtle transparent container — readable, but the scene shows through.
        padding: mobile ? '14px 16px' : '18px 20px',
        background: 'rgba(8,11,22,0.42)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        fontFamily: "'Cormorant Garamond','Garamond','Georgia',serif",
        animation: PREFERS_REDUCED_MOTION ? undefined : 'orrery-fade-in 0.5s ease both',
      }}
    >
      {/* name + type */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 2 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
        <span style={{ color: '#fff', fontSize: mobile ? 26 : 34, fontWeight: 400, letterSpacing: 1.5, textShadow: shadow }}>{name}</span>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, fontStyle: 'italic', letterSpacing: 0.5, marginBottom: 14, textShadow: shadow }}>
        {subtitle}
      </div>

      {/* stats as plain label / value rows */}
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 16, rowGap: 6 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ display: 'contents' }}>
            <dt style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', whiteSpace: 'nowrap', textShadow: shadow }}>{s.label}</dt>
            <dd style={{ margin: 0, color: '#fff', fontSize: 15, fontVariantNumeric: 'tabular-nums', textShadow: shadow }}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onBack(); }}
        style={{
          marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          color: accent, fontFamily: 'inherit', fontSize: 13, letterSpacing: 1.4,
          textTransform: 'uppercase', textShadow: shadow,
          minHeight: 44, display: 'inline-flex', alignItems: 'center',
        }}
        aria-label="Back"
      >
        <span aria-hidden="true" style={{ marginRight: 6 }}>‹</span> Back
        <span style={{ marginLeft: 8, fontSize: 10, color: `rgba(${accentRgb},0.55)`, letterSpacing: 1 }}>· esc</span>
      </button>
    </div>
  );
}
