/*
 * Deep space layer — Oort Cloud, spacecraft, nearby stars, galaxy markers
 */

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  OORT_CLOUD, SPACECRAFT, NEARBY_STARS, LOCAL_GROUP,
  PC_TO_AU, STAR_DISPLAY_CAP_AU,
  heliocentricXYZ, raDecToSphere,
} from '../data/deepspace';
import type { Spacecraft } from '../data/deepspace';

// ─── Oort Cloud (instanced particle shell) ──────────────────────────────────

function OortCloud() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const initializedRef = useRef(false);

  const [matrices] = useState(() => {
    const { innerRadius, outerRadius, particleCount } = OORT_CLOUD;
    const arr = new Float32Array(particleCount * 16);
    const mat4 = new THREE.Matrix4();

    for (let i = 0; i < particleCount; i++) {
      // Spherical shell distribution
      const u = Math.random();
      // Bias toward outer regions (cubic distribution in radius)
      const r = innerRadius + (outerRadius - innerRadius) * Math.cbrt(u);
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = Math.random() * Math.PI * 2;

      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.cos(theta);
      const z = r * Math.sin(theta) * Math.sin(phi);

      const scale = 0.3 + Math.random() * 0.5;
      mat4.makeTranslation(x, y, z);
      mat4.scale(new THREE.Vector3(scale, scale, scale));
      mat4.toArray(arr, i * 16);
    }
    return arr;
  });

  // Apply matrices on mount
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || initializedRef.current) return;
    const { particleCount } = OORT_CLOUD;
    const mat4 = new THREE.Matrix4();
    for (let i = 0; i < particleCount; i++) {
      mat4.fromArray(matrices, i * 16);
      mesh.setMatrixAt(i, mat4);
    }
    mesh.instanceMatrix.needsUpdate = true;
    initializedRef.current = true;
  });

  // Slow rotation for visual interest
  useFrame((_, dt) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += dt * 0.0005;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, OORT_CLOUD.particleCount]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#aaccff" transparent opacity={0.12} toneMapped={false} />
    </instancedMesh>
  );
}

// ─── Spacecraft markers ─────────────────────────────────────────────────────

