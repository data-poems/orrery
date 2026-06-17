/*
 * Orrery — Interactive 3D Solar System
 *
 * Main component: state management, effects, Canvas composition.
 * 3D scene in scene/, UI overlays in ui/.
 * Cinematic tour: constellations stay hidden through the Deep Space → Solar System →
 * Inner Planets sweep and only appear when the camera lands on Earth, alongside the
 * Sky-mode hint and a Sky-toggle pulse.
 */

import { useEffect, useState, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { ALL_BODIES, CAMS, CAM_PRESET_LAYER_EFFECTS, camIndex } from './data/planets';
import { getMoonsForPlanet } from './data/moons';
import type { NEO, FocusTarget } from './lib/kepler';
import { julianDate, moonPhase } from './lib/kepler';
import { ThemeProvider, useTheme } from './lib/themes';
import type { CometDef } from './data/comets';
import type { MeteorShower } from './scene/Meteors';
import type { SatellitePosition } from './lib/satellites';
import type { Spacecraft, NearStar, GalaxyMarker } from './data/deepspace';
import { CONSTELLATION_NAMES } from './data/mythology';
import { getConstellationCentroid, getConstellationCentroidCached, prefetchConstellationCentroids } from './lib/constellationCentroids';
import Scene from './scene/Scene';
import Panels from './ui/Panels';
import SidePanel from './ui/SidePanel';
import BottomCluster from './ui/BottomCluster';
import LoadingScreen from './ui/LoadingScreen';
import OrreryDiagOverlay from './ui/OrreryDiagOverlay';
import { neoFeedUrlForDay } from './lib/neoFeed';
import { OBSERVATORY_MODE } from './lib/mode';
import { IS_ANDROID } from './lib/platform';
import { PREFERS_REDUCED_MOTION } from './lib/motion';
import { useImmersiveVrSupported } from './lib/xr';
import type { XRStore } from './scene/XRProvider';
// @react-three/xr lives only in this lazily-loaded module, mounted only when a
// headset is detected — so non-XR users never download the XR runtime.
const XRProvider = lazy(() => import('./scene/XRProvider'));

/** Scale ladder for the zoom tiles / +- stepping (innermost → outermost). */
const ZOOM_LADDER = ['Sun', 'Inner', 'System', 'Outer', 'Kuiper', 'Oort', 'Stellar'] as const;

/** Nearest ladder rung for a camera distance (log-distance match). 0 = Sun
 *  (innermost), ZOOM_LADDER.length-1 = Stellar (outermost). Shared by the zoom
 *  action and the bottom-cluster grey-out so they always agree. */
function zoomRungFor(cameraDistance: number): number {
  let cur = 0, best = Infinity;
  for (let i = 0; i < ZOOM_LADDER.length; i++) {
    const ci = camIndex(ZOOM_LADDER[i]);
    if (ci < 0) continue;
    const [x, y, z] = CAMS[ci].pos;
    const d = Math.sqrt(x * x + y * y + z * z);
    const diff = Math.abs(Math.log10(d) - Math.log10(Math.max(0.01, cameraDistance)));
    if (diff < best) { best = diff; cur = i; }
  }
  return cur;
}

/** Curated iconic constellations used by the random-tour dice. The full IAU
 *  list is 88 entries — picking uniformly across that bag drowned every other
 *  category at ~60% of rolls. Kept short and recognizable so the dice still
 *  surfaces variety from spacecraft / DSO / planets / presets / moons. */
const FAMOUS_CONSTELLATIONS: ReadonlyArray<string> = [
  'Ori', // Orion
  'UMa', // Ursa Major
  'Cas', // Cassiopeia
  'Cyg', // Cygnus
  'Leo', // Leo
  'Sco', // Scorpius
  'Tau', // Taurus
  'Cru', // Crux (Southern Cross)
];

type CinematicStep = {
  /** Preferred — resolves via `camIndex(label)` instead of fragile array index. */
  presetLabel?: string;
  camPreset?: number;
  focusPlanet?: number; focusMoon?: number;
  duration: number; label: string;
  desc?: string;
  stars?: boolean;
  constellations?: boolean;
  asterisms?: boolean;
  constellationFocus?: boolean;

  asteroidBelt?: boolean; dwarf?: boolean;
  deepSpace?: boolean;
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
    synthetic: true,
  };
}

const CINEMATIC_DEFAULTS: Omit<CinematicStep, 'duration' | 'label'> = {
  stars: true, constellations: false, asterisms: false,
  constellationFocus: false, asteroidBelt: false, dwarf: false,
  deepSpace: false, comets: false,
  satellites: false, meteors: false, autoRotateSpeed: 0.3,
};

