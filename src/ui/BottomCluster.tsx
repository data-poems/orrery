/*
 * BottomCluster — the front-page control tiles.
 *
 * A compact, idle-fading pill centered on the bottom edge: zoom out / in,
 * cinematic tour, random destination, sky toggle, and open-full-controls. The
 * zoom tiles grey out at the ends of the scale ladder (− at the outermost rung,
 * + at the innermost). This is the primary control surface; the full SidePanel
 * opens from the trailing ≡ tile. No emoji — serif glyphs only.
 */
import { useIsMobile, Z } from './styles';
import { PREFERS_REDUCED_MOTION } from '../lib/motion';

export interface BottomClusterProps {
  visible: boolean;
  /** Brief reveal cue on the Sky tile after the cinematic tour lands. */
  pulse?: boolean;
  accent: string;
  accentRgb: string;
  onAction: (action: string, arg?: string) => void;
  /** At the innermost rung (Sun) → zoom-in (+) is disabled. */
  atInnermost: boolean;
  /** At the outermost rung (Stellar) → zoom-out (−) is disabled. */
  atOutermost: boolean;
  skyActive: boolean;
}

interface TileProps {
  label: string;
  glyph: string;
  onClick: () => void;
  size: number;
  accent: string;
  accentRgb: string;
  disabled?: boolean;
  active?: boolean;
  /** Pressed-state semantics for toggles (Sky). */
  pressed?: boolean;
  /** Class applied to the button (reveal blink). */
  className?: string;
  /** Class applied to the glyph span (twinkle). */
  glyphClass?: string;
}

function Tile({ label, glyph, onClick, size, accent, accentRgb, disabled, active, pressed, className, glyphClass }: TileProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      aria-pressed={pressed}
      tabIndex={disabled ? -1 : 0}
      className={className}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
      style={{
        width: size, height: size, borderRadius: 10, padding: 0, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        background: active ? `rgba(${accentRgb},0.10)` : 'transparent',
        border: `1px solid ${active ? `rgba(${accentRgb},0.42)` : 'rgba(255,255,255,0.12)'}`,
        color: active ? accent : 'rgba(255,255,255,0.85)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.28 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        fontFamily: "'Cormorant Garamond','Garamond','Georgia',serif", fontSize: 22, lineHeight: 1,
        transition: PREFERS_REDUCED_MOTION ? 'none' : 'opacity 0.18s, color 0.18s, border-color 0.18s, background 0.18s',
      }}
    >
      <span aria-hidden="true" className={glyphClass}>{glyph}</span>
    </button>
  );
}

export default function BottomCluster({
  visible, pulse, accent, accentRgb, onAction, atInnermost, atOutermost, skyActive,
}: BottomClusterProps) {
  const mobile = useIsMobile();
  const size = mobile ? 44 : 48;

  return (
    <nav
      aria-label="View controls"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', zIndex: Z.controls,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
        left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8, padding: 6,
        background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none',
        transition: PREFERS_REDUCED_MOTION ? 'none' : 'opacity 0.6s ease',
      }}
    >
      <Tile label="Zoom out" glyph={'−'} size={size} accent={accent} accentRgb={accentRgb}
        disabled={atOutermost} onClick={() => onAction('zoom', 'out')} />
      <Tile label="Zoom in" glyph={'+'} size={size} accent={accent} accentRgb={accentRgb}
        disabled={atInnermost} onClick={() => onAction('zoom', 'in')} />
      <Tile label="Cinematic tour" glyph={'▶'} size={size} accent={accent} accentRgb={accentRgb}
        onClick={() => onAction('tour')} />
      <Tile label="Random destination" glyph={'⚄'} size={size} accent={accent} accentRgb={accentRgb}
        onClick={() => onAction('dice')} />
      <Tile label="Sky and constellations" glyph={'✦'} size={size} accent={accent} accentRgb={accentRgb}
        active={skyActive} pressed={skyActive}
        className={pulse ? 'sky-toggle-blink' : undefined}
        glyphClass={skyActive ? 'orrery-twinkle' : undefined}
        onClick={() => onAction('toggleSky')} />
      <Tile label="Open controls" glyph={'≡'} size={size} accent={accent} accentRgb={accentRgb}
        onClick={() => onAction('controls')} />
    </nav>
  );
}
