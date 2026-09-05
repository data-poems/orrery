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
import { getConstellationCentroid } from './lib/constellationCentroids';
import type { CometDef } from './data/comets';
import type { MeteorShower } from './scene/Meteors';
import type { SatellitePosition } from './lib/satellites';
import type { Spacecraft, NearStar, GalaxyMarker } from './data/deepspace';
import { SPACECRAFT, heliocentricXYZ } from './data/deepspace';
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
import { claimFirstVisitCinematic } from './lib/launchExperience';
import { restoreHudControlFocus } from './lib/hudFocus';
import { createReviewPromptCoordinator } from './lib/reviewPrompt';
import { useImmersiveVrSupported } from './lib/xr';
import { tourRandom, recordTourTarget } from './lib/tourRandom';
import { useAmbientTourClock } from './lib/useAmbientTourClock';
import type { XRStore } from './scene/XRProvider';
// @react-three/xr lives only in this lazily-loaded module, mounted only when a
// headset is detected — so non-XR users never download the XR runtime.
const XRProvider = lazy(() => import('./scene/XRProvider'));

/** A single fly-to destination for the dice and the ambient tour. */
type DiceTarget =
  | { kind: 'preset'; label: string; key: string }
  | { kind: 'planet'; planetIdx: number; key: string }
  | { kind: 'moon'; planetIdx: number; moonIdx: number; key: string }
  | { kind: 'spacecraft'; craftIdx: number; key: string };

/** Scale ladder for the zoom tiles / +- stepping (innermost → outermost). */
const ZOOM_LADDER = ['Sun', 'Inner', 'System', 'Outer', 'Kuiper', 'Oort', 'Stellar'] as const;
const HUD_IDLE_MS = 4000;

function persistentStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Claim the automatic tour once at app bootstrap, outside React's Strict Mode
// render cycle. This persists the handled state before an interrupted tour can
// accidentally become a second-launch tour.
const LAUNCH_STARTS_CINEMATIC = claimFirstVisitCinematic(
  persistentStorage(),
  {
    observatoryMode: OBSERVATORY_MODE,
    prefersReducedMotion: PREFERS_REDUCED_MOTION,
  },
);

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
  const launchStartsCinematic = LAUNCH_STARTS_CINEMATIC;
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
  // Fly-to-any-point focus for non-planet bodies (spacecraft, comets, asteroids).
  // Cleared by the planet/preset focus handlers so a body focus always wins.
  const [pointFocus, setPointFocus] = useState<{ pos: [number, number, number]; dist: number } | null>(null);
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
  const [speed] = useState(1);
  const [simTime, setSimTime] = useState(new Date());
  const [playing, setPlaying] = useState(true);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [canvasCreated, setCanvasCreated] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const lastCanvasRemountRef = useRef(-Infinity);
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cinematicExitButtonRef = useRef<HTMLButtonElement | null>(null);
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
  // First-time visitors get the cinematic unless reduced motion or Observatory
  // mode says otherwise. Returning visitors land in a useful interactive view.
  const [cinematic, setCinematic] = useState(launchStartsCinematic);
  const [navStack, setNavStack] = useState<string[]>(['Solar System']);
  const [selMoonIdx, setSelMoonIdx] = useState<number | null>(null);
  const [cameraDistance, setCameraDistance] = useState(50);
  const [camIdx, setCamIdx] = useState(() =>
    launchStartsCinematic ? camIndex('Inner') : camIndex('System'));
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
  // Guards the tour's auto-end against the interval double-firing exitCinematic
  // (one more 500ms tick can land between setCinematic(false) and effect cleanup).
  const tourEndedRef = useRef(false);
  const reviewPrompt = useMemo(() => createReviewPromptCoordinator(), []);
  const reviewPromptTimeoutRef = useRef<number | undefined>(undefined);

  const wakeHud = useCallback(() => {
    if (!hudActiveRef.current) {
      hudActiveRef.current = true;
      setHudActive(true);
    }
    window.clearTimeout(hudTimerRef.current);
    hudTimerRef.current = window.setTimeout(() => {
      hudActiveRef.current = false;
      setHudActive(false);
    }, HUD_IDLE_MS);
  }, []);

  const cancelScheduledReviewPrompt = useCallback(() => {
    window.clearTimeout(reviewPromptTimeoutRef.current);
    reviewPromptTimeoutRef.current = undefined;
  }, []);

  const scheduleReviewPromptAfterDismissal = useCallback(() => {
    cancelScheduledReviewPrompt();
    reviewPromptTimeoutRef.current = window.setTimeout(() => {
      reviewPromptTimeoutRef.current = undefined;
      void reviewPrompt.requestIfEligible();
    }, 900);
  }, [cancelScheduledReviewPrompt, reviewPrompt]);

  const recordManualExploration = useCallback((targetKey: string) => {
    reviewPrompt.recordManualExploration(targetKey);
  }, [reviewPrompt]);

  const clearSkyCueTimeouts = useCallback(() => {
    skyCueTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    skyCueTimeoutsRef.current = [];
  }, []);

  useEffect(() => () => {
    clearSkyCueTimeouts();
  }, [clearSkyCueTimeouts]);

  useEffect(() => {
    const previousDebugHook = window.__ORRERY_FORCE_REVIEW_PROMPT__;
    window.__ORRERY_FORCE_REVIEW_PROMPT__ = () =>
      reviewPrompt.requestIfEligible({ force: true });
    return () => {
      cancelScheduledReviewPrompt();
      if (previousDebugHook) window.__ORRERY_FORCE_REVIEW_PROMPT__ = previousDebugHook;
      else delete window.__ORRERY_FORCE_REVIEW_PROMPT__;
    };
  }, [cancelScheduledReviewPrompt, reviewPrompt]);

  useEffect(() => {
    if (!cinematic || !sceneReady) return;
    const id = window.setTimeout(() => cinematicExitButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [cinematic, sceneReady]);

  useEffect(() => {
    // A new interaction means the prior dismissal is no longer a quiet moment.
    // Keep the StoreKit request deferred until the user actually settles.
    window.addEventListener('pointerdown', cancelScheduledReviewPrompt);
    window.addEventListener('touchstart', cancelScheduledReviewPrompt, { passive: true });
    window.addEventListener('keydown', cancelScheduledReviewPrompt);
    return () => {
      window.removeEventListener('pointerdown', cancelScheduledReviewPrompt);
      window.removeEventListener('touchstart', cancelScheduledReviewPrompt);
      window.removeEventListener('keydown', cancelScheduledReviewPrompt);
    };
  }, [cancelScheduledReviewPrompt]);

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
    setPointFocus(null);

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

    if (!OBSERVATORY_MODE) {
      restoreHudControlFocus('orrery-open-controls', wakeHud);
    }

  }, [clearSkyCueTimeouts, setPanelOpen, wakeHud]);

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
    cancelScheduledReviewPrompt();
    cinematicIdx.current = 0;
    cinematicStart.current = Date.now();
    tourEndedRef.current = false;
    setPanelOpen(false);
    // Invalidate pending dice aim BEFORE clearing aimAtSphere so a slow Promise
    // resolve gated by `lastTourPickRef.current === aimTicket` can't re-set it.
    lastTourPickRef.current = null;
    setAimAtSphere(null);
    setPointFocus(null);
    applyCinematicStep(0);
    setCinematic(true);
  }, [applyCinematicStep, cancelScheduledReviewPrompt, setPanelOpen]);

  // Cinematic timer — poll-based; pauses while tab is hidden
  const cinematicHiddenAt = useRef<number | null>(null);
  useEffect(() => {
    if (!cinematic || !sceneReady) return;

    const id = setInterval(() => {
      if (tabHiddenRef.current || tourEndedRef.current) return;
      const elapsed = Date.now() - cinematicStart.current;
      const dur = cinematicSteps[cinematicIdx.current].duration;
      if (elapsed >= dur) {
        const next = cinematicIdx.current + 1;
        if (next >= cinematicSteps.length) {
          // A natural finish ends on Earth — its climactic constellation reveal
          // (exitCinematic's default Earth target). Only a tap-to-interrupt goes
          // to the Sun (handleCinematicClick). Guard against a second tick firing
          // before this effect's cleanup runs.
          tourEndedRef.current = true;
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

  // Selecting a constellation aims the camera at its sky direction. Constellations
  // live on the camera-pinned celestial sphere (radius 300), so they can't be
  // *flown* to like a planet — the camera instead rotates to face the centroid via
  // aimAtSphere (planAimAtSphere in CamCtrl wins over focusTarget). The centroid
  // resolve is async; the cleanup flag drops a stale resolve when the selection
  // changes again. Gated on !cinematic so the intro tour owns the camera uncontested.
  useEffect(() => {
    if (cinematic || !selConstellation) return;
    let cancelled = false;
    getConstellationCentroid(selConstellation).then((pos) => {
      if (!cancelled && pos) setAimAtSphere(pos);
    });
    return () => { cancelled = true; };
  }, [selConstellation, cinematic]);

  // Toggle a constellation selection. Selecting one lets the effect above aim the
  // camera; deselecting it (re-click) must also drop the aim, since no other
  // handler runs on this path. Other focus handlers clear aimAtSphere themselves.
  const handleConstellationSelect = useCallback((id: string) => {
    if (selConstellation === id) {
      setSelConstellation(null);
      setAimAtSphere(null);
      scheduleReviewPromptAfterDismissal();
    } else {
      setSelConstellation(id);
      setPointFocus(null);
      recordManualExploration(`constellation:${id}`);
    }
  }, [recordManualExploration, scheduleReviewPromptAfterDismissal, selConstellation]);

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
    // Bail only when there's genuinely nothing to go back from. The Sun reaches
    // selSun via a preset jump (handlePresetSelect) that resets navStack to the
    // root, so a length check alone would wrongly block zooming back out of Sol.
    if (navStack.length <= 1 && selMoonIdx === null && !selSun && selPlanet === null) return;

    if (selMoonIdx !== null) {
      setSelMoonIdx(null);
      setFocusTarget(prev => prev ? { planetIdx: prev.planetIdx, pos: prev.pos } : null);
      setNavStack(prev => prev.slice(0, -1));
      scheduleReviewPromptAfterDismissal();
    } else if (selSun) {
      setSelSun(false);
      setSelPlanet(null);
      setFocusTarget(null);
      setNavStack(['Solar System']);
      setCamIdx(1);
      scheduleReviewPromptAfterDismissal();
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
      scheduleReviewPromptAfterDismissal();
    }
  }, [cinematic, navStack, scheduleReviewPromptAfterDismissal, selMoonIdx, selPlanet, selSun, exitCinematic]);

  // Close the selected-body card without moving the camera (unlike navigateBack,
  // which zooms back out to the containing scale level). Used by the card's × so
  // you can dismiss the readout and stay where you are.
  const dismissSelection = useCallback(() => {
    setSelPlanet(null);
    setSelSun(false);
    setSelMoonIdx(null);
    setFocusTarget(null);
    setPointFocus(null);
    scheduleReviewPromptAfterDismissal();
  }, [scheduleReviewPromptAfterDismissal]);

  // Planet selection auto-focuses camera and pushes to nav stack
  const handlePlanetSelect = useCallback((idx: number | null, manual = true) => {
    if (cinematic) return;

    if (idx !== null) {
      setSelSun(false);
      setSelSpacecraft(null);
      setSelNearStar(null);
      setSelGalaxy(null);
      setSelConstellation(null);
      setAimAtSphere(null);
      setPointFocus(null);
      setSelPlanet(idx);
      setSelMoonIdx(null);
      setCamIdx(-1);
      const pos = positionsRef.current.get(idx);
      if (pos) setFocusTarget({ planetIdx: idx, pos });
      setNavStack(['Solar System', ALL_BODIES[idx].name]);
      if (manual) recordManualExploration(`planet:${idx}`);
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
      if (manual) scheduleReviewPromptAfterDismissal();
    }
  }, [cinematic, recordManualExploration, scheduleReviewPromptAfterDismissal, selPlanet]);

  // Moon selection drill-down
  const handleMoonSelect = useCallback((planetIdx: number, moonIdx: number, manual = true) => {
    if (cinematic) return;
    const moons = getMoonsForPlanet(planetIdx);
    if (moonIdx >= moons.length) return;

    setSelSun(false);
    setSelSpacecraft(null);
    setSelNearStar(null);
    setSelGalaxy(null);
    setSelConstellation(null);
    setAimAtSphere(null);
    setPointFocus(null);
    setSelPlanet(planetIdx);
    setSelMoonIdx(moonIdx);
    setCamIdx(-1);
    const pos = positionsRef.current.get(planetIdx);
    if (pos) setFocusTarget({ planetIdx, pos, moonIdx });
    setNavStack(prev => {
      const base = prev.length >= 2 ? prev.slice(0, 2) : [...prev];
      return [...base, moons[moonIdx].name];
    });
    if (manual) recordManualExploration(`moon:${planetIdx}:${moonIdx}`);
  }, [cinematic, recordManualExploration]);

  // Camera preset selection
  const handlePresetSelect = useCallback((idx: number, manual = true) => {
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
    setPointFocus(null);
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
    if (manual) recordManualExploration(`preset:${preset.label}`);
  }, [recordManualExploration]);

  const jumpToPreset = useCallback((label: string, manual = true) => {
    const idx = camIndex(label);
    if (idx >= 0) handlePresetSelect(idx, manual);
  }, [handlePresetSelect]);

  const handleSunSelect = useCallback((manual = true) => {
    if (cinematic) return;
    setSelSun(true);
    setSelMoonIdx(null);
    setSelPlanet(null);
    setFocusTarget(null);
    setPointFocus(null);
    setNavStack(['Solar System', 'Sun']);
    jumpToPreset('Sun', false);
    if (manual) recordManualExploration('sun');
  }, [cinematic, jumpToPreset, recordManualExploration]);

  // Build a fresh destination pool. Pool stays planet/moon-heavy on purpose
  // (those read as "stellar bodies"); a few active spacecraft sprinkle in the
  // occasional "wow, a probe out past the planets." Sky-pinned objects
  // (constellations, near-stars, galaxies) stay out — they don't fly-to/center as
  // a destination. One random moon per planet is chosen per build, so repeated
  // builds vary which moons appear. Shared by the dice (random pick) and the
  // ambient tour (sequential cycle). Kuiper is always present, so a full tour
  // cycle always features the Kuiper belt.
  const buildDestinations = useCallback((): DiceTarget[] => {
    const planetIndices = [0, 1, 2, 3, 4, 5, 6, 7];
    const moonTargets = planetIndices.flatMap((planetIdx) => {
      const moons = getMoonsForPlanet(planetIdx);
      if (moons.length === 0) return [];
      return [{ kind: 'moon' as const, planetIdx, moonIdx: Math.floor(tourRandom() * moons.length) }];
    });
    // ALL_BODIES = [...PLANETS (0-7), ...DWARF_PLANETS (8-10)].
    const dwarfIndices: number[] = [];
    for (let i = 8; i < ALL_BODIES.length; i++) dwarfIndices.push(i);
    const activeCraft = SPACECRAFT
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.status === 'active');

    return [
      { kind: 'preset', label: 'Sun', key: 'preset:Sun' },
      { kind: 'preset', label: 'Inner', key: 'preset:Inner' },
      { kind: 'preset', label: 'System', key: 'preset:System' },
      { kind: 'preset', label: 'Outer', key: 'preset:Outer' },
      { kind: 'preset', label: 'Kuiper', key: 'preset:Kuiper' },
      { kind: 'preset', label: 'Oort', key: 'preset:Oort' },
      ...planetIndices.map<DiceTarget>((planetIdx) => ({ kind: 'planet', planetIdx, key: `planet:${planetIdx}` })),
      ...dwarfIndices.map<DiceTarget>((planetIdx) => ({ kind: 'planet', planetIdx, key: `planet:${planetIdx}` })),
      ...moonTargets.map<DiceTarget>((m) => ({ ...m, key: `moon:${m.planetIdx}:${m.moonIdx}` })),
      ...activeCraft.map<DiceTarget>(({ i }) => ({ kind: 'spacecraft', craftIdx: i, key: `spacecraft:${i}` })),
    ];
  }, []);

  // Execute a jump to one destination. Shared by the dice and the ambient tour.
  const goToTarget = useCallback((target: DiceTarget) => {
    const clearObjectSelections = () => {
      setSelSpacecraft(null);
      setSelNearStar(null);
      setSelGalaxy(null);
      setSelConstellation(null);
    };
    // Reset sky layers so a jump always lands on a clean solar-system view (no
    // lingering focus-mode brightness from a prior constellation selection).
    const disableSkyTourLayers = () => {
      setShowConstellations(false);
      setConstellationFocus(false);
      setSelConstellation(null);
      setSelAsterism(null);
    };

    clearObjectSelections();
    disableSkyTourLayers();
    setAimAtSphere(null);

    switch (target.kind) {
      case 'preset':
        if (target.label === 'Sun') handleSunSelect(false);
        else jumpToPreset(target.label, false);
        return;
      case 'planet':
        // Dwarf planets are filtered out of `visibleBodies` unless `showDwarf`
        // is enabled; without this, focusing Eris/Pluto/Ceres lands the camera
        // on coordinates where no body is rendered.
        if (target.planetIdx >= 8) setShowDwarf(true);
        handlePlanetSelect(target.planetIdx, false);
        return;
      case 'moon':
        handleMoonSelect(target.planetIdx, target.moonIdx, false);
        return;
      case 'spacecraft': {
        const craft = SPACECRAFT[target.craftIdx];
        // Spacecraft live at their true heliocentric distance (tens to ~165 AU);
        // fly to a static point just off the marker. Their layer must be on or the
        // starburst won't render where the camera lands.
        const pos = heliocentricXYZ(craft.ra, craft.dec, craft.distAU);
        setCamIdx(-1);
        setSelPlanet(null);
        setSelMoonIdx(null);
        setFocusTarget(null);
        setShowDeepSpace(true);
        setSelSpacecraft(craft);
        setPointFocus({ pos, dist: 10 });
        setNavStack(['Solar System', 'Deep Space', craft.name]);
        return;
      }
    }
  }, [handleMoonSelect, handlePlanetSelect, handleSunSelect, jumpToPreset]);

  const triggerRandomJump = useCallback(() => {
    if (cinematic) return;
    cancelScheduledReviewPrompt();
    const destinations = buildDestinations();
    let target = destinations[Math.floor(Math.random() * destinations.length)];
    for (let i = 0; i < 3 && target.key === lastTourPickRef.current; i++) {
      target = destinations[Math.floor(Math.random() * destinations.length)];
    }
    if (!target) return;
    lastTourPickRef.current = target.key;
    goToTarget(target);
  }, [cinematic, buildDestinations, cancelScheduledReviewPrompt, goToTarget]);

  // Ambient tour — a manual-toggle "screensaver" that cycles a shuffled playlist
  // of the whole pool, one stop every ten seconds, until toggled off. Each cycle
  // reshuffles (and re-randomizes which moons appear). Pauses for the cinematic.
  const [tourActive, setTourActive] = useState(false);
  const tourPlaylistRef = useRef<DiceTarget[]>([]);
  const tourIdxRef = useRef(0);
  useAmbientTourClock(tourActive && !cinematic && sceneReady, (restart) => {
    if (restart) tourIdxRef.current = tourPlaylistRef.current.length;
    if (tabHiddenRef.current) return;
    if (tourIdxRef.current >= tourPlaylistRef.current.length) {
      // Fisher-Yates shuffle of a fresh pool.
      const pool = buildDestinations();
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(tourRandom() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      tourPlaylistRef.current = pool;
      tourIdxRef.current = 0;
    }
    const t = tourPlaylistRef.current[tourIdxRef.current++];
    if (t) { recordTourTarget(t.key); lastTourPickRef.current = t.key; goToTarget(t); }
  });

  const toggleTour = useCallback(() => {
    cancelScheduledReviewPrompt();
    if (cinematic) exitCinematic();
    setTourActive((a) => !a);
  }, [cancelScheduledReviewPrompt, cinematic, exitCinematic]);

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
      const isInteractiveShortcut = isPresetKey || ['m', 'n', 'd', 'b', 's', 'l', 'a', 'g', 'c', 'r', 'i', 'o', 'escape', ' '].includes(k);

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
      if (k === 'b') setShowAsteroidBelt(p => !p);
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
        // A selected body dismisses in place (no zoom-out); clear any sky-object
        // selection too. With nothing selected, Escape steps back a level.
        setSelNeo(null);
        setSelComet(null);
        setSelMeteor(null);
        setSelSatellite(null);
        setSelSpacecraft(null);
        setSelNearStar(null);
        setSelGalaxy(null);
        if (selPlanet !== null || selSun || selMoonIdx !== null) {
          dismissSelection();
        } else {
          navigateBack();
        }
      }
      if (k === ' ') { e.preventDefault(); setPlaying(p => !p); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [cinematic, panelOpen, navigateBack, handlePresetSelect, exitCinematic, startCinematicTour, selPlanet, selSun, selMoonIdx, dismissSelection]);

  // Clicking during the tour exits and zooms to the Sun. exitCinematic first
  // clears the tour's focusTarget, then jumpToPreset settles the Sun preset —
  // the same proven order as pressing a preset key during the tour.
  const handleCinematicClick = useCallback(() => {
    if (!cinematic) return;
    tourEndedRef.current = true;
    exitCinematic({ kind: 'preset', label: 'Sun' });
    jumpToPreset('Sun', false);
  }, [cinematic, exitCinematic, jumpToPreset]);

  useEffect(() => {
    const previousHandler = window.__ORRERY_HANDLE_ANDROID_BACK__;
    window.__ORRERY_HANDLE_ANDROID_BACK__ = () => {
      if (cinematic) {
        exitCinematic();
        return true;
      }
      if (panelOpen) {
        setPanelOpen(false);
        return true;
      }

      const hasPointSelection = selNeo !== null || selComet !== null
        || selMeteor !== null || selSatellite !== null || selSpacecraft !== null
        || selNearStar !== null || selGalaxy !== null
        || selConstellation !== null || selAsterism !== null;
      if (hasPointSelection) {
        setSelNeo(null);
        setSelComet(null);
        setSelMeteor(null);
        setSelSatellite(null);
        setSelSpacecraft(null);
        setSelNearStar(null);
        setSelGalaxy(null);
        setSelConstellation(null);
        setSelAsterism(null);
        setAimAtSphere(null);
        return true;
      }

      if (selPlanet !== null || selSun || selMoonIdx !== null || navStack.length > 1) {
        navigateBack();
        return true;
      }
      return false;
    };

    return () => {
      if (previousHandler) window.__ORRERY_HANDLE_ANDROID_BACK__ = previousHandler;
      else delete window.__ORRERY_HANDLE_ANDROID_BACK__;
    };
  }, [
    cinematic, exitCinematic, navStack.length, navigateBack, panelOpen,
    selAsterism, selComet, selConstellation, selGalaxy, selMeteor, selMoonIdx,
    selNearStar, selNeo, selPlanet, selSatellite, selSpacecraft, selSun,
  ]);

  const accentRgb = theme.uiAccentRgb;

  // A tap fires OrbitControls' "start" (this) on pointer-down before the click
  // handler runs, so it must also land on the Sun — otherwise it would exit to
  // Earth first and the click handler would no-op.
  const handleUserGrabDuringCinematic = useCallback(() => {
    if (!cinematic) return;
    tourEndedRef.current = true;
    exitCinematic({ kind: 'preset', label: 'Sun' });
    jumpToPreset('Sun', false);
  }, [cinematic, exitCinematic, jumpToPreset]);

  // Control-surface action dispatch (bottom cluster + side panel).
  const handleArcAction = useCallback((action: string, arg?: string) => {
    switch (action) {
      case 'tour': startCinematicTour(); break;
      case 'autotour': toggleTour(); break;
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
        else if (arg === 'asteroidBelt') setShowAsteroidBelt(p => !p);
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
  }, [startCinematicTour, toggleTour, triggerRandomJump, jumpToPreset, cameraDistance]);
  const arcLayerState = useMemo(() => ({
    sky: constellationFocus,
    neo: showNeo, dwarf: showDwarf, asteroidBelt: showAsteroidBelt,
    comets: showComets, meteors: showMeteors,
    satellites: showSatellites, deepSpace: showDeepSpace, asterisms: showAsterisms,
  }), [constellationFocus, showNeo, showDwarf, showAsteroidBelt, showComets, showMeteors, showSatellites, showDeepSpace, showAsterisms]);

  // Current zoom-ladder rung drives the +/- grey-out on the bottom cluster.
  const zoomRung = useMemo(() => zoomRungFor(cameraDistance), [cameraDistance]);
  const atInnermost = zoomRung === 0;
  const atOutermost = zoomRung === ZOOM_LADDER.length - 1;

  // Wake the HUD on any interaction; fade out after idle. setState only on edges.
  useEffect(() => {
    const opts = { passive: true } as const;
    window.addEventListener('pointermove', wakeHud, opts);
    window.addEventListener('pointerdown', wakeHud, opts);
    window.addEventListener('touchstart', wakeHud, opts);
    window.addEventListener('keydown', wakeHud);
    window.clearTimeout(hudTimerRef.current);
    hudTimerRef.current = window.setTimeout(() => {
      hudActiveRef.current = false;
      setHudActive(false);
    }, HUD_IDLE_MS);
    return () => {
      window.removeEventListener('pointermove', wakeHud);
      window.removeEventListener('pointerdown', wakeHud);
      window.removeEventListener('touchstart', wakeHud);
      window.removeEventListener('keydown', wakeHud);
      window.clearTimeout(hudTimerRef.current);
    };
  }, [wakeHud]);

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
      onConstellationSelect={handleConstellationSelect}
      onAsterismSelect={(name) => { setSelAsterism(prev => prev === name ? null : name); }}
      selConstellationId={selConstellation}
      accentColor={theme.uiAccent}
      aimAtSphere={aimAtSphere}
      pointFocus={pointFocus}
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
      onContextMenu={(e) => {
        // Right-click zooms out: step back from a focused body, else step the
        // scale ladder outward. (Closing a body just closes — never zooms.)
        e.preventDefault();
        if (selPlanet !== null || selSun || selMoonIdx !== null) navigateBack();
        else handleArcAction('zoom', 'out');
      }}
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
        onPointerMissed={OBSERVATORY_MODE ? (e) => {
          if (e.button !== 0) return; // left-click only; right-click zooms out
          setSelConstellation(null);
          setSelAsterism(null);
          setSelNearStar(null);
          setSelGalaxy(null);
          setAimAtSphere(null);
        } : (e) => {
          if (e.button !== 0) return; // left-click only; right-click zooms out (onContextMenu)
          setSelSpacecraft(null);
          setSelNearStar(null);
          setSelGalaxy(null);
          // Clicking empty space dismisses a focused body in place — no zoom-out
          // (use the − tile or breadcrumb to actually zoom out).
          if (!cinematic && (selPlanet !== null || selSun || selMoonIdx !== null)) {
            dismissSelection();
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
        moon={moon} solarWind={solarWind}
        selPlanet={selPlanet}
        neoStatus={neoStatus} selNeo={selNeo} setSelNeo={handleNeoSelect}
        showNeo={showNeo}
        selConstellation={selConstellation} setSelConstellation={setSelConstellation}
        selAsterism={selAsterism} setSelAsterism={setSelAsterism}
        cinematic={cinematic}
        navStack={navStack}
        onZoomOut={navigateBack}
        selMoonIdx={selMoonIdx}
        cameraDistance={cameraDistance}
        selComet={selComet} setSelComet={setSelComet}
        selMeteor={selMeteor} setSelMeteor={setSelMeteor}
        selSatellite={selSatellite} setSelSatellite={setSelSatellite}
        selSpacecraft={selSpacecraft} setSelSpacecraft={setSelSpacecraft}
        selNearStar={selNearStar} setSelNearStar={setSelNearStar}
        selGalaxy={selGalaxy} setSelGalaxy={setSelGalaxy}
        selSun={selSun}
        currentAreaLabel={currentAreaLabel}
        hudVisible={hudActive}
      />

      {!OBSERVATORY_MODE && (
        <SidePanel
          accent={theme.uiAccent}
          onAction={handleArcAction}
          layerState={arcLayerState}
          open={panelOpen}
          onOpenChange={setPanelOpen}
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
          tourActive={tourActive}
        />
      )}

      {/* Sim clock + date — shown during the cinematic tour. */}
      {cinematic && !OBSERVATORY_MODE && (
        <>
          <div className="sr-only" role="status" aria-live="polite">
            Cinematic tour playing. Use Exit tour and explore to enter the interactive solar system.
          </div>
          <button
            ref={cinematicExitButtonRef}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleCinematicClick();
            }}
            style={{
              position: 'fixed',
              left: 'calc(env(safe-area-inset-left, 0px) + 20px)',
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
              zIndex: 25,
              minHeight: 44,
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.28)',
              background: 'rgba(0,0,0,0.48)',
              color: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 14,
              letterSpacing: 0.5,
            }}
          >
            Exit tour and explore
          </button>
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
        </>
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
