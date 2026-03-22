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
  desc: string;
}

export const SPACECRAFT: Spacecraft[] = [
  {
    name: 'Voyager 1',
    distAU: 165,
    ra: 255, dec: 12,
    speedAUyr: 3.57,
    launchYear: 1977,
    status: 'active',
    desc: 'Farthest human-made object. Crossed the heliopause in 2012, now in interstellar space. Still transmitting data on cosmic rays and magnetic fields.',
  },
  {
    name: 'Voyager 2',
    distAU: 139,
    ra: 296, dec: -57,
    speedAUyr: 3.25,
    launchYear: 1977,
    status: 'active',
    desc: 'Only spacecraft to visit all four gas/ice giants. Crossed the heliopause in 2018. Grand Tour trajectory using rare planetary alignment.',
  },
  {
    name: 'Pioneer 10',
    distAU: 137,
    ra: 84, dec: 26,
    speedAUyr: 2.54,
    launchYear: 1972,
    status: 'dead',
    desc: 'First spacecraft to traverse the asteroid belt and fly past Jupiter. Last contact 2003. Carries a gold plaque depicting humans and Earth\'s location.',
  },
  {
    name: 'Pioneer 11',
    distAU: 111,
    ra: 283, dec: -10,
    speedAUyr: 2.42,
    launchYear: 1973,
    status: 'dead',
    desc: 'First spacecraft to fly past Saturn. Lost contact 1995. Heading toward the constellation Aquila, will pass near a star in ~4 million years.',
  },
  {
    name: 'New Horizons',
    distAU: 63,
    ra: 293, dec: -20,
    speedAUyr: 2.83,
    launchYear: 2006,
    status: 'active',
    desc: 'First spacecraft to fly past Pluto (2015) and Kuiper Belt object Arrokoth (2019). Still operational, studying the outer heliosphere.',
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
  desc: string;
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
    desc: 'Nearest Sun-like star system. Binary pair orbiting every 80 years. 4.37 light-years away.',
  },
  {
    name: 'Proxima Centauri',
    distPC: 1.30, ra: 217.4, dec: -62.7,
    spectral: 'M5.5V', mag: 11.05,
    desc: 'Closest star to the Sun at 4.24 light-years. Red dwarf with at least two confirmed exoplanets, including Proxima b in the habitable zone.',
  },
  {
    name: "Barnard's Star",
    distPC: 1.83, ra: 269.5, dec: 4.7,
    spectral: 'M4V', mag: 9.54,
    desc: 'Fastest-moving star in Earth\'s sky (10.3"/yr). Red dwarf 5.96 light-years away. One confirmed exoplanet.',
  },
  {
    name: 'Wolf 359',
    distPC: 2.39, ra: 164.1, dec: 7.0,
    spectral: 'M6V', mag: 13.54,
    desc: 'One of the faintest known stars, only 0.1% of solar luminosity. 7.86 light-years away in Leo.',
  },
  {
    name: 'Lalande 21185',
    distPC: 2.55, ra: 165.8, dec: 35.9,
    spectral: 'M2V', mag: 7.52,
    desc: 'Bright red dwarf visible with binoculars. 8.31 light-years away in Ursa Major.',
  },
  {
    name: 'Sirius A/B',
    distPC: 2.64, ra: 101.3, dec: -16.7,
    spectral: 'A1V', mag: -1.46,
    desc: 'Brightest star in Earth\'s night sky. Binary system with a white dwarf companion. 8.6 light-years away.',
  },
  {
    name: 'Luyten 726-8 A/B',
    distPC: 2.68, ra: 24.8, dec: -18.0,
    spectral: 'M5.5V', mag: 12.54,
    desc: 'Binary red dwarf system in Cetus. UV Ceti (component B) is the prototype of flare stars. 8.73 light-years.',
  },
  {
    name: 'Ross 154',
    distPC: 2.97, ra: 283.3, dec: -23.8,
    spectral: 'M3.5V', mag: 10.43,
    desc: 'Active flare star in Sagittarius. 9.69 light-years away.',
  },
  {
    name: 'Ross 248',
    distPC: 3.16, ra: 355.5, dec: 44.2,
    spectral: 'M5.5V', mag: 12.29,
    desc: 'In ~33,000 years will become the closest star to the Sun for about 9,000 years. 10.3 light-years in Andromeda constellation.',
  },
  {
    name: 'Epsilon Eridani',
    distPC: 3.22, ra: 53.2, dec: -9.5,
    spectral: 'K2V', mag: 3.73,
    desc: 'Young Sun-like star with a debris disk. One of the nearest stars with a confirmed exoplanet. 10.5 light-years.',
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
  desc: string;
}

export const LOCAL_GROUP: GalaxyMarker[] = [
  {
    name: 'Large Magellanic Cloud',
    distKpc: 50, ra: 80.9, dec: -69.8,
    type: 'Irregular', mag: 0.9,
    desc: 'Largest satellite galaxy of the Milky Way. Visible to the naked eye from the Southern Hemisphere. Contains the Tarantula Nebula.',
  },
  {
    name: 'Small Magellanic Cloud',
    distKpc: 61, ra: 13.2, dec: -72.8,
    type: 'Irregular', mag: 2.7,
    desc: 'Dwarf irregular galaxy 200,000 light-years away. Being tidally disrupted by the Milky Way.',
  },
  {
    name: 'Andromeda (M31)',
    distKpc: 770, ra: 10.7, dec: 41.3,
    type: 'Spiral', mag: 3.4,
    desc: 'Nearest large galaxy. 2.5 million light-years away. On a collision course with the Milky Way in ~4.5 billion years.',
  },
  {
    name: 'Triangulum (M33)',
    distKpc: 840, ra: 23.5, dec: 30.7,
    type: 'Spiral', mag: 5.7,
    desc: 'Third-largest galaxy in the Local Group. 2.7 million light-years away. May be gravitationally bound to Andromeda.',
  },
  {
    name: 'Sagittarius Dwarf',
    distKpc: 24, ra: 283.8, dec: -30.5,
    type: 'Dwarf Spheroidal', mag: 4.5,
    desc: 'Currently merging with the Milky Way. Discovered in 1994. Its stars are being stripped into tidal streams.',
  },
  {
    name: 'Canis Major Dwarf',
    distKpc: 8, ra: 108.1, dec: -28.0,
    type: 'Irregular', mag: null,
    desc: 'Closest galaxy to Earth at ~25,000 light-years from the Sun. Being cannibalized by the Milky Way.',
  },
  {
    name: 'Ursa Minor Dwarf',
    distKpc: 66, ra: 227.3, dec: 67.2,
    type: 'Dwarf Spheroidal', mag: 11.9,
    desc: 'One of the faintest known galaxies. Satellite of the Milky Way, discovered in 1954.',
  },
  {
    name: 'Sculptor Dwarf',
    distKpc: 86, ra: 15.0, dec: -33.7,
    type: 'Dwarf Spheroidal', mag: 10.1,
    desc: 'One of the first dwarf spheroidal galaxies discovered (1937). Used to study dark matter distribution.',
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
