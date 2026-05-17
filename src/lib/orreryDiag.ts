/*
 * Runtime diagnostics for camera / render debugging.
 *
 * Enable in Safari Web Inspector: window.__ORRERY_DIAG__ = true
 * (or localStorage 'orrery-diag' = '1')
 */

export interface OrreryDiagSnapshot {
  fps: number;
  rendersPerSec: number;
  cameraDistance: number;
  remainDist: number;
  settling: boolean;
  tPosMag: number;
  framesSinceTargetChange: number;
  positionsUpdatesPerSec: number;
  phase: string;
  cinematic: boolean;
}

type DiagListener = (snap: OrreryDiagSnapshot) => void;

const listeners = new Set<DiagListener>();
let lastSnap: OrreryDiagSnapshot | null = null;

export function isOrreryDiagEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as Window & { __ORRERY_DIAG__?: boolean };
  if (w.__ORRERY_DIAG__ === true) return true;
  try {
    return localStorage.getItem('orrery-diag') === '1';
  } catch {
    return false;
  }
}

export function subscribeOrreryDiag(fn: DiagListener): () => void {
  listeners.add(fn);
  if (lastSnap) fn(lastSnap);
  return () => listeners.delete(fn);
}

export function publishOrreryDiag(snap: OrreryDiagSnapshot): void {
  if (!isOrreryDiagEnabled()) return;
  lastSnap = snap;
  listeners.forEach((fn) => fn(snap));
}

export function bumpPositionsUpdateCounter(): void {
  if (!isOrreryDiagEnabled()) return;
  const w = window as Window & { __orreryPosUpdates?: { count: number; t: number } };
  const now = performance.now();
  if (!w.__orreryPosUpdates || now - w.__orreryPosUpdates.t > 1000) {
    w.__orreryPosUpdates = { count: 1, t: now };
    return;
  }
  w.__orreryPosUpdates.count += 1;
}

export function getPositionsUpdatesPerSec(): number {
  const w = window as Window & { __orreryPosUpdates?: { count: number; t: number } };
  if (!w.__orreryPosUpdates) return 0;
  const elapsed = (performance.now() - w.__orreryPosUpdates.t) / 1000;
  if (elapsed < 0.1) return 0;
  return w.__orreryPosUpdates.count / elapsed;
}
