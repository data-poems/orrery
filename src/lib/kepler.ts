/*
 * Orbital mechanics — JPL Keplerian elements
 *
 * All angles in degrees unless suffixed with _rad.
 * Distances in AU (1 AU = 1 scene unit).
 * Coordinate output: [x, y_up, z] where y is ecliptic normal.
 */

import * as THREE from 'three';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type TexKey = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

export interface PlanetDef {
  name: string;
  a: number; e: number; I: number; L: number; wBar: number; omega: number;
  aR: number; eR: number; IR: number; LR: number; wR: number; oR: number;
  radius: number; tex: TexKey; color: string; period: number;
  hasRings?: boolean;
  isDwarf?: boolean;
  desc: string; distAU: string; moons: number; type: string;
  surfaceTemp: string; gravity: string;
}

export interface NEO {
  id: string; name: string; dMin: number; dMax: number; hazardous: boolean;
  missLunar: number; missAU: number; missKm: number;
  velKms: number; date: string; url: string;
  orbit?: {
    a: number; e: number; i: number; om: number; w: number;
    ma: number; epoch: number;
    loaded: boolean;
  };
}

export interface CamPreset {
  key: string; label: string;
  pos: [number, number, number];
  tgt: [number, number, number];
  follow?: number;
  autoRotate?: boolean;
}

export interface FocusTarget {
  planetIdx: number;
  pos: [number, number, number];
}

// ─── Constants ──────────────────────────────────────────────────────────────────

export const DEG = Math.PI / 180;
const norm = (d: number) => ((d % 360) + 360) % 360;

// ─── Julian date ────────────────────────────────────────────────────────────────

export function julianDate(date: Date): number {
  const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() + date.getUTCHours() / 24 + date.getUTCMinutes() / 1440 + date.getUTCSeconds() / 86400;
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

// ─── Kepler's equation (Newton-Raphson) ─────────────────────────────────────────

export function solveKepler(M_deg: number, e: number): number {
  const M = norm(M_deg) * DEG;
  let E = M;
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

// ─── Heliocentric XYZ from Keplerian elements ──────────────────────────────────

export function planetXYZ(p: PlanetDef, T: number): [number, number, number] {
  const a = p.a + p.aR * T, e = p.e + p.eR * T;
  const I = (p.I + p.IR * T) * DEG;
  const Om = norm(p.omega + p.oR * T) * DEG;
  const wBar = norm(p.wBar + p.wR * T);
  const E = solveKepler(p.L + p.LR * T - wBar, e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = (wBar - (p.omega + p.oR * T)) * DEG;
  const cw = Math.cos(w), sw = Math.sin(w), co = Math.cos(Om), so = Math.sin(Om), ci = Math.cos(I), si = Math.sin(I);
  const x = (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp;
  const y = (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp;
  const z = (sw * si) * xp + (cw * si) * yp;
  return [x, z, -y];
}

// ─── Full orbit path (closed ellipse) ───────────────────────────────────────────

export function orbitPath(p: PlanetDef, T: number, n = 180): THREE.Vector3[] {
  const a = p.a + p.aR * T, e = p.e + p.eR * T;
  const I = (p.I + p.IR * T) * DEG;
  const Om = norm(p.omega + p.oR * T) * DEG;
  const wBar = norm(p.wBar + p.wR * T);
  const w = (wBar - (p.omega + p.oR * T)) * DEG;
  const cw = Math.cos(w), sw = Math.sin(w), co = Math.cos(Om), so = Math.sin(Om), ci = Math.cos(I), si = Math.sin(I);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 2;
    const r = a * (1 - e * e) / (1 + e * Math.cos(th));
    const xp = r * Math.cos(th), yp = r * Math.sin(th);
    const x = (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp;
    const y = (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp;
    const z = (sw * si) * xp + (cw * si) * yp;
    pts.push(new THREE.Vector3(x, z, -y));
  }
  return pts;
}

// ─── Asteroid/NEO orbit from raw elements ───────────────────────────────────────

export function asteroidOrbitPath(a: number, e: number, I_deg: number, Om_deg: number, w_deg: number, n = 180): THREE.Vector3[] {
  const I = I_deg * DEG, Om = Om_deg * DEG, w = w_deg * DEG;
  const cw = Math.cos(w), sw = Math.sin(w), co = Math.cos(Om), so = Math.sin(Om), ci = Math.cos(I), si = Math.sin(I);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 2;
    const r = a * (1 - e * e) / (1 + e * Math.cos(th));
    const xp = r * Math.cos(th), yp = r * Math.sin(th);
    const x = (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp;
    const y = (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp;
    const z = (sw * si) * xp + (cw * si) * yp;
    pts.push(new THREE.Vector3(x, z, -y));
  }
  return pts;
}

// ─── Single-point NEO position from Keplerian elements + epoch ──────────────────

export function neoXYZ(
  a: number, e: number, I_deg: number, Om_deg: number, w_deg: number,
  ma_deg: number, epoch_jd: number, current_jd: number,
): [number, number, number] {
  // Propagate mean anomaly: n = 0.9856076686 / sqrt(a^3) deg/day
  const n = 0.9856076686 / Math.sqrt(a * a * a);
  const dt = current_jd - epoch_jd;
  const M = ma_deg + n * dt;

  const I = I_deg * DEG, Om = Om_deg * DEG, w = w_deg * DEG;
  const E = solveKepler(M, e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), co = Math.cos(Om), so = Math.sin(Om), ci = Math.cos(I), si = Math.sin(I);
  const x = (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp;
  const y = (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp;
  const z = (sw * si) * xp + (cw * si) * yp;
  return [x, z, -y];
}

// ─── Moon phase ─────────────────────────────────────────────────────────────────

export function moonPhase(jd: number) {
  const days = jd - 2451550.1, syn = 29.53059;
  const p = ((days % syn) + syn) % syn / syn;
  const ill = Math.round((1 - Math.cos(p * 2 * Math.PI)) / 2 * 100);
  const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  const emojis = ['\u{1F311}', '\u{1F312}', '\u{1F313}', '\u{1F314}', '\u{1F315}', '\u{1F316}', '\u{1F317}', '\u{1F318}'];
  const idx = Math.floor(p * 8) % 8;
  return { name: names[idx], emoji: emojis[idx], ill };
}
