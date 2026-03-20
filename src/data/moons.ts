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
  desc: string;        // short description
  i?: number;          // orbital inclination (degrees)
}

// Parent indices in ALL_BODIES: Mercury=0, Venus=1, Earth=2, Mars=3,
// Jupiter=4, Saturn=5, Uranus=6, Neptune=7, Ceres=8, Pluto=9, Eris=10

export const MOONS: MoonDef[] = [
  // Earth (2)
  { name: 'Moon', parent: 2, a: 0.09, period: 27.322, radius: 0.015, color: '#c0c0c0', desc: 'Earth\'s only natural satellite. Its gravitational pull drives ocean tides.' },

  // Mars (3)
  { name: 'Phobos', parent: 3, a: 0.04, period: 0.319, radius: 0.005, color: '#8a7d6b', desc: 'Tiny, potato-shaped moon. Orbits closer than any other known moon to its planet.', i: 1.1 },
  { name: 'Deimos', parent: 3, a: 0.06, period: 1.263, radius: 0.004, color: '#9a8d7b', desc: 'Mars\'s smaller outer moon. Smooth surface with few craters.', i: 1.8 },

  // Jupiter (4)
  { name: 'Io', parent: 4, a: 0.12, period: 1.769, radius: 0.012, color: '#e8c840', desc: 'Most volcanically active body in the solar system. Over 400 active volcanoes.' },
  { name: 'Europa', parent: 4, a: 0.16, period: 3.551, radius: 0.011, color: '#c8c0b0', desc: 'Ice-covered ocean world. A top candidate for extraterrestrial life.' },
  { name: 'Ganymede', parent: 4, a: 0.20, period: 7.155, radius: 0.018, color: '#a0a098', desc: 'Largest moon in the solar system. Bigger than Mercury. Has its own magnetic field.' },
  { name: 'Callisto', parent: 4, a: 0.25, period: 16.689, radius: 0.016, color: '#706860', desc: 'Most heavily cratered object in the solar system. May have a subsurface ocean.' },

  // Saturn (5)
  { name: 'Titan', parent: 5, a: 0.20, period: 15.945, radius: 0.017, color: '#d4a040', desc: 'Second largest moon. Only moon with a thick atmosphere. Has methane lakes and rivers.' },
  { name: 'Enceladus', parent: 5, a: 0.10, period: 1.370, radius: 0.007, color: '#f0f0f0', desc: 'Geysers of water ice erupt from its south pole. Subsurface ocean confirmed.' },
  { name: 'Rhea', parent: 5, a: 0.15, period: 4.518, radius: 0.009, color: '#c8c0b8', desc: 'Saturn\'s second-largest moon. Icy surface with a thin oxygen-CO2 atmosphere.' },

  // Uranus (6)
  { name: 'Titania', parent: 6, a: 0.12, period: 8.706, radius: 0.009, color: '#a8a0a0', desc: 'Largest moon of Uranus. Named after the queen of fairies in A Midsummer Night\'s Dream.' },
  { name: 'Oberon', parent: 6, a: 0.15, period: 13.463, radius: 0.008, color: '#908888', desc: 'Outermost major moon of Uranus. Dark surface with large impact craters.' },
  { name: 'Miranda', parent: 6, a: 0.06, period: 1.413, radius: 0.006, color: '#b0b0b0', desc: 'Smallest of Uranus\'s major moons. Has dramatic cliffs up to 20 km high.', i: 4.3 },

  // Neptune (7)
  { name: 'Triton', parent: 7, a: 0.12, period: 5.877, radius: 0.012, color: '#a0b8c0', desc: 'Only large moon with a retrograde orbit. Likely a captured Kuiper Belt object. Has nitrogen geysers.' },

  // Pluto (9)
  { name: 'Charon', parent: 9, a: 0.05, period: 6.387, radius: 0.010, color: '#908880', desc: 'Nearly half Pluto\'s size. The two are tidally locked, always showing the same face to each other.' },
];

/** Get all moons orbiting a given parent body index */
export function getMoonsForPlanet(parentIdx: number): MoonDef[] {
  return MOONS.filter(m => m.parent === parentIdx);
}
