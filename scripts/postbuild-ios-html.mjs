/**
 * Post-build: keep the iOS bundle self-contained by removing remote font
 * hints/stylesheet requests from the Capacitor copy of index.html.
 */
import { readFile, writeFile } from 'node:fs/promises';

const INDEX = 'dist/index.html';

let html = await readFile(INDEX, 'utf-8');
html = html
  .replace(/\n\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/g, '')
  .replace(/\n\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/g, '')
  .replace(/\n\s*<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+" rel="stylesheet">/g, '');

await writeFile(INDEX, html);
console.log('  iOS index.html stripped of remote font requests');
