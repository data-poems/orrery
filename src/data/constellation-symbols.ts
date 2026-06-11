/*
 * Zodiac glyphs — Unicode astrological symbols (♈♉♊♋♌♍♎♏♐♑♒♓).
 *
 * Earlier revisions of this file shipped hand-traced SVG bezier paths for each
 * sign; that approach drifted from the canonical glyph shapes (Pisces, Cancer,
 * Capricorn each had to be re-fixed at one point) so we now render the
 * Unicode characters directly. The font stack in `src/scene/Stars.tsx` picks
 * a symbol font that contains the zodiac block; the bezier-path rendering is
 * gone.
 */

/**
 * Authoritative Unicode astrological glyphs for the 12 zodiac constellations,
 * keyed by IAU 3-letter abbreviation.
 */
export const ZODIAC_UNICODE: Record<string, string> = {
  Ari: '♈',
  Tau: '♉',
  Gem: '♊',
  Cnc: '♋',
  Leo: '♌',
  Vir: '♍',
  Lib: '♎',
  Sco: '♏',
  Sgr: '♐',
  Cap: '♑',
  Aqr: '♒',
  Psc: '♓',
};

