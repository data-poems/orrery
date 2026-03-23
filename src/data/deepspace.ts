/*
 * Deep space data — Oort Cloud, spacecraft, nearby stars, Local Group galaxies
 *
 * All positions use heliocentric RA/Dec (J2000 epoch).
 * Distances: AU for spacecraft, parsecs for stars, kpc for galaxies.
 */

// ─── Oort Cloud ────────────────────────────────────────────────────────────────

export const OORT_CLOUD = {
  innerRadius: 2000,    // AU (inner edge, ~Hills Cloud)
  outerRadius: 50000,   // AU (estimated outer edge)
  particleCount: 5000,  // visual particles (instanced)
};

// ─── Spacecraft ────────────────────────────────────────────────────────────────

export interface Spacecraft {
  name: string;
  distAU: number;         // current heliocentric distance (~2026)
  ra: number;             // direction in degrees (J2000)
  dec: number;
  speedAUyr: number;      // AU per year
  launchYear: number;
  status: 'active' | 'dead';
}

export const SPACECRAFT: Spacecraft[] = [
  {
    name: 'Voyager 1',
    distAU: 165,
    ra: 255, dec: 12,
    speedAUyr: 3.57,
    launchYear: 1977,
    status: 'active',
  },
  {
    name: 'Voyager 2',
    distAU: 139,
    ra: 296, dec: -57,
    speedAUyr: 3.25,
    launchYear: 1977,
    status: 'active',
  },
  {
    name: 'Pioneer 10',
    distAU: 137,
    ra: 84, dec: 26,
    speedAUyr: 2.54,
    launchYear: 1972,
    status: 'dead',
  },
  {
    name: 'Pioneer 11',
    distAU: 111,
    ra: 283, dec: -10,
    speedAUyr: 2.42,
    launchYear: 1973,
    status: 'dead',
  },
  {
    name: 'New Horizons',
    distAU: 63,
    ra: 293, dec: -20,
    speedAUyr: 2.83,
    launchYear: 2006,
    status: 'active',
  },
];

// ─── Nearby Stars ──────────────────────────────────────────────────────────────

export interface NearStar {
  name: string;
  distPC: number;         // parsecs
  ra: number;             // degrees (J2000)
  dec: number;
  spectral: string;
  mag: number;            // apparent magnitude
}

// 1 parsec = 206265 AU
export const PC_TO_AU = 206265;

// Display cap: stars beyond this get directional arrows instead
export const STAR_DISPLAY_CAP_AU = 80000;

export const NEARBY_STARS: NearStar[] = [
  {
    name: 'Alpha Centauri A/B',
    distPC: 1.34, ra: 219.9, dec: -60.8,
    spectral: 'G2V/K1V', mag: -0.27,
  },
  {
    name: 'Proxima Centauri',
    distPC: 1.30, ra: 217.4, dec: -62.7,
    spectral: 'M5.5V', mag: 11.05,
  },
  {
    name: "Barnard's Star",
    distPC: 1.83, ra: 269.5, dec: 4.7,
    spectral: 'M4V', mag: 9.54,
  },
  {
    name: 'Wolf 359',
    distPC: 2.39, ra: 164.1, dec: 7.0,
    spectral: 'M6V', mag: 13.54,
  },
  {
    name: 'Lalande 21185',
    distPC: 2.55, ra: 165.8, dec: 35.9,
    spectral: 'M2V', mag: 7.52,
  },
  {
    name: 'Sirius A/B',
    distPC: 2.64, ra: 101.3, dec: -16.7,
    spectral: 'A1V', mag: -1.46,
  },
  {
    name: 'Luyten 726-8 A/B',
    distPC: 2.68, ra: 24.8, dec: -18.0,
    spectral: 'M5.5V', mag: 12.54,
  },
  {
    name: 'Ross 154',
    distPC: 2.97, ra: 283.3, dec: -23.8,
    spectral: 'M3.5V', mag: 10.43,
  },
  {
    name: 'Ross 248',
    distPC: 3.16, ra: 355.5, dec: 44.2,
    spectral: 'M5.5V', mag: 12.29,
  },
  {
    name: 'Epsilon Eridani',
    distPC: 3.22, ra: 53.2, dec: -9.5,
    spectral: 'K2V', mag: 3.73,
  },
];

