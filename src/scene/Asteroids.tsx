/*
 * Asteroid belt + NEO dots and orbit lines
 */

import { useRef, useEffect, useMemo, useState } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { NEO } from '../lib/kepler';
import { DEG, asteroidOrbitPath, neoXYZ } from '../lib/kepler';

// ─── Real Asteroid Belt (from prebaked data) ────────────────────────────────────

interface AsteroidData {
  a: number; e: number; i: number; om: number; w: number;
  ma: number; epoch: number; H: number; name: string;
}

const REAL_BELT_PATH = import.meta.env.BASE_URL + 'data/main-belt.json';

export function RealAsteroidBelt({ jd, visible, onLoad }: { jd: number; visible: boolean; onLoad?: () => void }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [data, setData] = useState<AsteroidData[] | null>(null);
  const lastJd = useRef(0);

  useEffect(() => {
    if (!visible) { onLoad?.(); return; }
    fetch(REAL_BELT_PATH)
      .then(r => r.json())
      .then(d => {
        setData(d);
        onLoad?.();
      })
      .catch(() => {});
  }, [visible, onLoad]);

  // Recompute positions when jd changes by >0.5 days
  useEffect(() => {
    if (!data || !meshRef.current || !visible) return;
    if (Math.abs(jd - lastJd.current) < 0.5 && lastJd.current !== 0) return;
    lastJd.current = jd;

    const dummy = new THREE.Object3D();
    const count = Math.min(data.length, 5000);

    for (let idx = 0; idx < count; idx++) {
      const d = data[idx];
      const pos = neoXYZ(d.a, d.e, d.i, d.om, d.w, d.ma, d.epoch, jd);
      const scale = 0.002 + (d.H < 15 ? 0.004 : 0.001);
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(idx, dummy.matrix);
    }
    meshRef.current!.instanceMatrix.needsUpdate = true;
  }, [data, jd, visible]);

  if (!data || !visible) return null;

  const count = Math.min(data.length, 5000);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#887766" roughness={0.9} />
    </instancedMesh>
  );
}

// ─── NEO dot ────────────────────────────────────────────────────────────────────

export function NeoDot({ neo, selected, onSelect, jd }: {
  neo: NEO; selected: boolean; onSelect: () => void; jd: number;
}) {
  const pos = useMemo((): [number, number, number] => {
    // Use Keplerian position if orbital elements are loaded
    if (neo.orbit?.loaded && neo.orbit.epoch) {
      return neoXYZ(neo.orbit.a, neo.orbit.e, neo.orbit.i, neo.orbit.om, neo.orbit.w, neo.orbit.ma, neo.orbit.epoch, jd);
    }
    // Fallback: approximate placement near Earth based on miss distance
    const angle = (parseInt(neo.id.slice(-4), 16) % 360) * DEG;
    const dist = Math.min(neo.missAU * 5, 2.5);
    const x = (1 + dist) * Math.cos(angle);
    const z = (1 + dist) * Math.sin(angle);
    return [x, 0, z];
  }, [neo, jd]);

  const col = neo.hazardous ? '#ff4444' : '#44ff88';
  const r = Math.max(0.006, Math.min(0.022, neo.dMax / 500));

  return (
    <group position={pos}>
      <mesh onClick={e => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[r, 24, 24]} />
        <meshBasicMaterial color={col} toneMapped={false} />
      </mesh>
      {selected && (
        <mesh>
          <sphereGeometry args={[r * 4, 16, 16]} />
          <meshBasicMaterial color={col} transparent opacity={0.2} blending={THREE.AdditiveBlending} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// ─── NEO orbit line ─────────────────────────────────────────────────────────────

export function AsteroidOrbitLine({ neo }: { neo: NEO }) {
  const pts = useMemo(() => {
    if (!neo.orbit?.loaded) return null;
    return asteroidOrbitPath(neo.orbit.a, neo.orbit.e, neo.orbit.i, neo.orbit.om, neo.orbit.w);
  }, [neo.orbit]);

  if (!pts || pts.length < 2) return null;
  const col = neo.hazardous ? '#ff6644' : '#44ffaa';
  return <Line points={pts} color={col} lineWidth={0.8} transparent opacity={0.5} />;
}
