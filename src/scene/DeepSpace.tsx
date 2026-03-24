/*
 * Deep space layer — Oort Cloud, spacecraft, nearby stars, galaxy markers
 */

import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  OORT_CLOUD, SPACECRAFT, NEARBY_STARS, LOCAL_GROUP,
  PC_TO_AU, STAR_DISPLAY_CAP_AU,
  heliocentricXYZ, raDecToSphere,
} from '../data/deepspace';
import { ECLIPTIC_TILT } from '../lib/kepler';
import type { Spacecraft } from '../data/deepspace';

// Simple additive-blended glow sphere used throughout deep space markers
function GlowSphere({ color, opacity, position, scale }: {
  color: string; opacity: number; position: [number, number, number]; scale: [number, number, number];
}) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

const DEEP_SPACE_SPHERE_RADIUS = 920;
const MW_DATA_PATH = import.meta.env.BASE_URL + 'data/mw.json';

interface MwGeoJson {
  features: {
    geometry: {
      type: 'MultiPolygon';
      coordinates: [number, number][][][];
    };
  }[];
}

function MilkyWayBackdrop() {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    fetch(MW_DATA_PATH)
      .then(r => r.json())
      .then((data: MwGeoJson) => {
        const positions: number[] = [];
        const opacities: number[] = [];

        data.features.forEach((feature) => {
          feature.geometry.coordinates.forEach((polygon) => {
            polygon.forEach((ring) => {
              if (ring.length < 3) return;
              const centerRa = ring.reduce((sum, p) => sum + p[0], 0) / ring.length;
              const centerDec = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
              const centerPos = raDecToSphere(centerRa, centerDec, DEEP_SPACE_SPHERE_RADIUS);

              for (let i = 0; i < ring.length - 1; i++) {
                const p1 = raDecToSphere(ring[i][0], ring[i][1], DEEP_SPACE_SPHERE_RADIUS);
                const p2 = raDecToSphere(ring[i + 1][0], ring[i + 1][1], DEEP_SPACE_SPHERE_RADIUS);

                positions.push(...centerPos, ...p1, ...p2);
                // Uniform opacity across all vertices — no gradient = no seam lines
                opacities.push(0.15, 0.15, 0.15);
              }
            });
          });
        });

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        geo.setAttribute('opacity', new THREE.BufferAttribute(new Float32Array(opacities), 1));
        setGeometry(geo);
      });
  }, []);

  const uniforms = useMemo(() => ({
    time: { value: 0 },
    globalOpacity: { value: 0.18 },
  }), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  if (!geometry) return null;

  return (
    <group rotation={[ECLIPTIC_TILT, 0, 0]}>
      <mesh geometry={geometry}>
        <shaderMaterial
          ref={materialRef}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
          side={THREE.FrontSide}
          uniforms={uniforms}
          vertexShader={`
            attribute float opacity;
            varying float vOpacity;
            varying vec3 vNormal;
            void main() {
              vOpacity = opacity;
              vNormal = normalize(position);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying float vOpacity;
            varying vec3 vNormal;
            uniform float time;
            uniform float globalOpacity;

            float noise(vec3 p) {
              return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
            }

            void main() {
              float n = noise(vNormal * 100.0 + time * 0.05);
              float finalAlpha = vOpacity * globalOpacity * (0.8 + 0.2 * n);
              vec3 color = mix(vec3(0.05, 0.08, 0.15), vec3(0.85, 0.9, 1.0), vOpacity * 1.5);
              gl_FragColor = vec4(color, finalAlpha);
            }
          `}
        />
      </mesh>
    </group>
  );
}

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
      <meshBasicMaterial color="#aaccff" transparent opacity={0.12} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
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

  const DEG = Math.PI / 180;

  return (
    <group>
      {/* Craft marker — 3 crossed planes (starburst) */}
      <group position={pos} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        {[0, 60, 120].map(angle => (
          <mesh key={angle} rotation={[0, 0, angle * DEG]}>
            <planeGeometry args={[size * 0.4, size * 2]} />
            <meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide} transparent opacity={0.9} depthWrite={false} />
          </mesh>
        ))}
      </group>
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
            <GlowSphere color={color} opacity={0.25} position={pos} scale={[size * 6, size * 6, 1]} />
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
        const pos = raDecToSphere(gal.ra, gal.dec, DEEP_SPACE_SPHERE_RADIUS - 90);
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
            <GlowSphere color={color} opacity={0.15} position={pos} scale={[size * 8, size * 5, 1]} />
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
      <MilkyWayBackdrop />
      <OortCloud />
      <SpacecraftMarkers selSpacecraft={selSpacecraft} setSelSpacecraft={setSelSpacecraft} />
      <NearStarMarkers />
      <GalaxyMarkers />
    </group>
  );
}