// ─── Local Group Galaxies ──────────────────────────────────────────────────────

export interface GalaxyMarker {
  name: string;
  distKpc: number;        // kiloparsecs
  ra: number;             // degrees (J2000)
  dec: number;
  type: string;
  mag: number | null;     // apparent magnitude
}

export const LOCAL_GROUP: GalaxyMarker[] = [
  {
    name: 'Large Magellanic Cloud',
    distKpc: 50, ra: 80.9, dec: -69.8,
    type: 'Irregular', mag: 0.9,
  },
  {
    name: 'Small Magellanic Cloud',
    distKpc: 61, ra: 13.2, dec: -72.8,
    type: 'Irregular', mag: 2.7,
  },
  {
    name: 'Andromeda (M31)',
    distKpc: 770, ra: 10.7, dec: 41.3,
    type: 'Spiral', mag: 3.4,
  },
  {
    name: 'Triangulum (M33)',
    distKpc: 840, ra: 23.5, dec: 30.7,
    type: 'Spiral', mag: 5.7,
  },
  {
    name: 'Sagittarius Dwarf',
    distKpc: 24, ra: 283.8, dec: -30.5,
    type: 'Dwarf Spheroidal', mag: 4.5,
  },
  {
    name: 'Canis Major Dwarf',
    distKpc: 8, ra: 108.1, dec: -28.0,
    type: 'Irregular', mag: null,
  },
  {
    name: 'Ursa Minor Dwarf',
    distKpc: 66, ra: 227.3, dec: 67.2,
    type: 'Dwarf Spheroidal', mag: 11.9,
  },
  {
    name: 'Sculptor Dwarf',
    distKpc: 86, ra: 15.0, dec: -33.7,
    type: 'Dwarf Spheroidal', mag: 10.1,
  },
];

// ─── Coordinate conversion ────────────────────────────────────────────────────

const DEG = Math.PI / 180;
const ECLIPTIC_TILT = 23.4 * DEG;

/** Convert RA/Dec (degrees) + distance (AU) to heliocentric Three.js coords [x, y, z] */
export function heliocentricXYZ(raDeg: number, decDeg: number, distAU: number): [number, number, number] {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  // Equatorial → ecliptic rotation, then ecliptic → Three.js (x, z, -y)
  const xEq = distAU * Math.cos(dec) * Math.cos(ra);
  const yEq = distAU * Math.cos(dec) * Math.sin(ra);
  const zEq = distAU * Math.sin(dec);
  // Rotate by ecliptic tilt
  const xEc = xEq;
  const yEc = yEq * Math.cos(ECLIPTIC_TILT) + zEq * Math.sin(ECLIPTIC_TILT);
  const zEc = -yEq * Math.sin(ECLIPTIC_TILT) + zEq * Math.cos(ECLIPTIC_TILT);
  // Ecliptic → Three.js
  return [xEc, zEc, -yEc];
}

/** Place direction marker on celestial sphere at given radius */
export function raDecToSphere(raDeg: number, decDeg: number, r: number = 300): [number, number, number] {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const xEq = r * Math.cos(dec) * Math.cos(ra);
  const yEq = r * Math.cos(dec) * Math.sin(ra);
  const zEq = r * Math.sin(dec);
  const xEc = xEq;
  const yEc = yEq * Math.cos(ECLIPTIC_TILT) + zEq * Math.sin(ECLIPTIC_TILT);
  const zEc = -yEq * Math.sin(ECLIPTIC_TILT) + zEq * Math.cos(ECLIPTIC_TILT);
  return [xEc, zEc, -yEc];
}
