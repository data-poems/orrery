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

function OrreryInner() {
  const [neos, setNeos] = useState<NEO[]>([]);
  const [neoStatus, setNeoStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [selNeo, setSelNeo] = useState<NEO | null>(null);
  // Mobile: no info card on load (blocks screen). Desktop: Earth selected.
  const isMobileInit = typeof window !== 'undefined' && window.innerWidth < 768;
  const [selPlanet, setSelPlanet] = useState<number | null>(isMobileInit ? null : 2);
  const [showNeo, setShowNeo] = useState(false);
  const [showDwarf, setShowDwarf] = useState(true);
  const [showStars, setShowStars] = useState(true);
  const [showConstellations, setShowConstellations] = useState(true);
  const [showAsteroidBelt, setShowAsteroidBelt] = useState(true);
  const [showMilkyWay, setShowMilkyWay] = useState(true);
  const [showDeepSpace, setShowDeepSpace] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [simTime, setSimTime] = useState(new Date());
  const [playing, setPlaying] = useState(true);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  const [navStack, setNavStack] = useState<string[]>(isMobileInit ? ['Solar System'] : ['Solar System', 'Earth']);
  const [selMoonIdx, setSelMoonIdx] = useState<number | null>(null);
  const [cameraDistance, setCameraDistance] = useState(50);
  const [camIdx, setCamIdx] = useState(0);
  const positionsRef = useRef(new Map<number, [number, number, number]>());

  const jd = useMemo(() => julianDate(simTime), [simTime]);
  const T = useMemo(() => (jd - 2451545.0) / 36525, [jd]);
  const moon = useMemo(() => moonPhase(jd), [jd]);

  const camPreset = camIdx >= 0 && camIdx < CAMS.length ? CAMS[camIdx] : null;

  // ─── Cinematic tour: auto-cycle through bodies and views ────────────────────
  const cinematicShots = useMemo(() => {
    // Each shot: { planetIdx, moonIdx?, duration(ms), angle, elevation, distMult }
    // angle/elevation/distMult control camera placement relative to body
    const shots: { planetIdx: number; moonIdx?: number; duration: number; angle: number; elevation: number; distMult: number; label: string }[] = [
      // Wide solar system view
      { planetIdx: -1, duration: 8000, angle: 0, elevation: 0.4, distMult: 1, label: 'Solar System' },
      // Inner planets
      { planetIdx: 2, duration: 7000, angle: 0.3, elevation: 0.3, distMult: 1, label: 'Earth' },
      { planetIdx: 2, moonIdx: 0, duration: 5000, angle: -0.5, elevation: 0.2, distMult: 1.5, label: 'The Moon' },
      { planetIdx: 1, duration: 5000, angle: 1.2, elevation: 0.5, distMult: 1, label: 'Venus' },
      { planetIdx: 0, duration: 5000, angle: 2.0, elevation: 0.3, distMult: 1, label: 'Mercury' },
      { planetIdx: 3, duration: 5000, angle: -0.3, elevation: 0.4, distMult: 1, label: 'Mars' },
      // Gas giants
      { planetIdx: 4, duration: 7000, angle: 0.8, elevation: 0.3, distMult: 0.8, label: 'Jupiter' },
      { planetIdx: 4, moonIdx: 2, duration: 5000, angle: -0.4, elevation: 0.2, distMult: 1.2, label: 'Ganymede' },
      { planetIdx: 5, duration: 7000, angle: -0.6, elevation: 0.5, distMult: 0.7, label: 'Saturn' },
      { planetIdx: 5, moonIdx: 5, duration: 5000, angle: 0.9, elevation: 0.3, distMult: 1, label: 'Titan' },
      // Ice giants and outer
      { planetIdx: 6, duration: 5000, angle: 1.5, elevation: 0.4, distMult: 1, label: 'Uranus' },
      { planetIdx: 7, duration: 5000, angle: -1.0, elevation: 0.3, distMult: 1, label: 'Neptune' },
      { planetIdx: 7, moonIdx: 0, duration: 4000, angle: 0.5, elevation: 0.2, distMult: 1.3, label: 'Triton' },
      // Dwarf planets
      { planetIdx: 9, duration: 5000, angle: 0.2, elevation: 0.5, distMult: 1, label: 'Pluto' },
      // Pull back to wide view
      { planetIdx: -1, duration: 6000, angle: Math.PI, elevation: 0.6, distMult: 1, label: 'Solar System' },
    ];
    return shots;
  }, []);

  const cinematicIdx = useRef(0);
  const cinematicTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply a cinematic shot
  const applyCinematicShot = useCallback((idx: number) => {
    const shot = cinematicShots[idx % cinematicShots.length];
    if (shot.planetIdx === -1) {
      // Wide solar system view
      setSelPlanet(null);
      setSelMoonIdx(null);
      setFocusTarget(null);
      setCamIdx(1); // System view preset
      setNavStack(['Solar System']);
    } else {
      setSelPlanet(shot.planetIdx);
      setCamIdx(-1);
      const pos = positionsRef.current.get(shot.planetIdx);
      if (shot.moonIdx !== undefined) {
        const moons = getMoonsForPlanet(shot.planetIdx);
        if (shot.moonIdx < moons.length) {
          setSelMoonIdx(shot.moonIdx);
          setFocusTarget({ planetIdx: shot.planetIdx, pos: pos || [0, 0, 0], moonIdx: shot.moonIdx });
          setNavStack(['Solar System', ALL_BODIES[shot.planetIdx].name, moons[shot.moonIdx].name]);
        }
      } else {
        setSelMoonIdx(null);
        setFocusTarget({ planetIdx: shot.planetIdx, pos: pos || [0, 0, 0] });
        setNavStack(['Solar System', ALL_BODIES[shot.planetIdx].name]);
      }
    }
  }, [cinematicShots]);

  // Cinematic tour timer
  useEffect(() => {
    if (!cinematic) {
      if (cinematicTimer.current) clearTimeout(cinematicTimer.current);
      return;
    }

    // Start tour from shot 0
    cinematicIdx.current = 0;
    applyCinematicShot(0);

    const advance = () => {
      cinematicIdx.current = (cinematicIdx.current + 1) % cinematicShots.length;
      applyCinematicShot(cinematicIdx.current);
      cinematicTimer.current = setTimeout(advance, cinematicShots[cinematicIdx.current].duration);
    };

    cinematicTimer.current = setTimeout(advance, cinematicShots[0].duration);

    return () => {
      if (cinematicTimer.current) clearTimeout(cinematicTimer.current);
    };
  }, [cinematic, applyCinematicShot, cinematicShots]);

  const handlePositionsUpdate = useCallback((m: Map<number, [number, number, number]>) => {
    positionsRef.current = m;
  }, []);

  // Start focused on Earth (camera follows even on mobile, just no info card)
  const didInitFocus = useRef(false);
  useEffect(() => {
    if (didInitFocus.current) return;
    if (positionsRef.current.size > 0) return;
  }, []);
  useEffect(() => {
    if (didInitFocus.current) return;
    const pos = positionsRef.current.get(2);
    if (pos) {
      setFocusTarget({ planetIdx: 2, pos });
      didInitFocus.current = true;
    }
  });

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
    setCamIdx(idx);
    const preset = CAMS[idx];
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

      if (k === 'n') setShowNeo(p => !p);
      if (k === 'd') setShowDwarf(p => !p);
      if (k === 's') setShowStars(p => !p);
      if (k === 'c') setShowConstellations(p => !p);
      if (k === 'f') setCinematic(true);
      if (k === 'escape') {
        navigateBack();
        setSelNeo(null);
        setShowAbout(false);
      }
      if (k === ' ') { e.preventDefault(); setPlaying(p => !p); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [cinematic, navigateBack, handlePresetSelect]);

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
            neos={neos} selNeo={selNeo} setSelNeo={setSelNeo}
            selPlanet={selPlanet} setSelPlanet={handlePlanetSelect}
            focusTarget={focusTarget}
            onPositionsUpdate={handlePositionsUpdate}
            showDwarf={showDwarf}
            showStars={showStars}
            showConstellations={showConstellations}
            showAsteroidBelt={showAsteroidBelt}
            showMilkyWay={showMilkyWay}
            showDeepSpace={showDeepSpace}
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
        simTime={simTime} moon={moon}
        speed={speed} setSpeed={setSpeed}
        playing={playing} setPlaying={setPlaying}
        focusTarget={focusTarget} setFocusTarget={setFocusTarget}
        selPlanet={selPlanet} setSelPlanet={handlePlanetSelect}
        neos={neos} neoStatus={neoStatus} selNeo={selNeo} setSelNeo={setSelNeo}
        showNeo={showNeo} setShowNeo={setShowNeo}
        showDwarf={showDwarf} setShowDwarf={setShowDwarf}
        showStars={showStars} setShowStars={setShowStars}
        showConstellations={showConstellations} setShowConstellations={setShowConstellations}
        showAsteroidBelt={showAsteroidBelt} setShowAsteroidBelt={setShowAsteroidBelt}
        showMilkyWay={showMilkyWay} setShowMilkyWay={setShowMilkyWay}
        showDeepSpace={showDeepSpace} setShowDeepSpace={setShowDeepSpace}
        showAbout={showAbout} setShowAbout={setShowAbout}
        setSimTime={setSimTime}
        positionsRef={positionsRef}
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
