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
import { ZODIAC_SYMBOLS, isZodiac, type ConstellationSymbolSvg } from '../data/constellation-symbols';
import { OBSERVATORY_MODE } from '../lib/mode';
import { raDecTo3D, ECLIPTIC_TILT, DEG } from '../lib/kepler';

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
  id?: string;
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

function setsEqual<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

// ─── RA/Dec → 3D unit sphere ────────────────────────────────────────────────

function sphericalArcPoints(
  start: [number, number, number],
  end: [number, number, number],
): THREE.Vector3[] {
  const a = new THREE.Vector3(...start).normalize();
  const b = new THREE.Vector3(...end).normalize();
  const angle = a.angleTo(b);
  if (angle < 1e-5) {
    return [a.multiplyScalar(SPHERE_RADIUS), b.multiplyScalar(SPHERE_RADIUS)];
  }

  const axis = new THREE.Vector3().crossVectors(a, b);
  if (axis.lengthSq() < 1e-10) {
    return [a.multiplyScalar(SPHERE_RADIUS), b.multiplyScalar(SPHERE_RADIUS)];
  }
  axis.normalize();
  const steps = Math.max(2, Math.ceil(angle / (Math.PI / 96)));
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push(a.clone().applyAxisAngle(axis, angle * t).multiplyScalar(SPHERE_RADIUS));
  }

  return points;
}

// ─── Camera-following group with ecliptic tilt ──────────────────────────────

