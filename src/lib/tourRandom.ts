// Diagnostic builds repeat the same tour, independently of Three.js UUIDs and
// procedural scene randomness. Ordinary production builds keep random tours.
let seed = 781;
export function tourRandom(): number {
  if (import.meta.env.VITE_ORRERY_GRAPHICS_PROBE !== 'true') return Math.random();
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}

export function recordTourTarget(key: string): void {
  if (import.meta.env.VITE_ORRERY_GRAPHICS_PROBE === 'true') console.info('OrreryGraphicsRoute', key);
}
