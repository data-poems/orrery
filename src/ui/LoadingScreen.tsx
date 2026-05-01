/*
 * Loading overlay — visible until 3D scene is ready.
 * Film title card aesthetic: sparse, cinematic, minimal.
 */

import { useState, useEffect } from 'react';
import { OBSERVATORY_MODE } from '../lib/mode';

export default function LoadingScreen({ ready, progress = 0 }: { ready: boolean; progress?: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => setVisible(false), 800);
      return () => clearTimeout(t);
    }
  }, [ready]);

  if (!visible) return null;

  const title = OBSERVATORY_MODE ? 'Observatory' : 'Orrery';
  const tagline = OBSERVATORY_MODE ? 'Look up.' : 'Real data. Real time.';

  return (
    <div
      role="alert"
      aria-label={`Loading ${title.toLowerCase()}`}
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
        color: 'rgba(255,255,255,0.55)',
        fontSize: 32, letterSpacing: 12,
        textTransform: 'uppercase', fontWeight: 300,
        marginBottom: 14,
      }}>
        {title}
      </div>

      <div style={{
        color: 'rgba(255,255,255,0.4)',
        fontSize: 18, fontStyle: 'italic',
        fontWeight: 300, letterSpacing: 2,
        marginBottom: 32,
      }}>
        {tagline}
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
