/*
 * The cinematic tour as one continuous camera flight.
 *
 * The tour used to be four fixed camera targets chased with an exponential
 * ease: the camera lunged at each target, coasted to a stop, waited for a
 * timer and lunged again. Here the whole flight is a function of time, so the
 * camera never stops and never cuts: it spirals in from deep space, circling
 * as it descends, and lands on the same pose the interactive Earth focus uses.
 *
 * Everything in this file is pure so the path can be tested without WebGL.
 */

import { ALL_BODIES } from '../data/planets';
import { getMoonsForPlanet } from '../data/moons';

export type Vec3 = [number, number, number];

/** A camera pose as an orbit around a point: where it looks and from where. */
export interface OrbitPose {
  center: Vec3;
  /** Camera distance from `center`. */
  dist: number;
  /** Azimuth around the ecliptic pole, radians. */
  az: number;
  /** Elevation above the ecliptic, radians. */
  el: number;
}

/** Angles the interactive planet focus views a planet from. */
export const FOCUS_AZIMUTH = 0.7;
export const FOCUS_ELEVATION = 0.4;

/** How far the camera sits from a focused planet: clear of its outermost moon. */
export function planetFocusDistance(planetIdx: number): number {
  const planet = ALL_BODIES[planetIdx];
  const moons = getMoonsForPlanet(planetIdx);
  const maxMoonA = moons.length > 0 ? Math.max(...moons.map(m => m.a)) : 0;
  return Math.max(planet.radius * 8, maxMoonA * 2.5);
}

export function orbitOffset(dist: number, az: number, el: number): Vec3 {
  return [
    dist * Math.cos(el) * Math.cos(az),
    dist * Math.sin(el),
    dist * Math.cos(el) * Math.sin(az),
  ];
}

export function poseToCamera(pose: OrbitPose): { pos: Vec3; look: Vec3 } {
  const [ox, oy, oz] = orbitOffset(pose.dist, pose.az, pose.el);
  const [cx, cy, cz] = pose.center;
  return { pos: [cx + ox, cy + oy, cz + oz], look: pose.center };
}

/** The orbit pose of a camera at `pos` looking at `look`. */
export function cameraToPose(pos: Vec3, look: Vec3): OrbitPose {
  const dx = pos[0] - look[0], dy = pos[1] - look[1], dz = pos[2] - look[2];
  const dist = Math.max(1e-6, Math.hypot(dx, dy, dz));
  return {
    center: look,
    dist,
    az: Math.atan2(dz, dx),
    el: Math.asin(Math.max(-1, Math.min(1, dy / dist))),
  };
}

const EARTH = 2;

/** Seconds from the first frame to the landing at Earth. */
export const CINEMATIC_DURATION = 15;


export interface CinematicPhase {
  label: string;
  /** Path time at which this phase's title and layers take over. */
  start: number;
  /** Path time shown as a still when reduced motion is requested. */
  still: number;
  deepSpace: boolean;
  dwarf: boolean;
  asteroidBelt: boolean;
  /** Body highlighted (orbit ring, label) during the phase. */
  highlightPlanet?: number;
}

export const CINEMATIC_PHASES: CinematicPhase[] = [
  { label: 'Deep Space', start: 0, still: 0, deepSpace: true, dwarf: true, asteroidBelt: false },
  { label: 'Solar System', start: 3.2, still: 6.6, deepSpace: false, dwarf: true, asteroidBelt: true },
  { label: 'Inner Planets', start: 8.6, still: 10.6, deepSpace: false, dwarf: false, asteroidBelt: true },
  { label: 'Earth', start: 11.8, still: CINEMATIC_DURATION, deepSpace: false, dwarf: false, asteroidBelt: false, highlightPlanet: EARTH },
];

export function cinematicPhaseAt(t: number): number {
  let idx = 0;
  for (let i = 0; i < CINEMATIC_PHASES.length; i++) {
    if (t >= CINEMATIC_PHASES[i].start) idx = i;
  }
  return idx;
}

// Keyframes. Distance is keyed in log10 so a dive across four orders of
// magnitude reads as steady motion. The keys are spaced so the zoom rate stays
// within about a factor of three of itself for the whole flight: it eases a
// little where the eye takes in the whole system (around 6 s) and the inner
// planets (around 11 s), and the camera keeps circling through both, so the
// flight breathes without ever stopping.
const KEY_T = [0, 3.6, 6.6, 9.4, 11.4, CINEMATIC_DURATION];
const START_DIST = 1650;
const KEY_LOG_DIST_HEAD = [Math.log10(START_DIST), Math.log10(110), Math.log10(34), Math.log10(6), Math.log10(2.7)];
const EL_T = [0, 6.6, 11.4, CINEMATIC_DURATION];
const EL_V = [0.571, 0.62, 0.52, FOCUS_ELEVATION];
/** Radians the camera circles through over the whole flight (about 80 degrees). */
const SWEEP = 1.4;
/** Radians between the Sun-Earth line and the landing view (about 43 degrees). */
const LANDING_PHASE_ANGLE = 0.75;
/** When the look-at point starts sliding from the Sun to Earth. */
const HANDOFF_START = 9.4;

