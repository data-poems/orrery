import { describe, expect, it } from 'vitest';
import { parseSbdbOrbit, sbdbOrbitUrl } from './sbdb';

// Shape of a real answer for 433 Eros, trimmed to the fields the app reads.
const EROS = {
  orbit: {
    epoch: '2461200.5',
    elements: [
      { name: 'e', label: 'e', value: '0.2228359407071628' },
      { name: 'a', label: 'a', value: '1.458120998474684' },
      { name: 'q', label: 'q', value: '1.133199233434707' },
      { name: 'i', label: 'i', value: '10.82846651399785' },
      { name: 'om', label: 'node', value: '304.2701025753316' },
      { name: 'w', label: 'peri', value: '178.9297536744151' },
      { name: 'ma', label: 'M', value: '310.5543277370992' },
    ],
  },
};

describe('sbdbOrbitUrl', () => {
  it('asks only for documented parameters', () => {
    const url = new URL(sbdbOrbitUrl('2000433'));
    expect(url.origin + url.pathname).toBe('https://ssd-api.jpl.nasa.gov/sbdb.api');
    expect([...url.searchParams.keys()].sort()).toEqual(['full-prec', 'spk']);
    expect(url.searchParams.get('spk')).toBe('2000433');
  });
});

describe('parseSbdbOrbit', () => {
  it('reads the six elements and the epoch by element name', () => {
    const orbit = parseSbdbOrbit(EROS);
    expect(orbit.loaded).toBe(true);
    expect(orbit.synthetic).toBeUndefined();
    expect(orbit.a).toBeCloseTo(1.4581, 4);
    expect(orbit.e).toBeCloseTo(0.2228, 4);
    expect(orbit.i).toBeCloseTo(10.8285, 4);
    expect(orbit.om).toBeCloseTo(304.2701, 4);
    expect(orbit.w).toBeCloseTo(178.9298, 4);
    expect(orbit.ma).toBeCloseTo(310.5543, 4);
    expect(orbit.epoch).toBe(2461200.5);
  });

  it('rejects an error answer instead of drawing an orbit of zeros', () => {
    expect(() => parseSbdbOrbit({
      message: 'one or more query parameter was not recognized', code: '400',
    } as never)).toThrow();
    expect(() => parseSbdbOrbit(null)).toThrow();
  });

  it('rejects an answer with an element missing', () => {
    const partial = { orbit: { epoch: '2461200.5', elements: EROS.orbit.elements.filter(e => e.name !== 'ma') } };
    expect(() => parseSbdbOrbit(partial)).toThrow(/ma/);
  });
});
