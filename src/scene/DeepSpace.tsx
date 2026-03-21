/*
 * Deep space visuals — scale markers, Oort Cloud, galaxy disc
 *
 * These render at extreme distances (100+ AU to 100,000+ AU)
 * and rely on logarithmic depth buffer for z-precision.
 *
 * All use depthTest: true and normal blending to avoid
 * the additive "blur mess" that happens with depthTest: false.
 */

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTheme } from '../lib/themes';

// ─── Scale markers (rings at key distances) ──────────────────────────────────

export function ScaleMarkers() {
  const { theme } = useTheme();
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const markers = useMemo(() => [
    { r: 50,    minDist: 30 },
    { r: 120,   minDist: 60 },
    { r: 1000,  minDist: 200 },
    { r: 5000,  minDist: 500 },
    { r: 10000, minDist: 1000 },
    { r: 50000, minDist: 3000 },
  ], []);

  useFrame(() => {
    if (!ref.current) return;
    const dist = camera.position.length();
    ref.current.children.forEach((child, i) => {
      child.visible = dist > markers[i].minDist;
    });
  });

  return (
    <group ref={ref}>
      {markers.map(({ r }) => (
        <mesh key={r} rotation={[Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[r - r * 0.001, r + r * 0.001, 128]} />
          <meshBasicMaterial
            color={r === 120 ? theme.uiAccent : '#ffffff'}
            transparent
            opacity={r === 120 ? 0.12 : 0.03}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Oort Cloud (sparse spherical shell of faint points) ─────────────────────

const OORT_COUNT = 5000;

export function OortCloud() {
  const ref = useRef<THREE.Points>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!ref.current) return;
    const dist = camera.position.length();
    ref.current.visible = dist > 200;
    // Fade in 200-2000, brighter peak at mid-distances where Oort is the main visual
    if (ref.current.material && 'opacity' in ref.current.material) {
      let opacity: number;
      if (dist < 2000) {
        opacity = (dist - 200) / 1800 * 0.35;
      } else if (dist < 60000) {
        opacity = 0.35;
      } else {
        // Fade out as galaxy takes over
        opacity = Math.max(0.1, 0.35 - (dist - 60000) / 50000 * 0.25);
      }
      (ref.current.material as THREE.PointsMaterial).opacity = opacity;
    }
  });

  const geometry = useMemo(() => {
    const positions = new Float32Array(OORT_COUNT * 3);

    for (let i = 0; i < OORT_COUNT; i++) {
      // Wider radial spread to avoid clumping
      const r = 2000 + Math.pow(Math.random(), 0.7) * 48000;
      const theta = Math.acos(2 * Math.random() - 1);
      // More spherical distribution (less disc-like)
      const flatTheta = theta * 0.85 + (Math.PI / 2) * 0.15;
      const phi = Math.random() * Math.PI * 2;

      positions[i * 3] = r * Math.sin(flatTheta) * Math.cos(phi);
      positions[i * 3 + 1] = r * Math.cos(flatTheta) * 0.6;
      positions[i * 3 + 2] = r * Math.sin(flatTheta) * Math.sin(phi);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <points ref={ref} geometry={geometry} visible={false}>
      <pointsMaterial
        color="#8899bb"
        size={1.5}
        transparent
        opacity={0.35}
        depthWrite={false}
        depthTest={true}
        sizeAttenuation={false}
      />
    </points>
  );
}

// ─── Galaxy (star points scattered along spiral arms — no texture plane) ─────

export function GalaxyDisc() {
  return <GalaxyStars />;
}

// ─── Galaxy star points (scattered along spiral arms) ────────────────────────

const GALAXY_STAR_COUNT = 15000;

function GalaxyStars() {
  const ref = useRef<THREE.Points>(null);
  const { camera } = useThree();

  const geometry = useMemo(() => {
    const positions = new Float32Array(GALAXY_STAR_COUNT * 3);
    const colors = new Float32Array(GALAXY_STAR_COUNT * 3);

    for (let i = 0; i < GALAXY_STAR_COUNT; i++) {
      const r = Math.pow(Math.random(), 0.6) * 90000;
      // 4 spiral arms for richer structure
      const armAngle = Math.floor(Math.random() * 4) * (Math.PI / 2);
      const spiralAngle = armAngle + r * 0.00008 + (Math.random() - 0.5) * 0.6;

      const x = r * Math.cos(spiralAngle) + (Math.random() - 0.5) * r * 0.25;
      const z = r * Math.sin(spiralAngle) + (Math.random() - 0.5) * r * 0.25;
      const y = (Math.random() - 0.5) * Math.max(500, r * 0.05);

      const rx = x;
      const ry = y * Math.cos(0.1) - z * Math.sin(0.1) - 2000;
      const rz = y * Math.sin(0.1) + z * Math.cos(0.1);

      positions[i * 3] = rx * Math.cos(0.4) - rz * Math.sin(0.4);
      positions[i * 3 + 1] = ry;
      positions[i * 3 + 2] = rx * Math.sin(0.4) + rz * Math.cos(0.4);

      const centerFactor = Math.exp(-r / 20000);
      colors[i * 3] = 0.7 + centerFactor * 0.3;
      colors[i * 3 + 1] = 0.8 + centerFactor * 0.1;
      colors[i * 3 + 2] = 1.0 - centerFactor * 0.3;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  // Fade in from 5000 AU for smooth Oort-to-Galaxy visual continuity
  useFrame(() => {
    if (!ref.current) return;
    const dist = camera.position.length();
    ref.current.visible = dist > 5000;
    if (ref.current.material && 'opacity' in ref.current.material) {
      const mat = ref.current.material as THREE.PointsMaterial;
      if (dist < 15000) {
        mat.opacity = ((dist - 5000) / 10000) * 0.6;
      } else {
        mat.opacity = 0.6;
      }
    }
  });

  return (
    <points ref={ref} geometry={geometry} visible={false}>
      <pointsMaterial
        vertexColors
        size={1.5}
        transparent
        opacity={0.6}
        depthWrite={false}
        depthTest={true}
        sizeAttenuation={false}
      />
    </points>
  );
}
