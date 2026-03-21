/*
 * Celestial sphere — star field, constellation lines, labels, Milky Way
 *
 * All components anchor to camera position (not rotation) so they appear
 * infinitely far away. The group is tilted 23.4° to align the celestial
 * equator with the ecliptic plane used by the scene.
 *
 * Data: d3-celestial GeoJSON catalogs loaded at runtime from /orrery/data/
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { OrreryTheme } from '../lib/themes';

const DEG = Math.PI / 180;
const ECLIPTIC_TILT = 23.4 * DEG;
const SPHERE_RADIUS = 300;
const BASE_PATH = import.meta.env.BASE_URL + 'data/';

// ─── RA/Dec → 3D unit sphere ────────────────────────────────────────────────

function raDecTo3D(raDeg: number, decDeg: number, r: number = SPHERE_RADIUS): [number, number, number] {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const x = r * Math.cos(dec) * Math.cos(ra);
  const y = r * Math.sin(dec);
  const z = -r * Math.cos(dec) * Math.sin(ra);
  return [x, y, z];
}

// ─── Camera-following group with ecliptic tilt ──────────────────────────────

function CelestialGroup({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(camera.position);
    }
  });

  return (
    <group ref={groupRef} visible={visible}>
      <group rotation={[ECLIPTIC_TILT, 0, 0]}>
        {children}
      </group>
    </group>
  );
}

// ─── Star field (41K stars as Points) ───────────────────────────────────────

function bvToColor(bv: number): [number, number, number] {
  if (bv < 0) return [0.667, 0.8, 1.0];       // #aaccff — blue-white
  if (bv < 0.5) return [1.0, 1.0, 1.0];        // #ffffff — white
  if (bv < 1.0) return [1.0, 0.933, 0.8];      // #ffeecc — warm white
  return [1.0, 0.667, 0.467];                   // #ffaa77 — orange
}

interface StarData {
  positions: Float32Array;
  sizes: Float32Array;
  colors: Float32Array;
  count: number;
}

function useStarData(): StarData | null {
  const [data, setData] = useState<StarData | null>(null);

  useEffect(() => {
    fetch(BASE_PATH + 'stars.8.json')
      .then(r => r.json())
      .then((geojson: any) => {
        const features = geojson.features;
        const count = features.length;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
          const f = features[i];
          const [ra, dec] = f.geometry.coordinates;
          const mag = f.properties.mag ?? 6;
          const bv = parseFloat(f.properties.bv) || 0;

          const [x, y, z] = raDecTo3D(ra, dec);
          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;

          sizes[i] = Math.max(0.5, Math.min(6, 8 - mag));

          const [cr, cg, cb] = bvToColor(bv);
          colors[i * 3] = cr;
          colors[i * 3 + 1] = cg;
          colors[i * 3 + 2] = cb;
        }

        setData({ positions, sizes, colors, count });
      })
      .catch(() => {});
  }, []);

  return data;
}

export function StarField({ visible }: { visible: boolean }) {
  const starData = useStarData();

  const geometry = useMemo(() => {
    if (!starData) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(starData.positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(starData.sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(starData.colors, 3));
    return geo;
  }, [starData]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        // Circular point with soft edge
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = 0.85 * smoothstep(0.5, 0.2, d);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  }), []);

  if (!geometry) return null;

  return (
    <CelestialGroup visible={visible}>
      <points geometry={geometry} material={material} />
    </CelestialGroup>
  );
}

// ─── Constellation lines ────────────────────────────────────────────────────

interface LineData {
  positions: Float32Array;
  count: number;
}

function useConstellationLineData(): LineData | null {
  const [data, setData] = useState<LineData | null>(null);

  useEffect(() => {
    fetch(BASE_PATH + 'constellations.lines.json')
      .then(r => r.json())
      .then((geojson: any) => {
        // Collect all line segments
        const segments: number[] = [];
        for (const feature of geojson.features) {
          const coords = feature.geometry.coordinates; // MultiLineString: array of line strings
          for (const lineString of coords) {
            for (let i = 0; i < lineString.length - 1; i++) {
              const [ra1, dec1] = lineString[i];
              const [ra2, dec2] = lineString[i + 1];
              const [x1, y1, z1] = raDecTo3D(ra1, dec1);
              const [x2, y2, z2] = raDecTo3D(ra2, dec2);
              segments.push(x1, y1, z1, x2, y2, z2);
            }
          }
        }
        const positions = new Float32Array(segments);
        setData({ positions, count: segments.length / 3 });
      })
      .catch(() => {});
  }, []);

  return data;
}

export function ConstellationLines({ visible, theme }: { visible: boolean; theme: OrreryTheme }) {
  const lineData = useConstellationLineData();
  const { camera } = useThree();

  const geometry = useMemo(() => {
    if (!lineData) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(lineData.positions, 3));
    return geo;
  }, [lineData]);

  const material = useMemo(() => new THREE.LineBasicMaterial({
    color: theme.constellationLine,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    depthTest: true,
  }), [theme.constellationLine]);

  // Distance-based fade: full opacity < 200 AU, dim > 500 AU
  useFrame(() => {
    const dist = camera.position.length();
    if (dist < 200) material.opacity = 0.35;
    else if (dist > 500) material.opacity = 0.05;
    else material.opacity = 0.35 - (dist - 200) / 300 * 0.3;
  });

  if (!geometry) return null;

  return (
    <CelestialGroup visible={visible}>
      <lineSegments geometry={geometry} material={material} />
    </CelestialGroup>
  );
}

// ─── Constellation labels ───────────────────────────────────────────────────

interface ConstellationCentroid {
  id: string;
  latin: string;
  english: string;
  pos: [number, number, number];
}

function useConstellationCentroids(): ConstellationCentroid[] {
  const [centroids, setCentroids] = useState<ConstellationCentroid[]>([]);

  useEffect(() => {
    fetch(BASE_PATH + 'constellations.json')
      .then(r => r.json())
      .then((geojson: any) => {
        const items: ConstellationCentroid[] = [];
        const seenIds = new Set<string>();
        for (const feature of geojson.features) {
          const coords = feature.geometry.coordinates;
          // Point geometry: [ra, dec]
          if (feature.geometry.type === 'Point') {
            let uid = feature.id;
            if (seenIds.has(uid)) uid = `${uid}_${seenIds.size}`;
            seenIds.add(uid);
            items.push({
              id: uid,
              latin: feature.properties.name || feature.id,
              english: feature.properties.en || '',
              pos: raDecTo3D(coords[0], coords[1]),
            });
          }
        }
        setCentroids(items);
      })
      .catch(() => {});
  }, []);

  return centroids;
}

export function ConstellationLabels({ visible }: { visible: boolean }) {
  const centroids = useConstellationCentroids();
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [visibleLabels, setVisibleLabels] = useState<Set<string>>(new Set());

  // Cull labels outside ~60° of camera look direction
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(camera.position);
    }

    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const threshold = Math.cos(60 * DEG);

    const vis = new Set<string>();
    for (const c of centroids) {
      // Direction from camera to label (on the sphere around camera)
      const dir = new THREE.Vector3(c.pos[0], c.pos[1], c.pos[2]).normalize();
      // Apply ecliptic tilt to match the rendered position
      const tiltedDir = dir.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), ECLIPTIC_TILT);
      if (tiltedDir.dot(camDir) > threshold) {
        vis.add(c.id);
      }
    }
    setVisibleLabels(vis);
  });

  if (!visible || centroids.length === 0) return null;

  return (
    <group ref={groupRef}>
      <group rotation={[ECLIPTIC_TILT, 0, 0]}>
        {centroids.map(c => (
          <group key={c.id} position={c.pos}>
            {visibleLabels.has(c.id) && (
              <Html
                center
                distanceFactor={600}
                style={{ pointerEvents: 'none' }}
                zIndexRange={[1, 0]}
              >
                <div style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 11,
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: 'italic',
                  fontWeight: 300,
                  whiteSpace: 'nowrap',
                  letterSpacing: 1,
                  userSelect: 'none',
                  textAlign: 'center',
                  lineHeight: 1.3,
                  textShadow: '0 0 8px rgba(0,0,0,0.8)',
                }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 400, fontStyle: 'normal' }}>{c.latin}</span>
                  {c.english && <span style={{ display: 'block', fontSize: 9, opacity: 0.6 }}>{c.english}</span>}
                </div>
              </Html>
            )}
          </group>
        ))}
      </group>
    </group>
  );
}

// ─── Milky Way band ─────────────────────────────────────────────────────────

function useMilkyWayGeometry(): THREE.BufferGeometry | null {
  const [geo, setGeo] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    fetch(BASE_PATH + 'mw.json')
      .then(r => r.json())
      .then((geojson: any) => {
        const allPositions: number[] = [];
        const allIndices: number[] = [];
        let vertexOffset = 0;

        for (const feature of geojson.features) {
          const multiPoly = feature.geometry.coordinates;
          for (const polygon of multiPoly) {
            // Use outer ring only (polygon[0])
            const ring = polygon[0];
            if (ring.length < 3) continue;

            // Convert ring to 3D positions
            const start = vertexOffset;
            for (const [ra, dec] of ring) {
              const [x, y, z] = raDecTo3D(ra, dec, SPHERE_RADIUS * 0.99);
              allPositions.push(x, y, z);
              vertexOffset++;
            }

            // Simple fan triangulation from first vertex
            for (let i = 1; i < ring.length - 1; i++) {
              allIndices.push(start, start + i, start + i + 1);
            }
          }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
        geometry.setIndex(allIndices);
        geometry.computeVertexNormals();
        setGeo(geometry);
      })
      .catch(() => {});
  }, []);

  return geo;
}

export function MilkyWayBand({ visible, theme }: { visible: boolean; theme: OrreryTheme }) {
  const geometry = useMilkyWayGeometry();

  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: theme.milkyWay,
    transparent: true,
    opacity: 0.03,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), [theme.milkyWay]);

  if (!geometry) return null;

  return (
    <CelestialGroup visible={visible}>
      <mesh geometry={geometry} material={material} />
    </CelestialGroup>
  );
}
