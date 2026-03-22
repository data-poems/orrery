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
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* Corona glow layers */}
      <mesh>
        <sphereGeometry args={[0.19, 32, 32]} />
        <meshBasicMaterial color="#ffcc66" transparent opacity={0.18} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.26, 32, 32]} />
        <meshBasicMaterial color="#ffaa33" transparent opacity={0.08} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshBasicMaterial color="#ff8800" transparent opacity={0.03} />
      </mesh>
      <pointLight intensity={5} color="#fff5e0" distance={200} />
      <pointLight intensity={2} color="#ffcc80" distance={100} />
      <Html
        position={[0, 0.2, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: 'none' }}
        zIndexRange={[1, 0]}
      >
        <div style={{
          color: 'rgba(255,220,160,0.9)',
          fontSize: 11,
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 400,
          letterSpacing: 1.5,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          textShadow: '0 0 12px rgba(255,180,60,0.5)',
        }}>
          Sol
        </div>
      </Html>
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

export function Planet({ planet, T, selected, onSelect, hovered, onHover, moonFocused }: {
  planet: PlanetDef; T: number; selected: boolean; onSelect: () => void;
  hovered: boolean; onHover: (h: boolean) => void; moonFocused?: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => planetXYZ(planet, T), [planet, T]);
  const tex = useLoader(THREE.TextureLoader, TEX[planet.tex]);
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
        <meshStandardMaterial map={tex} roughness={0.8} metalness={0.0} transparent={!!moonFocused} opacity={moonFocused ? 0.3 : 1} depthWrite={!moonFocused} />
      </mesh>
      {planet.tex === 'earth' && <EarthClouds radius={r} />}
      {planet.hasRings && <SaturnRings radius={r} />}
      {/* Always-visible label */}
      <Html
        position={[0, r + 0.02, 0]}
        center
        distanceFactor={planet.isDwarf ? 6 : 12}
        style={{ pointerEvents: 'none' }}
        zIndexRange={[1, 0]}
      >
        <div style={{
          color: hovered || selected ? '#fff' : 'rgba(255,255,255,0.85)',
          fontSize: 11,
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: selected ? 600 : 400,
          letterSpacing: 1,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          textShadow: '0 0 6px rgba(0,0,0,0.9)',
          transition: 'color 0.2s',
        }}>
          {planet.name}
        </div>
      </Html>
    </group>
  );
}

// ─── Satellite (generic moon) ──────────────────────────────────────────────────

export function Satellite({ moon, parentPos, jd, selected, onSelect, hovered, onHover }: {
  moon: MoonDef; parentPos: [number, number, number]; jd: number;
  selected?: boolean; onSelect?: () => void;
  hovered?: boolean; onHover?: (h: boolean) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const angle = ((jd - 2451545) / moon.period) * Math.PI * 2;
  const inc = (moon.i || 0) * (Math.PI / 180);

  const isEarthMoon = moon.name === 'Moon' && moon.parent === 2;
  const tex = useLoader(THREE.TextureLoader, isEarthMoon ? TEX.moon : TEX.mercury);

  const pos: [number, number, number] = [
    parentPos[0] + moon.a * Math.cos(angle),
    parentPos[1] + moon.a * Math.sin(inc) * Math.sin(angle),
    parentPos[2] + moon.a * Math.sin(angle) * Math.cos(inc),
  ];

  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.05; });

  return (
    <group>
      <mesh
        ref={ref}
        position={pos}
        renderOrder={11}
        onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(); } : undefined}
        onPointerEnter={onHover ? () => onHover(true) : undefined}
        onPointerLeave={onHover ? () => onHover(false) : undefined}
      >
        <sphereGeometry args={[moon.radius, 24, 24]} />
        {isEarthMoon ? (
          <meshStandardMaterial map={tex} roughness={0.9} depthWrite={true} />
        ) : (
          <meshStandardMaterial color={moon.color} roughness={0.9} depthWrite={true} />
        )}
      </mesh>
      {/* Always-visible label */}
      <group position={pos}>
        <Html
          position={[0, moon.radius + 0.008, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: 'none' }}
          zIndexRange={[1, 0]}
        >
          <div style={{
            color: hovered || selected ? '#fff' : 'rgba(255,255,255,0.75)',
            fontSize: 10,
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 400,
            fontStyle: 'italic',
            letterSpacing: 0.5,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            textShadow: '0 0 6px rgba(0,0,0,0.9)',
            transition: 'color 0.2s',
          }}>
            {moon.name}
          </div>
        </Html>
      </group>
    </group>
  );
}

/** Orbit ring for a satellite around its parent */
export function SatelliteOrbit({ moon, parentPos }: { moon: MoonDef; parentPos: [number, number, number] }) {
  const inc = (moon.i || 0) * (Math.PI / 180);
  const pts = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      points.push(new THREE.Vector3(
        parentPos[0] + moon.a * Math.cos(theta),
        parentPos[1] + moon.a * Math.sin(inc) * Math.sin(theta),
        parentPos[2] + moon.a * Math.sin(theta) * Math.cos(inc),
      ));
    }
    return points;
  }, [moon, parentPos, inc]);

  return (
    <Line
      points={pts}
      color="#ffffff"
      lineWidth={0.4}
      transparent
      opacity={0.15}
    />
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
