/*
 * Loading overlay — visible until 3D scene is ready.
 * Film title card aesthetic: sparse, cinematic, minimal.
 *
 * Watchdog: if loading stalls >8s, offer retry (up to 2) then full reload.
 */

import { useState, useEffect } from 'react';
import { OBSERVATORY_MODE } from '../lib/mode';

const OBSERVATORY_STATS = [
  '41,119 stars',
  '88 constellations',
  '19 asterisms',
];

const ORRERY_STATS = [
  '8 planets · 32 moons',
  '3,000 main-belt asteroids',
  '20+ comets · 14 meteor showers',
  'live near-Earth objects',
];

const WATCHDOG_MS = 8000;
const MAX_RETRIES = 2;

export default function LoadingScreen({
  ready,
  progress = 0,
  loadingTasks,
  onReload,
}: {
  ready: boolean;
  progress?: number;
  loadingTasks?: Record<string, boolean>;
  onReload?: () => void;
}) {
  const [visible, setVisible] = useState(true);
  const [stuck, setStuck] = useState(false);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    if (ready) {
      const holdMs = OBSERVATORY_MODE ? 1500 : 800;
      const t = setTimeout(() => setVisible(false), holdMs);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStuck(true), WATCHDOG_MS);
    return () => clearTimeout(t);
  }, [ready, retries]);

  if (!visible) return null;

  const title = OBSERVATORY_MODE ? 'Observatory' : 'Orrery';
  const tagline = OBSERVATORY_MODE ? 'Look up.' : 'Real data. Real time.';
  const stats = OBSERVATORY_MODE ? OBSERVATORY_STATS : ORRERY_STATS;
  const fadeMs = OBSERVATORY_MODE ? 1.4 : 0.7;

  const pendingTasks = loadingTasks
    ? Object.entries(loadingTasks).filter(([, done]) => !done).map(([k]) => k)
    : [];

  // Drive the bar off real task completion when we have it (accumulates against
  // the known loading tasks) instead of the coarse/jumpy progress prop.
  const taskValues = loadingTasks ? Object.values(loadingTasks) : [];
  const pct = ready
    ? 100
    : taskValues.length > 0
      ? Math.round((taskValues.filter(Boolean).length / taskValues.length) * 100)
      : progress;

  const handleReload = () => {
    if (retries >= MAX_RETRIES) {
      window.location.reload();
      return;
    }
    setRetries(r => r + 1);
    setStuck(false);
    onReload?.();
  };

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
      <div
        style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: 32, letterSpacing: 12,
          textTransform: 'uppercase', fontWeight: 300,
          marginBottom: 14,
        }}
      >
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

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        style={{
          width: 200, height: 2,
          background: 'rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 28,
        }}
      >
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`,
          background: 'rgba(255,255,255,0.45)',
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

      {stuck && !ready && (
        <div style={{ marginTop: 28, textAlign: 'center', maxWidth: 280 }}>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 12 }}>
            Loading is taking longer than expected.
            {pendingTasks.length > 0 && (
              <span style={{ display: 'block', marginTop: 6, fontSize: 11 }}>
                Waiting: {pendingTasks.join(', ')}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={handleReload}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.7)',
              fontFamily: 'inherit',
              fontSize: 12,
              letterSpacing: 2,
              textTransform: 'uppercase',
              padding: '10px 20px',
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            {retries >= MAX_RETRIES ? 'Reload page' : 'Retry loading'}
          </button>
        </div>
      )}
    </div>
  );
}
