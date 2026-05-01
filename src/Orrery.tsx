/*
 * Orrery — Interactive 3D Solar System
 *
 * Main component: state management, effects, Canvas composition.
 * 3D scene in scene/, UI overlays in ui/.
 */

import { useEffect, useState, useRef, useMemo, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { ALL_BODIES, CAMS, camIndex } from './data/planets';
import { getMoonsForPlanet } from './data/moons';
import type { NEO, FocusTarget } from './lib/kepler';
import { julianDate, moonPhase } from './lib/kepler';
import { ThemeProvider, useTheme } from './lib/themes';
import type { CometDef } from './data/comets';
import type { MeteorShower } from './scene/Meteors';
import type { SatellitePosition } from './lib/satellites';
import type { Spacecraft } from './data/deepspace';
import Scene from './scene/Scene';
import Panels from './ui/Panels';
import LoadingScreen from './ui/LoadingScreen';
import { OBSERVATORY_MODE } from './lib/mode';

type CinematicStep = {
  camPreset?: number; focusPlanet?: number; focusMoon?: number;
  duration: number; label: string;
  desc?: string;
  stars?: boolean;
  constellations?: boolean;
  asterisms?: boolean;
  constellationFocus?: boolean;

  asteroidBelt?: boolean; dwarf?: boolean;
  deepSky?: boolean; deepSpace?: boolean;
  comets?: boolean; satellites?: boolean; meteors?: boolean;
  autoRotateSpeed?: number;
};

type NeoOrbit = NonNullable<NEO['orbit']>;

interface NeoApproachData {
  miss_distance?: {
    lunar?: string;
    astronomical?: string;
    kilometers?: string;
  };
  relative_velocity?: {
    kilometers_per_second?: string;
  };
  close_approach_date_full?: string;
  close_approach_date?: string;
}

interface NeoFeedEntry {
  id: string;
  name: string;
  estimated_diameter?: {
    meters?: {
      estimated_diameter_min?: number;
      estimated_diameter_max?: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data?: NeoApproachData[];
  nasa_jpl_url: string;
}

interface NeoFeedResponse {
  near_earth_objects?: Record<string, NeoFeedEntry[]>;
}

interface SbdbOrbitElement {
  label?: string;
  name?: string;
  value: string;
}

interface SbdbOrbitResponse {
  orbit?: {
    epoch?: string;
    elements?: SbdbOrbitElement[];
  };
}

const PENDING_NEO_ORBIT: NeoOrbit = {
  a: 0,
  e: 0,
  i: 0,
  om: 0,
  w: 0,
  ma: 0,
  epoch: 0,
  loaded: false,
};

function getTodayNeoCacheKey() {
  return `neo-${new Date().toISOString().split('T')[0]}`;
}

function readNeoCache(cacheKey: string): NEO[] | null {
  try {
    const cached = sessionStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) as NEO[] : null;
  } catch {
    return null;
  }
}

function fallbackOrbitForNeo(neo: NEO): NeoOrbit {
  return {
    a: 1.0 + neo.missAU * 0.5,
    e: 0.3,
    i: 5,
    om: 0,
    w: 0,
    ma: 0,
    epoch: 2451545,
    loaded: true,
  };
}

const CINEMATIC_DEFAULTS: Omit<CinematicStep, 'duration' | 'label'> = {
  stars: true, constellations: false, asterisms: false,
  constellationFocus: false, asteroidBelt: false, dwarf: false,
  deepSky: false, deepSpace: false, comets: false,
  satellites: false, meteors: false, autoRotateSpeed: 0.3,
};

function OrreryInner() {
  const { theme } = useTheme();
  const neoCacheKey = useMemo(() => getTodayNeoCacheKey(), []);
  const initialNeoCache = useMemo(() => readNeoCache(neoCacheKey), [neoCacheKey]);
  const [neos, setNeos] = useState<NEO[]>(() => initialNeoCache ?? []);
  const [neoStatus, setNeoStatus] = useState<'loading' | 'loaded' | 'error'>(() => initialNeoCache ? 'loaded' : 'loading');
  const [selNeo, setSelNeo] = useState<NEO | null>(null);
  // Cinematic mode is the default — start bare, reveal layers progressively.
  // Observatory mode skips the cinematic and anchors the camera at Earth's heliocentric position
  // with sky layers on (no Sun, no planets, no orbital bodies).
  const [selPlanet, setSelPlanet] = useState<number | null>(null);
  const [showNeo, setShowNeo] = useState(false);
  const [showDwarf, setShowDwarf] = useState(false);
  const [showStars, setShowStars] = useState(true);
  const [showConstellations, setShowConstellations] = useState(OBSERVATORY_MODE);
  const [showAsterisms, setShowAsterisms] = useState(OBSERVATORY_MODE);
  const [showAsteroidBelt, setShowAsteroidBelt] = useState(false);
  const [showComets, setShowComets] = useState(false);
  const [showMeteors, setShowMeteors] = useState(false);
  const [showSatellites, setShowSatellites] = useState(false);
  const [showDeepSky, setShowDeepSky] = useState(OBSERVATORY_MODE);
  const [showDeepSpace, setShowDeepSpace] = useState(OBSERVATORY_MODE);
  const [selSpacecraft, setSelSpacecraft] = useState<Spacecraft | null>(null);
  const [selConstellation, setSelConstellation] = useState<string | null>(null);
  const [selAsterism, setSelAsterism] = useState<string | null>(null);
  const [selDeepSky, setSelDeepSky] = useState<string | null>(null);
  const [selComet, setSelComet] = useState<CometDef | null>(null);
  const [selMeteor, setSelMeteor] = useState<MeteorShower | null>(null);
  const [selSatellite, setSelSatellite] = useState<SatellitePosition | null>(null);
  const [constellationFocus, setConstellationFocus] = useState(OBSERVATORY_MODE);
  const [speed, setSpeed] = useState(1);
  const [simTime, setSimTime] = useState(new Date());
  const [playing, setPlaying] = useState(true);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [canvasCreated, setCanvasCreated] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState<Record<string, boolean>>({
    stars: false,
    deepsky: false,
    asteroids: false,
    constellations: false,
    constellationLines: false,
    comets: false,
    meteors: false,
    satellites: false,
  });

  const completeLoadingTask = useCallback((id: string) => {
    setLoadingTasks(prev => {
      if (prev[id]) return prev;
      return { ...prev, [id]: true };
    });
  }, []);

  const loadingProgress = useMemo(() => {
    const values = Object.values(loadingTasks);
    const completed = values.filter(v => v).length;
    return (completed / values.length) * 100;
  }, [loadingTasks]);

  const sceneReady = useMemo(() => {
    return Object.values(loadingTasks).every(v => v) && canvasCreated;
  }, [loadingTasks, canvasCreated]);
  const [cinematic, setCinematic] = useState(!OBSERVATORY_MODE);
  const [navStack, setNavStack] = useState<string[]>(['Solar System']);
  const [selMoonIdx, setSelMoonIdx] = useState<number | null>(null);
  const [cameraDistance, setCameraDistance] = useState(50);
  const [camIdx, setCamIdx] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [cinematicRotateSpeed, setCinematicRotateSpeed] = useState(0.5);
  const positionsRef = useRef(new Map<number, [number, number, number]>());

  const jd = useMemo(() => julianDate(simTime), [simTime]);
  const T = useMemo(() => (jd - 2451545.0) / 36525, [jd]);
  const moon = useMemo(() => moonPhase(jd), [jd]);

  const camPreset = camIdx >= 0 && camIdx < CAMS.length ? CAMS[camIdx] : null;

  // ─── Cinematic: tight highlight reel through scale levels ────────────────────
  const cinematicSteps = useMemo((): CinematicStep[] => [
    { ...CINEMATIC_DEFAULTS, camPreset: 9, duration: 5000, label: 'Deep Space', deepSky: true, deepSpace: true, dwarf: true, autoRotateSpeed: 0.06 },
    { ...CINEMATIC_DEFAULTS, camPreset: 1, duration: 5000, label: 'Solar System', asteroidBelt: true, dwarf: true, autoRotateSpeed: 0.2 },
    { ...CINEMATIC_DEFAULTS, camPreset: 0, duration: 4000, label: 'Inner Planets', asteroidBelt: true, autoRotateSpeed: 0.3 },
    { ...CINEMATIC_DEFAULTS, focusPlanet: 2, duration: 5000, label: 'Earth', autoRotateSpeed: 0.5 },
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

  type ExitTarget =
    | { kind: 'planet'; idx: number; label: string }
    | { kind: 'preset'; label: string };

  // Leave cinematic and clear all selection state; default lands on Earth focus.
  const exitCinematic = useCallback((target: ExitTarget = { kind: 'planet', idx: 2, label: 'Earth' }) => {
    setCinematic(false);
    setShowStars(true);
    setShowDeepSky(true);
    setSelMoonIdx(null);
    setSelNeo(null);
    setSelComet(null);
    setSelMeteor(null);
    setSelSatellite(null);
    setSelConstellation(null);
    setSelSpacecraft(null);

    if (target.kind === 'planet') {
      const pos = positionsRef.current.get(target.idx);
      setSelPlanet(target.idx);
      setCamIdx(-1);
      setFocusTarget(pos ? { planetIdx: target.idx, pos } : null);
      setNavStack(['Solar System', target.label]);
    } else {
      setSelPlanet(null);
      setCamIdx(Math.max(0, camIndex(target.label)));
      setFocusTarget(null);
      setNavStack(['Solar System']);
    }
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
    if (step.asterisms !== undefined) setShowAsterisms(() => step.asterisms!);
    if (step.constellationFocus !== undefined) setConstellationFocus(() => step.constellationFocus!);
    if (step.asteroidBelt !== undefined) setShowAsteroidBelt(() => step.asteroidBelt!);
    if (step.dwarf !== undefined) setShowDwarf(() => step.dwarf!);
    if (step.deepSky !== undefined) setShowDeepSky(() => step.deepSky!);
    if (step.deepSpace !== undefined) setShowDeepSpace(() => step.deepSpace!);
    if (step.comets !== undefined) setShowComets(() => step.comets!);
    if (step.satellites !== undefined) setShowSatellites(() => step.satellites!);
    if (step.meteors !== undefined) setShowMeteors(() => step.meteors!);
    setCinematicRotateSpeed(step.autoRotateSpeed ?? 0.5);
  }, [cinematicSteps]);

  const startCinematicTour = useCallback(() => {
    cinematicIdx.current = 0;
    cinematicStart.current = Date.now();
    applyCinematicStep(0);
    setCinematic(true);
  }, [applyCinematicStep]);

  // Cinematic timer — poll-based to avoid fragile setTimeout chains
  useEffect(() => {
    if (!cinematic || !sceneReady) return;

    // Use setInterval to poll elapsed time — robust against React re-renders
    const id = setInterval(() => {
      const elapsed = Date.now() - cinematicStart.current;
      const dur = cinematicSteps[cinematicIdx.current].duration;
      if (elapsed >= dur) {
        const next = cinematicIdx.current + 1;
        if (next >= cinematicSteps.length) {
          // Tour complete — exit to interactive (Earth focus)
          exitCinematic();
        } else {
          cinematicIdx.current = next;
          cinematicStart.current = Date.now();
          applyCinematicStep(next);
        }
      }
    }, 500);

    return () => clearInterval(id);
  }, [cinematic, sceneReady, applyCinematicStep, cinematicSteps, exitCinematic]);

  // Observatory mode: anchor camera at Earth's position via the Earth Observer preset.
  // Fires once — `observatoryEntered` ref prevents re-entry on subsequent renders.
  const observatoryEntered = useRef(false);
  useEffect(() => {
    if (!OBSERVATORY_MODE || !sceneReady || observatoryEntered.current) return;
    observatoryEntered.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- entry-mode bootstrap, fires once
    exitCinematic({ kind: 'preset', label: 'Earth Observer' });
  }, [sceneReady, exitCinematic]);

  // Prefetch tour-essential datasets when cinematic starts
  useEffect(() => {
    if (!cinematic) return;
    const urls = [
      import.meta.env.BASE_URL + 'data/main-belt.json',
      import.meta.env.BASE_URL + 'data/mw.json',
      import.meta.env.BASE_URL + 'data/deepsky.json',
    ];
    urls.forEach(url => fetch(url).catch(() => {}));
  }, [cinematic]);

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
    if (initialNeoCache) return;

    const day = neoCacheKey.slice(4);
    let cancelled = false;

    fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${day}&end_date=${day}&api_key=DEMO_KEY`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: NeoFeedResponse) => {
        if (cancelled) return;
        const list: NEO[] = [];
        Object.values(data.near_earth_objects ?? {}).forEach((arr) => {
          arr.forEach((n) => {
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
              date: ca.close_approach_date_full || ca.close_approach_date || '',
              url: n.nasa_jpl_url,
            });
          });
        });
        list.sort((a, b) => a.missLunar - b.missLunar);
        setNeos(list);
        setNeoStatus('loaded');
        try { sessionStorage.setItem(neoCacheKey, JSON.stringify(list)); } catch { /* ignore */ }
      })
      .catch(() => {
        if (cancelled) return;
        setNeoStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [initialNeoCache, neoCacheKey]);

  const handleNeoSelect = useCallback((neo: NEO | null) => {
    if (neo === null) {
      setSelNeo(null);
      return;
    }

    if (neo.orbit === undefined) {
      const nextNeo = { ...neo, orbit: PENDING_NEO_ORBIT };
      setNeos(prev => prev.map(item => item.id === neo.id ? nextNeo : item));
      setSelNeo(nextNeo);
      return;
    }

    setSelNeo(neo);
  }, []);

  // Fetch asteroid orbital elements from NASA SBDB on NEO selection
  useEffect(() => {
    if (!selNeo) return;
    if (!selNeo.orbit || selNeo.orbit.loaded) return;

    let cancelled = false;

    fetch(`https://ssd-api.jpl.nasa.gov/sbdb.api?spk=${selNeo.id}&phys-par=false&close-approach=false`)
      .then(r => r.json())
      .then((data: SbdbOrbitResponse) => {
        if (cancelled) return;
        const elems = data?.orbit?.elements;
        if (!elems) {
          throw new Error('missing orbital elements');
        }
        const get = (label: string) => {
          const el = elems.find((entry) => entry.label === label || entry.name === label);
          return el ? parseFloat(el.value) : 0;
        };
        const orbit: NeoOrbit = {
          a: get('a'), e: get('e'), i: get('i'), om: get('om'), w: get('w'),
          ma: get('ma'),
          epoch: parseFloat(data?.orbit?.epoch || '0'),
          loaded: true,
        };
        setNeos(prev => prev.map(n => n.id === selNeo.id ? { ...n, orbit } : n));
        setSelNeo(prev => prev?.id === selNeo.id ? { ...prev, orbit } : prev);
      })
      .catch(() => {
        if (cancelled) return;
        const orbit = fallbackOrbitForNeo(selNeo);
        setNeos(prev => prev.map(n => n.id === selNeo.id ? { ...n, orbit } : n));
        setSelNeo(prev => prev?.id === selNeo.id ? { ...prev, orbit } : prev);
      });

    return () => {
      cancelled = true;
    };
  }, [selNeo]);

  // Navigate back one level
  const navigateBack = useCallback(() => {
    if (cinematic) {
      exitCinematic();
      return;
    }
    if (navStack.length <= 1) return;

    if (selMoonIdx !== null) {
      setSelMoonIdx(null);
      setFocusTarget(prev => prev ? { planetIdx: prev.planetIdx, pos: prev.pos } : null);
      setNavStack(prev => prev.slice(0, -1));
    } else if (selPlanet !== null) {
      // Go back to the zoom level that contains this planet's orbit
      const planet = ALL_BODIES[selPlanet];
      const a = planet.a;
      let camTarget = 0; // Inner (default for Mercury–Mars)
      if (a > 5) camTarget = 1; // System (Jupiter–Saturn)
      if (a > 20) camTarget = 4; // Outer (Uranus+)
      if (a > 40) camTarget = 5; // Kuiper (Pluto+)
      setSelPlanet(null);
      setFocusTarget(null);
      setSelMoonIdx(null);
      setCamIdx(camTarget);
      setNavStack(['Solar System']);
    }
  }, [cinematic, navStack, selMoonIdx, selPlanet, exitCinematic]);

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

    if (idx !== null) {
      setSelPlanet(idx);
      setSelMoonIdx(null);
      setCamIdx(-1);
      const pos = positionsRef.current.get(idx);
      if (pos) setFocusTarget({ planetIdx: idx, pos });
      setNavStack(['Solar System', ALL_BODIES[idx].name]);
    } else {
      // Deselecting — zoom back to appropriate level for the current planet
      const prev = selPlanet;
      let camTarget = 0; // Inner
      if (prev !== null) {
        const a = ALL_BODIES[prev].a;
        if (a > 5) camTarget = 1;
        if (a > 20) camTarget = 4;
        if (a > 40) camTarget = 5;
      }
      setSelPlanet(null);
      setFocusTarget(null);
      setSelMoonIdx(null);
      setCamIdx(camTarget);
      setNavStack(['Solar System']);
    }
  }, [cinematic, selPlanet]);

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
    // Stargazer preset: enable stars, constellations, deep sky in focus mode
    if (preset.label === 'Stargazer') {
      setShowStars(true);
      setShowConstellations(true);
      setConstellationFocus(true);
      setShowDeepSky(true);
    }
    // Deep-space presets: auto-enable required layers
    if (preset.label === 'Oort') {
      setShowDeepSpace(true);
      setShowDeepSky(true);
      setShowDwarf(true);
    }
    if (preset.label === 'Kuiper') {
      setShowDwarf(true);
      setShowDeepSky(true);
    }
    if (preset.label === 'Outer') {
      setShowDwarf(true);
    }
    if (preset.label === 'Belt') {
      setShowAsteroidBelt(true);
    }
    if (preset.label === 'Stellar') {
      setShowDeepSpace(true);
      setShowDeepSky(true);
      setShowDwarf(true);
      setShowStars(true);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const k = e.key.toLowerCase();
      const isPresetKey = (e.key >= '1' && e.key <= '9') || e.key === '0' || e.key === '-' || e.key === '=';
      const isInteractiveShortcut = isPresetKey || ['m', 'n', 'd', 's', 'l', 'a', 'g', 'k', 'c', 'r', 'i', 'o', 'escape', ' '].includes(k);

      if (k === 'f') {
        startCinematicTour();
        return;
      }

      if (cinematic) {
        exitCinematic();
        if (!isInteractiveShortcut || k === 'escape') {
          return;
        }
      }

      // Camera presets: 1-9 map to indices 0-8, 0 maps to index 9
      if (e.key >= '1' && e.key <= '9') {
        handlePresetSelect(parseInt(e.key) - 1);
        return;
      }
      if (e.key === '0') {
        handlePresetSelect(9);
        return;
      }
      if (e.key === '-') {
        handlePresetSelect(10);
        return;
      }
      if (e.key === '=') {
        handlePresetSelect(11);
        return;
      }

      if (k === 'm') { setPanelOpen(p => !p); return; }
      if (k === 'n') setShowNeo(p => !p);
      if (k === 'd') setShowDwarf(p => !p);
      if (k === 's') setShowStars(p => !p);
      if (k === 'l') setShowConstellations(p => !p);
      if (k === 'a') setShowAsterisms(p => !p);
      if (k === 'g') setConstellationFocus(p => !p);
      if (k === 'k') setShowDeepSky(p => !p);
      if (k === 'c') setShowComets(p => !p);
      if (k === 'r') setShowMeteors(p => !p);
      if (k === 'i') setShowSatellites(p => !p);
      if (k === 'o') setShowDeepSpace(p => !p);
      if (k === 'escape') {
        if (panelOpen) { setPanelOpen(false); return; }
        if (OBSERVATORY_MODE) {
          setSelConstellation(null);
          setSelAsterism(null);
          setSelDeepSky(null);
          return;
        }
        navigateBack();
        setSelNeo(null);
        setSelComet(null);
        setSelMeteor(null);
        setSelSatellite(null);
      }
      if (k === ' ') { e.preventDefault(); setPlaying(p => !p); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [cinematic, panelOpen, navigateBack, handlePresetSelect, exitCinematic, startCinematicTour]);

  // Exit cinematic mode on click
  const handleCinematicClick = useCallback(() => {
    if (cinematic) exitCinematic();
  }, [cinematic, exitCinematic]);

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
        dpr={[1, 1.5]}
        camera={{
          position: OBSERVATORY_MODE ? [1, 0.001, 0] : [0, 3, 4],
          fov: 55,
          near: 0.005,
          far: 250000,
        }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true, logarithmicDepthBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        onCreated={() => {
          setCanvasCreated(true);
          if (cinematic) startCinematicTour();
        }}
        onPointerMissed={OBSERVATORY_MODE ? () => {
          setSelConstellation(null);
          setSelAsterism(null);
          setSelDeepSky(null);
        } : undefined}
      >
        <Suspense fallback={null}>
          <Scene
            jd={jd} T={T} simTime={simTime}
            onLoadComplete={completeLoadingTask}
            neos={showNeo ? neos : []} selNeo={selNeo} setSelNeo={handleNeoSelect}
            selPlanet={selPlanet} setSelPlanet={handlePlanetSelect}
            focusTarget={focusTarget}
            onPositionsUpdate={handlePositionsUpdate}
            showDwarf={showDwarf}
            showStars={showStars}
            showConstellations={showConstellations}
            showAsterisms={showAsterisms}
            showAsteroidBelt={showAsteroidBelt}
            showComets={showComets}
            showMeteors={showMeteors}
            showSatellites={showSatellites}
            showDeepSky={showDeepSky}
            showDeepSpace={showDeepSpace}
            onConstellationSelect={(id) => { setSelConstellation(prev => prev === id ? null : id); }}
            onAsterismSelect={(name) => { setSelAsterism(prev => prev === name ? null : name); }}
            onDeepSkySelect={(id) => { setSelDeepSky(prev => prev === id ? null : id); }}
            selConstellationId={selConstellation}
            accentColor={theme.uiAccent}
            constellationFocus={constellationFocus}
            cinematic={cinematic}
            cinematicRotateSpeed={cinematicRotateSpeed}
            onMoonSelect={handleMoonSelect}
            selMoonIdx={selMoonIdx}
            onCameraDistance={setCameraDistance}
            cameraDistance={cameraDistance}
            camPreset={camPreset}
            showBodyGlyphs={camPreset?.label === 'Stargazer'}
            selComet={selComet} setSelComet={setSelComet}
            selMeteor={selMeteor} setSelMeteor={setSelMeteor}
            selSatellite={selSatellite} setSelSatellite={setSelSatellite}
            selSpacecraft={selSpacecraft} setSelSpacecraft={setSelSpacecraft}
          />
        </Suspense>
      </Canvas>

      <LoadingScreen ready={sceneReady} progress={loadingProgress} />

      <Panels
        simTime={simTime} moon={moon} solarWind={solarWind}
        speed={speed} setSpeed={setSpeed}
        playing={playing} setPlaying={setPlaying}
        selPlanet={selPlanet} setSelPlanet={handlePlanetSelect}
        neos={neos} neoStatus={neoStatus} selNeo={selNeo} setSelNeo={handleNeoSelect}
        showNeo={showNeo} setShowNeo={setShowNeo}
        showDwarf={showDwarf} setShowDwarf={setShowDwarf}
        showStars={showStars} setShowStars={setShowStars}
        showConstellations={showConstellations} setShowConstellations={setShowConstellations}
        showAsterisms={showAsterisms} setShowAsterisms={setShowAsterisms}
        showAsteroidBelt={showAsteroidBelt} setShowAsteroidBelt={setShowAsteroidBelt}
        showComets={showComets} setShowComets={setShowComets}
        showMeteors={showMeteors} setShowMeteors={setShowMeteors}
        showSatellites={showSatellites} setShowSatellites={setShowSatellites}
        showDeepSky={showDeepSky} setShowDeepSky={setShowDeepSky}
        showDeepSpace={showDeepSpace} setShowDeepSpace={setShowDeepSpace}
        selConstellation={selConstellation} setSelConstellation={setSelConstellation}
        selAsterism={selAsterism} setSelAsterism={setSelAsterism}
        selDeepSky={selDeepSky} setSelDeepSky={setSelDeepSky}
        constellationFocus={constellationFocus} setConstellationFocus={setConstellationFocus}
        panelOpen={panelOpen}
        setPanelOpen={setPanelOpen}
        cinematic={cinematic}
        navStack={navStack}
        navigateBack={navigateBack}
        navigateToLevel={navigateToLevel}
        selMoonIdx={selMoonIdx}
        cameraDistance={cameraDistance}
        cams={CAMS}
        camIdx={camIdx}
        onPresetSelect={handlePresetSelect}
        onMoonSelect={handleMoonSelect}
        selComet={selComet} setSelComet={setSelComet}
        selMeteor={selMeteor} setSelMeteor={setSelMeteor}
        selSatellite={selSatellite} setSelSatellite={setSelSatellite}
        selSpacecraft={selSpacecraft} setSelSpacecraft={setSelSpacecraft}
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
