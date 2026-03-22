/*
 * Deep sky objects — Messier catalog + bright NGC/IC objects
 * rendered on the celestial sphere with type-specific shapes.
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { raDecTo3D, ECLIPTIC_TILT } from '../lib/kepler';

const DEG = Math.PI / 180;
const SPHERE_RADIUS = 300;
const BASE_PATH = import.meta.env.BASE_URL + 'data/';
const LABEL_UPDATE_INTERVAL_MS = 120;

function setsEqual<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

interface DeepSkyObj {
  id: string;
  name: string;
  type: string; // galaxy, globular, open, nebula
  ra: number;
  dec: number;
  mag: number;
  con: string;
  size: number;
  pos?: [number, number, number];
}

// Type → shape color (soft blue-white for all, with slight variation)
const TYPE_COLORS: Record<string, string> = {
  galaxy: 'rgba(200,180,255,0.4)',    // soft violet
  globular: 'rgba(255,220,180,0.4)',  // warm gold
  open: 'rgba(180,220,255,0.4)',      // cool blue
  nebula: 'rgba(180,255,200,0.4)',    // soft green
};

// Type → symbol for label
const TYPE_SYMBOLS: Record<string, string> = {
  galaxy: '\u2B2D',   // ⬭ horizontal ellipse
  globular: '\u2299', // ⊙ circled dot
  open: '\u25CB',     // ○ circle
  nebula: '\u2B1A',   // ⬚ dotted square (fallback: □)
};

function useDeepSkyData(): DeepSkyObj[] | null {
  const [data, setData] = useState<DeepSkyObj[] | null>(null);

  useEffect(() => {
    fetch(BASE_PATH + 'deepsky.json')
      .then(r => r.json())
      .then((objects: DeepSkyObj[]) => {
        for (const obj of objects) {
          obj.pos = raDecTo3D(obj.ra, obj.dec, SPHERE_RADIUS, false);
        }
        setData(objects);
      })
      .catch(() => {});
  }, []);

  return data;
}

export function DeepSkyField({ visible, onLoad }: { visible: boolean; onLoad?: () => void }) {
  const objects = useDeepSkyData();
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (objects) onLoad?.();
  }, [objects, onLoad]);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const visibleIdsRef = useRef(new Set<string>());
  const lastLabelUpdateRef = useRef(0);

  const camDirRef = useRef(new THREE.Vector3());
  const dirRef = useRef(new THREE.Vector3());
  const tiltAxisRef = useRef(new THREE.Vector3(1, 0, 0));

  // Points geometry for all objects
  const pointsGeo = useMemo(() => {
    if (!objects) return null;
    const positions = new Float32Array(objects.length * 3);
    const sizes = new Float32Array(objects.length);
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const pos = obj.pos!;
      positions[i * 3] = pos[0];
      positions[i * 3 + 1] = pos[1];
      positions[i * 3 + 2] = pos[2];
      // Size based on magnitude — brighter = bigger
      sizes[i] = Math.max(1.5, Math.min(5, 9 - obj.mag));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [objects]);

  // Build per-object colors based on type
  const colorsAttr = useMemo(() => {
    if (!objects) return null;
    const colors = new Float32Array(objects.length * 3);
    const typeRgb: Record<string, [number, number, number]> = {
      galaxy:   [0.75, 0.65, 1.0],   // soft violet
      globular: [1.0, 0.85, 0.65],   // warm gold
      open:     [0.65, 0.85, 1.0],   // cool blue
      nebula:   [0.65, 1.0, 0.75],   // soft green
    };
    for (let i = 0; i < objects.length; i++) {
      const [r, g, b] = typeRgb[objects[i].type] || [0.7, 0.8, 1.0];
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    return colors;
  }, [objects]);

  const pointsMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * 2.5;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = 0.7 * smoothstep(0.5, 0.05, d);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  }), []);

  // Cull labels to 60° cone
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(camera.position);
    }
    if (!objects) return;
    const now = performance.now();
    if (now - lastLabelUpdateRef.current < LABEL_UPDATE_INTERVAL_MS) return;
    lastLabelUpdateRef.current = now;
    camera.getWorldDirection(camDirRef.current);
    const threshold = Math.cos(60 * DEG);
    const vis = new Set<string>();
    for (const obj of objects) {
      if (!obj.pos) continue;
      // Only label bright objects (Messier or mag < 8)
      if (obj.mag > 8 && !obj.id.startsWith('M')) continue;
      dirRef.current.set(obj.pos[0], obj.pos[1], obj.pos[2]).normalize();
      dirRef.current.applyAxisAngle(tiltAxisRef.current, ECLIPTIC_TILT);
      if (dirRef.current.dot(camDirRef.current) > threshold) {
        vis.add(obj.id);
      }
    }
    if (!setsEqual(visibleIdsRef.current, vis)) {
      visibleIdsRef.current = vis;
      setVisibleIds(vis);
    }
  });

  // Attach color attribute when ready
  useEffect(() => {
    if (pointsGeo && colorsAttr) {
      pointsGeo.setAttribute('color', new THREE.BufferAttribute(colorsAttr, 3));
    }
  }, [pointsGeo, colorsAttr]);

  if (!visible || !objects || !pointsGeo) return null;

  return (
    <group ref={groupRef}>
      <group rotation={[ECLIPTIC_TILT, 0, 0]}>
        <points geometry={pointsGeo} material={pointsMat} />
        {objects.map(obj => (
          obj.pos && visibleIds.has(obj.id) && (
            <group key={obj.id} position={obj.pos}>
              <Html
                center
                distanceFactor={80}
                style={{ pointerEvents: 'none' }}
                zIndexRange={[1, 0]}
              >
                <div style={{
                  color: TYPE_COLORS[obj.type] || 'rgba(180,200,255,0.3)',
                  fontSize: obj.mag < 5 ? 7 : 6,
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 300,
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  letterSpacing: 0.3,
                  textShadow: '0 0 6px rgba(0,0,0,0.9)',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}>
                  <span style={{ marginRight: 3 }}>{TYPE_SYMBOLS[obj.type] || '\u25CB'}</span>
                  {obj.id}
                  {obj.name && obj.mag < 7 && (
                    <span style={{ display: 'block', fontSize: 5, opacity: 0.6 }}>{obj.name}</span>
                  )}
                </div>
              </Html>
            </group>
          )
        ))}
      </group>
    </group>
  );
}
