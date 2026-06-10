import { describe, it, expect } from 'vitest';

const FONT_PRECONNECT = /\n\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/g;
const FONT_STYLESHEET = /\n\s*<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+" rel="stylesheet">/g;

function stripFonts(html) {
  return html
    .replace(FONT_PRECONNECT, '')
    .replace(/\n\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/g, '')
    .replace(FONT_STYLESHEET, '');
}

describe('postbuild-ios-html font strip', () => {
  it('removes Google Fonts links from sample HTML', () => {
    const sample = `<html><head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond" rel="stylesheet">
</head></html>`;
    const out = stripFonts(sample);
    expect(out).not.toMatch(/fonts\.googleapis/);
    expect(out).not.toMatch(/fonts\.gstatic/);
  });
});
