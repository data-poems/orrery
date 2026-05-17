/*
 * Debug overlay — toggled via window.__ORRERY_DIAG__ or localStorage orrery-diag=1
 */

import { useEffect, useState } from 'react';
import { isOrreryDiagEnabled, subscribeOrreryDiag, type OrreryDiagSnapshot } from '../lib/orreryDiag';

export default function OrreryDiagOverlay() {
  const [enabled, setEnabled] = useState(isOrreryDiagEnabled);
  const [snap, setSnap] = useState<OrreryDiagSnapshot | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setEnabled(isOrreryDiagEnabled()), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    return subscribeOrreryDiag(setSnap);
  }, [enabled]);

  if (!enabled || !snap) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 8,
        bottom: 8,
        zIndex: 200,
        pointerEvents: 'none',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 10,
        lineHeight: 1.45,
        color: '#0f0',
        background: 'rgba(0,0,0,0.75)',
        padding: '6px 8px',
        borderRadius: 4,
        maxWidth: 220,
      }}
    >
      <div>{`FPS ${snap.fps.toFixed(0)} · R/s ${snap.rendersPerSec.toFixed(0)}`}</div>
      <div>{`camDist ${snap.cameraDistance.toFixed(2)} · remain ${snap.remainDist.toFixed(2)}`}</div>
      <div>{`tPos ${snap.tPosMag.toFixed(2)} · phase ${snap.phase}`}</div>
      <div>{`settle ${snap.settling ? 'Y' : 'n'} · cin ${snap.cinematic ? 'Y' : 'n'}`}</div>
      <div>{`tgtΔ ${snap.framesSinceTargetChange}f · posΔ/s ${snap.positionsUpdatesPerSec.toFixed(1)}`}</div>
    </div>
  );
}
