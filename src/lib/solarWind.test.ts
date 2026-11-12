import { describe, expect, it } from 'vitest';
import { parseSolarWindSpeed } from './solarWind';

describe('parseSolarWindSpeed', () => {
  it('reads the current list format', () => {
    expect(parseSolarWindSpeed([{ proton_speed: 429, time_tag: '2026-11-12T17:42:00Z' }])).toBe('429 km/s');
  });

  it('reads the older object format', () => {
    expect(parseSolarWindSpeed({ WindSpeed: '512.4', TimeStamp: '2025-01-01 00:00:00.000' })).toBe('512 km/s');
  });

  it('shows nothing when the speed is missing or not a number', () => {
    expect(parseSolarWindSpeed([])).toBeNull();
    expect(parseSolarWindSpeed([{ proton_speed: null }])).toBeNull();
    expect(parseSolarWindSpeed({ WindSpeed: 'n/a' })).toBeNull();
    expect(parseSolarWindSpeed(null)).toBeNull();
    expect(parseSolarWindSpeed('error')).toBeNull();
  });
});
