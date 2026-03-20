/*
 * Orrery — Interactive 3D Solar System
 *
 * Main component: state management, effects, Canvas composition.
 * 3D scene in scene/, UI overlays in ui/.
 */

import { useEffect, useState, useRef, useMemo, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMS } from './data/planets';
import type { NEO, FocusTarget } from './lib/kepler';
import { julianDate, moonPhase } from './lib/kepler';
import { ThemeProvider, useTheme } from './lib/themes';
import Scene from './scene/Scene';
import Panels from './ui/Panels';
import LoadingScreen from './ui/LoadingScreen';

function OrreryInner() {
  const { cycleTheme } = useTheme();
  const [neos, setNeos] = useState<NEO[]>([]);
  const [selNeo, setSelNeo] = useState<NEO | null>(null);
  const [selPlanet, setSelPlanet] = useState<number | null>(null);
  const [camIdx, setCamIdx] = useState(0);
  const [showNeo, setShowNeo] = useState(false);
  const [showHud, setShowHud] = useState(false);
  const [showDwarf, setShowDwarf] = useState(true);
  const [showStars, setShowStars] = useState(true);
  const [showConstellations, setShowConstellations] = useState(true);
  const [showPlanetList, setShowPlanetList] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [simTime, setSimTime] = useState(new Date());
  const [playing, setPlaying] = useState(true);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const positionsRef = useRef(new Map<number, [number, number, number]>());

  const jd = useMemo(() => julianDate(simTime), [simTime]);
  const T = useMemo(() => (jd - 2451545.0) / 36525, [jd]);
  const moon = useMemo(() => moonPhase(jd), [jd]);

  const handlePositionsUpdate = useCallback((m: Map<number, [number, number, number]>) => {
    positionsRef.current = m;
  }, []);

  // Time tick (~60fps)
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setSimTime(p => new Date(p.getTime() + speed * 16)), 16);
    return () => clearInterval(id);
  }, [playing, speed]);

  // Fetch today's near-Earth objects from NASA NeoWs
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

  // Fetch asteroid orbital elements from NASA SBDB on NEO selection
  useEffect(() => {
    if (!selNeo) return;
    if (selNeo.orbit !== undefined) return;

    // Mark as loading
    setNeos(prev => prev.map(n => n.id === selNeo.id ? { ...n, orbit: { a: 0, e: 0, i: 0, om: 0, w: 0, ma: 0, epoch: 0, loaded: false } } : n));

    fetch(`https://ssd-api.jpl.nasa.gov/sbdb.api?spk=${selNeo.id}&phys-par=false&close-approach=false`)
      .then(r => r.json())
      .then(data => {
        const elems = data?.orbit?.elements;
        if (!elems) return;
        const get = (label: string) => {
          const el = elems.find((e: any) => e.label === label || e.name === label);
          return el ? parseFloat(el.value) : 0;
        };
        const orbit = {
          a: get('a'), e: get('e'), i: get('i'), om: get('om'), w: get('w'),
          ma: get('ma'),
          epoch: parseFloat(data?.orbit?.epoch || '0'),
          loaded: true,
        };
        setNeos(prev => prev.map(n => n.id === selNeo.id ? { ...n, orbit } : n));
        setSelNeo(prev => prev?.id === selNeo.id ? { ...prev, orbit } : prev);
      })
      .catch(() => {
        const orbit = { a: 1.0 + selNeo.missAU * 0.5, e: 0.3, i: 5, om: 0, w: 0, ma: 0, epoch: 2451545, loaded: true };
        setNeos(prev => prev.map(n => n.id === selNeo.id ? { ...n, orbit } : n));
        setSelNeo(prev => prev?.id === selNeo.id ? { ...prev, orbit } : prev);
      });
  }, [selNeo]);

  // Keyboard shortcuts
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const k = e.key.toLowerCase();
      if (k === 'h') setShowHud(p => !p);
      if (k === 'n') setShowNeo(p => !p);
      if (k === 'd') setShowDwarf(p => !p);
      if (k === 's') setShowStars(p => !p);
      if (k === 'c') setShowConstellations(p => !p);
      if (k === 't') cycleTheme();
      if (k === 'p') setShowPlanetList(p => !p);
      if (k === 'f') document.documentElement.requestFullscreen?.();
      if (k === 'escape') { setSelPlanet(null); setSelNeo(null); setFocusTarget(null); setShowPlanetList(false); }
      if (k === ' ') { e.preventDefault(); setPlaying(p => !p); }
      if (e.key === '0' && CAMS.length >= 10) { setCamIdx(9); setFocusTarget(null); }
      const num = parseInt(e.key);
      if (num >= 1 && num <= Math.min(9, CAMS.length)) { setCamIdx(num - 1); setFocusTarget(null); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // Planet selection auto-focuses camera
  const handlePlanetSelect = useCallback((idx: number | null) => {
    setSelPlanet(idx);
    if (idx !== null) {
      const pos = positionsRef.current.get(idx);
      if (pos) setFocusTarget({ planetIdx: idx, pos });
    } else {
      setFocusTarget(null);
    }
  }, []);

  return (
    <div style={{
      width: '100vw', height: '100dvh', background: '#000',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Cormorant Garamond','Garamond','Baskerville','Georgia',serif",
    }}>
      <Canvas
        camera={{ position: [0, 3, 4], fov: 55, near: 0.005, far: 500 }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        onCreated={() => setSceneReady(true)}
      >
        <Suspense fallback={null}>
          <Scene
            jd={jd} T={T}
            neos={neos} selNeo={selNeo} setSelNeo={setSelNeo}
            selPlanet={selPlanet} setSelPlanet={handlePlanetSelect}
            camPreset={CAMS[camIdx]}
            focusTarget={focusTarget}
            onPositionsUpdate={handlePositionsUpdate}
            showDwarf={showDwarf}
            showStars={showStars}
            showConstellations={showConstellations}
          />
        </Suspense>
      </Canvas>

      <LoadingScreen ready={sceneReady} />

      <Panels
        simTime={simTime} moon={moon}
        speed={speed} setSpeed={setSpeed}
        playing={playing} setPlaying={setPlaying}
        camIdx={camIdx} setCamIdx={setCamIdx}
        cams={CAMS}
        focusTarget={focusTarget} setFocusTarget={setFocusTarget}
        selPlanet={selPlanet} setSelPlanet={handlePlanetSelect}
        neos={neos} selNeo={selNeo} setSelNeo={setSelNeo}
        showNeo={showNeo} setShowNeo={setShowNeo}
        showHud={showHud} setShowHud={setShowHud}
        showDwarf={showDwarf} setShowDwarf={setShowDwarf}
        showStars={showStars} setShowStars={setShowStars}
        showConstellations={showConstellations} setShowConstellations={setShowConstellations}
        showPlanetList={showPlanetList} setShowPlanetList={setShowPlanetList}
        setSimTime={setSimTime}
        jd={jd} T={T}
        positionsRef={positionsRef}
      />
    </div>
  );
}

export default function Orrery() {
  return (
    <ThemeProvider>
      <OrreryInner />
    </ThemeProvider>
  );
}
