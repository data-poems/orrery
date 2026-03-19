/*
 * Orrery — Standalone 3D Solar System
 *
 * Features:
 *   - All 8 planets with NASA texture maps (Solar System Scope, CC BY 4.0)
 *   - Accurate real-time positions using JPL Keplerian elements
 *   - Milky Way skybox for deep-space immersion
 *   - Planet click-to-focus: camera flies to orbit selected planet
 *   - Planet info cards with orbital data
 *   - Time animation with variable playback speed
 *   - Live NASA NeoWs asteroid data with click-to-inspect
 *   - Asteroid orbit ellipse rendering using NASA SBDB orbital elements
 *   - 7 camera presets with smooth lerp transitions
 *   - Keyboard shortcuts (1-7 cameras, H/N/F/Esc/Space)
 *   - Hidden-by-default HUD panels for immersive experience
 */

import { useEffect, useState, useRef, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';

// ─── CDN Texture URLs (Solar System Scope, CC BY 4.0) ───────────────────────

const TEX = {
  sun:        'https://d2xsxph8kpxj0f.cloudfront.net/310419663029916604/boBVkWMKnM6d26ztuVrLrs/2k_sun_5dda6323.jpg',
  mercury:    'https://d2xsxph8kpxj0f.cloudfront.net/310419663029916604/boBVkWMKnM6d26ztuVrLrs/2k_mercury_3a544532.jpg',
  venus:      'https://d2xsxph8kpxj0f.cloudfront.net/310419663029916604/boBVkWMKnM6d26ztuVrLrs/2k_venus_surface_64d32f16.jpg',
  earth:      'https://d2xsxph8kpxj0f.cloudfront.net/310419663029916604/boBVkWMKnM6d26ztuVrLrs/2k_earth_daymap_92ee265f.jpg',
  earthClouds:'https://d2xsxph8kpxj0f.cloudfront.net/310419663029916604/boBVkWMKnM6d26ztuVrLrs/2k_earth_clouds_8894a3d4.jpg',
  mars:       'https://d2xsxph8kpxj0f.cloudfront.net/310419663029916604/boBVkWMKnM6d26ztuVrLrs/2k_mars_31a2dde3.jpg',
  jupiter:    'https://d2xsxph8kpxj0f.cloudfront.net/310419663029916604/boBVkWMKnM6d26ztuVrLrs/2k_jupiter_119eb97c.jpg',
  saturn:     'https://d2xsxph8kpxj0f.cloudfront.net/310419663029916604/boBVkWMKnM6d26ztuVrLrs/2k_saturn_920011fe.jpg',
  uranus:     'https://d2xsxph8kpxj0f.cloudfront.net/310419663029916604/boBVkWMKnM6d26ztuVrLrs/2k_uranus_a5872335.jpg',
  neptune:    'https://d2xsxph8kpxj0f.cloudfront.net/310419663029916604/boBVkWMKnM6d26ztuVrLrs/2k_neptune_d38c09d9.jpg',
  moon:       'https://d2xsxph8kpxj0f.cloudfront.net/310419663029916604/boBVkWMKnM6d26ztuVrLrs/2k_moon_d6e624fa.jpg',
} as const;

type TexKey = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

// ─── Keplerian Elements (JPL J2000 + rates) ─────────────────────────────────

interface PlanetDef {
  name: string; a: number; e: number; I: number; L: number; wBar: number; omega: number;
  aR: number; eR: number; IR: number; LR: number; wR: number; oR: number;
  radius: number; tex: TexKey; color: string; period: number;
  hasRings?: boolean;
  desc: string; distAU: string; moons: number; type: string;
  surfaceTemp: string; gravity: string;
}

const PLANETS: PlanetDef[] = [
  { name:'Mercury', a:0.38710, e:0.20564, I:7.005, L:252.250, wBar:77.458, omega:48.331, aR:0.0000004, eR:0.00002, IR:-0.0059, LR:149472.674, wR:0.160, oR:-0.125, radius:0.035, tex:'mercury', color:'#b0a090', period:87.97, desc:'Smallest planet. Extreme temperature swings from −180°C at night to 430°C by day due to its negligible atmosphere.', distAU:'0.39', moons:0, type:'Terrestrial', surfaceTemp:'−180 to 430°C', gravity:'3.7 m/s²' },
  { name:'Venus',   a:0.72334, e:0.00678, I:3.395, L:181.979, wBar:131.602, omega:76.680, aR:0.0000039, eR:-0.00004, IR:-0.0008, LR:58517.815, wR:0.003, oR:-0.278, radius:0.055, tex:'venus', color:'#e8c870', period:224.7, desc:'Hottest planet in the solar system. Dense CO₂ atmosphere creates a runaway greenhouse effect. Rotates backwards.', distAU:'0.72', moons:0, type:'Terrestrial', surfaceTemp:'465°C', gravity:'8.87 m/s²' },
  { name:'Earth',   a:1.00000, e:0.01671, I:0.000, L:100.465, wBar:102.938, omega:0.0, aR:0.0000056, eR:-0.00004, IR:-0.013, LR:35999.372, wR:0.323, oR:0.0, radius:0.06, tex:'earth', color:'#4488cc', period:365.25, desc:'Our home. The only known planet harboring life. 71% of the surface is covered by liquid water oceans.', distAU:'1.00', moons:1, type:'Terrestrial', surfaceTemp:'−89 to 58°C', gravity:'9.81 m/s²' },
  { name:'Mars',    a:1.52371, e:0.09339, I:1.850, L:-4.553, wBar:-23.944, omega:49.560, aR:0.0000185, eR:0.00008, IR:-0.008, LR:19140.303, wR:0.444, oR:-0.293, radius:0.045, tex:'mars', color:'#cc6644', period:686.98, desc:'The Red Planet. Home to Olympus Mons, the tallest volcano in the solar system at 22 km. Thin CO₂ atmosphere.', distAU:'1.52', moons:2, type:'Terrestrial', surfaceTemp:'−143 to 35°C', gravity:'3.72 m/s²' },
  { name:'Jupiter', a:5.20289, e:0.04839, I:1.304, L:34.396, wBar:14.728, omega:100.474, aR:-0.0001161, eR:-0.00013, IR:-0.002, LR:3034.746, wR:0.213, oR:0.205, radius:0.16, tex:'jupiter', color:'#cc9966', period:4332.59, desc:'Largest planet. The Great Red Spot is a storm larger than Earth that has raged for centuries. 95 known moons.', distAU:'5.20', moons:95, type:'Gas Giant', surfaceTemp:'−110°C (cloud tops)', gravity:'24.79 m/s²' },
  { name:'Saturn',  a:9.53668, e:0.05386, I:2.486, L:49.954, wBar:92.599, omega:113.662, aR:-0.0012506, eR:-0.00051, IR:0.002, LR:1222.494, wR:-0.419, oR:-0.289, radius:0.13, tex:'saturn', color:'#ddbb77', period:10759.22, hasRings:true, desc:'Iconic ring system spanning 282,000 km. 146 known moons including Titan with a thick nitrogen atmosphere.', distAU:'9.54', moons:146, type:'Gas Giant', surfaceTemp:'−178°C (cloud tops)', gravity:'10.44 m/s²' },
  { name:'Uranus',  a:19.18916, e:0.04726, I:0.773, L:313.238, wBar:170.954, omega:74.017, aR:-0.0019618, eR:-0.00004, IR:-0.002, LR:428.482, wR:0.408, oR:0.042, radius:0.09, tex:'uranus', color:'#88cccc', period:30688.5, desc:'Ice giant. Rotates on its side with an axial tilt of 97.8°. Has faint rings and 28 known moons.', distAU:'19.19', moons:28, type:'Ice Giant', surfaceTemp:'−224°C', gravity:'8.87 m/s²' },
  { name:'Neptune', a:30.06992, e:0.00859, I:1.770, L:-55.120, wBar:44.965, omega:131.784, aR:0.0002629, eR:0.00005, IR:0.0004, LR:218.459, wR:-0.322, oR:-0.005, radius:0.085, tex:'neptune', color:'#5577cc', period:60182.0, desc:'Windiest planet. Supersonic storms reach 2,100 km/h. Triton orbits retrograde — likely a captured Kuiper Belt object.', distAU:'30.07', moons:16, type:'Ice Giant', surfaceTemp:'−218°C', gravity:'11.15 m/s²' },
];

// ─── Math helpers ────────────────────────────────────────────────────────────

const DEG = Math.PI / 180;
const norm = (d: number) => ((d % 360) + 360) % 360;

function julianDate(date: Date): number {
  const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() + date.getUTCHours() / 24 + date.getUTCMinutes() / 1440 + date.getUTCSeconds() / 86400;
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function solveKepler(M_deg: number, e: number): number {
  const M = norm(M_deg) * DEG;
  let E = M;
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

function planetXYZ(p: PlanetDef, T: number): [number, number, number] {
  const a = p.a + p.aR * T, e = p.e + p.eR * T;
  const I = (p.I + p.IR * T) * DEG;
  const Om = norm(p.omega + p.oR * T) * DEG;
  const wBar = norm(p.wBar + p.wR * T);
  const E = solveKepler(p.L + p.LR * T - wBar, e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = (wBar - (p.omega + p.oR * T)) * DEG;
  const cw = Math.cos(w), sw = Math.sin(w), co = Math.cos(Om), so = Math.sin(Om), ci = Math.cos(I), si = Math.sin(I);
  const x = (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp;
  const y = (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp;
  const z = (sw * si) * xp + (cw * si) * yp;
  return [x, z, -y];
}

function orbitPath(p: PlanetDef, T: number, n = 180): THREE.Vector3[] {
  const a = p.a + p.aR * T, e = p.e + p.eR * T;
  const I = (p.I + p.IR * T) * DEG;
  const Om = norm(p.omega + p.oR * T) * DEG;
  const wBar = norm(p.wBar + p.wR * T);
  const w = (wBar - (p.omega + p.oR * T)) * DEG;
  const cw = Math.cos(w), sw = Math.sin(w), co = Math.cos(Om), so = Math.sin(Om), ci = Math.cos(I), si = Math.sin(I);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 2;
    const r = a * (1 - e * e) / (1 + e * Math.cos(th));
    const xp = r * Math.cos(th), yp = r * Math.sin(th);
    const x = (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp;
    const y = (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp;
    const z = (sw * si) * xp + (cw * si) * yp;
    pts.push(new THREE.Vector3(x, z, -y));
  }
  return pts;
}

// Build orbit path from raw Keplerian elements (for asteroids)
function asteroidOrbitPath(a: number, e: number, I_deg: number, Om_deg: number, w_deg: number, n = 180): THREE.Vector3[] {
  const I = I_deg * DEG, Om = Om_deg * DEG, w = w_deg * DEG;
  const cw = Math.cos(w), sw = Math.sin(w), co = Math.cos(Om), so = Math.sin(Om), ci = Math.cos(I), si = Math.sin(I);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 2;
    const r = a * (1 - e * e) / (1 + e * Math.cos(th));
    const xp = r * Math.cos(th), yp = r * Math.sin(th);
    const x = (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp;
    const y = (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp;
    const z = (sw * si) * xp + (cw * si) * yp;
    pts.push(new THREE.Vector3(x, z, -y));
  }
  return pts;
}

function moonPhase(jd: number) {
  const days = jd - 2451550.1, syn = 29.53059;
  const p = ((days % syn) + syn) % syn / syn;
  const ill = Math.round((1 - Math.cos(p * 2 * Math.PI)) / 2 * 100);
  const names = ['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous','Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'];
  const emojis = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
  const idx = Math.floor(p * 8) % 8;
  return { name: names[idx], emoji: emojis[idx], ill };
}

// ─── NEO types ───────────────────────────────────────────────────────────────

interface NEO {
  id: string; name: string; dMin: number; dMax: number; hazardous: boolean;
  missLunar: number; missAU: number; missKm: number;
  velKms: number; date: string; url: string;
  // Orbital elements from SBDB (loaded on demand)
  orbit?: {
    a: number; e: number; i: number; om: number; w: number;
    loaded: boolean;
  };
}

// ─── Camera presets ──────────────────────────────────────────────────────────

interface CamPreset {
  key: string; label: string;
  pos: [number, number, number];
  tgt: [number, number, number];
  follow?: number;
  autoRotate?: boolean;
}

const CAMS: CamPreset[] = [
  { key:'1', label:'Inner',     pos:[0, 3, 4],       tgt:[0, 0, 0] },
  { key:'2', label:'System',    pos:[0, 30, 40],      tgt:[0, 0, 0] },
  { key:'3', label:'Earth',     pos:[0, 0.4, 1.4],    tgt:[0, 0, 1],   follow:2 },
  { key:'4', label:'Top',       pos:[0, 45, 0.01],    tgt:[0, 0, 0] },
  { key:'5', label:'Ecliptic',  pos:[10, 0.2, 0],     tgt:[0, 0, 0] },
  { key:'6', label:'Jupiter',   pos:[0, 2, 7],        tgt:[0, 0, 5.2], follow:4 },
  { key:'7', label:'Cinematic', pos:[4, 2.5, 6],      tgt:[0, 0, 0],   autoRotate:true },
];

// ─── Focus camera state (for planet click-to-focus) ──────────────────────────

interface FocusTarget {
  planetIdx: number;
  pos: [number, number, number];
}

// ─── 3D Components ───────────────────────────────────────────────────────────

function Skybox() {
  const tex = useLoader(THREE.TextureLoader, TEX.starfield);
  const { scene } = useThree();
  useEffect(() => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = tex;
  }, [tex, scene]);
  return null;
}

function Sun() {
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

function Planet({ planet, T, selected, onSelect, hovered, onHover }: {
  planet: PlanetDef; T: number; selected: boolean; onSelect: () => void;
  hovered: boolean; onHover: (h: boolean) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => planetXYZ(planet, T), [planet, T]);
  const tex = useLoader(THREE.TextureLoader, TEX[planet.tex]);
  const cloudTex = planet.tex === 'earth' ? useLoader(THREE.TextureLoader, TEX.earthClouds) : null;
  const r = planet.radius;

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.12;
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.18;
  });

  return (
    <group position={pos}>
      <mesh
        ref={ref}
        onClick={e => { e.stopPropagation(); onSelect(); }}
        onPointerEnter={() => onHover(true)}
        onPointerLeave={() => onHover(false)}
      >
        <sphereGeometry args={[r, 48, 48]} />
        <meshStandardMaterial map={tex} roughness={0.8} metalness={0.0} />
      </mesh>
      {cloudTex && (
        <mesh ref={cloudRef}>
          <sphereGeometry args={[r * 1.012, 32, 32]} />
          <meshStandardMaterial map={cloudTex} transparent opacity={0.35} depthWrite={false} />
        </mesh>
      )}
      {planet.hasRings && (
        <mesh rotation={[Math.PI / 2 + 0.47, 0, 0]}>
          <ringGeometry args={[r * 1.45, r * 2.6, 128]} />
          <meshStandardMaterial color="#c8a86e" transparent opacity={0.55} side={THREE.DoubleSide} roughness={1} />
        </mesh>
      )}
      {selected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r * 2.1, r * 2.35, 64]} />
          <meshBasicMaterial color="#00ffcc" transparent opacity={0.7} side={THREE.DoubleSide} />
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

function Moon({ earthPos, jd }: { earthPos: [number, number, number]; jd: number }) {
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

function OrbitRing({ planet, T, dim, highlighted }: { planet: PlanetDef; T: number; dim: boolean; highlighted: boolean }) {
  const pts = useMemo(() => orbitPath(planet, T), [planet, T]);
  return (
    <Line
      points={pts}
      color={highlighted ? '#00ffcc' : planet.color}
      lineWidth={highlighted ? 1.2 : dim ? 0.3 : 0.6}
      transparent
      opacity={highlighted ? 0.6 : dim ? 0.08 : 0.25}
    />
  );
}

function AsteroidOrbitLine({ neo }: { neo: NEO }) {
  const pts = useMemo(() => {
    if (!neo.orbit?.loaded) return null;
    return asteroidOrbitPath(neo.orbit.a, neo.orbit.e, neo.orbit.i, neo.orbit.om, neo.orbit.w);
  }, [neo.orbit]);

  if (!pts) return null;
  const col = neo.hazardous ? '#ff6644' : '#44ffaa';
  return <Line points={pts} color={col} lineWidth={0.8} transparent opacity={0.5} />;
}

function AUGrid() {
  return (
    <group>
      {[1, 2, 5, 10, 20, 30].map(r => (
        <mesh key={r} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.003, r + 0.003, 128]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.025} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function NeoDot({ neo, selected, onSelect }: { neo: NEO; selected: boolean; onSelect: () => void }) {
  const angle = (parseInt(neo.id.slice(-4), 16) % 360) * DEG;
  const dist = Math.min(neo.missAU * 5, 2.5);
  const x = (1 + dist) * Math.cos(angle);
  const z = (1 + dist) * Math.sin(angle);
  const col = neo.hazardous ? '#ff4444' : '#44ff88';
  const r = Math.max(0.006, Math.min(0.022, neo.dMax / 500));
  return (
    <group position={[x, 0, z]}>
      <mesh onClick={e => { e.stopPropagation(); onSelect(); }}>
        <icosahedronGeometry args={[r, 0]} />
        <meshBasicMaterial color={col} />
      </mesh>
      {selected && (
        <mesh>
          <sphereGeometry args={[r * 3, 8, 8]} />
          <meshBasicMaterial color={col} transparent opacity={0.12} />
        </mesh>
      )}
    </group>
  );
}

// ─── Camera controller ───────────────────────────────────────────────────────

interface CamCtrlProps {
  preset: CamPreset;
  focusTarget: FocusTarget | null;
  positions: Map<number, [number, number, number]>;
}

function CamCtrl({ preset, focusTarget, positions }: CamCtrlProps) {
  const { camera } = useThree();
  const ctrlRef = useRef<any>(null);
  const tPos = useRef(new THREE.Vector3(...preset.pos));
  const tLook = useRef(new THREE.Vector3(...preset.tgt));

  useEffect(() => {
    if (focusTarget !== null) {
      const pp = positions.get(focusTarget.planetIdx);
      if (pp) {
        const planet = PLANETS[focusTarget.planetIdx];
        const offset = planet.radius * 8 + planet.a * 0.15;
        tLook.current = new THREE.Vector3(...pp);
        tPos.current = new THREE.Vector3(pp[0] + offset, pp[1] + offset * 0.4, pp[2] + offset);
      }
    } else {
      let p = new THREE.Vector3(...preset.pos);
      let l = new THREE.Vector3(...preset.tgt);
      if (preset.follow !== undefined) {
        const pp = positions.get(preset.follow);
        if (pp) { l = new THREE.Vector3(...pp); p = l.clone().add(new THREE.Vector3(0.3, 0.25, 0.5)); }
      }
      tPos.current = p;
      tLook.current = l;
    }
  }, [preset, focusTarget, positions]);

  useFrame(() => {
    if (focusTarget !== null) {
      const pp = positions.get(focusTarget.planetIdx);
      if (pp) {
        const planet = PLANETS[focusTarget.planetIdx];
        const offset = planet.radius * 8 + planet.a * 0.15;
        tLook.current.set(...pp);
        tPos.current.set(pp[0] + offset, pp[1] + offset * 0.4, pp[2] + offset);
      }
    }
    camera.position.lerp(tPos.current, 0.03);
    if (ctrlRef.current) {
      ctrlRef.current.target.lerp(tLook.current, 0.03);
      ctrlRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={ctrlRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={0.05}
      maxDistance={120}
      autoRotate={!focusTarget && !!preset.autoRotate}
      autoRotateSpeed={0.25}
    />
  );
}

// ─── Scene ───────────────────────────────────────────────────────────────────

interface SceneProps {
  jd: number; T: number;
  neos: NEO[]; selNeo: NEO | null; setSelNeo: (n: NEO | null) => void;
  selPlanet: number | null; setSelPlanet: (i: number | null) => void;
  camPreset: CamPreset;
  focusTarget: FocusTarget | null;
  onPositionsUpdate: (m: Map<number, [number, number, number]>) => void;
}

function Scene({ jd, T, neos, selNeo, setSelNeo, selPlanet, setSelPlanet, camPreset, focusTarget, onPositionsUpdate }: SceneProps) {
  const [hov, setHov] = useState<number | null>(null);
  const positions = useMemo(() => {
    const m = new Map<number, [number, number, number]>();
    PLANETS.forEach((p, i) => m.set(i, planetXYZ(p, T)));
    return m;
  }, [T]);

  useEffect(() => { onPositionsUpdate(positions); }, [positions, onPositionsUpdate]);

  const ep = (positions.get(2) || [1, 0, 0]) as [number, number, number];

  return (
    <>
      <Skybox />
      <ambientLight intensity={0.05} />
      <Sun />
      <Moon earthPos={ep} jd={jd} />
      <AUGrid />
      {PLANETS.map((p, i) => (
        <group key={p.name}>
          <OrbitRing
            planet={p} T={T}
            dim={selPlanet !== null && selPlanet !== i}
            highlighted={selPlanet === i}
          />
          <Planet
            planet={p} T={T}
            selected={selPlanet === i}
            onSelect={() => setSelPlanet(selPlanet === i ? null : i)}
            hovered={hov === i}
            onHover={h => setHov(h ? i : null)}
          />
        </group>
      ))}
      {neos.map(neo => (
        <group key={neo.id}>
          <NeoDot
            neo={neo}
            selected={selNeo?.id === neo.id}
            onSelect={() => setSelNeo(selNeo?.id === neo.id ? null : neo)}
          />
          {selNeo?.id === neo.id && <AsteroidOrbitLine neo={neo} />}
        </group>
      ))}
      <CamCtrl preset={camPreset} focusTarget={focusTarget} positions={positions} />
    </>
  );
}

// ─── Glass style helper ──────────────────────────────────────────────────────

const glass: React.CSSProperties = {
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
};

// ─── Tiny UI helpers ─────────────────────────────────────────────────────────

function Btn({ children, onClick, style }: { children: React.ReactNode; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
      fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
      padding: '1px 5px', lineHeight: 1.4, ...style,
    }}>
      {children}
    </button>
  );
}

function Stat({ label, val, c }: { label: string; val: string | number; c?: string }) {
  return (
    <div>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: c || '#fff', fontSize: 10, marginTop: 1 }}>{val}</div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Orrery() {
  const [neos, setNeos] = useState<NEO[]>([]);
  const [selNeo, setSelNeo] = useState<NEO | null>(null);
  const [selPlanet, setSelPlanet] = useState<number | null>(null);
  const [camIdx, setCamIdx] = useState(0);
  const [showNeo, setShowNeo] = useState(false);
  const [showHud, setShowHud] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [simTime, setSimTime] = useState(new Date());
  const [playing, setPlaying] = useState(true);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const positionsRef = useRef(new Map<number, [number, number, number]>());

  const jd = useMemo(() => julianDate(simTime), [simTime]);
  const T = useMemo(() => (jd - 2451545.0) / 36525, [jd]);
  const moon = useMemo(() => moonPhase(jd), [jd]);

  const handlePositionsUpdate = useCallback((m: Map<number, [number, number, number]>) => {
    positionsRef.current = m;
  }, []);

  // Time tick — 16ms ≈ 60fps
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setSimTime(p => new Date(p.getTime() + speed * 1000 * 16)), 16);
    return () => clearInterval(id);
  }, [playing, speed]);

  // Fetch NEOs
  useEffect(() => {
    const d = new Date().toISOString().split('T')[0];
    fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${d}&end_date=${d}&api_key=DEMO_KEY`)
      .then(r => r.json())
      .then(data => {
        const list: NEO[] = [];
        Object.values(data.near_earth_objects || {}).forEach((arr: any) => {
          arr.forEach((n: any) => {
            const ca = n.close_approach_data?.[0];
            if (!ca) return;
            list.push({
              id: n.id, name: n.name,
              dMin: n.estimated_diameter?.meters?.estimated_diameter_min || 0,
              dMax: n.estimated_diameter?.meters?.estimated_diameter_max || 0,
              hazardous: n.is_potentially_hazardous_asteroid,
              missLunar: parseFloat(ca.miss_distance?.lunar || '0'),
              missAU: parseFloat(ca.miss_distance?.astronomical || '0'),
              missKm: parseFloat(ca.miss_distance?.kilometers || '0'),
              velKms: parseFloat(ca.relative_velocity?.kilometers_per_second || '0'),
              date: ca.close_approach_date_full || ca.close_approach_date,
              url: n.nasa_jpl_url,
            });
          });
        });
        list.sort((a, b) => a.missLunar - b.missLunar);
        setNeos(list);
      })
      .catch(() => {});
  }, []);

  // Fetch asteroid orbital elements from NASA SBDB when a NEO is selected
  useEffect(() => {
    if (!selNeo) return;
    if (selNeo.orbit !== undefined) return; // already loaded or loading

    // Mark as loading
    setNeos(prev => prev.map(n => n.id === selNeo.id ? { ...n, orbit: { a: 0, e: 0, i: 0, om: 0, w: 0, loaded: false } } : n));

    // NASA SBDB small body API
    const spkId = selNeo.id;
    fetch(`https://ssd-api.jpl.nasa.gov/sbdb.api?spk=${spkId}&phys-par=false&close-approach=false`)
      .then(r => r.json())
      .then(data => {
        const elems = data?.orbit?.elements;
        if (!elems) return;
        const get = (label: string) => {
          const el = elems.find((e: any) => e.label === label || e.name === label);
          return el ? parseFloat(el.value) : 0;
        };
        const orbit = {
          a: get('a'),
          e: get('e'),
          i: get('i'),
          om: get('om'),
          w: get('w'),
          loaded: true,
        };
        setNeos(prev => prev.map(n => n.id === selNeo.id ? { ...n, orbit } : n));
        setSelNeo(prev => prev?.id === selNeo.id ? { ...prev, orbit } : prev);
      })
      .catch(() => {
        // On error, mark as loaded with fallback (approximate circular orbit near 1 AU)
        const orbit = { a: 1.0 + selNeo.missAU * 0.5, e: 0.3, i: 5, om: 0, w: 0, loaded: true };
        setNeos(prev => prev.map(n => n.id === selNeo.id ? { ...n, orbit } : n));
        setSelNeo(prev => prev?.id === selNeo.id ? { ...prev, orbit } : prev);
      });
  }, [selNeo]);

  // Keyboard shortcuts
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'h') setShowHud(p => !p);
      if (k === 'n') setShowNeo(p => !p);
      if (k === 'f') document.documentElement.requestFullscreen?.();
      if (k === 'escape') { setSelPlanet(null); setSelNeo(null); setFocusTarget(null); }
      if (k === ' ') { e.preventDefault(); setPlaying(p => !p); }
      const num = parseInt(e.key);
      if (num >= 1 && num <= 7) { setCamIdx(num - 1); setFocusTarget(null); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // Planet selection → auto-focus camera
  const handlePlanetSelect = useCallback((idx: number | null) => {
    setSelPlanet(idx);
    if (idx !== null) {
      const pos = positionsRef.current.get(idx);
      if (pos) setFocusTarget({ planetIdx: idx, pos });
    } else {
      setFocusTarget(null);
    }
  }, []);

  const sp = selPlanet !== null ? PLANETS[selPlanet] : null;

  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour12: false });

  const speedLabel = (s: number) => {
    if (s === 1) return '1×';
    if (s < 1000) return `${s}×`;
    if (s < 86400) return `${(s / 3600).toFixed(1)}h/s`;
    if (s < 86400 * 365) return `${(s / 86400).toFixed(1)}d/s`;
    return `${(s / (86400 * 365)).toFixed(1)}yr/s`;
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden', fontFamily: "'JetBrains Mono','SF Mono',monospace" }}>
      {/* ── 3D Canvas ── */}
      <Canvas
        camera={{ position: [0, 3, 4], fov: 55, near: 0.005, far: 300 }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      >
        <Suspense fallback={null}>
          <Scene
            jd={jd} T={T}
            neos={neos} selNeo={selNeo} setSelNeo={setSelNeo}
            selPlanet={selPlanet} setSelPlanet={handlePlanetSelect}
            camPreset={CAMS[camIdx]}
            focusTarget={focusTarget}
            onPositionsUpdate={handlePositionsUpdate}
          />
        </Suspense>
      </Canvas>

      {/* ── Top bar: date/time/moon ── */}
      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 12, ...glass, padding: '6px 16px', zIndex: 10 }}>
        <span style={{ color: '#fff', fontSize: 17, fontWeight: 600, letterSpacing: 2 }}>{fmtTime(simTime)}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{fmtDate(simTime)}</span>
        <span style={{ fontSize: 15 }}>{moon.emoji}</span>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>{moon.name} · {moon.ill}%</span>
        {speed !== 1 && <span style={{ color: '#00ffcc', fontSize: 9 }}>{speedLabel(speed)}</span>}
      </div>

      {/* ── Camera preset pills ── */}
      <div style={{ position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 3, zIndex: 10 }}>
        {CAMS.map((c, i) => (
          <button
            key={c.key}
            onClick={() => { setCamIdx(i); setFocusTarget(null); setSelPlanet(null); }}
            style={{
              ...glass, padding: '3px 8px', fontSize: 9, cursor: 'pointer', fontFamily: 'inherit',
              color: camIdx === i && !focusTarget ? '#00ffcc' : 'rgba(255,255,255,0.4)',
              borderColor: camIdx === i && !focusTarget ? 'rgba(0,255,204,0.4)' : 'rgba(255,255,255,0.07)',
              background: camIdx === i && !focusTarget ? 'rgba(0,255,204,0.1)' : 'rgba(0,0,0,0.5)',
              transition: 'all 0.15s',
            }}
          >
            {c.key} {c.label}
          </button>
        ))}
        {focusTarget !== null && (
          <button
            onClick={() => { setFocusTarget(null); setSelPlanet(null); }}
            style={{ ...glass, padding: '3px 8px', fontSize: 9, cursor: 'pointer', fontFamily: 'inherit', color: '#00ffcc', borderColor: 'rgba(0,255,204,0.4)', background: 'rgba(0,255,204,0.1)' }}
          >
            ✦ {PLANETS[focusTarget.planetIdx].name} ✕
          </button>
        )}
      </div>

      {/* ── Time controls (bottom center) ── */}
      <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 4, ...glass, padding: '5px 12px', zIndex: 10 }}>
        <Btn onClick={() => setSpeed(s => Math.max(1, s / 10))}>«</Btn>
        <Btn
          onClick={() => setPlaying(p => !p)}
          style={{ color: playing ? '#00ffcc' : '#ff6644', fontSize: 14, padding: '0 4px' }}
        >
          {playing ? '⏸' : '▶'}
        </Btn>
        <Btn onClick={() => setSpeed(s => Math.min(86400 * 365, s * 10))}>»</Btn>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, minWidth: 52, textAlign: 'center' }}>
          {speedLabel(speed)}
        </span>
        <Btn onClick={() => { setSimTime(new Date()); setSpeed(1); }} style={{ color: '#ffcc44', marginLeft: 4 }}>NOW</Btn>
      </div>

      {/* ── Toggle buttons (bottom right) ── */}
      <div style={{ position: 'absolute', bottom: 14, right: 14, display: 'flex', gap: 3, zIndex: 10 }}>
        {[
          { l: 'HUD', on: showHud, fn: () => setShowHud(p => !p) },
          { l: 'NEO', on: showNeo, fn: () => setShowNeo(p => !p) },
          { l: '⛶', on: false, fn: () => document.documentElement.requestFullscreen?.() },
        ].map(b => (
          <button key={b.l} onClick={b.fn} style={{
            ...glass, padding: '4px 9px', fontSize: 9, cursor: 'pointer', fontFamily: 'inherit',
            color: b.on ? '#00ffcc' : 'rgba(255,255,255,0.35)',
            borderColor: b.on ? 'rgba(0,255,204,0.35)' : 'rgba(255,255,255,0.07)',
            background: b.on ? 'rgba(0,255,204,0.08)' : 'rgba(0,0,0,0.5)',
            transition: 'all 0.15s',
          }}>
            {b.l}
          </button>
        ))}
      </div>

      {/* ── Selected planet info card ── */}
      {sp && (
        <div style={{ position: 'absolute', top: 96, left: 14, ...glass, padding: '12px 14px', width: 205, zIndex: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>{sp.name}</span>
            <Btn onClick={() => { setSelPlanet(null); setFocusTarget(null); }}>✕</Btn>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, lineHeight: 1.6, marginBottom: 8 }}>{sp.desc}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
            <Stat label="Type" val={sp.type} />
            <Stat label="Moons" val={sp.moons} />
            <Stat label="Distance" val={`${sp.distAU} AU`} />
            <Stat label="Period" val={`${(sp.period / 365.25).toFixed(2)} yr`} />
            <Stat label="Eccentricity" val={sp.e.toFixed(4)} />
            <Stat label="Inclination" val={`${sp.I.toFixed(2)}°`} />
            <Stat label="Gravity" val={sp.gravity} />
            <Stat label="Temp" val={sp.surfaceTemp} />
          </div>
          <button
            onClick={() => {
              const pos = positionsRef.current.get(selPlanet!);
              setFocusTarget(focusTarget?.planetIdx === selPlanet ? null : { planetIdx: selPlanet!, pos: pos || [0,0,0] });
            }}
            style={{
              marginTop: 10, width: '100%', padding: '4px 0', fontSize: 9, cursor: 'pointer',
              fontFamily: 'inherit', borderRadius: 3, border: '1px solid rgba(0,255,204,0.3)',
              background: focusTarget?.planetIdx === selPlanet ? 'rgba(0,255,204,0.15)' : 'transparent',
              color: '#00ffcc', transition: 'all 0.15s',
            }}
          >
            {focusTarget?.planetIdx === selPlanet ? '✦ Focused — click to release' : '⊕ Focus Camera'}
          </button>
        </div>
      )}

      {/* ── NEO panel (slide-in from right) ── */}
      <div style={{
        position: 'absolute', top: 56, right: 0, bottom: 50, width: 250,
        ...glass, borderRadius: '6px 0 0 6px', borderRight: 'none',
        transform: showNeo ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        overflowY: 'auto', padding: '10px 8px', zIndex: 15,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase' }}>Near-Earth Objects</span>
          <span style={{ color: '#00ffcc', fontSize: 9 }}>{neos.length} today</span>
        </div>
        {neos.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, textAlign: 'center', marginTop: 20 }}>Loading NASA data…</div>
        )}
        {neos.map(neo => (
          <div
            key={neo.id}
            onClick={() => setSelNeo(selNeo?.id === neo.id ? null : neo)}
            style={{
              padding: '6px 7px', marginBottom: 2, borderRadius: 4, cursor: 'pointer',
              background: selNeo?.id === neo.id ? 'rgba(0,255,204,0.07)' : 'transparent',
              border: selNeo?.id === neo.id ? '1px solid rgba(0,255,204,0.2)' : '1px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {neo.hazardous && <span style={{ color: '#ff4444', fontSize: 7 }}>●</span>}
              <span style={{ color: '#fff', fontSize: 9 }}>{neo.name.replace(/[()]/g, '')}</span>
              {neo.orbit?.loaded && <span style={{ color: '#00ffcc', fontSize: 7, marginLeft: 'auto' }}>orbit</span>}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, marginTop: 2 }}>
              {neo.missLunar.toFixed(1)} LD · {neo.velKms.toFixed(1)} km/s · {Math.round(neo.dMin)}–{Math.round(neo.dMax)} m
            </div>
          </div>
        ))}
        <div style={{ color: 'rgba(255,255,255,0.12)', fontSize: 7, marginTop: 8, textAlign: 'center' }}>Source: NASA JPL NeoWs · SBDB</div>
      </div>

      {/* ── Selected NEO detail ── */}
      {selNeo && (
        <div style={{
          position: 'absolute', bottom: 56, left: '50%', transform: 'translateX(-50%)',
          ...glass, padding: '10px 16px', maxWidth: 420, width: '90%', zIndex: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{selNeo.name}</span>
            <Btn onClick={() => setSelNeo(null)}>✕</Btn>
          </div>
          {selNeo.hazardous && (
            <div style={{ color: '#ff4444', fontSize: 8, letterSpacing: 1.5, marginTop: 2, textTransform: 'uppercase' }}>⚠ Potentially Hazardous</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginTop: 8 }}>
            <Stat label="Diameter" val={`${Math.round(selNeo.dMin)}–${Math.round(selNeo.dMax)} m`} />
            <Stat label="Miss distance" val={`${selNeo.missLunar.toFixed(1)} LD`} />
            <Stat label="Velocity" val={`${selNeo.velKms.toFixed(1)} km/s`} />
            <Stat label="Close approach" val={selNeo.date} />
            {selNeo.orbit?.loaded && (
              <>
                <Stat label="Semi-major axis" val={`${selNeo.orbit.a.toFixed(3)} AU`} c="#00ffcc" />
                <Stat label="Eccentricity" val={selNeo.orbit.e.toFixed(4)} c="#00ffcc" />
                <Stat label="Inclination" val={`${selNeo.orbit.i.toFixed(2)}°`} c="#00ffcc" />
                <Stat label="Orbit shown" val="in scene" c="#00ffcc" />
              </>
            )}
            {selNeo.orbit && !selNeo.orbit.loaded && (
              <div style={{ gridColumn: '1/-1', color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>Loading orbital elements…</div>
            )}
          </div>
          <a
            href={selNeo.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: 8, color: '#00ffcc', fontSize: 9, textDecoration: 'none', borderBottom: '1px solid rgba(0,255,204,0.3)' }}
          >
            View on NASA JPL →
          </a>
        </div>
      )}

      {/* ── Simulation HUD (hidden by default) ── */}
      {showHud && (
        <div style={{ position: 'absolute', bottom: 56, left: 14, ...glass, padding: '8px 12px', fontSize: 9, zIndex: 15 }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' }}>Simulation</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 14px' }}>
            <Stat label="Julian Date" val={jd.toFixed(2)} />
            <Stat label="T (centuries)" val={T.toFixed(4)} />
            <Stat label="Sim speed" val={speedLabel(speed)} />
            <Stat label="Moon phase" val={`${moon.name} ${moon.ill}%`} />
            <Stat label="NEOs loaded" val={neos.length} />
            <Stat label="Playing" val={playing ? 'Yes' : 'Paused'} c={playing ? '#00ffcc' : '#ff6644'} />
          </div>
        </div>
      )}

      {/* ── Keyboard hints ── */}
      <div style={{
        position: 'absolute', bottom: 56, right: showNeo ? 264 : 14,
        color: 'rgba(255,255,255,0.1)', fontSize: 7, lineHeight: 1.8, textAlign: 'right',
        transition: 'right 0.3s', zIndex: 10,
      }}>
        <div>1–7 cameras · click planet to focus</div>
        <div>H hud · N neo · F fullscreen · Space pause</div>
      </div>

      {/* ── Title watermark ── */}
      <div style={{ position: 'absolute', top: 14, left: 14, color: 'rgba(255,255,255,0.12)', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', zIndex: 5 }}>
        Orrery
      </div>
    </div>
  );
}
