/*
 * Solar system data — planets, dwarf planets, textures, camera presets
 *
 * Keplerian elements: JPL J2000 epoch (JD 2451545.0 = 2000 Jan 1.5 TDB)
 * with secular rates per Julian century.
 *
 * Textures: Solar System Scope (CC BY 4.0)
 */

import type { PlanetDef, TexKey, CamPreset } from '../lib/kepler';

// ─── CDN texture URLs ───────────────────────────────────────────────────────────

const B = import.meta.env.BASE_URL + 'textures/';
const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310419663029916604/boBVkWMKnM6d26ztuVrLrs/';
const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth < 768;
const RES = IS_MOBILE ? '2k' : '4k';

export const TEX: Record<string, string> = {
  sun:        B + `sun_${RES}.jpg`,
  mercury:    B + `mercury_${RES}.jpg`,
  venus:      B + `venus_${RES}.jpg`,
  earth:      B + `earth_daymap_${RES}.jpg`,
  earthClouds: B + `earth_clouds_${RES}.jpg`,
  mars:       B + `mars_${RES}.jpg`,
  jupiter:    B + `jupiter_${RES}.jpg`,
  saturn:     B + `saturn_${RES}.jpg`,
  uranus:     CDN + '2k_uranus_a5872335.jpg',
  neptune:    CDN + '2k_neptune_d38c09d9.jpg',
  moon:       B + `moon_${RES}.jpg`,
};

// ─── Planets (JPL J2000 + secular rates per century) ────────────────────────────

export const PLANETS: PlanetDef[] = [
  { name: 'Mercury', a: 0.38710, e: 0.20564, I: 7.005, L: 252.250, wBar: 77.458, omega: 48.331, aR: 0.0000004, eR: 0.00002, IR: -0.0059, LR: 149472.674, wR: 0.160, oR: -0.125, radius: 0.035, tex: 'mercury' as TexKey, color: '#b0a090', period: 87.97, distAU: '0.39', moons: 0, type: 'Terrestrial', surfaceTemp: '-180 to 430\u00b0C', gravity: '3.7 m/s\u00b2' },
  { name: 'Venus', a: 0.72334, e: 0.00678, I: 3.395, L: 181.979, wBar: 131.602, omega: 76.680, aR: 0.0000039, eR: -0.00004, IR: -0.0008, LR: 58517.815, wR: 0.003, oR: -0.278, radius: 0.055, tex: 'venus' as TexKey, color: '#e8c870', period: 224.7, distAU: '0.72', moons: 0, type: 'Terrestrial', surfaceTemp: '465\u00b0C', gravity: '8.87 m/s\u00b2' },
  { name: 'Earth', a: 1.00000, e: 0.01671, I: 0.000, L: 100.465, wBar: 102.938, omega: 0.0, aR: 0.0000056, eR: -0.00004, IR: -0.013, LR: 35999.372, wR: 0.323, oR: 0.0, radius: 0.06, tex: 'earth' as TexKey, color: '#4488cc', period: 365.25, distAU: '1.00', moons: 1, type: 'Terrestrial', surfaceTemp: '-89 to 58\u00b0C', gravity: '9.81 m/s\u00b2' },
  { name: 'Mars', a: 1.52371, e: 0.09339, I: 1.850, L: -4.553, wBar: -23.944, omega: 49.560, aR: 0.0000185, eR: 0.00008, IR: -0.008, LR: 19140.303, wR: 0.444, oR: -0.293, radius: 0.045, tex: 'mars' as TexKey, color: '#cc6644', period: 686.98, distAU: '1.52', moons: 2, type: 'Terrestrial', surfaceTemp: '-143 to 35\u00b0C', gravity: '3.72 m/s\u00b2' },
  { name: 'Jupiter', a: 5.20289, e: 0.04839, I: 1.304, L: 34.396, wBar: 14.728, omega: 100.474, aR: -0.0001161, eR: -0.00013, IR: -0.002, LR: 3034.746, wR: 0.213, oR: 0.205, radius: 0.16, tex: 'jupiter' as TexKey, color: '#cc9966', period: 4332.59, distAU: '5.20', moons: 95, type: 'Gas Giant', surfaceTemp: '-110\u00b0C (cloud tops)', gravity: '24.79 m/s\u00b2' },
  { name: 'Saturn', a: 9.53668, e: 0.05386, I: 2.486, L: 49.954, wBar: 92.599, omega: 113.662, aR: -0.0012506, eR: -0.00051, IR: 0.002, LR: 1222.494, wR: -0.419, oR: -0.289, radius: 0.13, tex: 'saturn' as TexKey, color: '#ddbb77', period: 10759.22, hasRings: true, distAU: '9.54', moons: 146, type: 'Gas Giant', surfaceTemp: '-178\u00b0C (cloud tops)', gravity: '10.44 m/s\u00b2' },
  { name: 'Uranus', a: 19.18916, e: 0.04726, I: 0.773, L: 313.238, wBar: 170.954, omega: 74.017, aR: -0.0019618, eR: -0.00004, IR: -0.002, LR: 428.482, wR: 0.408, oR: 0.042, radius: 0.09, tex: 'uranus' as TexKey, color: '#88cccc', period: 30688.5, distAU: '19.19', moons: 28, type: 'Ice Giant', surfaceTemp: '-224\u00b0C', gravity: '8.87 m/s\u00b2' },
  { name: 'Neptune', a: 30.06992, e: 0.00859, I: 1.770, L: -55.120, wBar: 44.965, omega: 131.784, aR: 0.0002629, eR: 0.00005, IR: 0.0004, LR: 218.459, wR: -0.322, oR: -0.005, radius: 0.085, tex: 'neptune' as TexKey, color: '#5577cc', period: 60182.0, distAU: '30.07', moons: 16, type: 'Ice Giant', surfaceTemp: '-218\u00b0C', gravity: '11.15 m/s\u00b2' },
];

