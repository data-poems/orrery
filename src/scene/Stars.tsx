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

const DEG = Math.PI / 180;
const ECLIPTIC_TILT = 23.4 * DEG;
const SPHERE_RADIUS = 300;
const BASE_PATH = import.meta.env.BASE_URL + 'data/';
const LABEL_UPDATE_INTERVAL_MS = 120;

interface StarFeature {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    mag?: number;
    bv?: string | number;
    name?: string;
    bayer?: string;
    con?: string;
  };
}

interface StarGeoJson {
  features: StarFeature[];
}

interface ConstellationLineFeature {
  id?: string | number;
  geometry: {
    coordinates: [number, number][][];
  };
}

interface ConstellationLineGeoJson {
  features: ConstellationLineFeature[];
}

interface ConstellationPointFeature {
  id: string | number;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    name?: string;
    en?: string;
  };
}

interface ConstellationPointGeoJson {
  features: ConstellationPointFeature[];
}

interface ConstellationOverlayData {
  viewBox: string;
  paths: string[];
  points: Array<[number, number]>;
}

function setsEqual<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

// ─── RA/Dec → 3D unit sphere ────────────────────────────────────────────────

function raDecTo3D(raDeg: number, decDeg: number, r: number = SPHERE_RADIUS): [number, number, number] {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const x = r * Math.cos(dec) * Math.cos(ra);
  const y = r * Math.sin(dec);
  const z = -r * Math.cos(dec) * Math.sin(ra);
  return [x, y, z];
}

