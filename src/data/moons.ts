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

  // Jupiter (4) — Galilean moons
  { name: 'Io', parent: 4, a: 0.12, period: 1.769, radius: 0.012, color: '#e8c840', desc: 'Most volcanically active body in the solar system. Over 400 active volcanoes.' },
  { name: 'Europa', parent: 4, a: 0.16, period: 3.551, radius: 0.011, color: '#c8c0b0', desc: 'Ice-covered ocean world. A top candidate for extraterrestrial life.' },
  { name: 'Ganymede', parent: 4, a: 0.20, period: 7.155, radius: 0.018, color: '#a0a098', desc: 'Largest moon in the solar system. Bigger than Mercury. Has its own magnetic field.' },
  { name: 'Callisto', parent: 4, a: 0.25, period: 16.689, radius: 0.016, color: '#706860', desc: 'Most heavily cratered object in the solar system. May have a subsurface ocean.' },
  { name: 'Amalthea', parent: 4, a: 0.08, period: 0.498, radius: 0.004, color: '#a05030', desc: 'Reddest object in the solar system. Irregular, potato-shaped inner moon.', i: 0.4 },

  // Saturn (5) — major moons
  { name: 'Mimas', parent: 5, a: 0.07, period: 0.942, radius: 0.005, color: '#d0d0d0', desc: 'The "Death Star" moon. Dominated by the giant Herschel crater.', i: 1.5 },
  { name: 'Enceladus', parent: 5, a: 0.10, period: 1.370, radius: 0.007, color: '#f0f0f0', desc: 'Geysers of water ice erupt from its south pole. Subsurface ocean confirmed.' },
  { name: 'Tethys', parent: 5, a: 0.12, period: 1.888, radius: 0.008, color: '#e0e0e0', desc: 'Almost entirely water ice. Has a massive canyon system called Ithaca Chasma.', i: 1.1 },
  { name: 'Dione', parent: 5, a: 0.14, period: 2.737, radius: 0.008, color: '#c8c8c8', desc: 'Dense, icy moon. Bright wispy terrain marks its trailing hemisphere.' },
  { name: 'Rhea', parent: 5, a: 0.17, period: 4.518, radius: 0.009, color: '#c8c0b8', desc: 'Saturn\'s second-largest moon. Icy surface with a thin oxygen-CO2 atmosphere.' },
  { name: 'Titan', parent: 5, a: 0.22, period: 15.945, radius: 0.017, color: '#d4a040', desc: 'Second largest moon. Only moon with a thick atmosphere. Has methane lakes and rivers.' },
  { name: 'Hyperion', parent: 5, a: 0.26, period: 21.277, radius: 0.004, color: '#b0a090', desc: 'Irregularly shaped, sponge-like moon. Chaotic rotation with no fixed axis.', i: 0.4 },
  { name: 'Iapetus', parent: 5, a: 0.32, period: 79.322, radius: 0.009, color: '#806040', desc: 'Two-toned moon: one hemisphere dark as coal, the other bright as snow.', i: 14.7 },

  // Uranus (6) — major moons
  { name: 'Miranda', parent: 6, a: 0.06, period: 1.413, radius: 0.006, color: '#b0b0b0', desc: 'Smallest of Uranus\'s major moons. Has dramatic cliffs up to 20 km high.', i: 4.3 },
  { name: 'Ariel', parent: 6, a: 0.08, period: 2.520, radius: 0.008, color: '#c0c0c0', desc: 'Brightest and possibly youngest surface of the Uranian moons. Many canyons and valleys.' },
  { name: 'Umbriel', parent: 6, a: 0.10, period: 4.144, radius: 0.008, color: '#707070', desc: 'Darkest of the major Uranian moons. Ancient, heavily cratered surface.' },
  { name: 'Titania', parent: 6, a: 0.13, period: 8.706, radius: 0.009, color: '#a8a0a0', desc: 'Largest moon of Uranus. Named after the queen of fairies in A Midsummer Night\'s Dream.' },
  { name: 'Oberon', parent: 6, a: 0.16, period: 13.463, radius: 0.008, color: '#908888', desc: 'Outermost major moon of Uranus. Dark surface with large impact craters.' },

  // Neptune (7)
  { name: 'Triton', parent: 7, a: 0.12, period: 5.877, radius: 0.012, color: '#a0b8c0', desc: 'Only large moon with a retrograde orbit. Likely a captured Kuiper Belt object. Has nitrogen geysers.' },
  { name: 'Proteus', parent: 7, a: 0.06, period: 1.122, radius: 0.005, color: '#808080', desc: 'Second largest moon of Neptune. Irregularly shaped, nearly as large as Mimas.' },
  { name: 'Nereid', parent: 7, a: 0.30, period: 360.14, radius: 0.004, color: '#909090', desc: 'One of the most eccentric orbits of any moon. Likely a captured object.', i: 7.2 },

  // Pluto (9)
  { name: 'Charon', parent: 9, a: 0.05, period: 6.387, radius: 0.010, color: '#908880', desc: 'Nearly half Pluto\'s size. The two are tidally locked, always showing the same face to each other.' },
  { name: 'Nix', parent: 9, a: 0.07, period: 24.856, radius: 0.003, color: '#b0b0b0', desc: 'Small, irregularly shaped. Discovered in 2005 alongside Hydra.' },
  { name: 'Kerberos', parent: 9, a: 0.08, period: 32.168, radius: 0.002, color: '#909090', desc: 'Tiny double-lobed moon between Nix and Hydra. Discovered in 2011.' },
  { name: 'Hydra', parent: 9, a: 0.09, period: 38.202, radius: 0.003, color: '#a0a0a0', desc: 'Pluto\'s outermost large moon. Rotates chaotically due to Charon\'s gravity.' },
  { name: 'Styx', parent: 9, a: 0.06, period: 20.162, radius: 0.002, color: '#a8a8a8', desc: 'Smallest known moon of Pluto. Discovered in 2012 during Hubble observations.' },

  // Eris (10)
  { name: 'Dysnomia', parent: 10, a: 0.05, period: 15.774, radius: 0.004, color: '#888888', desc: 'Eris\'s only known moon. Named after the daughter of Eris in Greek mythology.' },
];

/** Get all moons orbiting a given parent body index */
export function getMoonsForPlanet(parentIdx: number): MoonDef[] {
  return MOONS.filter(m => m.parent === parentIdx);
}
