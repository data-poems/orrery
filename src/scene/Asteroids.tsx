/*
 * Asteroid belt + NEO dots and orbit lines
 */

import { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { NEO } from '../lib/kepler';
import { DEG, asteroidOrbitPath, neoXYZ } from '../lib/kepler';

// ─── Asteroid Belt (instanced particles, 2.2–3.2 AU) ───────────────────────────

const BELT_COUNT = 3000;

// Kirkwood gap centers (AU) — resonances with Jupiter
const KIRKWOOD = [2.502, 2.825, 2.958]; // 3:1, 5:2, 7:3
const GAP_WIDTH = 0.04;

function isInGap(a: number): boolean {
  for (const k of KIRKWOOD) {
    if (Math.abs(a - k) < GAP_WIDTH) return true;
  }
  return false;
}

export function AsteroidBelt() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const [matrices] = useState(() => {
    const dummy = new THREE.Object3D();
    const arr = new Float32Array(BELT_COUNT * 16);
    let placed = 0;
    while (placed < BELT_COUNT) {
      // Semi-major axis peaked around 2.7 AU
      const a = 1.8 + Math.pow(Math.random(), 0.6) * 2.4;
      if (a < 2.0 || a > 3.6) continue;
      if (isInGap(a)) continue;

      const angle = Math.random() * Math.PI * 2;
      const ecc = Math.random() * 0.25;
      const r = a * (1 - ecc * ecc) / (1 + ecc * Math.cos(angle));
      const incl = (Math.random() - 0.5) * 16 * DEG; // +/- 8 deg
      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle);
      const y = r * Math.sin(incl) * Math.sin(angle);
      const scale = 0.002 + Math.random() * 0.005;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      dummy.updateMatrix();
      dummy.matrix.toArray(arr, placed * 16);
      placed++;
    }
    return arr;
  });

  useEffect(() => {
    if (!meshRef.current) return;
    const m = new THREE.Matrix4();
    for (let i = 0; i < BELT_COUNT; i++) {
      m.fromArray(matrices, i * 16);
      meshRef.current.setMatrixAt(i, m);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  // Gentle rotation for orbital motion feel
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.003;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, BELT_COUNT]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#887766" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

// ─── Real Asteroid Belt (from prebaked data) ────────────────────────────────────

interface AsteroidData {
  a: number; e: number; i: number; om: number; w: number;
  ma: number; epoch: number; H: number; name: string;
}

const REAL_BELT_PATH = import.meta.env.BASE_URL + 'data/main-belt.json';

export function RealAsteroidBelt({ jd }: { jd: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [data, setData] = useState<AsteroidData[] | null>(null);
  const lastJd = useRef(0);

  useEffect(() => {
    fetch(REAL_BELT_PATH)
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  // Recompute positions when jd changes by >0.5 days
  useEffect(() => {
    if (!data || !meshRef.current) return;
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
  }, [data, jd]);

  if (!data) return null;

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
        <sphereGeometry args={[r, 16, 16]} />
        <meshBasicMaterial color={col} toneMapped={false} />
      </mesh>
      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[r * 2.5, 12, 12]} />
        <meshBasicMaterial color={col} transparent opacity={0.15} blending={THREE.AdditiveBlending} toneMapped={false} depthWrite={false} />
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

  if (!pts) return null;
  const col = neo.hazardous ? '#ff6644' : '#44ffaa';
  return <Line points={pts} color={col} lineWidth={0.8} transparent opacity={0.5} />;
}
