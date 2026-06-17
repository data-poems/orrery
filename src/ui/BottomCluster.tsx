/*
 * BottomCluster — the front-page control tiles.
 *
 * A compact, idle-fading pill centered on the bottom edge, left → right:
 * controls (gear) · zoom out · stargaze/sky · zoom in · dice. Stargaze sits dead
 * center, flanked by the zoom pair; the gear opens the full SidePanel and the
 * dice rolls a random destination. The zoom tiles grey out at the ends of the
 * scale ladder (− at the outermost rung, + at the innermost). Glyphs are serif
 * text (no emoji); the gear is an inline monochrome SVG.
 */
import { useIsMobile, Z } from './styles';
import { PREFERS_REDUCED_MOTION } from '../lib/motion';

/** Inline monochrome gear (currentColor) — avoids the ⚙ emoji-presentation risk. */
function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// All cluster glyphs are SVGs on the same centered 24×24 box, so they align
// pixel-perfectly with the gear (text glyphs sat on the font baseline and read
// off-center next to it).
function MinusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <line x1="6" y1="12" x2="18" y2="12" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="12" y1="6" x2="12" y2="18" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 C 13 9 15 11 22 12 C 15 13 13 15 12 22 C 11 15 9 13 2 12 C 9 11 11 9 12 2 Z" />
    </svg>
  );
}
function DiceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.5} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <g fill="currentColor" stroke="none">
        <circle cx="8.5" cy="8.5" r="1.3" />
        <circle cx="15.5" cy="8.5" r="1.3" />
        <circle cx="12" cy="12" r="1.3" />
        <circle cx="8.5" cy="15.5" r="1.3" />
        <circle cx="15.5" cy="15.5" r="1.3" />
      </g>
    </svg>
  );
}

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
  glyph: React.ReactNode;
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
      <span aria-hidden="true" className={glyphClass} style={{ display: 'grid', placeItems: 'center', lineHeight: 0 }}>{glyph}</span>
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
      {/* panel (gear) · zoom out · stargaze (sky) · zoom in · dice */}
      <Tile label="Open controls" glyph={<GearIcon />} size={size} accent={accent} accentRgb={accentRgb}
        onClick={() => onAction('controls')} />
      <Tile label="Zoom out" glyph={<MinusIcon />} size={size} accent={accent} accentRgb={accentRgb}
        disabled={atOutermost} onClick={() => onAction('zoom', 'out')} />
      <Tile label="Stargaze — sky and constellations" glyph={<StarIcon />} size={size} accent={accent} accentRgb={accentRgb}
        active={skyActive} pressed={skyActive}
        className={pulse ? 'sky-toggle-blink' : undefined}
        glyphClass={skyActive ? 'orrery-twinkle' : undefined}
        onClick={() => onAction('toggleSky')} />
      <Tile label="Zoom in" glyph={<PlusIcon />} size={size} accent={accent} accentRgb={accentRgb}
        disabled={atInnermost} onClick={() => onAction('zoom', 'in')} />
      <Tile label="Random destination" glyph={<DiceIcon />} size={size} accent={accent} accentRgb={accentRgb}
        onClick={() => onAction('dice')} />
    </nav>
  );
}
