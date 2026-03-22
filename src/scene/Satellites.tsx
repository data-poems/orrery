/**
 * Satellite rendering — tiny orbital markers near Earth.
 *
 * Kept intentionally minimal so the orbital shell only appears when the
 * camera is close enough to Earth for it to read as detail instead of clutter.
 */

import { useState, useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import type { SatelliteRecord, SatellitePosition } from '../lib/satellites';
import { fetchTLEs, propagateSatellite } from '../lib/satellites';

const SAT_COLOR = '#ff66ff';
const SATELLITE_MAX_CAMERA_DISTANCE = 3.5;

// ─── Single satellite dot ────────────────────────────────────────────────────

function SatDot({ sat, selected, onSelect }: {
  sat: SatellitePosition; selected: boolean; onSelect: () => void;
}) {
  const isISS = sat.name.includes('ISS');
  const size = isISS ? 0.0035 : 0.0024;

  return (
    <group position={sat.pos}>
      <mesh
        rotation={[Math.PI / 4, Math.PI / 4, 0]}
        onClick={e => { e.stopPropagation(); onSelect(); }}
      >
        <boxGeometry args={[size, size, size * 0.3]} />
        <meshBasicMaterial color={SAT_COLOR} toneMapped={false} />
      </mesh>
      {/* Selection glow */}
      {selected && (
        <mesh>
          <sphereGeometry args={[size * 3, 12, 12]} />
          <meshBasicMaterial color={SAT_COLOR} transparent opacity={0.12} toneMapped={false} />
        </mesh>
      )}
      {/* Labels only appear on explicit selection */}
      {selected && (
        <Html
          position={[0, size + 0.008, 0]}
          center
          distanceFactor={2}
          style={{ pointerEvents: 'none' }}
          zIndexRange={[1, 0]}
        >
          <div style={{
            color: SAT_COLOR,
            fontSize: 7,
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600,
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
  cameraDistance: number;
  selSatellite: SatellitePosition | null;
  setSelSatellite: (s: SatellitePosition | null) => void;
  onLoad?: () => void;
}

export function SatelliteField({ visible, simTime, earthPos, cameraDistance, selSatellite, setSelSatellite, onLoad }: SatelliteFieldProps) {
  const [records, setRecords] = useState<SatelliteRecord[]>([]);
  const [positions, setPositions] = useState<SatellitePosition[]>([]);
  const simTimeRef = useRef(simTime);
  const earthPosRef = useRef(earthPos);
  const shouldRender = visible && cameraDistance <= SATELLITE_MAX_CAMERA_DISTANCE;

  // Fetch TLEs once on mount
  useEffect(() => {
    fetchTLEs()
      .then(d => {
        setRecords(d);
        onLoad?.();
      })
      .catch(() => {});
  }, [onLoad]);

  useEffect(() => {
    simTimeRef.current = simTime;
  }, [simTime]);

  useEffect(() => {
    earthPosRef.current = earthPos;
  }, [earthPos]);

  // Propagate positions at ~1Hz without driving React updates from the render loop.
  useEffect(() => {
    if (!shouldRender || records.length === 0) return;

    const updatePositions = () => {
      const currentEarthPos = earthPosRef.current;
      if (!currentEarthPos) return;

      const newPositions: SatellitePosition[] = [];
      for (const rec of records) {
        const pos = propagateSatellite(rec, simTimeRef.current, currentEarthPos);
        if (pos) newPositions.push(pos);
      }
      setPositions(newPositions);
    };

    updatePositions();
    const id = window.setInterval(updatePositions, 1000);
    return () => window.clearInterval(id);
  }, [shouldRender, records]);

  useEffect(() => {
    if (shouldRender) return;
    setSelSatellite(null);
  }, [shouldRender, setSelSatellite]);

  if (!shouldRender || positions.length === 0) return null;

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
