/**
 * Fetch fresh ISS/stations TLEs from CelesTrak into public/data/stations.tle.
 * Run via `pnpm prebake` (included in prebake pipeline).
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const OUT = resolve(import.meta.dirname, '..', 'public/data/stations.tle');
const URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle';

async function main() {
  const resp = await fetch(URL);
  if (!resp.ok) throw new Error(`CelesTrak TLE: HTTP ${resp.status}`);
  const text = await resp.text();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, text.trim() + '\n');
  console.log(`Wrote ${OUT} (${text.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
