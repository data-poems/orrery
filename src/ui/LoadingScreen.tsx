/*
 * Loading overlay — visible until 3D scene is ready.
 * Fades out smoothly over 500ms.
 */

import { useState, useEffect } from 'react';

export default function LoadingScreen({ ready, progress = 0 }: { ready: boolean; progress?: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => setVisible(false), 600);
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
        transition: 'opacity 0.5s ease',
        pointerEvents: ready ? 'none' : 'auto',
      }}
    >
      <div style={{
        color: 'rgba(255,255,255,0.2)',
        fontSize: 16, letterSpacing: 8,
        textTransform: 'uppercase', fontWeight: 300,
        marginBottom: 24,
      }}>
        Orrery
      </div>
      
      <div style={{
        width: 120, height: 1,
        background: 'rgba(255,255,255,0.1)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 12,
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${progress}%`,
          background: 'rgba(0,255,204,0.5)',
          transition: 'width 0.3s ease-out',
        }} />
      </div>

      <div style={{
        color: 'rgba(0,255,204,0.4)',
        fontSize: 9,
        letterSpacing: 2,
        textTransform: 'uppercase',
      }}>
        {ready ? 'Ready' : `Initializing ${Math.round(progress)}%`}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scaleX(1); }
          50% { opacity: 1; transform: scaleX(2); }
        }
      `}</style>
    </div>
  );
}