function CelestialGroup({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!visible || !groupRef.current) return;
    groupRef.current.position.copy(camera.position);
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
  /** constellationCodes[i] = index into constellationCodeMap; 255 = unknown/unassigned. */
  constellationCodes: Uint8Array;
  constellationCodeMap: string[];
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

function useStarData(visible: boolean): StarData | null {
  const [data, setData] = useState<StarData | null>(null);

  useEffect(() => {
    if (!visible || data) return;
    fetch(BASE_PATH + 'stars.hyg-8.json')
      .then(r => r.json())
      .then((geojson: StarGeoJson) => {
        const features = geojson.features;
        const count = features.length;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const colors = new Float32Array(count * 3);
        const constellationCodes = new Uint8Array(count);
        const constellationCodeMap: string[] = [];
        const codeIndex = new Map<string, number>();
        const namedStars: NamedStar[] = [];
        const bayerStars: BayerStar[] = [];
        const namedSet = new Set<string>(); // track named stars to avoid double labels

        for (let i = 0; i < count; i++) {
          const f = features[i];
          const [ra, dec] = f.geometry.coordinates;
          const mag = f.properties.mag ?? 6;
          const bv = parseFloat(String(f.properties.bv ?? 0)) || 0;

          const [x, y, z] = raDecTo3D(ra, dec, SPHERE_RADIUS, false);
          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;

          sizes[i] = Math.max(0.5, Math.min(6, 8 - mag));

          const [cr, cg, cb] = bvToColor(bv);
          colors[i * 3] = cr;
          colors[i * 3 + 1] = cg;
          colors[i * 3 + 2] = cb;

          // Map this star's constellation to a small integer index for the highlight shader.
          // 255 (Uint8 sentinel) = unassigned. Up to 88 real IAU constellations fit in 0-127.
          const con = f.properties.con;
          if (con) {
            let idx = codeIndex.get(con);
            if (idx === undefined) {
              idx = constellationCodeMap.length;
              constellationCodeMap.push(con);
              codeIndex.set(con, idx);
            }
            constellationCodes[i] = idx;
          } else {
            constellationCodes[i] = 255;
          }

          // Collect named bright stars for labels
          const name = f.properties.name;
          if (name && mag < 3.0) {
            namedStars.push({ name, pos: [x, y, z], mag });
            namedSet.add(`${ra.toFixed(2)},${dec.toFixed(2)}`);
          }

          // Collect Bayer-designated stars (skip if already named)
          const bayer = f.properties.bayer;
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

        setData({ positions, sizes, colors, count, namedStars, bayerStars, constellationCodes, constellationCodeMap });
      })
      .catch(() => {});
  }, [visible, data]);

  return data;
}

export function StarField({ visible, showDesignations, onLoad, selectedConstellation, accent }: { visible: boolean; showDesignations?: boolean; onLoad?: () => void; selectedConstellation: string | null; accent: string }) {
  const starData = useStarData(visible);
  const { camera } = useThree();

  useEffect(() => {
    if (starData || !visible) onLoad?.();
  }, [starData, visible, onLoad]);
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
    geo.setAttribute('highlight', new THREE.BufferAttribute(new Float32Array(starData.count), 1));
    return geo;
  }, [starData]);

  // Update per-vertex highlight when the selected constellation changes.
  useEffect(() => {
    if (!geometry || !starData) return;
    const attr = geometry.getAttribute('highlight') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const targetIdx = selectedConstellation ? starData.constellationCodeMap.indexOf(selectedConstellation) : -1;
    if (targetIdx < 0) {
      arr.fill(0);
    } else {
      const codes = starData.constellationCodes;
      for (let i = 0; i < arr.length; i++) {
        arr[i] = codes[i] === targetIdx ? 1 : 0;
      }
    }
    attr.needsUpdate = true;
  }, [selectedConstellation, geometry, starData]);

  // Mutable uniform updates via ref-on-shaderMaterial — matches ConstellationLines pattern.
  const starMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const starUniforms = useMemo(() => ({
    accentColor: { value: new THREE.Color() },
    hasSelection: { value: 0 },
  }), []);

  useEffect(() => {
    const mat = starMatRef.current;
    if (mat) mat.uniforms.hasSelection.value = selectedConstellation ? 1 : 0;
  }, [selectedConstellation]);

  useEffect(() => {
    const mat = starMatRef.current;
    if (mat) mat.uniforms.accentColor.value.set(accent);
  }, [accent]);

  const starVertexShader = `
    attribute float size;
    attribute vec3 color;
    attribute float highlight;
    uniform vec3 accentColor;
    uniform float hasSelection;
    varying vec3 vColor;
    void main() {
      float boost = hasSelection * highlight;
      vColor = mix(color, accentColor, boost * 0.55);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (1.0 + boost * 0.7);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;
  const starFragmentShader = `
    varying vec3 vColor;
    void main() {
      // Circular point with soft edge
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float alpha = 0.85 * smoothstep(0.5, 0.2, d);
      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  // Cull named star labels + bayer designations to ~60° cone around camera direction
  useFrame(() => {
    if (!visible || !starData) return;
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
      <points geometry={geometry}>
        <shaderMaterial
          ref={starMatRef}
          vertexShader={starVertexShader}
          fragmentShader={starFragmentShader}
          uniforms={starUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest
        />
      </points>
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

/**
 * Constellation coloring logic.
 * Themed by category for visual depth and "accuracy":
 * - Zodiac (Ecliptic): Warm Gold / Amber
 * - Major Classical (Orion, Ursa Major, etc.): Bright Cyan / Electric Blue
 * - Ship Argo (Carina, Puppis, Vela, Pyxis): Deep Teal / Sea Green
 * - Southern Hemis. (Tucana, Pavo, Phoenix): Rich Violet / Magenta
 * - Modern / Technical (Lacerta, Sextans, etc.): Soft Grey / Blue-Grey
 */
function constellationColor(index: number, id: string): [number, number, number] {
  const mid = id.toUpperCase();
  
  // 1. Zodiac
  const zodiac = ['ARI','TAU','GEM','CNC','LEO','VIR','LIB','SCO','SGR','CAP','AQR','PSC'];
  if (zodiac.includes(mid)) {
    // Warm golds/ambers
    const hue = (45 + (index % 4) * 8) / 360;
    return hslToRgb(hue, 0.85, 0.65);
  }

  // 2. Ship Argo (Argo Navis)
  const argo = ['CAR','PUP','VEL','PYX'];
  if (argo.includes(mid)) {
    // Oceanic teals/greens
    const hue = (165 + (index % 4) * 12) / 360;
    return hslToRgb(hue, 0.75, 0.62);
  }

  // 3. Major Classical / Northern
  const classical = ['ORI','UMA','UMI','CYG','CAS','AQL','LYR','AND','PER','CMA','CMI','AUR','BOO','HER','OPH','SER','PEG','CEP','DRA','HYA'];
  if (classical.includes(mid)) {
    // Celestial blues/cyans
    const hue = (195 + (index % 6) * 10) / 360;
    return hslToRgb(hue, 0.8, 0.68);
  }

  // 4. Southern Hemisphere (Exotic animals/birds)
  const southern = ['CEN','CRU','PAV','IND','TUC','HYI','DOR','VOL','PIC','RET','HOR','CAE','MUS','TRA','NOR','CIR','APS','CHA','OCT','MEN','PHE','GRU','SCL','FOR','COL'];
  if (southern.includes(mid)) {
    // Exotic violets/pinks
    const hue = (280 + (index % 8) * 12) / 360;
    return hslToRgb(hue, 0.65, 0.7);
  }

  // 5. Modern / Dim / Technical (Greyish)
  // Everything else: Lacerta, Sextans, Lynx, Scutum, Vulpecula, Leo Minor, etc.
  const hue = (210 + (index % 10) * 15) / 360;
  return hslToRgb(hue, 0.35, 0.62);
}

// ─── Constellation lines (colored + glow) ───────────────────────────────

interface ColoredLineData {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
}

interface ColoredLineDataWithIds extends ColoredLineData {
  /** featureIds[i] gives the constellation feature index for vertex i. */
  featureIds: Uint16Array;
  /** featureIdMap[idx] gives the IAU abbreviation for that feature index. */
  featureIdMap: string[];
}

function useConstellationLineData(): ColoredLineDataWithIds | null {
  const [data, setData] = useState<ColoredLineDataWithIds | null>(null);

  useEffect(() => {
    fetch(BASE_PATH + 'constellations.lines.json')
      .then(r => r.json())
      .then((geojson: ConstellationLineGeoJson) => {
        const segments: number[] = [];
        const segColors: number[] = [];
        const segFeatureIds: number[] = [];
        const featureIdMap: string[] = [];

        geojson.features.forEach((feature, featureIdx) => {
          const baseId = String(feature.id || '');
          featureIdMap[featureIdx] = baseId;
          const [cr, cg, cb] = constellationColor(featureIdx, baseId);
          const coords = feature.geometry.coordinates;
          for (const lineString of coords) {
            for (let i = 0; i < lineString.length - 1; i++) {
              const [ra1, dec1] = lineString[i];
              const [ra2, dec2] = lineString[i + 1];
              const start = raDecTo3D(ra1, dec1, SPHERE_RADIUS, false);
              const end = raDecTo3D(ra2, dec2, SPHERE_RADIUS, false);
              const arc = sphericalArcPoints(start, end);
              for (let j = 0; j < arc.length - 1; j++) {
                const p1 = arc[j];
                const p2 = arc[j + 1];
                segments.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
                segColors.push(cr, cg, cb, cr, cg, cb);
                segFeatureIds.push(featureIdx, featureIdx);
              }
            }
          }
        });

        setData({
          positions: new Float32Array(segments),
          colors: new Float32Array(segColors),
          count: segments.length / 3,
          featureIds: new Uint16Array(segFeatureIds),
          featureIdMap,
        });
      })
      .catch(() => {});
  }, []);

  return data;
}

/** Glow line shader — additive blending with vertex colors. Selected constellation
 *  gets full opacity + a subtle pulse; everything else dims to ~15%. */
const glowLineVertexShader = `
  attribute vec3 color;
  attribute float highlight;
  varying vec3 vColor;
  varying float vHighlight;
  void main() {
    vColor = color;
    vHighlight = highlight;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowLineFragmentShader = `
  varying vec3 vColor;
  varying float vHighlight;
  uniform float opacity;
  uniform float hasSelection;
  uniform float time;
  void main() {
    float pulse = 1.0 + 0.18 * sin(time * 2.0);
    float dim = opacity * 0.15;
    float bright = min(1.0, opacity * pulse + 0.08);
    float selected = mix(dim, bright, vHighlight);
    float op = mix(opacity, selected, hasSelection);
    gl_FragColor = vec4(vColor, op);
  }
`;

export function ConstellationLines({ visible, focus, onLoad, selectedId }: { visible: boolean; focus?: boolean; onLoad?: () => void; selectedId: string | null }) {
  const lineData = useConstellationLineData();
  const { camera } = useThree();

  useEffect(() => {
    if (lineData) onLoad?.();
  }, [lineData, onLoad]);
  const lineMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const lineUniforms = useMemo(() => ({
    opacity: { value: 0.72 },
    hasSelection: { value: 0 },
    time: { value: 0 },
  }), []);

  const geometry = useMemo(() => {
    if (!lineData) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(lineData.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(lineData.colors, 3));
    geo.setAttribute('highlight', new THREE.BufferAttribute(new Float32Array(lineData.featureIds.length), 1));
    return geo;
  }, [lineData]);

  // Update highlight attribute when selectedId changes (cheap — just iterate vertex array).
  useEffect(() => {
    if (!geometry || !lineData) return;
    const attr = geometry.getAttribute('highlight') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const targetIdx = selectedId ? lineData.featureIdMap.indexOf(selectedId) : -1;
    if (targetIdx < 0) {
      arr.fill(0);
    } else {
      const ids = lineData.featureIds;
      for (let i = 0; i < arr.length; i++) {
        arr[i] = ids[i] === targetIdx ? 1 : 0;
      }
    }
    attr.needsUpdate = true;
  }, [selectedId, geometry, lineData]);

  // hasSelection is a function of selectedId only — push it once per change, not per frame.
  // Avoids a one-frame stale-state edge case if the lines toggle visibility while selected.
  useEffect(() => {
    const lineMat = lineMatRef.current;
    if (lineMat) lineMat.uniforms.hasSelection.value = selectedId ? 1 : 0;
  }, [selectedId]);

  // Distance-based fade (boosted in focus mode)
  useFrame((state) => {
    if (!visible) return;
    const lineMat = lineMatRef.current;
    // sin(time * 2) is PI-periodic; bound time to avoid float precision drift in long sessions.
    if (lineMat) lineMat.uniforms.time.value = state.clock.elapsedTime % Math.PI;
    // Observatory anchors camera at Earth's heliocentric position (~1 AU); the fade
    // thresholds below are heliocentric and would misfire as Earth orbits. Pin bright.
    if (OBSERVATORY_MODE) {
      if (lineMat) lineMat.uniforms.opacity.value = focus ? 0.92 : 0.34;
      return;
    }
    const dist = camera.position.length();
    const base = focus ? 0.92 : 0.34;
    const minFade = focus ? 0.42 : 0.03;
    let opacity = base;
    if (!focus) {
      if (dist < 1) opacity = 0.03;
      else if (dist < 5) opacity = base * ((dist - 1) / 4);
      else if (dist > 800) opacity = 0;
      else if (dist > 500) opacity = 0.09 * (1 - (dist - 500) / 300);
      else if (dist > 200) opacity = base - (dist - 200) / 300 * (base - 0.09);
    } else {
      // In focus mode, only fade slightly at extremes
      if (dist < 1) opacity = minFade;
      else if (dist > 500) opacity = 0.55;
      else if (dist > 200) opacity = base - (dist - 200) / 300 * (base - 0.55);
    }
    if (!lineMat) return;
    lineMat.uniforms.opacity.value = opacity;
  });

  if (!geometry) return null;

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
  symbol: ConstellationSymbolSvg | null;
}

function useConstellationCentroids(): ConstellationCentroid[] {
  const [centroids, setCentroids] = useState<ConstellationCentroid[]>([]);

  useEffect(() => {
    fetch(BASE_PATH + 'constellations.json')
      .then((r): Promise<ConstellationPointGeoJson> => r.json() as Promise<ConstellationPointGeoJson>)
      .then((geojson) => {
        const items: ConstellationCentroid[] = [];
        const seenIds = new Set<string>();
        let featureIdx = 0;
        for (const feature of geojson.features) {
          const coords = feature.geometry.coordinates;
          if (feature.geometry.type === 'Point') {
            const baseId = String(feature.id);
            let uid = baseId;
            if (seenIds.has(uid)) uid = `${uid}_${seenIds.size}`;
            seenIds.add(uid);
            const [r, g, b] = constellationColor(featureIdx, baseId);
            const pos = raDecTo3D(coords[0], coords[1], SPHERE_RADIUS, false);
            items.push({
              id: uid,
              latin: String(feature.properties.name ?? feature.id),
              english: feature.properties.en || '',
              pos,
              color: `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`,
              symbol: ZODIAC_SYMBOLS[baseId] ?? null,
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

export function ConstellationLabels({ visible, focus, onSelect, onLoad, selectedId, accent }: { visible: boolean; focus?: boolean; onSelect?: (id: string) => void; onLoad?: () => void; selectedId: string | null; accent: string }) {
  const centroids = useConstellationCentroids();
  const { camera } = useThree();

  useEffect(() => {
    if (centroids.length > 0) onLoad?.();
  }, [centroids, onLoad]);
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
    if (!visible) return;
    if (groupRef.current) {
      groupRef.current.position.copy(camera.position);
    }

    const now = performance.now();
    if (now - lastLabelUpdateRef.current < LABEL_UPDATE_INTERVAL_MS) return;
    lastLabelUpdateRef.current = now;

    const base = focus ? 0.85 : 0.4;
    let opacity = base;
    if (!OBSERVATORY_MODE) {
      const dist = camera.position.length();
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
        {centroids.map(c => {
          const selected = selectedId === c.id;
          const dimmed = selectedId != null && !selected;
          return (
          <group key={c.id} position={c.pos}>
            {visibleLabels.has(c.id) && (
              <Html
                center
                {...(focus ? {} : { distanceFactor: 80 })}
                style={{ pointerEvents: onSelect ? 'auto' : 'none' }}
                zIndexRange={[1, 0]}
              >
                <div
                  onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(c.id); } : undefined}
                  style={{
                    color: selected ? accent : c.color,
                    opacity: dimmed ? labelOpacity * 0.25 : selected ? 1 : labelOpacity,
                    fontSize: focus ? (selected ? 32 : 24) : (selected ? 16 : 10),
                    transition: 'opacity 0.35s ease, color 0.35s ease, font-size 0.35s ease, text-shadow 0.35s ease',
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: 'italic',
                    fontWeight: 400,
                    whiteSpace: 'nowrap',
                    letterSpacing: 1,
                    userSelect: 'none',
                    textAlign: 'center',
                    lineHeight: 1.3,
                    textShadow: selected
                      ? `0 0 14px ${accent}, 0 0 32px ${accent}, 0 0 48px rgba(0,0,0,0.95)`
                      : `0 0 10px ${c.color}, 0 0 24px ${c.color}, 0 0 36px rgba(0,0,0,0.9)`,
                    cursor: onSelect ? 'pointer' : 'default',
                    position: 'relative',
                    minWidth: focus && c.symbol ? 200 : 210,
                    minHeight: focus && c.symbol ? 120 : 180,
                    padding: focus && c.symbol ? '80px 14px 14px' : 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  {focus && c.symbol && (
                    <svg
                      viewBox={c.symbol.viewBox}
                      width={64}
                      height={64}
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -58%)',
                        overflow: 'visible',
                        pointerEvents: 'none',
                        opacity: isZodiac(c.id) ? 0.94 : 0.8,
                        filter: `drop-shadow(0 0 8px rgba(255,255,255,0.12)) drop-shadow(0 0 18px ${c.color})`,
                      }}
                    >
                      <g opacity={0.12}>
                        {c.symbol.paths.map((path, idx) => (
                          <path
                            key={`glow-${c.id}-${idx}`}
                            d={path}
                            fill="none"
                            stroke={c.color}
                            strokeWidth={isZodiac(c.id) ? 10 : 9}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ))}
                      </g>
                      <g opacity={0.96}>
                        {c.symbol.paths.map((path, idx) => (
                          <path
                            key={`line-${c.id}-${idx}`}
                            d={path}
                            fill="none"
                            stroke="rgba(255,247,232,0.96)"
                            strokeWidth={isZodiac(c.id) ? 2.8 : 2.4}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ))}
                      </g>
                    </svg>
                  )}
                  <span style={{ display: 'block', fontSize: focus ? 24 : 10, fontWeight: 400, fontStyle: 'normal', letterSpacing: focus ? 6 : 2, textTransform: 'uppercase' }}>{c.latin}</span>
                  {c.english && <span style={{ display: 'block', fontSize: focus ? 16 : 7, opacity: 0.68, marginTop: focus ? 4 : 2 }}>{c.english}</span>}
                </div>
              </Html>
            )}
          </group>
          );
        })}
      </group>
    </group>
  );
}
