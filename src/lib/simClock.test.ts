import { describe, it, expect } from 'vitest';
import { simClockTickMs, REALTIME_TICK_MS, ACCELERATED_TICK_MS } from './simClock';
import { julianDate } from './kepler';

describe('sim clock cadence', () => {
  it('ticks once a second at real time and fast when accelerated', () => {
    expect(simClockTickMs(1)).toBe(REALTIME_TICK_MS);
    expect(simClockTickMs(3600)).toBe(ACCELERATED_TICK_MS);
  });

  it('relies on julianDate having whole-second resolution', () => {
    // If julianDate starts using milliseconds, a one-second real-time tick
    // would make bodies step visibly; revisit REALTIME_TICK_MS then.
    const t = Date.UTC(2026, 9, 16, 12, 0, 0);
    expect(julianDate(new Date(t + 999))).toBe(julianDate(new Date(t)));
    expect(julianDate(new Date(t + 1000))).toBeGreaterThan(julianDate(new Date(t)));
  });
});
