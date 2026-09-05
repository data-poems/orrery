import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.resetModules(); });
it('keeps ordinary tours random', async () => {
  vi.stubEnv('VITE_ORRERY_GRAPHICS_PROBE', 'false');
  vi.resetModules();
  vi.spyOn(Math, 'random').mockReturnValue(0.125);
  const { tourRandom } = await import('./tourRandom');
  expect(tourRandom()).toBe(0.125);
});
it('repeats a diagnostic tour independently of other random allocations', async () => {
  vi.stubEnv('VITE_ORRERY_GRAPHICS_PROBE', 'true');
  vi.resetModules();
  const first = await import('./tourRandom');
  const expected = Array.from({ length: 100 }, () => first.tourRandom());
  vi.resetModules();
  const second = await import('./tourRandom');
  const actual = Array.from({ length: 100 }, () => { Math.random(); return second.tourRandom(); });
  expect(actual).toEqual(expected);
  expect(new Set(actual).size).toBe(100);
});
