/*
 * Loading overlay — visible until 3D scene is ready.
 * Film title card aesthetic: sparse, cinematic, minimal.
 */

import { useState, useEffect } from 'react';

export default function LoadingScreen({ ready, progress = 0 }: { ready: boolean; progress?: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => setVisible(false), 800);
      return () => clearTimeout(t);
    }
  }, [ready]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-label="Loading solar system"
      style={{
        position: 'absolute', inset: 0, zIndex: 100,
        background: '#000',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Cormorant Garamond', 'Garamond', serif",
        opacity: ready ? 0 : 1,
        transition: 'opacity 0.7s ease',
        pointerEvents: ready ? 'none' : 'auto',
      }}
    >
      <div style={{
        color: 'rgba(255,255,255,0.35)',
        fontSize: 18, letterSpacing: 10,
        textTransform: 'uppercase', fontWeight: 300,
        marginBottom: 12,
      }}>
        Orrery
      </div>

      <div style={{
        color: 'rgba(255,255,255,0.18)',
        fontSize: 13, fontStyle: 'italic',
        fontWeight: 300, letterSpacing: 1.5,
        marginBottom: 28,
      }}>
        Real data. Real orbits.
      </div>

      <div style={{
        width: 80, height: 1,
        background: 'rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${progress}%`,
          background: 'rgba(255,255,255,0.25)',
          transition: 'width 0.3s ease-out',
        }} />
      </div>
    </div>
  );
}
