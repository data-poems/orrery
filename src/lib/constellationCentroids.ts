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

let cachedRaDec: Map<string, [number, number]> | null = null;
let cachedPositions: Map<string, [number, number, number]> | null = null;
let inflight: Promise<void> | null = null;

async function ensureLoaded(): Promise<void> {
  if (cachedRaDec) return;
  if (!inflight) {
    inflight = fetch(BASE_PATH + 'constellations.json')
      .then((r) => r.json() as Promise<ConstellationsJson>)
      .then((geo) => {
        // Some constellations (notably Serpens, id="Ser") appear as multiple
        // disjoint Point features (Caput + Cauda). Collect every centroid for
        // each id and reduce to the mean so the random tour aims at the
        // figure's overall sky position instead of overwriting one half with
        // the other via Map.set.
        const collect = new Map<string, Array<[number, number]>>();
        for (const f of geo.features) {
          if (!f || f.geometry?.type !== 'Point') continue;
          const id = String(f.id);
          if (!id) continue;
          const [ra, dec] = f.geometry.coordinates;
          if (typeof ra !== 'number' || typeof dec !== 'number') continue;
          const list = collect.get(id);
          if (list) list.push([ra, dec]);
          else collect.set(id, [[ra, dec]]);
        }
        const raDec = new Map<string, [number, number]>();
        const pos = new Map<string, [number, number, number]>();
        for (const [id, samples] of collect) {
          // Average via 3D Cartesian midpoint then renormalise so the result
          // sits on the celestial sphere; averaging RA degrees directly is
          // wrong near the 0/360 wrap.
          let sx = 0, sy = 0, sz = 0;
          for (const [ra, dec] of samples) {
            const [x, y, z] = raDecTo3D(ra, dec, 1, false);
            sx += x; sy += y; sz += z;
          }
          const len = Math.hypot(sx, sy, sz) || 1;
          const ux = sx / len, uy = sy / len, uz = sz / len;
          // Recover RA/Dec from the unit vector (matches raDecTo3D's
          // applyTilt=false convention: y = sin(dec); z = -cos(dec) sin(ra)).
          const decDeg = Math.asin(Math.max(-1, Math.min(1, uy))) * (180 / Math.PI);
          let raDeg = Math.atan2(-uz, ux) * (180 / Math.PI);
          if (raDeg < 0) raDeg += 360;
          raDec.set(id, [raDeg, decDeg]);
          pos.set(id, [ux * SPHERE_RADIUS, uy * SPHERE_RADIUS, uz * SPHERE_RADIUS]);
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

export async function getConstellationRaDec(id: string): Promise<[number, number] | null> {
  await ensureLoaded();
  return cachedRaDec?.get(id) ?? null;
}

/** Pre-warm cache (e.g. during app load) so random-tour aiming has zero latency. */
export function prefetchConstellationCentroids(): void {
  void ensureLoaded();
}
