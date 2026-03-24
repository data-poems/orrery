/*
 * Celestial bodies — Sun, Planet, Moon, orbit rings, Saturn rings
 */

import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { TEX } from '../data/planets';
import { BODY_SYMBOLS } from '../data/body-symbols';
import type { PlanetDef } from '../lib/kepler';
import { planetXYZ, orbitPath } from '../lib/kepler';
import type { MoonDef } from '../data/moons';

// ─── Sun ────────────────────────────────────────────────────────────────────────

function BodyGlyph({
  symbolKey,
  color,
  distanceFactor,
  size,
}: {
  symbolKey: string;
  color: string;
  distanceFactor: number;
  size: number;
}) {
  const symbol = BODY_SYMBOLS[symbolKey];
  if (!symbol) return null;

  return (
    <Html center distanceFactor={distanceFactor} style={{ pointerEvents: 'none' }} zIndexRange={[1, 0]}>
      <svg
        viewBox={symbol.viewBox}
        width={size}
        height={size}
        aria-hidden="true"
        style={{
          overflow: 'visible',
          opacity: 0.94,
          filter: `drop-shadow(0 0 8px rgba(255,255,255,0.1)) drop-shadow(0 0 18px ${color})`,
        }}
      >
        <g opacity={0.1}>
          {symbol.paths.map((path, idx) => (
            <path
              key={`${symbolKey}-glow-${idx}`}
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
        <g opacity={0.96}>
          {symbol.paths.map((path, idx) => (
            <path
              key={`${symbolKey}-line-${idx}`}
              d={path}
              fill="none"
              stroke="rgba(255,247,232,0.96)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      </svg>
    </Html>
  );
}

export function Sun({ cameraDistance = 0, showGlyphOverlay = false }: { cameraDistance?: number; showGlyphOverlay?: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useLoader(THREE.TextureLoader, TEX.sun);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.02;
  });
  return (
    <group>
      {/* Compact white-hot core */}
      <mesh>
        <sphereGeometry args={[0.102, 48, 48]} />
        <meshBasicMaterial color="#fff5d8" toneMapped={false} transparent opacity={0.72} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Main textured photosphere */}
      <mesh ref={ref}>
        <sphereGeometry args={[0.146, 64, 64]} />
        <meshBasicMaterial map={tex} toneMapped={false} color="#fff7ec" transparent opacity={0.96} depthWrite={false} />
      </mesh>
      {/* Thin chromosphere tint */}
      <mesh>
        <sphereGeometry args={[0.152, 64, 64]} />
        <meshBasicMaterial color="#ffb24a" toneMapped={false} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {showGlyphOverlay && (
        <BodyGlyph symbolKey="Sol" color="rgba(255,196,108,0.95)" distanceFactor={0.86} size={92} />
      )}
      <pointLight intensity={cameraDistance > 2 ? 5.8 : 6.4} color="#fff3d2" distance={220} />
      <pointLight intensity={cameraDistance > 2 ? 2.6 : 3.0} color="#ffb25c" distance={140} />
      <Html
        position={[0, 0.25, 0]}
        center
        distanceFactor={3}
        style={{ pointerEvents: 'none' }}
        zIndexRange={[1, 0]}
      >
        <div style={{
          color: 'rgba(255,220,160,0.9)',
          fontSize: 9,
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

function planetLabelScale(radius: number) {
  return THREE.MathUtils.clamp(Math.sqrt(radius / 0.06), 0.34, 1.5);
}

function moonLabelScale(radius: number) {
  return THREE.MathUtils.clamp(Math.sqrt(radius / 0.015), 0.2, 1.05);
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
  varying float vT; // 0 = inner edge, 1 = outer edge
  uniform float innerRadius;
  uniform float outerRadius;
  void main() {
    // Compute radial parameter from vertex position (ring lies in XY plane)
    float r = length(position.xy);
    vT = (r - innerRadius) / (outerRadius - innerRadius);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragmentShader = `
  varying float vT;
  void main() {
    float t = clamp(vT, 0.0, 1.0);

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

    gl_FragColor = vec4(color, alpha * 0.42);
  }
`;

function SaturnRings({ radius }: { radius: number }) {
  const inner = radius * 1.2;
  const outer = radius * 2.6;
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: ringVertexShader,
    fragmentShader: ringFragmentShader,
    uniforms: {
      innerRadius: { value: inner },
      outerRadius: { value: outer },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), [inner, outer]);

  return (
    <mesh rotation={[Math.PI / 2 + 0.47, 0, 0]} material={material}>
      <ringGeometry args={[inner, outer, 128]} />
    </mesh>
  );
}

// ─── Planet ─────────────────────────────────────────────────────────────────────

export function Planet({ planet, T, selected, onSelect, hovered, onHover, moonFocused, cameraDistance = 0, showGlyphOverlay = false }: {
  planet: PlanetDef; T: number; selected: boolean; onSelect: () => void;
  hovered: boolean; onHover: (h: boolean) => void; moonFocused?: boolean;
  cameraDistance?: number;
  showGlyphOverlay?: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => planetXYZ(planet, T), [planet, T]);
  const tex = useLoader(THREE.TextureLoader, TEX[planet.tex]);
  const r = planet.radius;
  const glow = Math.min(cameraDistance / 80, 1.8);
  const labelScale = planetLabelScale(r);
  const labelDistanceFactor = THREE.MathUtils.lerp(1.2, 3, labelScale / 1.5);
  const labelFontSize = THREE.MathUtils.lerp(5.2, 9.4, labelScale / 1.5);
  const labelOffset = r + THREE.MathUtils.lerp(0.01, 0.024, labelScale / 1.5);
  const glyphDistanceFactor = Math.max(0.68, labelDistanceFactor * 0.72);
  const glyphSize = THREE.MathUtils.lerp(32, 96, labelScale / 1.5);
  // Invisible click target: larger sphere for easier selection
  const hitRadius = Math.max(r * 3, 0.15);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.12;
  });

  return (
    <group position={pos}>
      {/* Invisible larger click target */}
      <mesh
        renderOrder={9}
        onClick={e => { e.stopPropagation(); onSelect(); }}
        onPointerEnter={() => onHover(true)}
        onPointerLeave={() => onHover(false)}
      >
        <sphereGeometry args={[hitRadius, 16, 16]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <mesh
        ref={ref}
        renderOrder={10}
      >
        <sphereGeometry args={[r, 48, 48]} />
        <meshStandardMaterial map={tex} roughness={0.8} metalness={0.0} transparent={!!moonFocused} opacity={moonFocused ? 0.3 : 1} depthWrite={!moonFocused} />
      </mesh>
      {planet.tex === 'earth' && <EarthClouds radius={r} />}
      {planet.hasRings && <SaturnRings radius={r} />}
      {/* Distance-adaptive glow beacon */}
      {cameraDistance > 30 && planet.tex !== 'earth' && (
        <mesh>
          <sphereGeometry args={[r * glow, 16, 16]} />
          <meshBasicMaterial color={planet.color} transparent opacity={0.3} blending={THREE.AdditiveBlending} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      {showGlyphOverlay && BODY_SYMBOLS[planet.name] && (
        <BodyGlyph
          symbolKey={planet.name}
          color={planet.color}
          distanceFactor={glyphDistanceFactor}
          size={glyphSize}
        />
      )}
      {/* Always-visible label */}
      <Html
        position={[0, labelOffset, 0]}
        center
        distanceFactor={planet.isDwarf ? Math.min(labelDistanceFactor, 1.9) : labelDistanceFactor}
        style={{ pointerEvents: 'none' }}
        zIndexRange={[1, 0]}
      >
        <div style={{
          color: hovered || selected ? '#fff' : 'rgba(255,255,255,0.85)',
          fontSize: labelFontSize,
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: selected ? 600 : 400,
          letterSpacing: 0.35 + labelScale * 0.55,
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
  const labelScale = moonLabelScale(moon.radius);
  const labelDistanceFactor = THREE.MathUtils.lerp(0.7, 1.5, labelScale / 1.05);
  const labelFontSize = THREE.MathUtils.lerp(3.4, 8.2, labelScale / 1.05);
  const labelOffset = moon.radius + THREE.MathUtils.lerp(0.004, 0.012, labelScale / 1.05);

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
          position={[0, labelOffset, 0]}
          center
          distanceFactor={labelDistanceFactor}
          style={{ pointerEvents: 'none' }}
          zIndexRange={[1, 0]}
        >
          <div style={{
            color: hovered || selected ? '#fff' : 'rgba(255,255,255,0.75)',
            fontSize: labelFontSize,
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 400,
            fontStyle: 'italic',
            letterSpacing: 0.2 + labelScale * 0.45,
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

export function OrbitRing({ planet, T, dim, highlighted, cameraDistance = 0 }: {
  planet: PlanetDef; T: number; dim: boolean; highlighted: boolean; cameraDistance?: number;
}) {
  const pts = useMemo(() => orbitPath(planet, T), [planet, T]);
  // Fade out orbit rings when camera is very far (deep space views)
  const farFade = cameraDistance > 500 ? Math.max(0, 1 - (cameraDistance - 500) / 500) : 1;
  if (farFade <= 0) return null;
  const baseWidth = highlighted ? 1.2 : dim ? 0.3 : 0.6;
  const baseOpacity = (highlighted ? 0.6 : dim ? 0.08 : 0.25) * farFade;
  const color = highlighted ? '#ffffff' : '#999999';
  return (
    <Line
      points={pts}
      color={color}
      lineWidth={baseWidth}
      transparent
      opacity={baseOpacity}
    />
  );
}
