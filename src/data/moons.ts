/*
 * Moon definitions — major satellites of the solar system
 *
 * Simplified circular orbits for visual display.
 * Parent indices reference ALL_BODIES from planets.ts.
 */

export interface MoonDef {
  name: string;
  parent: number;      // index in ALL_BODIES
  a: number;           // orbital distance (AU from parent)
  period: number;      // orbital period (days)
  radius: number;      // visual radius (scene units, exaggerated)
  color: string;       // fallback color
  i?: number;          // orbital inclination (degrees)
}

// Parent indices in ALL_BODIES: Mercury=0, Venus=1, Earth=2, Mars=3,
// Jupiter=4, Saturn=5, Uranus=6, Neptune=7, Ceres=8, Pluto=9, Eris=10

export const MOONS: MoonDef[] = [
  // Earth (2) — radius 0.06
  { name: 'Moon', parent: 2, a: 0.10, period: 27.322, radius: 0.015, color: '#c0c0c0' },

  // Mars (3) — radius 0.045
  { name: 'Phobos', parent: 3, a: 0.06, period: 0.319, radius: 0.005, color: '#8a7d6b', i: 1.1 },
  { name: 'Deimos', parent: 3, a: 0.09, period: 1.263, radius: 0.004, color: '#9a8d7b', i: 1.8 },

  // Jupiter (4) — radius 0.16, all moons must orbit outside planet sphere
  { name: 'Amalthea', parent: 4, a: 0.20, period: 0.498, radius: 0.004, color: '#a05030', i: 0.4 },
  { name: 'Io', parent: 4, a: 0.24, period: 1.769, radius: 0.012, color: '#e8c840' },
  { name: 'Europa', parent: 4, a: 0.28, period: 3.551, radius: 0.011, color: '#c8c0b0' },
  { name: 'Ganymede', parent: 4, a: 0.33, period: 7.155, radius: 0.018, color: '#a0a098' },
  { name: 'Callisto', parent: 4, a: 0.38, period: 16.689, radius: 0.016, color: '#706860' },

  // Saturn (5) — radius 0.13, rings extend to radius*2.6 = 0.338, moons outside rings
  { name: 'Mimas', parent: 5, a: 0.36, period: 0.942, radius: 0.005, color: '#d0d0d0', i: 1.5 },
  { name: 'Enceladus', parent: 5, a: 0.39, period: 1.370, radius: 0.007, color: '#f0f0f0' },
  { name: 'Tethys', parent: 5, a: 0.42, period: 1.888, radius: 0.008, color: '#e0e0e0', i: 1.1 },
  { name: 'Dione', parent: 5, a: 0.45, period: 2.737, radius: 0.008, color: '#c8c8c8' },
  { name: 'Rhea', parent: 5, a: 0.49, period: 4.518, radius: 0.009, color: '#c8c0b8' },
  { name: 'Titan', parent: 5, a: 0.53, period: 15.945, radius: 0.017, color: '#d4a040' },
  { name: 'Hyperion', parent: 5, a: 0.56, period: 21.277, radius: 0.004, color: '#b0a090', i: 0.4 },
  { name: 'Iapetus', parent: 5, a: 0.62, period: 79.322, radius: 0.009, color: '#806040', i: 14.7 },

  // Uranus (6) — radius 0.09, moons outside planet sphere
  { name: 'Miranda', parent: 6, a: 0.12, period: 1.413, radius: 0.006, color: '#b0b0b0', i: 4.3 },
  { name: 'Ariel', parent: 6, a: 0.15, period: 2.520, radius: 0.008, color: '#c0c0c0' },
  { name: 'Umbriel', parent: 6, a: 0.18, period: 4.144, radius: 0.008, color: '#707070' },
  { name: 'Titania', parent: 6, a: 0.21, period: 8.706, radius: 0.009, color: '#a8a0a0' },
  { name: 'Oberon', parent: 6, a: 0.25, period: 13.463, radius: 0.008, color: '#908888' },

  // Neptune (7) — radius 0.085, moons outside planet sphere
  { name: 'Proteus', parent: 7, a: 0.11, period: 1.122, radius: 0.005, color: '#808080' },
  { name: 'Triton', parent: 7, a: 0.18, period: 5.877, radius: 0.012, color: '#a0b8c0' },
  { name: 'Nereid', parent: 7, a: 0.30, period: 360.14, radius: 0.004, color: '#909090', i: 7.2 },

  // Pluto (9) — radius 0.02, all moons already outside
  { name: 'Charon', parent: 9, a: 0.05, period: 6.387, radius: 0.010, color: '#908880' },
  { name: 'Styx', parent: 9, a: 0.06, period: 20.162, radius: 0.002, color: '#a8a8a8' },
  { name: 'Nix', parent: 9, a: 0.07, period: 24.856, radius: 0.003, color: '#b0b0b0' },
  { name: 'Kerberos', parent: 9, a: 0.08, period: 32.168, radius: 0.002, color: '#909090' },
  { name: 'Hydra', parent: 9, a: 0.09, period: 38.202, radius: 0.003, color: '#a0a0a0' },

  // Eris (10) — radius 0.02, moon already outside
  { name: 'Dysnomia', parent: 10, a: 0.05, period: 15.774, radius: 0.004, color: '#888888' },
];

/** Get all moons orbiting a given parent body index */
export function getMoonsForPlanet(parentIdx: number): MoonDef[] {
  return MOONS.filter(m => m.parent === parentIdx);
}
