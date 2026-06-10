/**
 * Satellite TLE fetching and SGP4 propagation wrapper.
 *
 * Fetches TLE data from CelesTrak, propagates via satellite.js,
 * converts ECI to heliocentric coords offset from Earth.
 */

import * as satellite from 'satellite.js';

export interface SatelliteRecord {
  name: string;
  noradId: number;
  satrec: satellite.SatRec;
}

export interface SatellitePosition {
  name: string;
  noradId: number;
  pos: [number, number, number]; // heliocentric [x, y_up, z]
  alt: number;   // altitude km
  vel: number;   // velocity km/s
}

const LOCAL_TLE = import.meta.env.BASE_URL + 'data/stations.tle';
const CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle';

/**
 * Fetch TLE data — CelesTrak first (fresh), bundled `stations.tle` fallback.
 */
export async function fetchTLEs(): Promise<SatelliteRecord[]> {
  let text: string;
  try {
    const resp = await fetch(CELESTRAK_URL);
    if (!resp.ok) throw new Error(`CelesTrak: ${resp.status}`);
    text = await resp.text();
  } catch {
    const local = await fetch(LOCAL_TLE);
    if (!local.ok) throw new Error('TLE unavailable');
    text = await local.text();
  }

  const lines = text.trim().split('\n').map(l => l.trim());
  const records: SatelliteRecord[] = [];

  // TLE format: 3 lines per satellite (name, line1, line2)
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    if (!line1?.startsWith('1') || !line2?.startsWith('2')) continue;

    try {
      const satrec = satellite.twoline2satrec(line1, line2);
      const noradId = parseInt(line2.slice(2, 7).trim());
      records.push({ name, noradId, satrec });
    } catch {
      // Skip malformed TLEs
    }
  }

  return records;
}

/**
 * Propagate satellite position and convert to heliocentric coords.
 * Earth position must be provided as [x, y_up, z] in AU.
 * Satellite distance is exaggerated to ~0.03 AU from Earth for visibility.
 */
export function propagateSatellite(
  rec: SatelliteRecord,
  date: Date,
  earthPos: [number, number, number],
): SatellitePosition | null {
  const posVel = satellite.propagate(rec.satrec, date);
  if (!posVel || !posVel.position || typeof posVel.position === 'boolean') return null;
  if (!posVel.velocity || typeof posVel.velocity === 'boolean') return null;

  const eciPos = posVel.position as satellite.EciVec3<number>;
  const eciVel = posVel.velocity as satellite.EciVec3<number>;

  // ECI position in km
  const altKm = Math.sqrt(eciPos.x ** 2 + eciPos.y ** 2 + eciPos.z ** 2) - 6371; // approx
  const velKms = Math.sqrt(eciVel.x ** 2 + eciVel.y ** 2 + eciVel.z ** 2);

  // Normalize ECI direction and exaggerate distance
  const eciLen = Math.sqrt(eciPos.x ** 2 + eciPos.y ** 2 + eciPos.z ** 2);
  const EXAGGERATION_AU = 0.03; // Show satellites at ~0.03 AU from Earth

  // Convert ECI direction to scene coords: ECI (x,y,z) → scene [x, z, -y]
  const nx = eciPos.x / eciLen;
  const ny = eciPos.y / eciLen;
  const nz = eciPos.z / eciLen;

  return {
    name: rec.name,
    noradId: rec.noradId,
    pos: [
      earthPos[0] + nx * EXAGGERATION_AU,
      earthPos[1] + nz * EXAGGERATION_AU, // ECI z → scene y (up)
      earthPos[2] - ny * EXAGGERATION_AU, // ECI y → scene -z
    ],
    alt: Math.max(0, altKm),
    vel: velKms,
  };
}
