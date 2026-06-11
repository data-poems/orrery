/*
 * Constellation centroid loader.
 *
 * Fetches `public/data/constellations.json` (GeoJSON-ish point features keyed by
 * IAU 3-letter abbreviations) once per session and exposes the constellation
 * centroid as either RA/Dec or a pre-rotated 3D position on the celestial
 * sphere used by Stars.tsx (radius ~300, ecliptic tilt NOT applied to match the
 * existing star/label rendering).
 *
 * Inputs: constellation id string (e.g. "And", "Ori").
 * Outputs: cached lookup tables resolved from the same JSON the scene uses.
 */
import { raDecTo3D } from './kepler';

const SPHERE_RADIUS = 300;
const BASE_PATH = import.meta.env.BASE_URL + 'data/';

interface PointFeature {
  id: string | number;
  geometry: { type: string; coordinates: [number, number] };
  properties: { name?: string; en?: string };
}
interface ConstellationsJson {
  features: PointFeature[];
}

interface LineFeature {
  id: string | number;
  geometry: {
    type: string;
    // MultiLineString: [number, number][][]
    coordinates: number[][][] | [number, number][];
  };
}
interface LinesJson {
  features: LineFeature[];
}

let cachedRaDec: Map<string, [number, number]> | null = null;
let cachedPositions: Map<string, [number, number, number]> | null = null;
let inflight: Promise<void> | null = null;

/** Reduce an array of (ra, dec) samples to a single unit-sphere position by
 *  averaging in 3D Cartesian coordinates and renormalising. RA averaging in
 *  degrees is wrong near the 0/360 wrap; this avoids that. */
function reduceSamples(samples: Array<[number, number]>): { ra: number; dec: number; xyz: [number, number, number] } | null {
  if (samples.length === 0) return null;
  let sx = 0, sy = 0, sz = 0;
  for (const [ra, dec] of samples) {
    const [x, y, z] = raDecTo3D(ra, dec, 1, false);
    sx += x; sy += y; sz += z;
  }
  const len = Math.hypot(sx, sy, sz) || 1;
  const ux = sx / len, uy = sy / len, uz = sz / len;
  const decDeg = Math.asin(Math.max(-1, Math.min(1, uy))) * (180 / Math.PI);
  let raDeg = Math.atan2(-uz, ux) * (180 / Math.PI);
  if (raDeg < 0) raDeg += 360;
  return { ra: raDeg, dec: decDeg, xyz: [ux * SPHERE_RADIUS, uy * SPHERE_RADIUS, uz * SPHERE_RADIUS] };
}

async function ensureLoaded(): Promise<void> {
  if (cachedRaDec) return;
  if (!inflight) {
    inflight = Promise.all([
      fetch(BASE_PATH + 'constellations.json').then((r) => r.json() as Promise<ConstellationsJson>),
      // Lines file is preferred for centroid math because IAU Point features
      // are LABEL positions (often offset for legibility) — they're not the
      // visual center of the stick figure. Averaging every line endpoint gives
      // a centroid on top of the actual figure instead.
      fetch(BASE_PATH + 'constellations.lines.json')
        .then((r) => r.json() as Promise<LinesJson>)
        .catch(() => ({ features: [] as LineFeature[] })),
    ])
      .then(([points, lines]) => {
        // Pass 1: collect Point features (fallback when no lines exist).
        const fromPoints = new Map<string, Array<[number, number]>>();
        for (const f of points.features) {
          if (!f || f.geometry?.type !== 'Point') continue;
          const id = String(f.id);
          if (!id) continue;
          const [ra, dec] = f.geometry.coordinates;
          if (typeof ra !== 'number' || typeof dec !== 'number') continue;
          const list = fromPoints.get(id);
          if (list) list.push([ra, dec]);
          else fromPoints.set(id, [[ra, dec]]);
        }
        // Pass 2: collect every endpoint from MultiLineString features. This
        // captures Serpens Caput + Cauda under a single id naturally.
        const fromLines = new Map<string, Array<[number, number]>>();
        for (const f of lines.features) {
          if (!f) continue;
          const id = String(f.id);
          if (!id) continue;
          const coords = f.geometry?.coordinates;
          if (!Array.isArray(coords)) continue;
          const list = fromLines.get(id) ?? [];
          if (f.geometry.type === 'MultiLineString') {
            for (const segment of coords as number[][][]) {
              for (const pt of segment) {
                if (Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
                  list.push([pt[0], pt[1]]);
                }
              }
            }
          } else if (f.geometry.type === 'LineString') {
            for (const pt of coords as [number, number][]) {
              if (Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
                list.push([pt[0], pt[1]]);
              }
            }
          }
          if (list.length) fromLines.set(id, list);
        }
        const raDec = new Map<string, [number, number]>();
        const pos = new Map<string, [number, number, number]>();
        const allIds = new Set<string>([...fromLines.keys(), ...fromPoints.keys()]);
        for (const id of allIds) {
          const samples = fromLines.get(id) ?? fromPoints.get(id) ?? [];
          const reduced = reduceSamples(samples);
          if (!reduced) continue;
          raDec.set(id, [reduced.ra, reduced.dec]);
          pos.set(id, reduced.xyz);
        }
        cachedRaDec = raDec;
        cachedPositions = pos;
      })
      .catch(() => {
        cachedRaDec = new Map();
        cachedPositions = new Map();
      });
  }
  await inflight;
}

export async function getConstellationCentroid(id: string): Promise<[number, number, number] | null> {
  await ensureLoaded();
  return cachedPositions?.get(id) ?? null;
}

/** Synchronous centroid lookup. Returns null when the cache hasn't loaded yet
 *  (call `prefetchConstellationCentroids` on mount to warm it). Used by the
 *  dice path so the camera target snaps to the constellation in the same React
 *  batch as the other selection state, avoiding a one-frame flash to origin. */
export function getConstellationCentroidCached(id: string): [number, number, number] | null {
  return cachedPositions?.get(id) ?? null;
}


/** Pre-warm cache (e.g. during app load) so random-tour aiming has zero latency. */
export function prefetchConstellationCentroids(): void {
  void ensureLoaded();
}
