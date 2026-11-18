// Shared inline monochrome icons (currentColor) on the 24×24 box the rest of the
// interface uses. Font symbols such as U+2715, U+2192 and U+2726 sit on the text
// baseline, change shape from font to font and, on some phones, draw as color
// emoji, so every symbol in a control is drawn here instead.

/** The four-point star: the Sky tile, and the Sky row in Controls. */
export function StarIcon({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 C 13 9 15 11 22 12 C 15 13 13 15 12 22 C 11 15 9 13 2 12 C 9 11 11 9 12 2 Z" />
    </svg>
  );
}

/** Close: two crossed strokes, the same weight as the other control icons. */
export function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

/** A link that leaves for another site. */
export function ArrowRightIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ verticalAlign: '-0.1em', marginLeft: '0.3em' }}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}
