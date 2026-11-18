/*
 * Zodiac glyphs — Unicode astrological symbols, U+2648 Aries to U+2653 Pisces.
 *
 * Earlier revisions of this file shipped hand-traced SVG bezier paths for each
 * sign; that approach drifted from the canonical glyph shapes (Pisces, Cancer,
 * Capricorn each had to be re-fixed at one point) so we now render the
 * Unicode characters directly. The font stack in `src/scene/Stars.tsx` picks
 * a symbol font that contains the zodiac block; the bezier-path rendering is
 * gone.
 *
 * Each glyph carries U+FE0E (text presentation). U+2648–U+2653 default to
 * emoji presentation, so without it iOS and Android draw color emoji tiles.
 */

/**
 * Authoritative Unicode astrological glyphs for the 12 zodiac constellations,
 * keyed by IAU 3-letter abbreviation.
 */
export const ZODIAC_UNICODE: Record<string, string> = {
  Ari: '♈\uFE0E',
  Tau: '♉\uFE0E',
  Gem: '♊\uFE0E',
  Cnc: '♋\uFE0E',
  Leo: '♌\uFE0E',
  Vir: '♍\uFE0E',
  Lib: '♎\uFE0E',
  Sco: '♏\uFE0E',
  Sgr: '♐\uFE0E',
  Cap: '♑\uFE0E',
  Aqr: '♒\uFE0E',
  Psc: '♓\uFE0E',
};

