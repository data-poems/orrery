/*
 * Celestial bodies — Sun, Planet, Moon, orbit rings, Saturn rings
 */

import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { TEX } from '../data/planets';
import type { PlanetDef } from '../lib/kepler';
import { planetXYZ, orbitPath } from '../lib/kepler';
import type { MoonDef } from '../data/moons';
import { useTheme } from '../lib/themes';

// ─── Sun ────────────────────────────────────────────────────────────────────────

export function Sun() {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useLoader(THREE.TextureLoader, TEX.sun);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.02; });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[0.15, 48, 48]} />
        <meshBasicMaterial map={tex} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.19, 32, 32]} />
        <meshBasicMaterial color="#ffaa33" transparent opacity={0.08} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.24, 32, 32]} />
        <meshBasicMaterial color="#ff8800" transparent opacity={0.04} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.30, 32, 32]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.02} />
      </mesh>
      <pointLight intensity={4} color="#fff5e0" distance={200} />
      <pointLight intensity={1.5} color="#ffcc80" distance={100} />
    </group>
  );
}

// ─── Earth cloud layer (separate component to avoid conditional hook) ────────────

function EarthClouds({ radius }: { radius: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const cloudTex = useLoader(THREE.TextureLoader, TEX.earthClouds);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.18; });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius * 1.012, 32, 32]} />
      <meshStandardMaterial map={cloudTex} transparent opacity={0.35} depthWrite={false} />
    </mesh>
  );
}

// ─── Saturn rings (procedural shader) ───────────────────────────────────────────

const ringVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragmentShader = `
  varying vec2 vUv;
  void main() {
    float t = vUv.x; // 0 = inner edge, 1 = outer edge

    // C Ring (innermost, faint)
    float cRing = smoothstep(0.0, 0.04, t) * smoothstep(0.18, 0.15, t) * 0.35;
    // B Ring (bright, dense)
    float bRing = smoothstep(0.18, 0.22, t) * smoothstep(0.48, 0.45, t) * 0.9;
    // Cassini Division (dark gap)
    float cassini = 1.0 - smoothstep(0.46, 0.49, t) * smoothstep(0.54, 0.51, t);
    // A Ring (moderate)
    float aRing = smoothstep(0.54, 0.58, t) * smoothstep(0.92, 0.88, t) * 0.65;
    // Encke Gap
    float encke = 1.0 - smoothstep(0.76, 0.765, t) * smoothstep(0.775, 0.77, t) * 0.7;

    float alpha = max(max(cRing, bRing), aRing) * cassini * encke;

    // Color gradient: inner warm amber, outer pale gold
    vec3 color = mix(vec3(0.78, 0.66, 0.43), vec3(0.88, 0.82, 0.65), t);

    // Subtle radial variation
    float noise = fract(sin(t * 347.3 + 43.1) * 43758.5453);
    alpha += noise * 0.04 * alpha;

    gl_FragColor = vec4(color, alpha * 0.65);
  }
`;

function SaturnRings({ radius }: { radius: number }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: ringVertexShader,
    fragmentShader: ringFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  return (
    <mesh rotation={[Math.PI / 2 + 0.47, 0, 0]} material={material}>
      <ringGeometry args={[radius * 1.2, radius * 2.6, 128]} />
    </mesh>
  );
}

// ─── Planet ─────────────────────────────────────────────────────────────────────

export function Planet({ planet, T, selected, onSelect, hovered, onHover }: {
  planet: PlanetDef; T: number; selected: boolean; onSelect: () => void;
  hovered: boolean; onHover: (h: boolean) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => planetXYZ(planet, T), [planet, T]);
  const tex = useLoader(THREE.TextureLoader, TEX[planet.tex]);
  const { theme } = useTheme();
  const r = planet.radius;

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.12;
  });

  return (
    <group position={pos}>
      <mesh
        ref={ref}
        renderOrder={10}
        onClick={e => { e.stopPropagation(); onSelect(); }}
        onPointerEnter={() => onHover(true)}
        onPointerLeave={() => onHover(false)}
      >
        <sphereGeometry args={[r, 48, 48]} />
        <meshStandardMaterial map={tex} roughness={0.8} metalness={0.0} depthWrite={true} />
      </mesh>
      {planet.tex === 'earth' && <EarthClouds radius={r} />}
      {planet.hasRings && <SaturnRings radius={r} />}
      {selected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r * 2.1, r * 2.35, 64]} />
          <meshBasicMaterial color={theme.selectedRing} transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
      {hovered && !selected && (
        <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div style={{
            color: '#fff', fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
            background: 'rgba(0,0,0,0.8)', padding: '2px 8px', borderRadius: 3,
            whiteSpace: 'nowrap', transform: 'translateY(-20px)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            {planet.name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Earth's Moon ───────────────────────────────────────────────────────────────

export function Moon({ earthPos, jd }: { earthPos: [number, number, number]; jd: number }) {
  const tex = useLoader(THREE.TextureLoader, TEX.moon);
  const ref = useRef<THREE.Mesh>(null);
  const angle = ((jd - 2451545) / 27.322) * Math.PI * 2;
  const d = 0.09;
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.05; });
  return (
    <mesh
      ref={ref}
      position={[earthPos[0] + d * Math.cos(angle), earthPos[1], earthPos[2] + d * Math.sin(angle)]}
    >
      <sphereGeometry args={[0.015, 24, 24]} />
      <meshStandardMaterial map={tex} roughness={0.9} />
    </mesh>
  );
}

// ─── Orbit ring ─────────────────────────────────────────────────────────────────

export function OrbitRing({ planet, T, dim, highlighted }: { planet: PlanetDef; T: number; dim: boolean; highlighted: boolean }) {
  const pts = useMemo(() => orbitPath(planet, T), [planet, T]);
  const { theme } = useTheme();
  return (
    <Line
      points={pts}
      color={highlighted ? theme.selectedRing : planet.color}
      lineWidth={highlighted ? 1.2 : dim ? 0.3 : 0.6}
      transparent
      opacity={highlighted ? 0.6 : dim ? 0.08 : 0.25}
    />
  );
}