function SpacecraftDot({ craft, selected, onSelect }: {
  craft: Spacecraft; selected: boolean; onSelect: () => void;
}) {
  const pos = useMemo(
    () => heliocentricXYZ(craft.ra, craft.dec, craft.distAU),
    [craft.ra, craft.dec, craft.distAU],
  );

  const color = craft.status === 'active' ? '#44ff88' : '#888888';
  const size = selected ? 1.5 : 0.8;

  // Trajectory line: from Sun origin through current position, extending 20% beyond
  const linePoints = useMemo(() => {
    const origin = new THREE.Vector3(0, 0, 0);
    const end = new THREE.Vector3(...pos);
    const extended = end.clone().multiplyScalar(1.2);
    return [origin, end, extended];
  }, [pos]);

  return (
    <group>
      {/* Trajectory line */}
      <Line
        points={linePoints}
        color={color}
        lineWidth={0.5}
        transparent
        opacity={0.25}
      />
      {/* Craft dot */}
      <mesh
        position={pos}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <sphereGeometry args={[size, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Glow */}
      <sprite position={pos} scale={[size * 4, size * 4, 1]}>
        <spriteMaterial color={color} transparent opacity={0.3} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      {/* Label */}
      <Html position={[pos[0], pos[1] + 3, pos[2]]} center distanceFactor={50} style={{ pointerEvents: 'none' }} zIndexRange={[1, 0]}>
        <div style={{
          color: selected ? '#fff' : 'rgba(255,255,255,0.7)',
          fontSize: 9,
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: selected ? 600 : 400,
          letterSpacing: 1,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          textShadow: '0 0 6px rgba(0,0,0,0.9)',
        }}>
          {craft.name}
          <br />
          <span style={{ fontSize: 7, opacity: 0.6 }}>{craft.distAU} AU</span>
        </div>
      </Html>
    </group>
  );
}

function SpacecraftMarkers({ selSpacecraft, setSelSpacecraft }: {
  selSpacecraft: Spacecraft | null;
  setSelSpacecraft: (s: Spacecraft | null) => void;
}) {
  return (
    <group>
      {SPACECRAFT.map(craft => (
        <SpacecraftDot
          key={craft.name}
          craft={craft}
          selected={selSpacecraft?.name === craft.name}
          onSelect={() => setSelSpacecraft(selSpacecraft?.name === craft.name ? null : craft)}
        />
      ))}
    </group>
  );
}

// ─── Nearby star markers ────────────────────────────────────────────────────

function NearStarMarkers() {
  return (
    <group>
      {NEARBY_STARS.map(star => {
        const distAU = star.distPC * PC_TO_AU;
        const capped = Math.min(distAU, STAR_DISPLAY_CAP_AU);
        const pos = heliocentricXYZ(star.ra, star.dec, capped);

        // Color by spectral type
        const isMDwarf = star.spectral.startsWith('M');
        const isAType = star.spectral.startsWith('A');
        const color = isMDwarf ? '#ff6644' : isAType ? '#aaccff' : '#ffeecc';
        const size = isAType ? 2.5 : isMDwarf ? 1.2 : 1.8;
        const ly = (star.distPC * 3.262).toFixed(1);

        return (
          <group key={star.name}>
            <mesh position={pos}>
              <sphereGeometry args={[size, 8, 8]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            {/* Glow sprite */}
            <sprite position={pos} scale={[size * 6, size * 6, 1]}>
              <spriteMaterial color={color} transparent opacity={0.25} blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <Html position={[pos[0], pos[1] + 4, pos[2]]} center distanceFactor={200} style={{ pointerEvents: 'none' }} zIndexRange={[1, 0]}>
              <div style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 8,
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                letterSpacing: 0.5,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                textShadow: '0 0 8px rgba(0,0,0,0.9)',
              }}>
                {star.name}
                <br />
                <span style={{ fontSize: 7, opacity: 0.5 }}>{ly} ly</span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// ─── Galaxy markers (on celestial sphere) ───────────────────────────────────

function GalaxyMarkers() {
  return (
    <group>
      {LOCAL_GROUP.map(gal => {
        const pos = raDecToSphere(gal.ra, gal.dec, 290);
        const isSpiral = gal.type === 'Spiral';
        const color = isSpiral ? '#ccaaff' : '#88aacc';
        const size = isSpiral ? 3 : 1.8;
        const distLabel = gal.distKpc >= 100
          ? `${(gal.distKpc / 1000).toFixed(1)} Mpc`
          : `${gal.distKpc} kpc`;

        return (
          <group key={gal.name}>
            {/* Galaxy dot */}
            <mesh position={pos}>
              <sphereGeometry args={[size, 8, 8]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            {/* Diffuse glow */}
            <sprite position={pos} scale={[size * 8, size * 5, 1]}>
              <spriteMaterial color={color} transparent opacity={0.15} blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <Html position={[pos[0], pos[1] + 5, pos[2]]} center distanceFactor={200} style={{ pointerEvents: 'none' }} zIndexRange={[1, 0]}>
              <div style={{
                color: 'rgba(200,180,255,0.7)',
                fontSize: 8,
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontStyle: 'italic',
                letterSpacing: 0.5,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                textShadow: '0 0 8px rgba(0,0,0,0.9)',
              }}>
                {gal.name}
                <br />
                <span style={{ fontSize: 7, opacity: 0.5 }}>{distLabel}</span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export interface DeepSpaceProps {
  visible: boolean;
  selSpacecraft: Spacecraft | null;
  setSelSpacecraft: (s: Spacecraft | null) => void;
}

export function DeepSpaceField({ visible, selSpacecraft, setSelSpacecraft }: DeepSpaceProps) {
  if (!visible) return null;
  return (
    <group>
      <OortCloud />
      <SpacecraftMarkers selSpacecraft={selSpacecraft} setSelSpacecraft={setSelSpacecraft} />
      <NearStarMarkers />
      <GalaxyMarkers />
    </group>
  );
}
