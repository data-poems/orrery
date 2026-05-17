/**
 * Process HYG star catalog into optimized GeoJSON for the orrery.
 *
 * Input: ~/data/celestial/hyg/hygdata_v41.csv (119K stars)
 * Output: public/data/stars.hyg-8.json (mag <= 8.0, ~41K stars, replaces stars.8.json)
 *
 * Adds proper names, Bayer designations, spectral types, and constellation IDs
 * compared to the d3-celestial stars.8.json which only has mag/bv/coordinates.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const INPUT = resolve(process.env.HOME!, 'data/celestial/hyg/hygdata_v41.csv');
const OUTPUT_DESKTOP = resolve(import.meta.dirname, '..', 'public/data/stars.hyg-8.json');
const OUTPUT_MOBILE = resolve(import.meta.dirname, '..', 'public/data/stars.mobile.json');

const MAX_MAG_DESKTOP = 8.0;
const MAX_MAG_MOBILE = 6.5;

const raw = readFileSync(INPUT, 'utf-8');
const lines = raw.split('\n');
const header = lines[0].split(',').map(h => h.replace(/"/g, ''));

// Find column indices
const idx = (name: string) => header.indexOf(name);
const iRA = idx('ra');
const iDec = idx('dec');
const iMag = idx('mag');
const iCI = idx('ci');    // color index (B-V)
const iProper = idx('proper');
const iBayer = idx('bayer');
const iCon = idx('con');
const iSpect = idx('spect');

interface StarFeature {
  type: 'Feature';
  id: number;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [RA in degrees, Dec in degrees]
  };
  properties: {
    mag: number;
    bv: number;
    name?: string;
    bayer?: string;
    con?: string;
    spect?: string;
  };
}

const featuresDesktop: StarFeature[] = [];
const featuresMobile: StarFeature[] = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;

  // CSV parse (handles quoted fields)
  const fields = line.split(',').map(f => f.replace(/"/g, ''));

  const mag = parseFloat(fields[iMag]);
  if (isNaN(mag) || mag > MAX_MAG_DESKTOP) continue;

  // Skip Sol (the Sun) — it's at RA=0, Dec=0 with mag -26.7
  if (mag < -20) continue;

  const raHours = parseFloat(fields[iRA]);
  const dec = parseFloat(fields[iDec]);
  if (isNaN(raHours) || isNaN(dec)) continue;

  // Convert RA from hours to degrees
  const raDeg = raHours * 15;
  const bv = parseFloat(fields[iCI]) || 0;
  const proper = fields[iProper] || '';
  const bayer = fields[iBayer] || '';
  const con = fields[iCon] || '';
  const spect = fields[iSpect] || '';

  const props: StarFeature['properties'] = { mag, bv };
  if (proper) props.name = proper;
  if (bayer) props.bayer = bayer;
  if (con) props.con = con;
  if (spect && mag < 6) props.spect = spect; // Only include spectral type for visible stars

  const feature: StarFeature = {
    type: 'Feature',
    id: i,
    geometry: {
      type: 'Point',
      coordinates: [raDeg, dec],
    },
    properties: props,
  };
  featuresDesktop.push(feature);
  if (mag <= MAX_MAG_MOBILE) featuresMobile.push(feature);
}

function writeCatalog(path: string, features: StarFeature[], maxMag: number) {
  const geojson = { type: 'FeatureCollection', features };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(geojson));
  console.log(`Wrote ${path} — ${features.length} stars (mag <= ${maxMag}, ${(JSON.stringify(geojson).length / 1024 / 1024).toFixed(1)} MB)`);
}

console.log(`Processed ${featuresDesktop.length} desktop stars (mag <= ${MAX_MAG_DESKTOP})`);
console.log(`  Mobile subset: ${featuresMobile.length} stars (mag <= ${MAX_MAG_MOBILE})`);
writeCatalog(OUTPUT_DESKTOP, featuresDesktop, MAX_MAG_DESKTOP);
writeCatalog(OUTPUT_MOBILE, featuresMobile, MAX_MAG_MOBILE);
