/*
 * JPL Small-Body Database lookup for a near-Earth object's orbit.
 *
 * The API sends no CORS headers, so a web view (or a browser) cannot read the
 * answer with fetch(). Inside the installed iOS and Android apps the request
 * goes through Capacitor's native HTTP client instead, which is not subject to
 * CORS. On the website the lookup still fails and the caller falls back to an
 * approximate orbit.
 */
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { NEO } from './kepler';

type NeoOrbit = NonNullable<NEO['orbit']>;

interface SbdbOrbitElement {
  label?: string;
  name?: string;
  value: string;
}

export interface SbdbOrbitResponse {
  orbit?: {
    epoch?: string;
    elements?: SbdbOrbitElement[];
  };
}

/** `spk` is the object id from the NASA near-Earth object feed. */
export function sbdbOrbitUrl(spk: string): string {
  // Only parameters the API documents: an unknown one makes it answer 400.
  return `https://ssd-api.jpl.nasa.gov/sbdb.api?spk=${encodeURIComponent(spk)}&full-prec=true`;
}

/** Turn an SBDB answer into orbit elements, or throw when it has none. */
export function parseSbdbOrbit(data: SbdbOrbitResponse | null | undefined): NeoOrbit {
  const elems = data?.orbit?.elements;
  if (!Array.isArray(elems) || elems.length === 0) {
    throw new Error('missing orbital elements');
  }
  const get = (key: string) => {
    const el = elems.find((entry) => entry.name === key || entry.label === key);
    const value = el ? parseFloat(el.value) : Number.NaN;
    if (!Number.isFinite(value)) throw new Error(`missing orbital element ${key}`);
    return value;
  };
  const epoch = parseFloat(data?.orbit?.epoch ?? '');
  if (!Number.isFinite(epoch)) throw new Error('missing orbit epoch');
  return {
    a: get('a'), e: get('e'), i: get('i'), om: get('om'), w: get('w'),
    ma: get('ma'),
    epoch,
    loaded: true,
  };
}

export async function fetchSbdbOrbit(spk: string): Promise<NeoOrbit> {
  const url = sbdbOrbitUrl(spk);
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({ url, responseType: 'json' });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`SBDB answered ${response.status}`);
    }
    const data: unknown = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return parseSbdbOrbit(data as SbdbOrbitResponse);
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`SBDB answered ${response.status}`);
  return parseSbdbOrbit(await response.json() as SbdbOrbitResponse);
}
