import { describe, expect, it } from 'vitest';
import { ZODIAC_UNICODE } from '../data/constellation-symbols';

// Characters that phones draw as color emoji by default: the pictographic
// planes, plus BMP symbols with Emoji_Presentation=Yes. A BMP symbol is allowed
// only when followed by U+FE0E (text presentation), written either as the
// character or as the escape sequence. U+FE0F (emoji presentation) is never
// allowed.
const ASTRAL_PICTOGRAPH = /[\u{1F000}-\u{1FAFF}]/u;
const BMP_EMOJI_DEFAULT = /[⌚⌛⏩-⏬⏰⏳◽◾☔☕♈-♓♿⚓⚡⚪⚫⚽⚾⛄⛅⛎⛔⛪⛲⛳⛵⛺⛽✅✊✋✨❌❎❓-❕❗➕-➗➰➿⬛⬜⭐⭕](?!︎|\\uFE0E)/u;

const sources: Record<string, string> = import.meta.glob(
  ['/src/**/*.{ts,tsx,css}', '!/src/**/*.test.{ts,tsx}', '/index.html', '/public/privacy.html'],
  { query: '?raw', import: 'default', eager: true },
);

describe('no emoji in the interface', () => {
  it('scans the interface source', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20);
  });

  it('ships no character that renders as a color emoji', () => {
    const hits: string[] = [];
    for (const [file, text] of Object.entries(sources)) {
      text.split('\n').forEach((line: string, i: number) => {
        if (ASTRAL_PICTOGRAPH.test(line) || BMP_EMOJI_DEFAULT.test(line) || line.includes('️')) {
          hits.push(`${file}:${i + 1}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });

  it('draws control symbols as SVG icons, not font characters', () => {
    // Close crosses, arrows and stars in controls come from ./icons.tsx; a font
    // symbol sits off-center, changes shape between fonts and can draw as emoji.
    const fontSymbol = /[✕✖✦✧➔➜➝]|\\u(2715|2716|2726|2727|2192|00[dD]7)|\{'[×→]'\}|^\s*[×→✕]\s*$/;
    const hits: string[] = [];
    for (const [file, text] of Object.entries(sources)) {
      text.split('\n').forEach((line: string, i: number) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        if (fontSymbol.test(line)) hits.push(`${file}:${i + 1}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it('draws every zodiac glyph as text, not emoji', () => {
    const glyphs = Object.values(ZODIAC_UNICODE);
    expect(glyphs).toHaveLength(12);
    for (const g of glyphs) expect(g.endsWith('︎')).toBe(true);
  });
});