function OrreryInner() {
  const { theme } = useTheme();
  // Only true in a real WebXR browser on a headset (Vision Pro Safari, Quest);
  // always false on phone/desktop/iOS shell, so the entry point stays hidden.
  const vrSupported = useImmersiveVrSupported();
  // Filled by the lazy XRProvider once it mounts (headset only); the Enter VR
  // button reads it to start a session. xrReady gates the button so it can't
  // be clicked before the lazy chunk has loaded and handed the store back.
  const xrStoreRef = useRef<XRStore | null>(null);
  const [xrReady, setXrReady] = useState(false);
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
  // Asterisms span constellation boundaries (e.g. Diamond of Virgo cuts through 4 constellations);
  // off-by-default in observatory so the sky reads cleanly. Toggle with 'a' (Panels UI is hidden in observatory).
  const [showAsterisms, setShowAsterisms] = useState(false);
  const [showAsteroidBelt, setShowAsteroidBelt] = useState(false);
  const [showComets, setShowComets] = useState(false);
  const [showMeteors, setShowMeteors] = useState(false);
  const [showSatellites, setShowSatellites] = useState(false);
  const [showDeepSpace, setShowDeepSpace] = useState(OBSERVATORY_MODE);
  const [selSun, setSelSun] = useState(false);
  const [aimAtSphere, setAimAtSphere] = useState<[number, number, number] | null>(null);
  // Tracks the most recent dice-roll target key. Used to gate async constellation
  // centroid resolves so a stale Promise can't clobber a newer roll, and to invalidate
  // pending aim resolves whenever the cinematic enters/exits or the user picks a
  // non-constellation destination explicitly.
  const lastTourPickRef = useRef<string | null>(null);
  const [selSpacecraft, setSelSpacecraft] = useState<Spacecraft | null>(null);
  const [selNearStar, setSelNearStar] = useState<NearStar | null>(null);
  const [selGalaxy, setSelGalaxy] = useState<GalaxyMarker | null>(null);
  const [selConstellation, setSelConstellation] = useState<string | null>(null);
  const [selAsterism, setSelAsterism] = useState<string | null>(null);
  const [selComet, setSelComet] = useState<CometDef | null>(null);
  const [selMeteor, setSelMeteor] = useState<MeteorShower | null>(null);
  const [selSatellite, setSelSatellite] = useState<SatellitePosition | null>(null);
  const [constellationFocus, setConstellationFocus] = useState(OBSERVATORY_MODE);
  const [speed, setSpeed] = useState(1);
  const [simTime, setSimTime] = useState(new Date());
  const [playing, setPlaying] = useState(true);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [canvasCreated, setCanvasCreated] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const lastCanvasRemountRef = useRef(-Infinity);
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tabHiddenRef = useRef(false);
  const [loadingTasks, setLoadingTasks] = useState<Record<string, boolean>>({
    stars: false,
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
  // Don't auto-play the sweeping tour for users who asked for reduced motion;
  // they land directly in the interactive view. They can still start it manually.
  const [cinematic, setCinematic] = useState(!OBSERVATORY_MODE && !PREFERS_REDUCED_MOTION);
  const [navStack, setNavStack] = useState<string[]>(['Solar System']);
  const [selMoonIdx, setSelMoonIdx] = useState<number | null>(null);
  const [cameraDistance, setCameraDistance] = useState(50);
  const [camIdx, setCamIdx] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  // Idle-fade: the summon hub is invisible at rest and wakes on interaction.
  const [hudActive, setHudActive] = useState(true);
  const hudActiveRef = useRef(true);
  const hudTimerRef = useRef<number | undefined>(undefined);
  const [cinematicRotateSpeed, setCinematicRotateSpeed] = useState(0.5);
  const [showSkyModeHint, setShowSkyModeHint] = useState(false);
  const [pulseSkyToggle, setPulseSkyToggle] = useState(false);
  const [constellationRevealTick, setConstellationRevealTick] = useState(0);
  const positionsRef = useRef(new Map<number, [number, number, number]>());
  const skyCueTimeoutsRef = useRef<number[]>([]);

  const clearSkyCueTimeouts = useCallback(() => {
    skyCueTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    skyCueTimeoutsRef.current = [];
  }, []);

  useEffect(() => () => {
    clearSkyCueTimeouts();
  }, [clearSkyCueTimeouts]);

  const jd = useMemo(() => julianDate(simTime), [simTime]);
  const T = useMemo(() => (jd - 2451545.0) / 36525, [jd]);
  const moon = useMemo(() => moonPhase(jd), [jd]);

  const camPreset = camIdx >= 0 && camIdx < CAMS.length ? CAMS[camIdx] : null;

  // ─── Cinematic: tight highlight reel through scale levels ────────────────────
  const cinematicSteps = useMemo((): CinematicStep[] => [
    { ...CINEMATIC_DEFAULTS, presetLabel: 'Oort', duration: 2000, label: 'Deep Space', deepSpace: true, dwarf: true, autoRotateSpeed: 0.14 },
    { ...CINEMATIC_DEFAULTS, presetLabel: 'System', duration: 5000, label: 'Solar System', asteroidBelt: true, dwarf: true, autoRotateSpeed: 0.2 },
    // Constellations stay off through Inner Planets — they're saved as the
    // climactic reveal when the camera lands on Earth (see exitCinematic).
    { ...CINEMATIC_DEFAULTS, presetLabel: 'Inner', duration: 4000, label: 'Inner Planets', asteroidBelt: true, autoRotateSpeed: 0.3 },
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
    setPanelOpen(false);
    // Invalidate any pending dice-roll aim resolve so a Promise that resolves
    // after cinematic exit can't pull the camera to a stale constellation.
    lastTourPickRef.current = null;
    setAimAtSphere(null);

    const earthPlanetExit = target.kind === 'planet' && target.idx === 2;
    if (earthPlanetExit) {
      setConstellationRevealTick((prev) => prev + 1);
      setConstellationFocus(true);
      setShowConstellations(true);
      clearSkyCueTimeouts();
      setShowSkyModeHint(true);
      const hintId = window.setTimeout(() => setShowSkyModeHint(false), 2200);
      skyCueTimeoutsRef.current.push(hintId);
      // Short grace so the constellation reveal animation reads before the
      // Sky-toggle starts pulsing.
      const pulseOnId = window.setTimeout(() => {
        setPulseSkyToggle(true);
        const pulseOffId = window.setTimeout(() => setPulseSkyToggle(false), 5200);
        skyCueTimeoutsRef.current.push(pulseOffId);
      }, 200);
      skyCueTimeoutsRef.current.push(pulseOnId);
    }

    setCinematic(false);
    setShowStars(true);
    setSelMoonIdx(null);
    setSelNeo(null);
    setSelComet(null);
    setSelMeteor(null);
    setSelSatellite(null);
    setSelConstellation(null);
    setSelSun(false);
    setSelSpacecraft(null);
    setSelNearStar(null);
    setSelGalaxy(null);

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

  }, [clearSkyCueTimeouts, setPanelOpen]);

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
      if (step.presetLabel !== undefined) {
        const idx = camIndex(step.presetLabel);
        if (idx >= 0) setCamIdx(idx);
      } else if (step.camPreset !== undefined) {
        setCamIdx(step.camPreset);
      }
    }

    if (step.stars !== undefined) setShowStars(() => step.stars!);
    if (step.constellations !== undefined) setShowConstellations(() => step.constellations!);
    if (step.asterisms !== undefined) setShowAsterisms(() => step.asterisms!);
    if (step.constellationFocus !== undefined) setConstellationFocus(() => step.constellationFocus!);
    if (step.asteroidBelt !== undefined) setShowAsteroidBelt(() => step.asteroidBelt!);
    if (step.dwarf !== undefined) setShowDwarf(() => step.dwarf!);
    if (step.deepSpace !== undefined) setShowDeepSpace(() => step.deepSpace!);
    if (step.comets !== undefined) setShowComets(() => step.comets!);
    if (step.satellites !== undefined) setShowSatellites(() => step.satellites!);
    if (step.meteors !== undefined) setShowMeteors(() => step.meteors!);
    setCinematicRotateSpeed(step.autoRotateSpeed ?? 0.5);

  }, [cinematicSteps]);

  const startCinematicTour = useCallback(() => {
    cinematicIdx.current = 0;
    cinematicStart.current = Date.now();
    setPanelOpen(false);
    // Invalidate pending dice aim BEFORE clearing aimAtSphere so a slow Promise
    // resolve gated by `lastTourPickRef.current === aimTicket` can't re-set it.
    lastTourPickRef.current = null;
    setAimAtSphere(null);
    applyCinematicStep(0);
    setCinematic(true);
  }, [applyCinematicStep, setPanelOpen]);

  // Cinematic timer — poll-based; pauses while tab is hidden
  const cinematicHiddenAt = useRef<number | null>(null);
  useEffect(() => {
    if (!cinematic || !sceneReady) return;

    const id = setInterval(() => {
      if (tabHiddenRef.current) return;
      const elapsed = Date.now() - cinematicStart.current;
      const dur = cinematicSteps[cinematicIdx.current].duration;
      if (elapsed >= dur) {
        const next = cinematicIdx.current + 1;
        if (next >= cinematicSteps.length) {
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

  useEffect(() => {
    const onVisibility = () => {
      const hidden = document.visibilityState === 'hidden';
      tabHiddenRef.current = hidden;
      if (hidden) {
        cinematicHiddenAt.current = Date.now();
        return;
      }
      if (cinematicHiddenAt.current !== null && cinematic) {
        const pauseMs = Date.now() - cinematicHiddenAt.current;
        cinematicStart.current += pauseMs;
        cinematicHiddenAt.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [cinematic]);

  // Observatory mode: anchor camera at Earth's position via the Earth Observer preset.
  // Fires once — `observatoryEntered` ref prevents re-entry on subsequent renders.
  const observatoryEntered = useRef(false);
  useEffect(() => {
    if (!OBSERVATORY_MODE || !sceneReady || observatoryEntered.current) return;
    observatoryEntered.current = true;
    // One-time observatory entry, guarded by the ref above — not a cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    exitCinematic({ kind: 'preset', label: 'Earth Observer' });
  }, [sceneReady, exitCinematic]);

  // Prefetch tour-essential datasets when cinematic starts
  useEffect(() => {
    if (!cinematic) return;
    const urls = [
      import.meta.env.BASE_URL + 'data/main-belt.json',
    ];
    urls.forEach(url => fetch(url).catch(() => {}));
  }, [cinematic]);

  const handlePositionsUpdate = useCallback((m: Map<number, [number, number, number]>) => {
    positionsRef.current = m;
  }, []);

  // Time tick (~60fps) — skipped while tab is hidden
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      if (tabHiddenRef.current) return;
      setSimTime(p => new Date(p.getTime() + speed * 16));
    }, 16);
    return () => clearInterval(id);
  }, [playing, speed]);

  // Fetch today's near-Earth objects from NASA NeoWs (with sessionStorage caching)
  useEffect(() => {
    if (initialNeoCache) return;

    const day = neoCacheKey.slice(4);
    let cancelled = false;

    fetch(neoFeedUrlForDay(day))
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
    } else if (selSun) {
      setSelSun(false);
      setSelPlanet(null);
      setFocusTarget(null);
      setNavStack(['Solar System']);
      setCamIdx(1);
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
  }, [cinematic, navStack, selMoonIdx, selPlanet, selSun, exitCinematic]);

  // Navigate to a specific breadcrumb level
  const navigateToLevel = useCallback((level: number) => {
    if (level === 0) {
      setSelSun(false);
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
      setSelSun(false);
      setSelSpacecraft(null);
      setSelNearStar(null);
      setSelGalaxy(null);
      setSelConstellation(null);
      setAimAtSphere(null);
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
      setSelSun(false);
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

    setSelSun(false);
    setSelSpacecraft(null);
    setSelNearStar(null);
    setSelGalaxy(null);
    setSelConstellation(null);
    setAimAtSphere(null);
    setSelPlanet(planetIdx);
    setSelMoonIdx(moonIdx);
    setCamIdx(-1);
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
    setSelSun(preset.label === 'Sun');
    setSelSpacecraft(null);
    setSelNearStar(null);
    setSelGalaxy(null);
    setSelMoonIdx(null);
    setSelConstellation(null);
    setAimAtSphere(null);
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
    if (preset.autoRotate && preset.follow !== undefined) {
      setShowStars(true);
      setShowConstellations(true);
    }
    const fx = CAM_PRESET_LAYER_EFFECTS[preset.label];
    if (fx?.stars !== undefined) setShowStars(fx.stars);
    if (fx?.constellations !== undefined) setShowConstellations(fx.constellations);
    if (fx?.deepSpace !== undefined) setShowDeepSpace(fx.deepSpace);
    if (fx?.dwarf !== undefined) setShowDwarf(fx.dwarf);
    if (fx?.asteroidBelt !== undefined) setShowAsteroidBelt(fx.asteroidBelt);
    if (fx?.constellationFocus !== undefined) setConstellationFocus(fx.constellationFocus);
  }, []);

  const jumpToPreset = useCallback((label: string) => {
    const idx = camIndex(label);
    if (idx >= 0) handlePresetSelect(idx);
  }, [handlePresetSelect]);

  const handleSunSelect = useCallback(() => {
    if (cinematic) return;
    setSelSun(true);
    setSelMoonIdx(null);
    setSelPlanet(null);
    setFocusTarget(null);
    setNavStack(['Solar System', 'Sun']);
    jumpToPreset('Sun');
  }, [cinematic, jumpToPreset]);

  // Pre-load constellation centroids so the random-jump aiming has zero latency.
  useEffect(() => {
    prefetchConstellationCentroids();
  }, []);

  const triggerRandomJump = useCallback(() => {
    if (cinematic) return;

    const planetIndices = [0, 1, 2, 3, 4, 5, 6, 7];
    const moonTargets = planetIndices.flatMap((planetIdx) => {
      const moons = getMoonsForPlanet(planetIdx);
      if (moons.length === 0) return [];
      return [{ kind: 'moon' as const, planetIdx, moonIdx: Math.floor(Math.random() * moons.length) }];
    });
    const constellationKeys = FAMOUS_CONSTELLATIONS;

    // Dwarf planet indices: ALL_BODIES = [...PLANETS (0-7), ...DWARF_PLANETS (8-10)].
    const dwarfIndices: number[] = [];
    for (let i = 8; i < ALL_BODIES.length; i++) dwarfIndices.push(i);

    // Tour pool excludes spacecraft / near-stars / galaxies / deep-sky objects:
    // their rendering scheme (camera-pinned celestial sphere or fixed beyond
    // any preset's reach) means a "fly to" arrival lands the camera in empty
    // space. They remain selectable via direct click, just not via dice.
    // Tracked as the future Stellar Neighborhood mode.
    type Target =
      | { kind: 'preset'; label: string; key: string }
      | { kind: 'planet'; planetIdx: number; key: string }
      | { kind: 'moon'; planetIdx: number; moonIdx: number; key: string }
      | { kind: 'constellation'; id: string; key: string };

    const destinations: Target[] = [
      { kind: 'preset', label: 'Sun', key: 'preset:Sun' },
      { kind: 'preset', label: 'Inner', key: 'preset:Inner' },
      { kind: 'preset', label: 'System', key: 'preset:System' },
      { kind: 'preset', label: 'Outer', key: 'preset:Outer' },
      { kind: 'preset', label: 'Kuiper', key: 'preset:Kuiper' },
      { kind: 'preset', label: 'Oort', key: 'preset:Oort' },
      ...planetIndices.map<Target>((planetIdx) => ({ kind: 'planet', planetIdx, key: `planet:${planetIdx}` })),
      ...dwarfIndices.map<Target>((planetIdx) => ({ kind: 'planet', planetIdx, key: `planet:${planetIdx}` })),
      ...moonTargets.map<Target>((m) => ({ ...m, key: `moon:${m.planetIdx}:${m.moonIdx}` })),
      ...constellationKeys.map<Target>((id) => ({ kind: 'constellation', id, key: `constellation:${id}` })),
    ];

    let target = destinations[Math.floor(Math.random() * destinations.length)];
    for (let i = 0; i < 3 && target.key === lastTourPickRef.current; i++) {
      target = destinations[Math.floor(Math.random() * destinations.length)];
    }
    if (!target) return;
    lastTourPickRef.current = target.key;

    const clearObjectSelections = () => {
      setSelSpacecraft(null);
      setSelNearStar(null);
      setSelGalaxy(null);
      setSelConstellation(null);
    };

    const enableSkyTourLayers = () => {
      setShowStars(true);
      setShowConstellations(true);
      setConstellationFocus(true);
      setCamIdx(-1);
      setSelPlanet(null);
      setFocusTarget(null);
    };

    // Constellations belong to sky destinations only. Without this, one
    // constellation roll left them (and focus-mode brightness) on for every
    // later planet/preset/moon roll — the "chaotic" accumulation.
    const disableSkyTourLayers = () => {
      setShowConstellations(false);
      setConstellationFocus(false);
      setSelConstellation(null);
      setSelAsterism(null);
    };

    switch (target.kind) {
      case 'preset':
        clearObjectSelections();
        disableSkyTourLayers();
        setAimAtSphere(null);
        if (target.label === 'Sun') {
          handleSunSelect();
        } else {
          jumpToPreset(target.label);
        }
        return;
      case 'planet':
        clearObjectSelections();
        disableSkyTourLayers();
        setAimAtSphere(null);
        // Dwarf planets are filtered out of `visibleBodies` unless `showDwarf`
        // is enabled; without this, focusing Eris/Pluto/Ceres lands the camera
        // on coordinates where no body is rendered.
        if (target.planetIdx >= 8) setShowDwarf(true);
        handlePlanetSelect(target.planetIdx);
        return;
      case 'moon':
        clearObjectSelections();
        disableSkyTourLayers();
        setAimAtSphere(null);
        handleMoonSelect(target.planetIdx, target.moonIdx);
        return;
      case 'constellation': {
        setSelSun(false);
        setSelMoonIdx(null);
        clearObjectSelections();
        enableSkyTourLayers();
        setSelConstellation(target.id);
        setNavStack(['Solar System', CONSTELLATION_NAMES[target.id] ?? target.id]);
        // Sync cache is warmed by `prefetchConstellationCentroids` on mount
        // (Orrery.tsx:735), so the dice path usually hits it. Setting aim in
        // the same React batch as the layer toggles avoids a one-frame flash
        // where CamCtrl sees focusTarget/camPreset/aimAtSphere all null and
        // snaps the camera target to origin before the async resolve.
        const cached = getConstellationCentroidCached(target.id);
        if (cached) {
          setAimAtSphere([cached[0], cached[1], cached[2]]);
          return;
        }
        // Cache miss (first dice roll before prefetch completes): fall back to
        // the async path with the same staleness gate as before so a fast
        // re-roll between resolves can't clobber a newer aim.
        const aimTicket = target.key;
        getConstellationCentroid(target.id).then((pos) => {
          if (pos && lastTourPickRef.current === aimTicket) {
            setAimAtSphere([pos[0], pos[1], pos[2]]);
          }
        });
        return;
      }
    }
  }, [cinematic, handleMoonSelect, handlePlanetSelect, handleSunSelect, jumpToPreset]);

  const currentAreaLabel = useMemo(() => {
    if (cinematic) return '';
    if (selNearStar) return 'Nearby Star';
    if (selGalaxy) return 'Local Group';
    if (selSpacecraft) return 'Deep Space';
    if (selMoonIdx !== null && selPlanet !== null) return 'Moon Orbit';
    if (selPlanet !== null) return ALL_BODIES[selPlanet].name;
    if (selSun) return 'Sun';
    if (camPreset?.label === 'Inner') return 'Inner System';
    if (camPreset?.label === 'System') return 'Full System';
    if (camPreset?.label === 'Outer') return 'Outer System';
    if (camPreset?.label === 'Kuiper') return 'Kuiper Belt';
    if (camPreset?.label === 'Oort') return 'Oort Cloud';
    if (camPreset?.label === 'Stellar') return 'Deep Space';
    if (camPreset?.label === 'Sun') return 'Inner';
    return 'Full System';
  }, [camPreset?.label, cinematic, selGalaxy, selMoonIdx, selNearStar, selPlanet, selSpacecraft, selSun]);

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

      if (e.key === '?') {
        // Shortcuts sheet lives in Panels; nudge it via a window event so we
        // don't thread its open-state back up here.
        window.dispatchEvent(new CustomEvent('orrery:toggle-shortcuts'));
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

      if (k === 'm') {
        if (!cinematic) window.dispatchEvent(new CustomEvent('orrery:toggle-controls'));
        return;
      }
      if (k === 'n') setShowNeo(p => !p);
      if (k === 'd') setShowDwarf(p => !p);
      if (k === 's') setShowStars(p => !p);
      if (k === 'l') setShowConstellations(p => !p);
      if (k === 'a') setShowAsterisms(p => !p);
      if (k === 'g') {
        setConstellationFocus((prev) => {
          const next = !prev;
          if (next) {
            setShowStars(true);
            setShowConstellations(true);
            // Keep this aligned with the SidePanel Sky toggle behavior.
            setSelConstellation(null);
            setSelAsterism(null);
            setAimAtSphere(null);
          }
          return next;
        });
      }
      if (k === 'c') setShowComets(p => !p);
      if (k === 'r') setShowMeteors(p => !p);
      if (k === 'i') setShowSatellites(p => !p);
      if (k === 'o') setShowDeepSpace(p => !p);
      if (k === 'escape') {
        if (panelOpen) { setPanelOpen(false); return; }
        if (OBSERVATORY_MODE) {
          setSelConstellation(null);
          setSelAsterism(null);
          setSelNearStar(null);
          setSelGalaxy(null);
          setAimAtSphere(null);
          return;
        }
        navigateBack();
        setSelNeo(null);
        setSelComet(null);
        setSelMeteor(null);
        setSelSatellite(null);
        setSelSpacecraft(null);
        setSelNearStar(null);
        setSelGalaxy(null);
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

  const accentRgb = theme.uiAccentRgb;

  const handleUserGrabDuringCinematic = useCallback(() => {
    if (cinematic) exitCinematic();
  }, [cinematic, exitCinematic]);

  // Control-surface action dispatch (bottom cluster + side panel).
  const handleArcAction = useCallback((action: string, arg?: string) => {
    switch (action) {
      case 'tour': startCinematicTour(); break;
      case 'dice': triggerRandomJump(); break;
      case 'preset': if (arg) jumpToPreset(arg); break;
      case 'zoom': {
        // Step the scale ladder from the nearest current rung (by camera distance).
        const cur = zoomRungFor(cameraDistance);
        const next = Math.max(0, Math.min(ZOOM_LADDER.length - 1, cur + (arg === 'in' ? -1 : 1)));
        if (next !== cur) jumpToPreset(ZOOM_LADDER[next]);
        break;
      }
      case 'toggleSky':
        setConstellationFocus((prev) => {
          const next = !prev;
          if (next) { setShowStars(true); setShowConstellations(true); setSelConstellation(null); setSelAsterism(null); setAimAtSphere(null); }
          return next;
        });
        break;
      case 'layer':
        if (arg === 'neo') setShowNeo(p => !p);
        else if (arg === 'dwarf') setShowDwarf(p => !p);
        else if (arg === 'comets') setShowComets(p => !p);
        else if (arg === 'meteors') setShowMeteors(p => !p);
        else if (arg === 'satellites') setShowSatellites(p => !p);
        else if (arg === 'deepSpace') setShowDeepSpace(p => !p);
        else if (arg === 'asterisms') setShowAsterisms(p => !p);
        break;
      case 'controls': window.dispatchEvent(new CustomEvent('orrery:toggle-controls')); break;
      case 'info': window.dispatchEvent(new CustomEvent('orrery:open-info')); break;
      case 'shortcuts': window.dispatchEvent(new CustomEvent('orrery:toggle-shortcuts')); break;
    }
  }, [startCinematicTour, triggerRandomJump, jumpToPreset, cameraDistance]);
  const arcLayerState = useMemo(() => ({
    sky: constellationFocus,
    neo: showNeo, dwarf: showDwarf, comets: showComets, meteors: showMeteors,
    satellites: showSatellites, deepSpace: showDeepSpace, asterisms: showAsterisms,
  }), [constellationFocus, showNeo, showDwarf, showComets, showMeteors, showSatellites, showDeepSpace, showAsterisms]);

  // Current zoom-ladder rung drives the +/- grey-out on the bottom cluster.
  const zoomRung = useMemo(() => zoomRungFor(cameraDistance), [cameraDistance]);
  const atInnermost = zoomRung === 0;
  const atOutermost = zoomRung === ZOOM_LADDER.length - 1;

  // Wake the HUD on any interaction; fade out after idle. setState only on edges.
  useEffect(() => {
    const IDLE_MS = 4000;
    const wake = () => {
      if (!hudActiveRef.current) { hudActiveRef.current = true; setHudActive(true); }
      window.clearTimeout(hudTimerRef.current);
      hudTimerRef.current = window.setTimeout(() => {
        hudActiveRef.current = false;
        setHudActive(false);
      }, IDLE_MS);
    };
    const opts = { passive: true } as const;
    window.addEventListener('pointermove', wake, opts);
    window.addEventListener('pointerdown', wake, opts);
    window.addEventListener('touchstart', wake, opts);
    window.addEventListener('keydown', wake);
    wake();
    return () => {
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('touchstart', wake);
      window.removeEventListener('keydown', wake);
      window.clearTimeout(hudTimerRef.current);
    };
  }, []);

  const reloadLoadingTasks = useCallback(() => {
    setLoadingTasks({
      stars: false,
      asteroids: false,
      constellations: false,
      constellationLines: false,
      comets: false,
      meteors: false,
      satellites: false,
    });
  }, []);

  useEffect(() => {
    const canvas = glCanvasRef.current;
    if (!canvas) return;
    const onLost = (e: Event) => {
      e.preventDefault();
      setPlaying(false);
      setCinematic(false);
      reloadLoadingTasks();
    };
    const onRestored = () => {
      reloadLoadingTasks();
      // Backoff: remounting the Canvas rebuilds every GPU resource. If the
      // device is dropping contexts under memory pressure (common on Android),
      // remounting in a tight loop makes the thrash worse — let three.js reuse
      // the restored context when the last remount was recent.
      const now = performance.now();
      if (now - lastCanvasRemountRef.current > 30000) {
        lastCanvasRemountRef.current = now;
        setCanvasKey(k => k + 1);
      }
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [canvasCreated, reloadLoadingTasks]);

  // Extracted so it can render either bare or wrapped in the lazy XRProvider
  // without duplicating the prop list.
  const sceneEl = (
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
      constellationRevealTick={constellationRevealTick}
      showAsterisms={showAsterisms}
      showAsteroidBelt={showAsteroidBelt}
      showComets={showComets}
      showMeteors={showMeteors}
      showSatellites={showSatellites}
      showDeepSpace={showDeepSpace}
      onConstellationSelect={(id) => { setSelConstellation(prev => prev === id ? null : id); }}
      onAsterismSelect={(name) => { setSelAsterism(prev => prev === name ? null : name); }}
      selConstellationId={selConstellation}
      accentColor={theme.uiAccent}
      aimAtSphere={aimAtSphere}
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
      selNearStar={selNearStar} setSelNearStar={setSelNearStar}
      selGalaxy={selGalaxy} setSelGalaxy={setSelGalaxy}
      onSunSelect={handleSunSelect}
      onUserGrabDuringCinematic={handleUserGrabDuringCinematic}
    />
  );

  return (
    <div
      style={{
        width: '100vw', height: '100dvh',
        // Observatory: atmospheric radial — subtle violet at zenith fading to black at the
        // horizon. Suggests scattered light from below the horizon without competing with
        // the stars. Default Orrery keeps the pure black solar-system void.
        background: OBSERVATORY_MODE
          ? 'radial-gradient(ellipse at 50% 35%, rgba(20, 14, 38, 0.32) 0%, #000 70%)'
          : '#000',
        position: 'relative', overflow: 'hidden',
        fontFamily: "'Cormorant Garamond','Garamond','Baskerville','Georgia',serif",
      }}
      onClick={handleCinematicClick}
    >
      <Canvas
        key={canvasKey}
        aria-label="Interactive 3D solar system. Select bodies with the on-screen controls or keyboard shortcuts."
        role="img"
        dpr={IS_ANDROID ? [1, 1.25] : [1, 1.5]}
        camera={{
          position: OBSERVATORY_MODE ? [1, 0.001, 0] : [0, 3, 4],
          fov: 55,
          near: 0.02,
          far: 250000,
        }}
        style={{ position: 'absolute', inset: 0 }}
        // Android profile: skip MSAA — multisampling multiplies tile-memory
        // traffic on Adreno/Mali and the scene is mostly points/lines anyway.
        gl={{ antialias: !IS_ANDROID, logarithmicDepthBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        onCreated={({ gl }) => {
          glCanvasRef.current = gl.domElement;
          setCanvasCreated(true);
          if (cinematic) startCinematicTour();
        }}
        onPointerMissed={OBSERVATORY_MODE ? () => {
          setSelConstellation(null);
          setSelAsterism(null);
          setSelNearStar(null);
          setSelGalaxy(null);
          setAimAtSphere(null);
        } : () => {
          setSelSpacecraft(null);
          setSelNearStar(null);
          setSelGalaxy(null);
          // Clicking empty space backs out of a focused body — the previously
          // only exits were the small Back button and Escape.
          if (!cinematic && (selPlanet !== null || selSun || selMoonIdx !== null)) {
            navigateBack();
          }
        }}
      >
        <Suspense fallback={null}>
          {/* null = XR support check still pending (XR-capable browsers only);
              withholding the first mount until it resolves keeps Scene from
              mounting bare and then remounting under XRProvider. */}
          {vrSupported === null ? null
            : vrSupported ? (
              <XRProvider onStoreReady={(s) => { xrStoreRef.current = s; setXrReady(true); }}>
                {sceneEl}
              </XRProvider>
            ) : sceneEl}
        </Suspense>
      </Canvas>

      {vrSupported === true && (
        <button
          type="button"
          disabled={!xrReady}
          onClick={() => {
            // Leave the auto-tour before handing the camera to the headset —
            // otherwise the cinematic keeps driving presets the XR camera
            // ignores, and the view looks frozen.
            setCinematic(false);
            setPanelOpen(false);
            void xrStoreRef.current?.enterVR();
          }}
          aria-label="Enter immersive VR"
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            padding: '10px 22px',
            background: `rgba(${accentRgb},0.16)`,
            border: `1px solid rgba(${accentRgb},0.4)`,
            borderRadius: 8,
            color: theme.uiAccent,
            fontFamily: 'inherit',
            fontSize: 14,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            cursor: xrReady ? 'pointer' : 'default',
            opacity: xrReady ? 1 : 0.5,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          Enter VR
        </button>
      )}

      <OrreryDiagOverlay />

      <LoadingScreen
        ready={sceneReady}
        progress={loadingProgress}
        loadingTasks={loadingTasks}
        onReload={reloadLoadingTasks}
      />

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
        showDeepSpace={showDeepSpace} setShowDeepSpace={setShowDeepSpace}
        selConstellation={selConstellation} setSelConstellation={setSelConstellation}
        selAsterism={selAsterism} setSelAsterism={setSelAsterism}
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
        selNearStar={selNearStar} setSelNearStar={setSelNearStar}
        selGalaxy={selGalaxy} setSelGalaxy={setSelGalaxy}
        selSun={selSun}
        currentAreaLabel={currentAreaLabel}
        onRandomJump={triggerRandomJump}
        onStartCinematic={startCinematicTour}
      />

      {!OBSERVATORY_MODE && (
        <SidePanel
          accent={theme.uiAccent}
          accentRgb={accentRgb}
          onAction={handleArcAction}
          layerState={arcLayerState}
        />
      )}

      {!OBSERVATORY_MODE && !cinematic && (
        <BottomCluster
          visible={hudActive}
          pulse={pulseSkyToggle}
          accent={theme.uiAccent}
          accentRgb={accentRgb}
          onAction={handleArcAction}
          atInnermost={atInnermost}
          atOutermost={atOutermost}
          skyActive={constellationFocus}
        />
      )}

      {/* Sim clock + date — shown during the cinematic tour. */}
      {cinematic && !OBSERVATORY_MODE && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            right: 'calc(env(safe-area-inset-right, 0px) + 20px)',
            zIndex: 20, pointerEvents: 'none', textAlign: 'right',
            color: 'rgba(255,255,255,0.5)', fontFamily: 'inherit',
            textShadow: '0 1px 10px rgba(0,0,0,0.85)',
          }}
        >
          <div style={{ fontSize: 15, letterSpacing: 1, fontWeight: 300 }}>
            {simTime.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ fontSize: 12, letterSpacing: 2.5, opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>
            {simTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )}

      {showSkyModeHint && !OBSERVATORY_MODE && (
        <div
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 52px)',
            right: 62,
            zIndex: 25,
            pointerEvents: 'none',
            background: `rgba(${accentRgb},0.14)`,
            border: `1px solid rgba(${accentRgb},0.34)`,
            borderRadius: 6,
            padding: '6px 10px',
            color: theme.uiAccent,
            fontFamily: 'inherit',
            fontSize: 11,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          Sky mode enabled
        </div>
      )}
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
