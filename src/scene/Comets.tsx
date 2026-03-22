/**
 * Comet rendering — dots, orbit lines, tails
 *
 * Comets use diamond shapes (colorblind-distinct from circular asteroids/NEOs).
 * Color: #66ddff (cyan). Orbits are dashed lines.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { CometDef } from '../data/comets';
import { cometXYZ, cometOrbitPath } from '../lib/kepler';

const BASE_PATH = import.meta.env.BASE_URL + 'data/';
const COMET_COLOR = '#66ddff';

// ─── Comet tail (billboard sprite stretched anti-sunward) ────────────────────

function CometTail({ pos, jd }: { pos: [number, number, number]; jd: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const sunDir = useMemo(() => {
    const d = new THREE.Vector3(pos[0], pos[1], pos[2]);
    const dist = d.length();
    if (dist < 0.01) return new THREE.Vector3(1, 0, 0);
    return d.normalize();
  }, [pos, jd]);

  // Tail length scales with 1/r² (brighter near Sun)
  const dist = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]);
  const tailLen = Math.min(0.5, 0.15 / Math.max(dist * dist, 0.01));
  const tailOpacity = Math.min(0.6, 0.3 / Math.max(dist, 0.1));

  if (dist > 5 || tailLen < 0.005) return null;

  return (
    <mesh
      ref={meshRef}
      position={[
        pos[0] + sunDir.x * tailLen * 0.5,
        pos[1] + sunDir.y * tailLen * 0.5,
        pos[2] + sunDir.z * tailLen * 0.5,
      ]}
    >
      <planeGeometry args={[0.01, tailLen]} />
      <meshBasicMaterial
        color={COMET_COLOR}
        transparent
        opacity={tailOpacity}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ─── Single comet dot (diamond shape) ────────────────────────────────────────

function CometDot({ comet, jd, selected, onSelect }: {
  comet: CometDef; jd: number; selected: boolean;
  onSelect: () => void;
}) {
  const pos = useMemo(() => cometXYZ(
    comet.q, comet.e, comet.i, comet.om, comet.w, comet.tp_jd, jd,
  ), [comet, jd]);

  // Skip if too far away (beyond scene render distance)
  const dist = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]);
  if (dist > 200) return null;

  const size = comet.notable ? 0.018 : 0.012;

  return (
    <group position={pos}>
      {/* Diamond shape: rotated cube */}
      <mesh
        rotation={[Math.PI / 4, 0, Math.PI / 4]}
        onClick={e => { e.stopPropagation(); onSelect(); }}
      >
        <boxGeometry args={[size, size, size]} />
        <meshBasicMaterial color={COMET_COLOR} />
      </mesh>
      {/* Selection glow */}
      {selected && (
        <mesh>
          <sphereGeometry args={[size * 3, 16, 16]} />
          <meshBasicMaterial color={COMET_COLOR} transparent opacity={0.12} />
        </mesh>
      )}
      {/* Label for notable comets */}
      {(selected || comet.notable) && (
        <Html
          position={[0, size + 0.015, 0]}
          center
          distanceFactor={3}
          style={{ pointerEvents: 'none' }}
          zIndexRange={[1, 0]}
        >
          <div style={{
            color: COMET_COLOR,
            fontSize: 7,
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: selected ? 600 : 300,
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            textShadow: `0 0 8px rgba(102,221,255,0.4)`,
            opacity: selected ? 1 : 0.7,
          }}>
            {comet.name.replace(/^[CP]\/\d{4}\s\w+\s\(/, '').replace(/\)$/, '') || comet.name}
          </div>
        </Html>
      )}
      <CometTail pos={pos} jd={jd} />
    </group>
  );
}

// ─── Comet orbit line (dashed) ───────────────────────────────────────────────

function CometOrbitLine({ comet }: { comet: CometDef }) {
  const pts = useMemo(
    () => cometOrbitPath(comet.q, comet.e, comet.i, comet.om, comet.w),
    [comet],
  );

  if (pts.length < 2) return null;
  return (
    <Line
      points={pts}
      color={COMET_COLOR}
      lineWidth={0.6}
      transparent
      opacity={0.35}
      dashed
      dashSize={0.15}
      gapSize={0.1}
    />
  );
}

// ─── Comet field (loads data, manages selection) ─────────────────────────────

export interface CometFieldProps {
  jd: number;
  visible: boolean;
  selComet: CometDef | null;
  setSelComet: (c: CometDef | null) => void;
}

export function CometField({ jd, visible, selComet, setSelComet }: CometFieldProps) {
  const [comets, setComets] = useState<CometDef[]>([]);

  useEffect(() => {
    if (!visible) return;
    fetch(BASE_PATH + 'comets.json')
      .then(r => r.json())
      .then(setComets)
      .catch(() => {});
  }, [visible]);

  if (!visible || comets.length === 0) return null;

  return (
    <>
      {comets.map(comet => (
        <group key={comet.designation}>
          <CometDot
            comet={comet}
            jd={jd}
            selected={selComet?.designation === comet.designation}
            onSelect={() => setSelComet(
              selComet?.designation === comet.designation ? null : comet,
            )}
          />
          {selComet?.designation === comet.designation && (
            <CometOrbitLine comet={comet} />
          )}
        </group>
      ))}
    </>
  );
}
