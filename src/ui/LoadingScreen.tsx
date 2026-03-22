/*
 * Loading overlay — visible until 3D scene is ready.
 * Fades out smoothly, reveals real data facts as assets load.
 */

import { useState, useEffect, useRef } from 'react';

const FACTS = [
  'Charting 41,487 stars from the HYG catalog',
  'Mapping 89 constellations across the celestial sphere',
  'Placing 5,000 asteroids in the main belt',
  'Tracing 95 comet orbits through the inner solar system',
  'Cataloging 113 meteor showers from the IAU database',
  'Tracking 30 satellites in Earth orbit via SGP4 propagation',
  'Plotting 288 deep sky objects — galaxies, nebulae, star clusters',
  'Computing Keplerian orbits for 8 planets and 32 moons',
  'Positioning 5 interstellar spacecraft beyond the heliosphere',
  'Scattering 5,000 icy bodies across the Oort Cloud',
  'Rendering Saturn\'s rings — C Ring to Encke Gap',
  'Resolving 10 nearby star systems within 12 light-years',
];

export default function LoadingScreen({ ready, progress = 0 }: { ready: boolean; progress?: number }) {
  const [visible, setVisible] = useState(true);
  const [shownFacts, setShownFacts] = useState<string[]>([]);
  const factIdx = useRef(0);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => setVisible(false), 600);
      return () => clearTimeout(t);
    }
  }, [ready]);

  // Reveal facts one at a time as loading progresses
  useEffect(() => {
    if (ready) return;
    const id = setInterval(() => {
      if (factIdx.current < FACTS.length) {
        setShownFacts(prev => [...prev, FACTS[factIdx.current]]);
        factIdx.current++;
      }
    }, isMobile ? 1800 : 1400);
    return () => clearInterval(id);
  }, [ready, isMobile]);

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

      {/* Facts feed */}
      <div style={{
        maxWidth: isMobile ? 280 : 360,
        minHeight: isMobile ? 140 : 180,
        marginBottom: 20,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
      }}>
        {shownFacts.slice(-5).map((fact, i) => {
          const isLatest = i === shownFacts.slice(-5).length - 1;
          return (
            <div
              key={fact}
              style={{
                color: isLatest ? 'rgba(0,255,204,0.6)' : 'rgba(255,255,255,0.15)',
                fontSize: isMobile ? 11 : 12,
                fontStyle: 'italic',
                lineHeight: 1.6,
                letterSpacing: 0.5,
                transition: 'color 0.4s ease, opacity 0.4s ease',
                textAlign: 'center',
              }}
            >
              {fact}
            </div>
          );
        })}
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
    </div>
  );
}
