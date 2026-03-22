/**
 * Parse MPC CometEls.txt into optimized JSON for the orrery.
 *
 * MPC fixed-width format (columns from MPC documentation):
 *   Col  1-4:   Periodic comet number (blank for non-periodic)
 *   Col  5:     Orbit type (C=long-period, P=periodic, D=defunct, X=uncertain, I=interstellar, A=asteroid)
 *   Col  6-12:  Provisional designation packed
 *   Col  15-18: Year of perihelion passage
 *   Col  20-21: Month of perihelion passage
 *   Col  23-29: Day of perihelion passage (with decimals)
 *   Col  31-39: Perihelion distance q (AU)
 *   Col  42-49: Eccentricity e
 *   Col  52-59: Argument of perihelion w (deg, J2000)
 *   Col  62-69: Longitude of ascending node Om (deg, J2000)
 *   Col  72-79: Inclination i (deg, J2000)
 *   Col  82-85: Epoch (packed MPC format, yyyymmdd)
 *   Col  86-90: Absolute magnitude H
 *   Col  92-95: Slope parameter G (or k)
 *   Col  103-158: Name/designation
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const INPUT = resolve(process.env.HOME!, 'data/celestial/mpc/CometEls.txt');
const OUTPUT = resolve(import.meta.dirname, '..', 'public/data/comets.json');

// Notable comets: these always get included regardless of perihelion date
// Only the truly famous/historically significant comets
const NOTABLE_NAMES = new Set([
  'Halley', 'Hale-Bopp', 'Encke', 'Swift-Tuttle',
  'NEOWISE', 'Tsuchinshan-ATLAS',
  'Churyumov-Gerasimenko', 'Pons-Brooks',
  'Hyakutake', 'West', 'Kohoutek',
  'Wirtanen', 'Wild 2',
]);

function isNotable(name: string): boolean {
  for (const n of NOTABLE_NAMES) {
    if (name.includes(n)) return true;
  }
  return false;
}

// Convert calendar date to Julian Date
function calToJD(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
    Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

// Current JD for filtering
const now = new Date();
const currentJD = calToJD(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());

interface CometRecord {
  name: string;
  designation: string;
  q: number;       // perihelion distance (AU)
  e: number;       // eccentricity
  i: number;       // inclination (deg)
  om: number;      // longitude of ascending node (deg)
  w: number;       // argument of perihelion (deg)
  tp_jd: number;   // perihelion time (JD)
  epoch_jd: number; // epoch (JD)
  H: number;       // absolute magnitude
  type: string;    // C, P, D, etc.
  notable: boolean;
}

function parseEpoch(s: string): number {
  // MPC packed epoch format: YYYYMMDD as 8 digits
  s = s.trim();
  if (s.length === 8) {
    const y = parseInt(s.slice(0, 4));
    const m = parseInt(s.slice(4, 6));
    const d = parseInt(s.slice(6, 8));
    return calToJD(y, m, d);
  }
  return 0;
}

function parseLine(line: string): CometRecord | null {
  if (line.length < 103) return null;

  // Type character at position 4 (0-indexed)
  const orbType = line[4];
  if (!['C', 'P', 'D', 'I', 'A'].includes(orbType)) return null;

  const tpYear = parseInt(line.slice(14, 18).trim());
  const tpMonth = parseInt(line.slice(19, 21).trim());
  const tpDay = parseFloat(line.slice(22, 29).trim());

  if (isNaN(tpYear) || isNaN(tpMonth) || isNaN(tpDay)) return null;

  const q = parseFloat(line.slice(30, 39).trim());
  const e = parseFloat(line.slice(41, 49).trim());
  const w = parseFloat(line.slice(51, 59).trim());
  const om = parseFloat(line.slice(61, 69).trim());
  const i = parseFloat(line.slice(71, 79).trim());

  if (isNaN(q) || isNaN(e) || isNaN(w) || isNaN(om) || isNaN(i)) return null;

  const epochStr = line.slice(81, 89).trim();
  const epoch_jd = parseEpoch(epochStr);

  const H = parseFloat(line.slice(85, 90).trim()) || 10;

  const nameRaw = line.slice(102, 158).trim();
  // Clean up name: remove trailing reference info
  const name = nameRaw.replace(/\s{2,}.*$/, '').trim();

  const tp_jd = calToJD(tpYear, tpMonth, Math.floor(tpDay)) + (tpDay % 1);

  return {
    name,
    designation: line.slice(0, 12).trim(),
    q,
    e,
    i,
    om,
    w,
    tp_jd,
    epoch_jd: epoch_jd || tp_jd,
    H,
    type: orbType,
    notable: isNotable(name),
  };
}

// Read and parse
const lines = readFileSync(INPUT, 'utf-8').split('\n').filter(l => l.trim().length > 0);
const allComets: CometRecord[] = [];

for (const line of lines) {
  const comet = parseLine(line);
  if (comet) allComets.push(comet);
}

console.log(`Parsed ${allComets.length} comets from MPC data`);

// Filter: notable comets + comets with perihelion within 2 years + bright comets (H < 10)
const twoYearsJD = 2 * 365.25;
const filtered = allComets.filter(c => {
  if (c.notable) return true;
  // Any comet near perihelion (within 2 years)
  if (Math.abs(c.tp_jd - currentJD) < twoYearsJD) return true;
  // Bright comets regardless of timing
  if (c.H < 10) return true;
  return false;
});

// Deduplicate by name (keep the one with most recent epoch)
const byName = new Map<string, CometRecord>();
for (const c of filtered) {
  const key = c.name;
  const existing = byName.get(key);
  if (!existing || c.epoch_jd > existing.epoch_jd) {
    byName.set(key, c);
  }
}

const result = Array.from(byName.values())
  .sort((a, b) => a.q - b.q); // Sort by perihelion distance

console.log(`Filtered to ${result.length} comets (${result.filter(c => c.notable).length} notable)`);

// Write output
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
console.log(`Wrote ${OUTPUT}`);
