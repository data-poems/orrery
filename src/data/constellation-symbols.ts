/*
 * Zodiac SVG symbols — formal astronomical glyph style.
 *
 * Refined calligraphic paths based on classical astrological typography.
 * Designed for rendering as stroke-only at various sizes with drop-shadow glow.
 *
 * To revert: cp src/data/constellation-symbols.ts.bak src/data/constellation-symbols.ts
 */

export interface ConstellationSymbolSvg {
  viewBox: string;
  paths: string[];
}

const VB = '0 0 100 100';

export const ZODIAC_SYMBOLS: Record<string, ConstellationSymbolSvg> = {
  // Aries ♈ — ram's horns, elegant sweep
  Ari: { viewBox: VB, paths: [
    'M50 88 C50 62 48 46 38 32 C32 24 24 20 18 22 C12 24 8 32 10 40 C12 46 18 50 24 48',
    'M50 88 C50 62 52 46 62 32 C68 24 76 20 82 22 C88 24 92 32 90 40 C88 46 82 50 76 48',
  ] },
  // Taurus ♉ — bull's head, open arc with circle
  Tau: { viewBox: VB, paths: [
    'M50 72 A20 20 0 1 1 50 32 A20 20 0 1 1 50 72',
    'M22 42 C22 28 34 14 50 14 C66 14 78 28 78 42',
    'M22 42 C18 48 14 42 16 36',
    'M78 42 C82 48 86 42 84 36',
  ] },
  // Gemini ♊ — twin pillars with crossbars
  Gem: { viewBox: VB, paths: [
    'M24 16 C36 16 64 16 76 16',
    'M24 84 C36 84 64 84 76 84',
    'M34 16 C38 32 38 68 34 84',
    'M66 16 C62 32 62 68 66 84',
  ] },
  // Cancer ♋ — two interlocking spirals (the standard "69-rotated" glyph)
  Cnc: { viewBox: VB, paths: [
    'M26 36 C14 36 8 46 8 54 C8 66 18 74 30 74 C40 74 48 68 48 58 C48 48 40 42 30 42',
    'M74 64 C86 64 92 54 92 46 C92 34 82 26 70 26 C60 26 52 32 52 42 C52 52 60 58 70 58',
  ] },
  // Leo ♌ — lion's mane with tail curl
  Leo: { viewBox: VB, paths: [
    'M22 68 C30 52 44 42 58 40 C70 38 80 30 82 20 C84 12 78 6 72 8 C66 10 62 16 64 24 C66 32 74 36 82 34',
    'M22 68 C16 76 14 86 20 92 C26 98 36 96 40 88 C44 80 42 70 34 66',
  ] },
  // Virgo ♍ — sheaf of wheat, vertical strokes with tail
  Vir: { viewBox: VB, paths: [
    'M16 76 L16 26',
    'M16 30 C24 30 30 38 30 48 L30 76',
    'M30 30 C38 30 44 38 44 48 L44 76',
    'M44 30 C52 30 58 38 58 48 L58 76',
    'M58 76 C58 86 66 90 74 86 C80 82 84 76 82 68',
    'M72 62 L82 52',
  ] },
  // Libra ♎ — scales, horizontal beam with arc
  Lib: { viewBox: VB, paths: [
    'M16 68 L84 68',
    'M24 52 L76 52',
    'M24 52 C28 36 38 26 50 26 C62 26 72 36 76 52',
  ] },
  // Scorpio ♏ — like Virgo but with arrow tail
  Sco: { viewBox: VB, paths: [
    'M16 76 L16 26',
    'M16 30 C24 30 30 38 30 48 L30 76',
    'M30 30 C38 30 44 38 44 48 L44 76',
    'M44 30 C52 30 58 38 58 48 L58 76',
    'M58 76 L72 76 L82 66',
    'M82 66 L76 76',
    'M82 66 L82 76',
  ] },
  // Sagittarius ♐ — arrow diagonal with crossbar
  Sgr: { viewBox: VB, paths: [
    'M20 80 L80 20',
    'M56 20 L80 20 L80 44',
    'M32 52 L52 32',
  ] },
  // Capricorn ♑ — sea-goat: V-shaped goat horns leading into a fish-tail loop
  Cap: { viewBox: VB, paths: [
    'M16 28 L40 76 L52 52',
    'M52 52 C60 36 76 36 84 48 C92 60 86 78 70 78 C58 78 50 70 52 52',
  ] },
  // Aquarius ♒ — double wave
  Aqr: { viewBox: VB, paths: [
    'M12 40 C18 30 24 30 30 40 C36 50 42 50 48 40 C54 30 60 30 66 40 C72 50 78 50 84 40',
    'M12 64 C18 54 24 54 30 64 C36 74 42 74 48 64 C54 54 60 54 66 64 C72 74 78 74 84 64',
  ] },
  // Pisces ♓ — two crescents opening outward, joined by a horizontal bar
  Psc: { viewBox: VB, paths: [
    'M14 18 C26 28 28 42 28 50 C28 58 26 72 14 82',
    'M86 18 C74 28 72 42 72 50 C72 58 74 72 86 82',
    'M28 50 L72 50',
  ] },
};

export function isZodiac(id: string): boolean {
  return id in ZODIAC_SYMBOLS;
}