function buildConstellationOverlay(
  coordinates: [number, number][][],
  centerPos: [number, number, number],
): ConstellationOverlayData | null {
  if (coordinates.length === 0) return null;

  const center = new THREE.Vector3(...centerPos).normalize();
  const referenceAxis = Math.abs(center.y) > 0.92
    ? new THREE.Vector3(0, 0, 1)
    : new THREE.Vector3(0, 1, 0);
  const east = new THREE.Vector3().crossVectors(referenceAxis, center);
  if (east.lengthSq() < 1e-6) east.set(1, 0, 0);
  else east.normalize();
  const north = new THREE.Vector3().crossVectors(center, east).normalize();
  const point = new THREE.Vector3();
  const projectedLines: Array<Array<[number, number]>> = [];
  const rawPoints: Array<[number, number]> = [];

  for (const lineString of coordinates) {
    const projected: Array<[number, number]> = [];
    for (const [ra, dec] of lineString) {
      const [x, y, z] = raDecTo3D(ra, dec, 1);
      point.set(x, y, z).normalize();
      const px = point.dot(east);
      const py = point.dot(north);
      projected.push([px, py]);
      rawPoints.push([px, py]);
    }
    if (projected.length > 1) projectedLines.push(projected);
  }

  if (projectedLines.length === 0 || rawPoints.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of rawPoints) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const rawWidth = Math.max(maxX - minX, 0.02);
  const rawHeight = Math.max(maxY - minY, 0.02);
  const maxDim = Math.max(rawWidth, rawHeight);
  const targetSize = 240;
  const padding = 28;
  const scale = targetSize / maxDim;
  const contentWidth = Math.max(rawWidth * scale, 128);
  const contentHeight = Math.max(rawHeight * scale, 128);
  const offsetX = padding + (contentWidth - rawWidth * scale) / 2;
  const offsetY = padding + (contentHeight - rawHeight * scale) / 2;
  const svgWidth = contentWidth + padding * 2;
  const svgHeight = contentHeight + padding * 2;

  const normalize = ([x, y]: [number, number]): [number, number] => ([
    offsetX + (x - minX) * scale,
    offsetY + (maxY - y) * scale,
  ]);

  const paths = projectedLines.map((lineString) => lineString.map((coords, idx) => {
    const [x, y] = normalize(coords);
    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' '));

  const seen = new Set<string>();
  const points: Array<[number, number]> = [];
  for (const coords of rawPoints) {
    const [x, y] = normalize(coords);
    const key = `${x.toFixed(1)},${y.toFixed(1)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push([x, y]);
  }

  return {
    viewBox: `0 0 ${svgWidth.toFixed(1)} ${svgHeight.toFixed(1)}`,
    paths,
    points,
  };
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

interface NamedStar {
  name: string;
  pos: [number, number, number];
  mag: number;
}

interface BayerStar {
  designation: string; // e.g. "α Ori"
  pos: [number, number, number];
  mag: number;
  con: string;
}

interface StarData {
  positions: Float32Array;
  sizes: Float32Array;
  colors: Float32Array;
  count: number;
  namedStars: NamedStar[];
  bayerStars: BayerStar[];
}

/** Convert 3-letter bayer abbreviation to Greek symbol */
const BAYER_GREEK: Record<string, string> = {
  Alp: 'α', Bet: 'β', Gam: 'γ', Del: 'δ', Eps: 'ε', Zet: 'ζ',
  Eta: 'η', The: 'θ', Iot: 'ι', Kap: 'κ', Lam: 'λ', Mu: 'μ',
  Nu: 'ν', Xi: 'ξ', Omi: 'ο', Pi: 'π', Rho: 'ρ', Sig: 'σ',
  Tau: 'τ', Ups: 'υ', Phi: 'φ', Chi: 'χ', Psi: 'ψ', Ome: 'ω',
};

function bayerToGreek(bayer: string): string | null {
  // Handle "Alp-1" → "α¹", "Bet" → "β", etc.
  const match = bayer.match(/^([A-Z][a-z]{1,2})(?:-(\d))?$/);
  if (!match) return null;
  const greek = BAYER_GREEK[match[1]];
  if (!greek) return null;
  const superscripts = ['', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  return greek + (match[2] ? superscripts[parseInt(match[2])] || '' : '');
}

function useStarData(): StarData | null {
  const [data, setData] = useState<StarData | null>(null);

  useEffect(() => {
    fetch(BASE_PATH + 'stars.hyg-8.json')
      .then(r => r.json())
      .then((geojson: StarGeoJson) => {
        const features = geojson.features;
        const count = features.length;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const colors = new Float32Array(count * 3);
        const namedStars: NamedStar[] = [];
        const bayerStars: BayerStar[] = [];
        const namedSet = new Set<string>(); // track named stars to avoid double labels

        for (let i = 0; i < count; i++) {
          const f = features[i];
          const [ra, dec] = f.geometry.coordinates;
          const mag = f.properties.mag ?? 6;
          const bv = parseFloat(String(f.properties.bv ?? 0)) || 0;

          const [x, y, z] = raDecTo3D(ra, dec);
          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;

          sizes[i] = Math.max(0.5, Math.min(6, 8 - mag));

          const [cr, cg, cb] = bvToColor(bv);
          colors[i * 3] = cr;
          colors[i * 3 + 1] = cg;
          colors[i * 3 + 2] = cb;

          // Collect named bright stars for labels
          const name = f.properties.name;
          if (name && mag < 3.0) {
            namedStars.push({ name, pos: [x, y, z], mag });
            namedSet.add(`${ra.toFixed(2)},${dec.toFixed(2)}`);
          }

          // Collect Bayer-designated stars (skip if already named)
          const bayer = f.properties.bayer;
          const con = f.properties.con;
          if (bayer && con && mag < 4.5) {
            const key = `${ra.toFixed(2)},${dec.toFixed(2)}`;
            if (!namedSet.has(key)) {
              const greek = bayerToGreek(bayer);
              if (greek) {
                bayerStars.push({
                  designation: `${greek} ${con}`,
                  pos: [x, y, z],
                  mag,
                  con,
                });
              }
            }
          }
        }

        setData({ positions, sizes, colors, count, namedStars, bayerStars });
      })
      .catch(() => {});
  }, []);

  return data;
}

export function StarField({ visible, showDesignations }: { visible: boolean; showDesignations?: boolean }) {
  const starData = useStarData();
  const { camera } = useThree();
  const [visibleNames, setVisibleNames] = useState<Set<string>>(new Set());
  const [visibleDesignations, setVisibleDesignations] = useState<Set<number>>(new Set());
  const visibleNamesRef = useRef(new Set<string>());
  const visibleDesignationsRef = useRef(new Set<number>());
  const lastLabelUpdateRef = useRef(0);

  // Pre-allocated vectors for culling (perf fix)
  const camDirRef = useRef(new THREE.Vector3());
  const starDirRef = useRef(new THREE.Vector3());
  const tiltAxisRef = useRef(new THREE.Vector3(1, 0, 0));

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

  // Cull named star labels + bayer designations to ~60° cone around camera direction
  useFrame(() => {
    if (!starData) return;
    const now = performance.now();
    if (now - lastLabelUpdateRef.current < LABEL_UPDATE_INTERVAL_MS) return;
    lastLabelUpdateRef.current = now;

    camera.getWorldDirection(camDirRef.current);
    const threshold = Math.cos(60 * DEG);

    if (starData.namedStars.length > 0) {
      const vis = new Set<string>();
      for (const star of starData.namedStars) {
        starDirRef.current.set(star.pos[0], star.pos[1], star.pos[2]).normalize();
        starDirRef.current.applyAxisAngle(tiltAxisRef.current, ECLIPTIC_TILT);
        if (starDirRef.current.dot(camDirRef.current) > threshold) {
          vis.add(star.name);
        }
      }
      if (!setsEqual(visibleNamesRef.current, vis)) {
        visibleNamesRef.current = vis;
        setVisibleNames(vis);
      }
    }

    if (showDesignations && starData.bayerStars.length > 0) {
      const vis = new Set<number>();
      for (let i = 0; i < starData.bayerStars.length; i++) {
        const star = starData.bayerStars[i];
        starDirRef.current.set(star.pos[0], star.pos[1], star.pos[2]).normalize();
        starDirRef.current.applyAxisAngle(tiltAxisRef.current, ECLIPTIC_TILT);
        if (starDirRef.current.dot(camDirRef.current) > threshold) {
          vis.add(i);
        }
      }
      if (!setsEqual(visibleDesignationsRef.current, vis)) {
        visibleDesignationsRef.current = vis;
        setVisibleDesignations(vis);
      }
    }
  });

  if (!geometry) return null;

  return (
    <CelestialGroup visible={visible}>
      <points geometry={geometry} material={material} />
      {/* Named star labels */}
      {starData?.namedStars.map(star => (
        visibleNames.has(star.name) && (
          <group key={star.name} position={star.pos}>
            <Html
              center
              distanceFactor={80}
              style={{ pointerEvents: 'none' }}
              zIndexRange={[1, 0]}
            >
              <div style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: star.mag < 1.0 ? 7 : 6,
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: star.mag < 1.0 ? 400 : 300,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                letterSpacing: 0.5,
                textShadow: '0 0 6px rgba(0,0,0,0.9)',
              }}>
                {star.name}
              </div>
            </Html>
          </group>
        )
      ))}
      {/* Bayer designation labels (α Ori, β Gem, etc.) */}
      {showDesignations && starData?.bayerStars.map((star, i) => (
        visibleDesignations.has(i) && (
          <group key={`bayer-${i}`} position={star.pos}>
            <Html
              center
              distanceFactor={80}
              style={{ pointerEvents: 'none' }}
              zIndexRange={[1, 0]}
            >
              <div style={{
                color: 'rgba(255,255,255,0.25)',
                fontSize: 5,
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 300,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                letterSpacing: 0.3,
                textShadow: '0 0 4px rgba(0,0,0,0.9)',
                marginTop: 6,
              }}>
                {star.designation}
              </div>
            </Html>
          </group>
        )
      ))}
    </CelestialGroup>
  );
}

// ─── HSL → RGB (for constellation palette) ──────────────────────────────

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  const hue = h * 6;
  if (hue < 1)      { r = c; g = x; }
  else if (hue < 2) { r = x; g = c; }
  else if (hue < 3) { g = c; b = x; }
  else if (hue < 4) { g = x; b = c; }
  else if (hue < 5) { r = x; b = c; }
  else              { r = c; b = x; }
  return [r + m, g + m, b + m];
}

/** Golden-angle hue spread with luminance variation for colorblind safety */
function constellationColor(index: number): [number, number, number] {
  const hue = ((index * 137.508) % 360) / 360;
  const sat = 0.75 + (index % 3) * 0.08;
  const light = 0.58 + (index % 5) * 0.05;
  return hslToRgb(hue, sat, light);
}

// ─── Constellation lines (colored + glow) ───────────────────────────────

interface ColoredLineData {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
}

function useConstellationLineData(): ColoredLineData | null {
  const [data, setData] = useState<ColoredLineData | null>(null);

  useEffect(() => {
    fetch(BASE_PATH + 'constellations.lines.json')
      .then(r => r.json())
      .then((geojson: ConstellationLineGeoJson) => {
        const segments: number[] = [];
        const segColors: number[] = [];

        geojson.features.forEach((feature, featureIdx) => {
          const [cr, cg, cb] = constellationColor(featureIdx);
          const coords = feature.geometry.coordinates;
          for (const lineString of coords) {
            for (let i = 0; i < lineString.length - 1; i++) {
              const [ra1, dec1] = lineString[i];
              const [ra2, dec2] = lineString[i + 1];
              const [x1, y1, z1] = raDecTo3D(ra1, dec1);
              const [x2, y2, z2] = raDecTo3D(ra2, dec2);
              segments.push(x1, y1, z1, x2, y2, z2);
              segColors.push(cr, cg, cb, cr, cg, cb);
            }
          }
        });

        setData({
          positions: new Float32Array(segments),
          colors: new Float32Array(segColors),
          count: segments.length / 3,
        });
      })
      .catch(() => {});
  }, []);

  return data;
}

/** Glow line shader — additive blending with vertex colors */
const glowLineVertexShader = `
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowLineFragmentShader = `
  varying vec3 vColor;
  uniform float opacity;
  void main() {
    gl_FragColor = vec4(vColor, opacity);
  }
`;

/** Glow halo points at each vertex for soft bloom effect */
const glowPointVertexShader = `
  attribute vec3 color;
  varying vec3 vColor;
  uniform float size;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const glowPointFragmentShader = `
  varying vec3 vColor;
  uniform float opacity;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = opacity * smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export function ConstellationLines({ visible, focus }: { visible: boolean; focus?: boolean }) {
  const lineData = useConstellationLineData();
  const { camera } = useThree();
  const lineMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const pointMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const auraPointMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const lineUniforms = useMemo(() => ({ opacity: { value: 0.72 } }), []);
  const pointUniforms = useMemo(() => ({ opacity: { value: 0.28 }, size: { value: 8 } }), []);
  const auraPointUniforms = useMemo(() => ({ opacity: { value: 0.12 }, size: { value: 18 } }), []);

  const geometry = useMemo(() => {
    if (!lineData) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(lineData.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(lineData.colors, 3));
    return geo;
  }, [lineData]);

  // Separate point geometry for glow halos (unique vertices only)
  const glowGeo = useMemo(() => {
    if (!lineData) return null;
    // Deduplicate vertices for point halos
    const seen = new Map<string, number>();
    const pts: number[] = [];
    const cols: number[] = [];
    for (let i = 0; i < lineData.positions.length; i += 3) {
      const key = `${lineData.positions[i].toFixed(1)},${lineData.positions[i + 1].toFixed(1)},${lineData.positions[i + 2].toFixed(1)}`;
      if (!seen.has(key)) {
        seen.set(key, pts.length / 3);
        pts.push(lineData.positions[i], lineData.positions[i + 1], lineData.positions[i + 2]);
        cols.push(lineData.colors[i], lineData.colors[i + 1], lineData.colors[i + 2]);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3));
    return geo;
  }, [lineData]);

  // Distance-based fade (boosted in focus mode)
  useFrame(() => {
    const dist = camera.position.length();
    const base = focus ? 0.92 : 0.34;
    const minFade = focus ? 0.42 : 0.03;
    let opacity = base;
    if (!focus) {
      if (dist < 1) opacity = 0.03;
      else if (dist < 5) opacity = base * ((dist - 1) / 4);
      else if (dist > 500) opacity = 0.09;
      else if (dist > 200) opacity = base - (dist - 200) / 300 * (base - 0.09);
    } else {
      // In focus mode, only fade slightly at extremes
      if (dist < 1) opacity = minFade;
      else if (dist > 500) opacity = 0.55;
      else if (dist > 200) opacity = base - (dist - 200) / 300 * (base - 0.55);
    }
    const lineMat = lineMatRef.current;
    const pointMat = pointMatRef.current;
    const auraPointMat = auraPointMatRef.current;
    if (!lineMat || !pointMat || !auraPointMat) return;
    lineMat.uniforms.opacity.value = opacity;
    pointMat.uniforms.opacity.value = opacity * (focus ? 0.8 : 0.18);
    pointMat.uniforms.size.value = focus ? 13 : 4.5;
    auraPointMat.uniforms.opacity.value = focus ? opacity * 0.34 : 0;
    auraPointMat.uniforms.size.value = focus ? 34 : 1;
  });

  if (!geometry || !glowGeo) return null;

  return (
    <CelestialGroup visible={visible}>
      <lineSegments geometry={geometry}>
        <shaderMaterial
          ref={lineMatRef}
          vertexShader={glowLineVertexShader}
          fragmentShader={glowLineFragmentShader}
          uniforms={lineUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest
        />
      </lineSegments>
      <points geometry={glowGeo}>
        <shaderMaterial
          ref={pointMatRef}
          vertexShader={glowPointVertexShader}
          fragmentShader={glowPointFragmentShader}
          uniforms={pointUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest
        />
      </points>
      <points geometry={glowGeo}>
        <shaderMaterial
          ref={auraPointMatRef}
          vertexShader={glowPointVertexShader}
          fragmentShader={glowPointFragmentShader}
          uniforms={auraPointUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
        />
      </points>
    </CelestialGroup>
  );
}

// ─── Constellation labels ───────────────────────────────────────────────────

interface ConstellationCentroid {
  id: string;
  latin: string;
  english: string;
  pos: [number, number, number];
  color: string;  // per-constellation color (CSS rgb)
  overlay: ConstellationOverlayData | null;
}

function useConstellationCentroids(): ConstellationCentroid[] {
  const [centroids, setCentroids] = useState<ConstellationCentroid[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(BASE_PATH + 'constellations.json').then((r): Promise<ConstellationPointGeoJson> => r.json() as Promise<ConstellationPointGeoJson>),
      fetch(BASE_PATH + 'constellations.lines.json').then((r): Promise<ConstellationLineGeoJson> => r.json() as Promise<ConstellationLineGeoJson>),
    ])
      .then(([geojson, lineGeojson]) => {
        const items: ConstellationCentroid[] = [];
        const seenIds = new Set<string>();
        let featureIdx = 0;
        for (const feature of geojson.features) {
          const coords = feature.geometry.coordinates;
          if (feature.geometry.type === 'Point') {
            let uid = String(feature.id);
            if (seenIds.has(uid)) uid = `${uid}_${seenIds.size}`;
            seenIds.add(uid);
            const [r, g, b] = constellationColor(featureIdx);
            const pos = raDecTo3D(coords[0], coords[1]);
            const lineFeature = lineGeojson.features[featureIdx];
            items.push({
              id: uid,
              latin: String(feature.properties.name ?? feature.id),
              english: feature.properties.en || '',
              pos,
              color: `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`,
              overlay: lineFeature ? buildConstellationOverlay(lineFeature.geometry.coordinates, pos) : null,
            });
            featureIdx++;
          }
        }
        setCentroids(items);
      })
      .catch(() => {});
  }, []);

  return centroids;
}

export function ConstellationLabels({ visible, focus, onSelect }: { visible: boolean; focus?: boolean; onSelect?: (id: string) => void }) {
  const centroids = useConstellationCentroids();
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [visibleLabels, setVisibleLabels] = useState<Set<string>>(new Set());
  const [labelOpacity, setLabelOpacity] = useState(0.4);
  const visibleLabelsRef = useRef(new Set<string>());
  const labelOpacityRef = useRef(0.4);
  const lastLabelUpdateRef = useRef(0);

  // Pre-allocated vectors to avoid GC pressure (perf fix — was creating new Vector3 every frame)
  const camDirRef = useRef(new THREE.Vector3());
  const dirRef = useRef(new THREE.Vector3());
  const tiltAxisRef = useRef(new THREE.Vector3(1, 0, 0));

  // Cull labels outside ~60° of camera look direction + distance-based fade
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(camera.position);
    }

    const now = performance.now();
    if (now - lastLabelUpdateRef.current < LABEL_UPDATE_INTERVAL_MS) return;
    lastLabelUpdateRef.current = now;

    const dist = camera.position.length();
    const base = focus ? 0.85 : 0.4;
    let opacity = base;
    if (!focus) {
      if (dist < 1) opacity = 0;
      else if (dist < 5) opacity = base * ((dist - 1) / 4);
      else if (dist > 500) opacity = 0.05;
      else if (dist > 200) opacity = base - (dist - 200) / 300 * (base - 0.05);
    } else {
      if (dist < 1) opacity = 0.3;
      else if (dist > 500) opacity = 0.4;
      else if (dist > 200) opacity = base - (dist - 200) / 300 * (base - 0.4);
    }
    if (Math.abs(labelOpacityRef.current - opacity) > 0.02) {
      labelOpacityRef.current = opacity;
      setLabelOpacity(opacity);
    }

    camera.getWorldDirection(camDirRef.current);
    const threshold = Math.cos(60 * DEG);

    const vis = new Set<string>();
    for (const c of centroids) {
      dirRef.current.set(c.pos[0], c.pos[1], c.pos[2]).normalize();
      dirRef.current.applyAxisAngle(tiltAxisRef.current, ECLIPTIC_TILT);
      if (dirRef.current.dot(camDirRef.current) > threshold) {
        vis.add(c.id);
      }
    }
    if (!setsEqual(visibleLabelsRef.current, vis)) {
      visibleLabelsRef.current = vis;
      setVisibleLabels(vis);
    }
  });

  if (!visible || centroids.length === 0 || labelOpacity < 0.01) return null;

  return (
    <group ref={groupRef}>
      <group rotation={[ECLIPTIC_TILT, 0, 0]}>
        {centroids.map(c => (
          <group key={c.id} position={c.pos}>
            {visibleLabels.has(c.id) && (
              <Html
                center
                distanceFactor={80}
                style={{ pointerEvents: onSelect ? 'auto' : 'none' }}
                zIndexRange={[1, 0]}
              >
                <div
                  onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(c.id); } : undefined}
                  style={{
                    color: c.color,
                    opacity: labelOpacity,
                    fontSize: focus ? 12 : 10,
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: 'italic',
                    fontWeight: 400,
                    whiteSpace: 'nowrap',
                    letterSpacing: 1,
                    userSelect: 'none',
                    textAlign: 'center',
                    lineHeight: 1.3,
                    textShadow: `0 0 10px ${c.color}, 0 0 24px ${c.color}, 0 0 36px rgba(0,0,0,0.9)`,
                    cursor: onSelect ? 'pointer' : 'default',
                    position: 'relative',
                    minWidth: focus && c.overlay ? 360 : 210,
                    minHeight: focus && c.overlay ? 320 : 180,
                    padding: focus && c.overlay ? '220px 14px 14px' : 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  {focus && c.overlay && (
                    <svg
                      viewBox={c.overlay.viewBox}
                      width={320}
                      height={320}
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -56%)',
                        overflow: 'visible',
                        pointerEvents: 'none',
                        opacity: 0.92,
                        filter: `drop-shadow(0 0 14px ${c.color}) drop-shadow(0 0 36px ${c.color})`,
                      }}
                    >
                      <g opacity={0.18}>
                        {c.overlay.paths.map((path, idx) => (
                          <path
                            key={`glow-${c.id}-${idx}`}
                            d={path}
                            fill="none"
                            stroke={c.color}
                            strokeWidth={15}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ))}
                      </g>
                      <g opacity={0.54}>
                        {c.overlay.paths.map((path, idx) => (
                          <path
                            key={`line-${c.id}-${idx}`}
                            d={path}
                            fill="none"
                            stroke={c.color}
                            strokeWidth={4.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ))}
                      </g>
                      <g>
                        {c.overlay.points.map(([x, y], idx) => (
                          <circle key={`aura-${c.id}-${idx}`} cx={x} cy={y} r={8} fill={c.color} opacity={0.14} />
                        ))}
                        {c.overlay.points.map(([x, y], idx) => (
                          <circle key={`core-${c.id}-${idx}`} cx={x} cy={y} r={2.8} fill={c.color} opacity={0.78} />
                        ))}
                      </g>
                    </svg>
                  )}
                  <span style={{ display: 'block', fontSize: focus ? 11 : 9, fontWeight: 500, fontStyle: 'normal', letterSpacing: 1.8, textTransform: 'uppercase' }}>{c.latin}</span>
                  {c.english && <span style={{ display: 'block', fontSize: focus ? 8 : 7, opacity: 0.68 }}>{c.english}</span>}
                </div>
              </Html>
            )}
          </group>
        ))}
      </group>
    </group>
  );
}
