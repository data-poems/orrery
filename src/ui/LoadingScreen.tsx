/*
 * Loading overlay — visible until 3D scene is ready.
 * Film title card aesthetic: sparse, cinematic, minimal.
 *
 * In observatory mode, the fade is longer (1.4s vs 0.7s) so the handoff
 * to the interactive sky doesn't feel abrupt, and the catalog stats give
 * the user something to read while data loads.
 */

import { useState, useEffect } from 'react';
import { OBSERVATORY_MODE } from '../lib/mode';

const OBSERVATORY_STATS = [
  '41,119 stars',
  '88 constellations',
  '110 deep sky objects',
  '19 asterisms',
  'Milky Way',
];

const ORRERY_STATS = [
  '8 planets · 32 moons',
  '3,000 main-belt asteroids',
  '20+ comets · 14 meteor showers',
  'live near-Earth objects',
];

export default function LoadingScreen({ ready, progress = 0 }: { ready: boolean; progress?: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (ready) {
      const holdMs = OBSERVATORY_MODE ? 1500 : 800;
      const t = setTimeout(() => setVisible(false), holdMs);
      return () => clearTimeout(t);
    }
  }, [ready]);

  if (!visible) return null;

  const title = OBSERVATORY_MODE ? 'Observatory' : 'Orrery';
  const tagline = OBSERVATORY_MODE ? 'Look up.' : 'Real data. Real time.';
  const stats = OBSERVATORY_MODE ? OBSERVATORY_STATS : ORRERY_STATS;
  const fadeMs = OBSERVATORY_MODE ? 1.4 : 0.7;

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
        transition: `opacity ${fadeMs}s ease`,
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
        marginBottom: 28,
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${progress}%`,
          background: 'rgba(255,255,255,0.25)',
          transition: 'width 0.3s ease-out',
        }} />
      </div>

      <ul style={{
        listStyle: 'none', padding: 0, margin: 0,
        textAlign: 'center',
        color: 'rgba(255,255,255,0.32)',
        fontSize: 12, fontWeight: 300, letterSpacing: 1.4,
        fontStyle: 'italic',
        lineHeight: 1.85,
      }}>
        {stats.map(s => <li key={s}>{s}</li>)}
      </ul>
    </div>
  );
}