/**
 * Monotone cubic interpolation (Fritsch-Carlson) with flat ends: passes
 * through every key, never overshoots, and starts and ends at rest.
 */
export function monotoneSpline(ts: number[], vs: number[], t: number): number {
  const n = ts.length;
  if (t <= ts[0]) return vs[0];
  if (t >= ts[n - 1]) return vs[n - 1];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]));
  const m: number[] = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) { m[i] = 0; continue; }
    const h0 = ts[i] - ts[i - 1], h1 = ts[i + 1] - ts[i];
    const w0 = 2 * h1 + h0, w1 = h1 + 2 * h0;
    m[i] = (w0 + w1) / (w0 / d[i - 1] + w1 / d[i]);
  }
  let i = 0;
  while (i < n - 2 && t > ts[i + 1]) i++;
  const h = ts[i + 1] - ts[i];
  const s = (t - ts[i]) / h;
  const s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * vs[i]
    + (s3 - 2 * s2 + s) * h * m[i]
    + (-2 * s3 + 3 * s2) * vs[i + 1]
    + (s3 - s2) * h * m[i + 1];
}

export function smoothstep(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

function smootherstep(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

/**
 * Azimuth the tour views Earth from at the landing: on the sunward side, a
 * little off the Sun-Earth line. Wherever Earth is on its orbit the landing
 * shows a mostly lit planet with the Sun behind the camera, and the flight in
 * passes beside the Sun rather than over it.
 */
export function cinematicLandingAzimuth(earth: Vec3): number {
  return Math.atan2(-earth[2], -earth[0]) + LANDING_PHASE_ANGLE;
}

/**
 * Camera pose `t` seconds into the tour. `earth` is Earth's current position;
 * the last stretch of the flight slides the look-at point from the Sun onto it
 * and ends at the interactive Earth focus distance and elevation, so the camera
 * controller can keep that pose when the tour hands over.
 */
export function cinematicPose(t: number, earth: Vec3): OrbitPose {
  const tc = Math.max(0, Math.min(CINEMATIC_DURATION, t));
  const logDist = monotoneSpline(
    KEY_T,
    [...KEY_LOG_DIST_HEAD, Math.log10(planetFocusDistance(EARTH))],
    tc,
  );
  const az = cinematicLandingAzimuth(earth) - SWEEP * (1 - smoothstep(tc / CINEMATIC_DURATION));
  const el = monotoneSpline(EL_T, EL_V, tc);
  const w = smootherstep((tc - HANDOFF_START) / (CINEMATIC_DURATION - HANDOFF_START));
  return {
    center: [earth[0] * w, earth[1] * w, earth[2] * w],
    dist: 10 ** logDist,
    az,
    el,
  };
}

/**
 * Seconds a replay takes to pull back from wherever the camera was onto the
 * path. The further in the camera starts, the longer the pull-back, so it
 * stays near one decade of zoom per second instead of snapping out.
 */
export function cinematicEntrySeconds(entry: OrbitPose): number {
  const decades = Math.abs(Math.log10(START_DIST) - Math.log10(Math.max(1e-3, entry.dist)));
  return Math.max(1.5, Math.min(4.5, 1 + 0.9 * decades));
}

/**
 * The same pose with its azimuth moved by whole turns to within half a turn of
 * `referenceAz`. Do this once, when a replay captures the camera: blendPose
 * then interpolates azimuth plainly. Picking "the short way round" on every
 * frame instead would flip direction mid-blend whenever the moving path
 * crossed the point opposite the starting view.
 */
export function alignAzimuth(pose: OrbitPose, referenceAz: number): OrbitPose {
  const turns = Math.round((referenceAz - pose.az) / (2 * Math.PI));
  return turns === 0 ? pose : { ...pose, az: pose.az + turns * 2 * Math.PI };
}

/** Blend two orbit poses: distance in log space. See alignAzimuth for the angle. */
export function blendPose(a: OrbitPose, b: OrbitPose, k: number): OrbitPose {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const lerp = (x: number, y: number) => x + (y - x) * k;
  return {
    center: [lerp(a.center[0], b.center[0]), lerp(a.center[1], b.center[1]), lerp(a.center[2], b.center[2])],
    dist: 10 ** lerp(Math.log10(a.dist), Math.log10(b.dist)),
    az: lerp(a.az, b.az),
    el: lerp(a.el, b.el),
  };
}
