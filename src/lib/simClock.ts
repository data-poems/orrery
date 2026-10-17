/*
 * Sim clock cadence. At real-time speed nothing reads the clock more finely
 * than once a second: julianDate() drops milliseconds, satellites propagate at
 * 1 Hz, and the on-screen clock shows minutes. Accelerated time needs the fast
 * tick so motion stays smooth.
 */
export const REALTIME_TICK_MS = 1000;
export const ACCELERATED_TICK_MS = 16;

export function simClockTickMs(speed: number): number {
  return speed === 1 ? REALTIME_TICK_MS : ACCELERATED_TICK_MS;
}
