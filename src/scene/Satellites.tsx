/**
 * Satellite rendering — ISS and space stations near Earth.
 *
 * Shape: small square (distinct from circles and diamonds).
 * Color: #ff66ff (magenta, colorblind-safe).
 */

import { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { SatelliteRecord, SatellitePosition } from '../lib/satellites';
import { fetchTLEs, propagateSatellite } from '../lib/satellites';

const SAT_COLOR = '#ff66ff';

// ─── Single satellite dot ────────────────────────────────────────────────────

function SatDot({ sat, selected, onSelect }: {
  sat: SatellitePosition; selected: boolean; onSelect: () => void;
}) {
  const isISS = sat.name.includes('ISS');
  const size = isISS ? 0.008 : 0.005;

  return (
    <group position={sat.pos}>
      {/* Square shape: flat box */}
      <mesh
        rotation={[Math.PI / 4, Math.PI / 4, 0]}
        onClick={e => { e.stopPropagation(); onSelect(); }}
      >
        <boxGeometry args={[size, size, size * 0.3]} />
        <meshBasicMaterial color={SAT_COLOR} />
      </mesh>
      {/* Selection glow */}
      {selected && (
        <mesh>
          <sphereGeometry args={[size * 4, 16, 16]} />
          <meshBasicMaterial color={SAT_COLOR} transparent opacity={0.1} />
        </mesh>
      )}
      {/* ISS always labeled, others only when selected */}
      {(isISS || selected) && (
        <Html
          position={[0, size + 0.008, 0]}
          center
          distanceFactor={2}
          style={{ pointerEvents: 'none' }}
          zIndexRange={[1, 0]}
        >
          <div style={{
            color: SAT_COLOR,
            fontSize: isISS ? 8 : 7,
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: selected ? 600 : 400,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            textShadow: '0 0 8px rgba(255,102,255,0.4)',
          }}>
            {sat.name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Satellite field ─────────────────────────────────────────────────────────

export interface SatelliteFieldProps {
  visible: boolean;
  simTime: Date;
  earthPos: [number, number, number] | null;
  selSatellite: SatellitePosition | null;
  setSelSatellite: (s: SatellitePosition | null) => void;
}

export function SatelliteField({ visible, simTime, earthPos, selSatellite, setSelSatellite }: SatelliteFieldProps) {
  const [records, setRecords] = useState<SatelliteRecord[]>([]);
  const [positions, setPositions] = useState<SatellitePosition[]>([]);
  const lastPropagation = useRef(0);

  // Fetch TLEs once when visible
  useEffect(() => {
    if (!visible) return;
    fetchTLEs()
      .then(setRecords)
      .catch(() => {});
  }, [visible]);

  // Propagate positions at ~1Hz
  useFrame(() => {
    if (!visible || records.length === 0 || !earthPos) return;

    const now = Date.now();
    if (now - lastPropagation.current < 1000) return;
    lastPropagation.current = now;

    const newPositions: SatellitePosition[] = [];
    for (const rec of records) {
      const pos = propagateSatellite(rec, simTime, earthPos);
      if (pos) newPositions.push(pos);
    }
    setPositions(newPositions);
  });

  if (!visible || positions.length === 0) return null;

  return (
    <>
      {positions.map(sat => (
        <SatDot
          key={sat.noradId}
          sat={sat}
          selected={selSatellite?.noradId === sat.noradId}
          onSelect={() => setSelSatellite(
            selSatellite?.noradId === sat.noradId ? null : sat,
          )}
        />
      ))}
    </>
  );
}
