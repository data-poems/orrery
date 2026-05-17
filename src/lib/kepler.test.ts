import { describe, it, expect } from 'vitest';
import { julianDate, planetXYZ, raDecTo3D } from './kepler';
import type { PlanetDef } from './kepler';

/** Minimal Earth/Mars/Jupiter defs (J2000 epoch) for golden-vector tests. */
const EARTH: PlanetDef = {
  name: 'Earth', a: 1, e: 0.01671, I: 0, L: 100.465, wBar: 102.938, omega: 0,
  aR: 0.0000056, eR: -0.00004, IR: -0.013, LR: 35999.372, wR: 0.323, oR: 0,
  radius: 0.06, tex: 'earth', color: '#4488cc', period: 365.25,
  distAU: '1', moons: 1, type: 'Terrestrial', surfaceTemp: '', gravity: '',
};
const MARS: PlanetDef = {
  name: 'Mars', a: 1.52371, e: 0.09339, I: 1.85, L: -4.553, wBar: -23.944, omega: 49.56,
  aR: 0.0000185, eR: 0.00008, IR: -0.008, LR: 19140.303, wR: 0.444, oR: -0.293,
  radius: 0.045, tex: 'mars', color: '#cc6644', period: 686.98,
  distAU: '1.52', moons: 2, type: 'Terrestrial', surfaceTemp: '', gravity: '',
};
const JUPITER: PlanetDef = {
  name: 'Jupiter', a: 5.20289, e: 0.04839, I: 1.304, L: 34.396, wBar: 14.728, omega: 100.474,
  aR: -0.0001161, eR: -0.00013, IR: -0.002, LR: 3034.746, wR: 0.213, oR: 0.205,
  radius: 0.16, tex: 'jupiter', color: '#cc9966', period: 4332.59,
  distAU: '5.2', moons: 95, type: 'Gas Giant', surfaceTemp: '', gravity: '',
};

const TOL = 0.005;

/** JPL Horizons–style samples (heliocentric ecliptic, AU). T = centuries from J2000. */
const GOLDEN: Array<{ label: string; T: number; body: PlanetDef; expected: [number, number, number] }> = [
  { label: 'Earth J2000', T: 0, body: EARTH, expected: [-0.1772, 0.0000, -0.9672] },
  { label: 'Mars J2000', T: 0, body: MARS, expected: [1.3907, -0.0345, 0.0134] },
  { label: 'Jupiter J2000', T: 0, body: JUPITER, expected: [3.9983, -0.1017, -2.9457] },
  { label: 'Earth 2024-01-01', T: 0.24013, body: EARTH, expected: [-0.2555, -0.0001, -0.9495] },
];

function dist(a: [number, number, number], b: [number, number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

describe('planetXYZ golden vectors', () => {
  for (const { label, T, body, expected } of GOLDEN) {
    it(`${label} within ${TOL} AU`, () => {
      const pos = planetXYZ(body, T) as [number, number, number];
      expect(dist(pos, expected)).toBeLessThan(TOL);
    });
  }
});

describe('raDecTo3D round-trip', () => {
  it('places points on sphere radius', () => {
    const p = raDecTo3D(83.8, -5.4, 300, false);
    const r = Math.hypot(p[0], p[1], p[2]);
    expect(r).toBeCloseTo(300, 3);
  });
});

describe('julianDate', () => {
  it('matches J2000 noon', () => {
    expect(julianDate(new Date('2000-01-01T12:00:00Z'))).toBeCloseTo(2451545.5, 2);
  });
});
