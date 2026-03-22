/**
 * Parse IAU Meteor Data Center established_showers.txt into JSON.
 *
 * Format: pipe-delimited with quoted fields.
 * We extract one primary record per IAU shower number (the one with AdNo "000").
 * If no "000" exists, take the first record for that IAU number.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const INPUT = resolve(process.env.HOME!, 'data/celestial/meteors/established_showers.txt');
const OUTPUT = resolve(import.meta.dirname, '..', 'public/data/meteor-showers.json');

interface MeteorShower {
  iauNo: number;
  code: string;
  name: string;
  ra: number;       // right ascension of radiant (deg)
  dec: number;      // declination of radiant (deg)
  solarLonPeak: number;  // solar longitude at peak (deg)
  solarLonStart: number; // solar longitude at start (deg)
  solarLonEnd: number;   // solar longitude at end (deg)
  vg: number;       // geocentric velocity (km/s)
  parent: string;   // parent body
}

function parseField(s: string): string {
  return s.replace(/^"|"$/g, '').trim();
}

function parseNum(s: string): number {
  const cleaned = parseField(s);
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

const raw = readFileSync(INPUT, 'utf-8');
const lines = raw.split('\n');

// Find data lines (start with a quote)
const dataLines = lines.filter(l => l.startsWith('"'));

console.log(`Found ${dataLines.length} data lines`);

// Group by IAU number, keep primary record (AdNo = "000" or first)
const showerMap = new Map<number, MeteorShower>();

for (const line of dataLines) {
  const fields = line.split('|');
  if (fields.length < 20) continue;

  const iauNo = parseInt(parseField(fields[1]));
  const adNo = parseField(fields[2]);
  const code = parseField(fields[3]);
  const name = parseField(fields[6]);
  const solarLonStart = parseNum(fields[8]);
  const solarLonEnd = parseNum(fields[9]);
  const solarLonPeak = parseNum(fields[10]);
  const ra = parseNum(fields[11]);
  const dec = parseNum(fields[12]);
  const vg = parseNum(fields[15]);
  const parent = fields.length > 31 ? parseField(fields[31]) : '';

  if (isNaN(iauNo) || iauNo === 0) continue;
  if (ra === 0 && dec === 0) continue; // Skip entries without radiant data

  const shower: MeteorShower = {
    iauNo,
    code,
    name: name.replace(/\s+/g, ' ').trim(),
    ra,
    dec,
    solarLonPeak,
    solarLonStart: solarLonStart || solarLonPeak - 5,
    solarLonEnd: solarLonEnd || solarLonPeak + 5,
    vg,
    parent,
  };

  const existing = showerMap.get(iauNo);
  if (!existing) {
    showerMap.set(iauNo, shower);
  } else if (adNo === '000') {
    // Primary record overrides
    showerMap.set(iauNo, shower);
  }
}

const result = Array.from(showerMap.values())
  .filter(s => s.solarLonPeak > 0) // Must have valid peak
  .sort((a, b) => a.solarLonPeak - b.solarLonPeak);

console.log(`Extracted ${result.length} unique meteor showers`);

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
console.log(`Wrote ${OUTPUT}`);
