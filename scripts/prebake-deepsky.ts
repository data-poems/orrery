/**
 * Prebake deep sky objects from NGC/IC catalog → public/data/deepsky.json
 *
 * Extracts Messier objects + named NGC/IC objects with positions and metadata.
 * Source: ~/data/celestial/deepsky/NGC.csv (OpenNGC catalog)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(process.env.HOME || '~', 'data/celestial/deepsky/NGC.csv');
const OUT = resolve(import.meta.dirname, '..', 'public/data/deepsky.json');

// Common names for well-known objects
const COMMON_NAMES: Record<string, string> = {
  M001: 'Crab Nebula', M008: 'Lagoon Nebula', M013: 'Great Hercules Cluster',
  M016: 'Eagle Nebula', M017: 'Omega Nebula', M020: 'Trifid Nebula',
  M027: 'Dumbbell Nebula', M031: 'Andromeda Galaxy', M033: 'Triangulum Galaxy',
  M042: 'Great Orion Nebula', M043: "De Mairan's Nebula", M044: 'Beehive Cluster',
  M045: 'Pleiades', M051: 'Whirlpool Galaxy', M057: 'Ring Nebula',
  M063: 'Sunflower Galaxy', M064: 'Black Eye Galaxy', M074: 'Phantom Galaxy',
  M076: 'Little Dumbbell', M078: 'Reflection Nebula', M081: "Bode's Galaxy",
  M082: 'Cigar Galaxy', M083: 'Southern Pinwheel', M087: 'Virgo A',
  M097: 'Owl Nebula', M101: 'Pinwheel Galaxy', M104: 'Sombrero Galaxy',
  M106: 'NGC 4258', M110: 'Satellite of Andromeda',
};

// NGC type → rendering category
function classifyType(t: string): string {
  if (t === 'G' || t === 'GPair' || t === 'GTrpl' || t === 'GGroup') return 'galaxy';
  if (t === 'GCl') return 'globular';
  if (t === 'OCl' || t === '*Ass' || t === 'Cl+N') return 'open';
  if (t === 'PN' || t === 'Neb' || t === 'HII' || t === 'RfN' || t === 'SNR' || t === 'EmN') return 'nebula';
  if (t === '**' || t === '*') return 'star';
  return 'other';
}

// Parse RA string "HH:MM:SS.ss" → degrees
function parseRA(s: string): number {
  const [h, m, sec] = s.split(':').map(Number);
  return (h + m / 60 + (sec || 0) / 3600) * 15;
}

// Parse Dec string "+DD:MM:SS.s" → degrees
function parseDec(s: string): number {
  const sign = s.startsWith('-') ? -1 : 1;
  const abs = s.replace(/^[+-]/, '');
  const [d, m, sec] = abs.split(':').map(Number);
  return sign * (d + m / 60 + (sec || 0) / 3600);
}

interface DeepSkyObj {
  id: string;
  name: string;
  type: string;
  ra: number;
  dec: number;
  mag: number;
  con: string;
  size: number;
}

const csv = readFileSync(SRC, 'utf-8');
const lines = csv.split('\n').slice(1); // skip header

const objects: DeepSkyObj[] = [];
const seen = new Set<string>();

for (const line of lines) {
  if (!line.trim()) continue;
  const cols = line.split(';');
  const name = cols[0];   // NGC/IC name
  const type = cols[1];
  const raStr = cols[2];
  const decStr = cols[3];
  const con = cols[4];
  const majAx = cols[5];
  const vMag = cols[9];
  const messier = cols[23]; // M column

  if (!raStr || !decStr) continue;

  // Only include Messier objects + bright named NGC objects
  const mNum = messier ? `M${messier.padStart(3, '0')}` : null;
  const mag = vMag ? parseFloat(vMag) : 99;
  const renderType = classifyType(type);

  // Skip stars and unknowns
  if (renderType === 'star' || renderType === 'other') continue;

  // Include if: Messier object, or bright (mag < 8) NGC/IC object
  if (!mNum && mag > 8) continue;

  const id = mNum || name;
  if (seen.has(id)) continue;
  seen.add(id);

  const ra = parseRA(raStr);
  const dec = parseDec(decStr);
  const size = majAx ? parseFloat(majAx) : 1;

  // Look up common name from our table or from catalog
  const commonName = (mNum && COMMON_NAMES[mNum]) || cols[28] || '';

  objects.push({
    id,
    name: commonName,
    type: renderType,
    ra,
    dec,
    mag: mag < 90 ? Math.round(mag * 10) / 10 : 10,
    con: con || '',
    size: Math.round(size * 10) / 10,
  });
}

// Sort: Messier first, then by magnitude
objects.sort((a, b) => {
  const aM = a.id.startsWith('M') ? 0 : 1;
  const bM = b.id.startsWith('M') ? 0 : 1;
  if (aM !== bM) return aM - bM;
  return a.mag - b.mag;
});

writeFileSync(OUT, JSON.stringify(objects, null, 0));
console.log(`Deep sky: ${objects.length} objects (${objects.filter(o => o.id.startsWith('M')).length} Messier) → ${OUT}`);
