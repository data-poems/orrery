/*
 * Deep space visuals — heliopause boundary, Oort Cloud, galaxy disc
 *
 * These components render at extreme distances (100+ AU to 100,000+ AU)
 * and rely on logarithmic depth buffer for z-precision.
 */

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTheme } from '../lib/themes';

// ─── Scale markers (rings at key distances) ──────────────────────────────────

export function ScaleMarkers() {
  const { theme } = useTheme();
  const markers = useMemo(() => [
    { r: 50,    label: 'Kuiper Belt' },
    { r: 120,   label: 'Heliopause' },
    { r: 1000,  label: '1,000 AU' },
    { r: 5000,  label: '5,000 AU' },
    { r: 10000, label: '10,000 AU' },
    { r: 50000, label: 'Oort Cloud outer edge' },
  ], []);

  return (
    <group>
      {markers.map(({ r }) => (
        <mesh key={r} rotation={[Math.PI / 2, 0, 0]}>
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

const OORT_COUNT = 8000;

export function OortCloud() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(OORT_COUNT * 3);
    const sizes = new Float32Array(OORT_COUNT);

    for (let i = 0; i < OORT_COUNT; i++) {
      // Spherical shell between 2000 and 50000 AU
      const r = 2000 + Math.random() * 48000;
      // Slightly flattened — more concentration near ecliptic
      const theta = Math.acos(2 * Math.random() - 1);
      const flatTheta = theta * 0.7 + (Math.PI / 2) * 0.3; // bias toward equator
      const phi = Math.random() * Math.PI * 2;

      positions[i * 3] = r * Math.sin(flatTheta) * Math.cos(phi);
      positions[i * 3 + 1] = r * Math.cos(flatTheta) * 0.4; // flatten y
      positions[i * 3 + 2] = r * Math.sin(flatTheta) * Math.sin(phi);

      sizes[i] = 20 + Math.random() * 40;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, []);

  return (
    <points geometry={geometry}>
      <shaderMaterial
        vertexShader={`
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 2.0;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float alpha = 0.08 * smoothstep(0.5, 0.1, d);
            gl_FragColor = vec4(0.533, 0.6, 0.733, alpha);
          }
        `}
        transparent={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={false}
      />
    </points>
  );
}

// ─── Galaxy disc (procedural Milky Way spiral) ───────────────────────────────

const galaxyVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const galaxyFragmentShader = `
  varying vec2 vUv;

  // Simple hash for pseudo-random noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0; // -1 to 1
    float dist = length(uv);

    // Falloff from center
    float falloff = exp(-dist * 2.5);

    // Central bulge
    float bulge = exp(-dist * 8.0) * 0.6;

    // Spiral arms (2 main arms + 2 minor)
    float angle = atan(uv.y, uv.x);
    float spiral1 = sin(angle * 2.0 - dist * 12.0) * 0.5 + 0.5;
    float spiral2 = sin(angle * 2.0 - dist * 12.0 + 3.14159) * 0.5 + 0.5;
    float minorSpiral = sin(angle * 4.0 - dist * 10.0) * 0.5 + 0.5;

    spiral1 = pow(spiral1, 3.0) * falloff;
    spiral2 = pow(spiral2, 3.0) * falloff;
    minorSpiral = pow(minorSpiral, 4.0) * falloff * 0.3;

    float arms = max(spiral1, spiral2) + minorSpiral;

    // Add noise for star density variation
    float noise = hash(uv * 50.0) * 0.3;
    float fineNoise = hash(uv * 200.0) * 0.15;

    float alpha = (arms + bulge) * (1.0 + noise + fineNoise);

    // Clip to disc shape
    alpha *= smoothstep(1.0, 0.85, dist);

    // Color: warm center, cooler arms
    vec3 centerColor = vec3(1.0, 0.9, 0.7);
    vec3 armColor = vec3(0.7, 0.8, 1.0);
    vec3 color = mix(armColor, centerColor, bulge / (bulge + 0.1));

    // Solar system marker — tiny bright dot near edge
    // Sun is ~26,500 ly from center in a galaxy ~50,000 ly radius
    // In UV: about 0.53 from center along one arm
    vec2 sunPos = vec2(0.53, 0.0);
    float sunDist = length(uv - sunPos);
    float sunDot = exp(-sunDist * 80.0) * 2.0;
    color += vec3(1.0, 0.95, 0.5) * sunDot;
    alpha += sunDot;

    gl_FragColor = vec4(color, alpha * 0.06);
  }
`;

export function GalaxyDisc() {
  const ref = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: galaxyVertexShader,
    fragmentShader: galaxyFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  // Only show galaxy disc when camera is far enough to see it as a disc
  useFrame(() => {
    if (!ref.current) return;
    const dist = camera.position.length();
    ref.current.visible = dist > 500;
    // Fade in smoothly between 500 and 2000 AU
    if (dist > 500 && dist < 2000) {
      material.opacity = (dist - 500) / 1500;
    } else if (dist >= 2000) {
      material.opacity = 1;
    }
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 2 + 0.1, 0, 0.4]} material={material} position={[0, -2000, 0]} visible={false}>
      <planeGeometry args={[200000, 200000]} />
    </mesh>
  );
}
