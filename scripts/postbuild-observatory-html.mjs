/**
 * Post-build: produce dist/observatory.html — a variant of index.html with
 * observatory-specific OG / Twitter metadata. Caddy serves this file for
 * /observatory/* requests via `try_files {path} /observatory.html /index.html`.
 *
 * The base bundle, assets, and data are shared; only the meta block changes.
 */
import { readFile, writeFile } from 'node:fs/promises';

const SRC = 'dist/index.html';
const DEST = 'dist/observatory.html';

const REPLACEMENTS = [
  // <title>
  [/<title>Orrery<\/title>/, '<title>Observatory · Orrery</title>'],

  // <meta name="description"> + og:description / twitter:description
  [
    /<meta name="description" content="[^"]*" \/>/,
    '<meta name="description" content="From Earth to the celestial sphere. 41,000 stars, 88 constellations, 110 deep sky objects, real catalog data — anchored at Earth\'s heliocentric position." />',
  ],
  [
    /<meta property="og:description" content="[^"]*" \/>/,
    '<meta property="og:description" content="From Earth to the celestial sphere. Stars, constellations, deep sky — real catalog data." />',
  ],
  [
    /<meta name="twitter:description" content="[^"]*" \/>/,
    '<meta name="twitter:description" content="From Earth to the celestial sphere. Stars, constellations, deep sky — real catalog data." />',
  ],

  // og:title / twitter:title
  [/<meta property="og:title" content="Orrery" \/>/, '<meta property="og:title" content="Observatory" />'],
  [/<meta name="twitter:title" content="Orrery" \/>/, '<meta name="twitter:title" content="Observatory" />'],

  // og:image / twitter:image — point at observatory variant
  [
    /<meta property="og:image" content="https:\/\/orrery\.solar\/orrery\/og-image\.png" \/>/,
    '<meta property="og:image" content="https://orrery.solar/orrery/og-image-observatory.png" />',
  ],
  [
    /<meta name="twitter:image" content="https:\/\/orrery\.solar\/orrery\/og-image\.png" \/>/,
    '<meta name="twitter:image" content="https://orrery.solar/orrery/og-image-observatory.png" />',
  ],

  // og:url
  [/<meta property="og:url" content="https:\/\/orrery\.solar" \/>/, '<meta property="og:url" content="https://orrery.solar/observatory/" />'],
];

let html = await readFile(SRC, 'utf-8');
let appliedCount = 0;
for (const [pattern, replacement] of REPLACEMENTS) {
  if (pattern.test(html)) {
    html = html.replace(pattern, replacement);
    appliedCount++;
  } else {
    console.warn(`  warn: no match for ${pattern}`);
  }
}
await writeFile(DEST, html);
console.log(`  observatory.html written (${appliedCount}/${REPLACEMENTS.length} replacements applied)`);
