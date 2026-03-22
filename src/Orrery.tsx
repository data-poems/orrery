/*
 * Orrery — Interactive 3D Solar System
 *
 * Main component: state management, effects, Canvas composition.
 * 3D scene in scene/, UI overlays in ui/.
 */

import { useEffect, useState, useRef, useMemo, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { ALL_BODIES, CAMS } from './data/planets';
import { getMoonsForPlanet } from './data/moons';
import type { NEO, FocusTarget } from './lib/kepler';
import { julianDate, moonPhase } from './lib/kepler';
import { ThemeProvider } from './lib/themes';
import Scene from './scene/Scene';
import Panels from './ui/Panels';
import LoadingScreen from './ui/LoadingScreen';

type CinematicStep = {
  camPreset?: number; focusPlanet?: number; focusMoon?: number;
  duration: number; label: string;
  desc?: string;
  stars?: boolean; constellations?: boolean; constellationFocus?: boolean;
  asteroidBelt?: boolean; dwarf?: boolean;
};

function OrreryInner() {
  const [neos, setNeos] = useState<NEO[]>([]);
  const [neoStatus, setNeoStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [selNeo, setSelNeo] = useState<NEO | null>(null);
  // Cinematic mode is the default — start bare, reveal layers progressively
  const [selPlanet, setSelPlanet] = useState<number | null>(null);
  const [showNeo, setShowNeo] = useState(false);
  const [showDwarf, setShowDwarf] = useState(false);
  const [showStars, setShowStars] = useState(true);
  const [showConstellations, setShowConstellations] = useState(false);
  const [showAsteroidBelt, setShowAsteroidBelt] = useState(false);
  const [constellationFocus, setConstellationFocus] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [simTime, setSimTime] = useState(new Date());
  const [playing, setPlaying] = useState(true);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [cinematic, setCinematic] = useState(true);
  const [navStack, setNavStack] = useState<string[]>(['Solar System']);
  const [selMoonIdx, setSelMoonIdx] = useState<number | null>(null);
  const [cameraDistance, setCameraDistance] = useState(50);
  const [camIdx, setCamIdx] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const positionsRef = useRef(new Map<number, [number, number, number]>());

  const jd = useMemo(() => julianDate(simTime), [simTime]);
  const T = useMemo(() => (jd - 2451545.0) / 36525, [jd]);
  const moon = useMemo(() => moonPhase(jd), [jd]);

  const camPreset = camIdx >= 0 && camIdx < CAMS.length ? CAMS[camIdx] : null;

  // ─── Cinematic: continuous zoom cycle through scale levels ──────────────────
  const cinematicSteps = useMemo((): CinematicStep[] => [
    // 1. Start at inner system
    { camPreset: 0, duration: 5000, label: 'Inner Planets',
      stars: true, constellations: false, constellationFocus: false,
      asteroidBelt: false, dwarf: false },
    // 2. Zoom to Earth
    { focusPlanet: 2, duration: 5000, label: 'Earth',
      constellations: true },
    // 3. Pull out to full system with asteroid belt
    { camPreset: 1, duration: 5000, label: 'Solar System',
      asteroidBelt: true, dwarf: true },
    // 4. Jupiter
    { focusPlanet: 4, duration: 5000, label: 'Jupiter' },
    // 5. Ganymede
    { focusPlanet: 4, focusMoon: 3, duration: 5000, label: 'Ganymede' },
    // 6. Saturn
    { focusPlanet: 5, duration: 5000, label: 'Saturn',
      constellations: false },
    // 7. Pluto
    { focusPlanet: 9, duration: 5000, label: 'Pluto' },
  ], []);

  const cinematicIdx = useRef(0);
  const cinematicStart = useRef(0);

  // Space weather state for cinematic overlay (NOAA SWPC, no auth needed)
  const [solarWind, setSolarWind] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json')
      .then(r => r.json())
      .then(data => {
        if (data?.WindSpeed) setSolarWind(`${Math.round(Number(data.WindSpeed))} km/s`);
      })
      .catch(() => {});
  }, []);

  // Apply a cinematic step (camera preset + layers)
  const applyCinematicStep = useCallback((idx: number) => {
    const step = cinematicSteps[idx % cinematicSteps.length];
    setSelMoonIdx(null);
    setNavStack([step.label]);

    if (step.focusPlanet !== undefined) {
      setCamIdx(-1);
      setSelPlanet(step.focusPlanet);
      const pos = positionsRef.current.get(step.focusPlanet);
      if (step.focusMoon !== undefined) {
        setSelMoonIdx(step.focusMoon);
        if (pos) setFocusTarget({ planetIdx: step.focusPlanet, pos, moonIdx: step.focusMoon });
      } else {
        if (pos) setFocusTarget({ planetIdx: step.focusPlanet, pos });
      }
    } else {
      setSelPlanet(null);
      setFocusTarget(null);
      if (step.camPreset !== undefined) setCamIdx(step.camPreset);
    }

    if (step.stars !== undefined) setShowStars(() => step.stars!);
    if (step.constellations !== undefined) setShowConstellations(() => step.constellations!);
    if (step.constellationFocus !== undefined) setConstellationFocus(() => step.constellationFocus!);
    if (step.asteroidBelt !== undefined) setShowAsteroidBelt(() => step.asteroidBelt!);
    if (step.dwarf !== undefined) setShowDwarf(() => step.dwarf!);
  }, [cinematicSteps]);

  // Cinematic timer — poll-based to avoid fragile setTimeout chains
  useEffect(() => {
    if (!cinematic) {
      setShowStars(() => true);
      setShowConstellations(() => true);
      setShowAsteroidBelt(() => true);
      setShowDwarf(() => true);
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      setSelPlanet(isMobile ? null : 2);
      setCamIdx(-1);
      const earthPos = positionsRef.current.get(2);
      if (earthPos) setFocusTarget({ planetIdx: 2, pos: earthPos });
      setNavStack(isMobile ? ['Solar System'] : ['Solar System', 'Earth']);
      return;
    }

    if (!sceneReady) return;

    cinematicIdx.current = 0;
    cinematicStart.current = Date.now();
    applyCinematicStep(0);

    // Use setInterval to poll elapsed time — robust against React re-renders
    const id = setInterval(() => {
      const elapsed = Date.now() - cinematicStart.current;
      const dur = cinematicSteps[cinematicIdx.current % cinematicSteps.length].duration;
      if (elapsed >= dur) {
        cinematicIdx.current = (cinematicIdx.current + 1) % cinematicSteps.length;
        cinematicStart.current = Date.now();
        applyCinematicStep(cinematicIdx.current);
      }
    }, 500);

    return () => clearInterval(id);
  }, [cinematic, sceneReady, applyCinematicStep, cinematicSteps]);

  const handlePositionsUpdate = useCallback((m: Map<number, [number, number, number]>) => {
    positionsRef.current = m;
  }, []);

  // Time tick (~60fps)
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setSimTime(p => new Date(p.getTime() + speed * 16)), 16);
    return () => clearInterval(id);
  }, [playing, speed]);

  // Fetch today's near-Earth objects from NASA NeoWs (with sessionStorage caching)
  useEffect(() => {
    const d = new Date().toISOString().split('T')[0];
    const cacheKey = `neo-${d}`;

    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const list = JSON.parse(cached) as NEO[];
        setNeos(list);
        setNeoStatus('loaded');
        return;
      }
    } catch { /* ignore */ }

    fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${d}&end_date=${d}&api_key=DEMO_KEY`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
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
        setNeoStatus('loaded');
        // Cache in sessionStorage
        try { sessionStorage.setItem(cacheKey, JSON.stringify(list)); } catch { /* ignore */ }
      })
      .catch(() => {
        setNeoStatus('error');
      });
  }, []);

  // Fetch asteroid orbital elements from NASA SBDB on NEO selection
  useEffect(() => {
    if (!selNeo) return;
    if (selNeo.orbit !== undefined) return;

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

  // Navigate back one level
  const navigateBack = useCallback(() => {
    if (cinematic) {
      setCinematic(false);
      return;
    }
    if (navStack.length <= 1) return;

    if (selMoonIdx !== null) {
      setSelMoonIdx(null);
      setFocusTarget(prev => prev ? { planetIdx: prev.planetIdx, pos: prev.pos } : null);
      setNavStack(prev => prev.slice(0, -1));
    } else if (selPlanet !== null) {
      setSelPlanet(null);
      setFocusTarget(null);
      setSelMoonIdx(null);
      setCamIdx(1);
      setNavStack(['Solar System']);
    }
  }, [cinematic, navStack, selMoonIdx, selPlanet]);

  // Navigate to a specific breadcrumb level
  const navigateToLevel = useCallback((level: number) => {
    if (level === 0) {
      setSelPlanet(null);
      setSelMoonIdx(null);
      setFocusTarget(null);
      setNavStack(['Solar System']);
    } else if (level === 1 && navStack.length > 2) {
      setSelMoonIdx(null);
      setFocusTarget(prev => prev ? { planetIdx: prev.planetIdx, pos: prev.pos } : null);
      setNavStack(prev => prev.slice(0, 2));
    }
  }, [navStack]);

  // Planet selection auto-focuses camera and pushes to nav stack
  const handlePlanetSelect = useCallback((idx: number | null) => {
    if (cinematic) return;

    setSelPlanet(idx);
    setSelMoonIdx(null);
    setCamIdx(-1);
    if (idx !== null) {
      const pos = positionsRef.current.get(idx);
      if (pos) setFocusTarget({ planetIdx: idx, pos });
      setNavStack(['Solar System', ALL_BODIES[idx].name]);
    } else {
      setFocusTarget(null);
      setNavStack(['Solar System']);
    }
  }, [cinematic]);

  // Moon selection drill-down
  const handleMoonSelect = useCallback((planetIdx: number, moonIdx: number) => {
    if (cinematic) return;
    const moons = getMoonsForPlanet(planetIdx);
    if (moonIdx >= moons.length) return;

    setSelMoonIdx(moonIdx);
    const pos = positionsRef.current.get(planetIdx);
    if (pos) setFocusTarget({ planetIdx, pos, moonIdx });
    setNavStack(prev => {
      const base = prev.length >= 2 ? prev.slice(0, 2) : [...prev];
      return [...base, moons[moonIdx].name];
    });
  }, [cinematic]);

  // Camera preset selection
  const handlePresetSelect = useCallback((idx: number) => {
    const preset = CAMS[idx];
    if (!preset) return;
    setCamIdx(idx);
    setSelMoonIdx(null);
    setCinematic(false);
    if (preset.follow !== undefined) {
      const pos = positionsRef.current.get(preset.follow);
      setSelPlanet(preset.follow);
      setFocusTarget({ planetIdx: preset.follow, pos: pos || [0, 0, 0] });
      setNavStack(['Solar System', ALL_BODIES[preset.follow].name]);
    } else {
      setSelPlanet(null);
      setFocusTarget(null);
      setNavStack(['Solar System']);
    }
    // Screensaver preset: enable constellations + stars for ambient display
    if (preset.autoRotate && preset.follow !== undefined) {
      setShowStars(true);
      setShowConstellations(true);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const k = e.key.toLowerCase();

      if (cinematic) {
        setCinematic(false);
        return;
      }

      // Camera presets 1-9
      if (e.key >= '1' && e.key <= '9') {
        handlePresetSelect(parseInt(e.key) - 1);
        return;
      }

      if (k === 'm') { setDrawerOpen(p => !p); return; }
      if (k === 'n') setShowNeo(p => !p);
      if (k === 'd') setShowDwarf(p => !p);
      if (k === 's') setShowStars(p => !p);
      if (k === 'c') setShowConstellations(p => !p);
      if (k === 'g') setConstellationFocus(p => !p);
      if (k === 'f') setCinematic(true);
      if (k === 'escape') {
        if (drawerOpen) { setDrawerOpen(false); return; }
        navigateBack();
        setSelNeo(null);
      }
      if (k === ' ') { e.preventDefault(); setPlaying(p => !p); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [cinematic, drawerOpen, navigateBack, handlePresetSelect]);

  // Exit cinematic mode on click
  const handleCinematicClick = useCallback(() => {
    if (cinematic) setCinematic(false);
  }, [cinematic]);

  return (
    <div
      style={{
        width: '100vw', height: '100dvh', background: '#000',
        position: 'relative', overflow: 'hidden',
        fontFamily: "'Cormorant Garamond','Garamond','Baskerville','Georgia',serif",
      }}
      onClick={handleCinematicClick}
    >
      <Canvas
        camera={{ position: [0, 3, 4], fov: 55, near: 0.005, far: 250000 }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true, logarithmicDepthBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        onCreated={() => setSceneReady(true)}
      >
        <Suspense fallback={null}>
          <Scene
            jd={jd} T={T}
            neos={showNeo ? neos : []} selNeo={selNeo} setSelNeo={setSelNeo}
            selPlanet={selPlanet} setSelPlanet={handlePlanetSelect}
            focusTarget={focusTarget}
            onPositionsUpdate={handlePositionsUpdate}
            showDwarf={showDwarf}
            showStars={showStars}
            showConstellations={showConstellations}
            showAsteroidBelt={showAsteroidBelt}
            constellationFocus={constellationFocus}
            cinematic={cinematic}
            onMoonSelect={handleMoonSelect}
            selMoonIdx={selMoonIdx}
            onCameraDistance={setCameraDistance}
            camPreset={camPreset}
          />
        </Suspense>
      </Canvas>

      <LoadingScreen ready={sceneReady} />

      <Panels
        simTime={simTime} moon={moon} solarWind={solarWind}
        speed={speed} setSpeed={setSpeed}
        playing={playing} setPlaying={setPlaying}
        selPlanet={selPlanet} setSelPlanet={handlePlanetSelect}
        neos={neos} neoStatus={neoStatus} selNeo={selNeo} setSelNeo={setSelNeo}
        showNeo={showNeo} setShowNeo={setShowNeo}
        showDwarf={showDwarf} setShowDwarf={setShowDwarf}
        showStars={showStars} setShowStars={setShowStars}
        showConstellations={showConstellations} setShowConstellations={setShowConstellations}
        showAsteroidBelt={showAsteroidBelt} setShowAsteroidBelt={setShowAsteroidBelt}
        constellationFocus={constellationFocus} setConstellationFocus={setConstellationFocus}
        drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen}
        cinematic={cinematic}
        setCinematic={setCinematic}
        navStack={navStack}
        navigateBack={navigateBack}
        navigateToLevel={navigateToLevel}
        selMoonIdx={selMoonIdx}
        cameraDistance={cameraDistance}
        cams={CAMS}
        camIdx={camIdx}
        onPresetSelect={handlePresetSelect}
        onMoonSelect={handleMoonSelect}
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