// ─── Dwarf planets (JPL Horizons, J2000 epoch) ─────────────────────────────────
// Secular rates set to zero (not published for minor bodies).
// LR derived from Kepler's third law: LR = 36000 / a^1.5 deg/century.

export const DWARF_PLANETS: PlanetDef[] = [
  {
    name: 'Ceres', a: 2.7658, e: 0.0756, I: 10.594, L: 230.20, wBar: 152.83, omega: 80.31,
    aR: 0, eR: 0, IR: 0, LR: 7829.5, wR: 0, oR: 0,
    radius: 0.015, tex: 'mercury' as TexKey, color: '#a0a0a0', period: 1681,
    isDwarf: true,
    distAU: '2.77', moons: 0, type: 'Dwarf Planet', surfaceTemp: '-106\u00b0C', gravity: '0.28 m/s\u00b2',
  },
  {
    name: 'Pluto', a: 39.482, e: 0.2488, I: 17.16, L: 238.96, wBar: 224.07, omega: 110.30,
    aR: 0, eR: 0, IR: 0, LR: 145.18, wR: 0, oR: 0,
    radius: 0.02, tex: 'mercury' as TexKey, color: '#c8b89a', period: 90560,
    isDwarf: true,
    distAU: '39.48', moons: 5, type: 'Dwarf Planet', surfaceTemp: '-230\u00b0C', gravity: '0.62 m/s\u00b2',
  },
  {
    name: 'Eris', a: 67.864, e: 0.4361, I: 44.04, L: 204.16, wBar: 187.52, omega: 35.88,
    aR: 0, eR: 0, IR: 0, LR: 64.39, wR: 0, oR: 0,
    radius: 0.02, tex: 'mercury' as TexKey, color: '#e0ddd5', period: 203830,
    isDwarf: true,
    distAU: '67.67', moons: 1, type: 'Dwarf Planet', surfaceTemp: '-243\u00b0C', gravity: '0.82 m/s\u00b2',
  },
];

export const ALL_BODIES: PlanetDef[] = [...PLANETS, ...DWARF_PLANETS];

// ─── Camera presets ──────────────────────────────────────────────────────────

export const CAMS: CamPreset[] = [
  { key: '1', label: 'Inner',     pos: [0, 3, 4],          tgt: [0, 0, 0] },
  { key: '2', label: 'System',    pos: [0, 30, 40],        tgt: [0, 0, 0] },
  { key: '3', label: 'Top',       pos: [0, 45, 0.01],      tgt: [0, 0, 0] },
  { key: '4', label: 'Ecliptic',  pos: [10, 0.2, 0],       tgt: [0, 0, 0] },
  { key: '5', label: 'Outer',     pos: [0, 60, 90],        tgt: [0, 0, 0] },
  { key: '6', label: 'Kuiper',    pos: [0, 120, 180],      tgt: [0, 0, 0] },
  { key: '7', label: 'Screensaver', pos: [4, 2.5, 6],      tgt: [0, 0, 0], follow: 2, autoRotate: true },
  { key: '8', label: 'Sun',       pos: [0.3, 0.15, 0.4],   tgt: [0, 0, 0] },
  { key: '9', label: 'Belt',      pos: [0, 5, 8],          tgt: [2.7, 0, 0] },
  { key: '0', label: 'Oort',      pos: [0, 900, 1400],     tgt: [0, 0, 0] },
  { key: '-', label: 'Stargazer', pos: [0, 3, 6],         tgt: [0, 0, 0] },
  { key: '=', label: 'Stellar',   pos: [0, 12000, 18000], tgt: [0, 0, 0] },
  { key: 'e', label: 'Earth Observer', pos: [0.001, 0, 0], tgt: [0, 0, 0], follow: 2, observe: true },
];

const CAM_INDEX: Record<string, number> = Object.fromEntries(CAMS.map((c, i) => [c.label, i]));

/** Look up a camera preset by label. Returns -1 if not found, matching `Array.findIndex` semantics. */
export function camIndex(label: string): number {
  return CAM_INDEX[label] ?? -1;
}
