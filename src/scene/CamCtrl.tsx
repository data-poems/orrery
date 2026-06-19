/*
 * Camera controller — three regimes (interactive, cinematic, observe) + aim-at-sphere.
 * Sole writer of camera.position and OrbitControls.target during automated moves.
 */

import { useEffect, useRef, useCallback, useState, type ElementRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ALL_BODIES } from '../data/planets';
import { getMoonsForPlanet, moonPositionAt } from '../data/moons';
import type { CamPreset, FocusTarget } from '../lib/kepler';
import { OBSERVATORY_MODE } from '../lib/mode';
import { PREFERS_REDUCED_MOTION } from '../lib/motion';
import {
  getPositionsUpdatesPerSec,
  isOrreryDiagEnabled,
  publishOrreryDiag,
} from '../lib/orreryDiag';

const HOME_POS: [number, number, number] = [0, 30, 40];
const HOME_TGT: [number, number, number] = [0, 0, 0];

type CamPhase = 'idle' | 'settling' | 'tracking' | 'cinematic' | 'observing' | 'aiming';

export interface CamCtrlProps {
  focusTarget: FocusTarget | null;
  positions: Map<number, [number, number, number]>;
  cinematic: boolean;
  camPreset?: CamPreset | null;
  cinematicRotateSpeed: number;
  onCameraDistance?: (d: number) => void;
  aimAtSphere?: [number, number, number] | null;
  onUserGrabDuringCinematic?: () => void;
  jd: number;
  /** Fly-to-any-point focus for non-planet bodies (spacecraft, comets,
   *  asteroids). `pos` is a heliocentric world position; `dist` is how far the
   *  camera should sit from it. Treated as a static target — the settling lerp
   *  frames it like a preset, no per-frame tracking. Lower precedence than a
   *  planet focusTarget, so callers clear focusTarget when setting this. */
  pointFocus?: { pos: [number, number, number]; dist: number } | null;
}

export default function CamCtrl({
  focusTarget,
  positions,
  cinematic,
  camPreset,
  cinematicRotateSpeed,
  onCameraDistance,
  aimAtSphere,
  onUserGrabDuringCinematic,
  jd,
  pointFocus,
}: CamCtrlProps) {
  const { camera, gl, scene, raycaster } = useThree();
  // During an immersive WebXR session the headset is the sole driver of the
  // camera. Yield to it: stop writing camera.position and disable OrbitControls.
  // Detected via three's own WebXRManager events — no @react-three/xr import, so
  // this controller stays in the bundle everyone downloads while the XR runtime
  // does not (see scene/XRProvider).
  const [inXR, setInXR] = useState(false);
  useEffect(() => {
    const xr = gl.xr;
    const start = () => setInXR(true);
    const end = () => setInXR(false);
    xr.addEventListener('sessionstart', start);
    xr.addEventListener('sessionend', end);
    return () => {
      xr.removeEventListener('sessionstart', start);
      xr.removeEventListener('sessionend', end);
    };
  }, [gl]);
  const ctrlRef = useRef<ElementRef<typeof OrbitControls> | null>(null);
  const interactiveFreePreset = camPreset?.label === 'Stargazer';
  const tPos = useRef(new THREE.Vector3(...HOME_POS));
  const tLook = useRef(new THREE.Vector3(...HOME_TGT));
  const settling = useRef(true);
  const observeUserTook = useRef(false);
  const prevTrackPos = useRef(new THREE.Vector3());
  const lastDistanceReportRef = useRef(0);
  const lastDistanceValueRef = useRef(0);
  const presetTrackPos = useRef(new THREE.Vector3());
  const newTargetRef = useRef(new THREE.Vector3());
  const lastTargetChange = useRef(0);
  const phaseRef = useRef<CamPhase>('idle');
  const frameSinceTargetRef = useRef(0);
  const diagFramesRef = useRef(0);
  const diagLastTRef = useRef(0);
  const diagFpsRef = useRef(0);

  // Live Julian date, mirrored into a ref so computeFocusOffset can read the
  // current moon position WITHOUT taking jd as a callback dependency — that would
  // give computeFocusOffset a new identity every frame and re-fire the
  // target-change effect each tick (the same hazard the `positions` dep note warns
  // about below).
  const jdRef = useRef(jd);
  jdRef.current = jd;

  const offsetFromAngle = useCallback((dist: number, angle: number, elevation: number): [number, number, number] => [
    dist * Math.cos(elevation) * Math.cos(angle),
    dist * Math.sin(elevation),
    dist * Math.cos(elevation) * Math.sin(angle),
  ], []);

  const computeFocusOffset = useCallback((pp: [number, number, number]) => {
    if (focusTarget === null) return;
    if (focusTarget.moonIdx !== undefined) {
      const moons = getMoonsForPlanet(focusTarget.planetIdx);
      const moon = moons[focusTarget.moonIdx];
      if (moon) {
        // Frame the moon on its ACTUAL position, not the parent's center —
        // otherwise the parent planet sits between camera and moon and you see
        // only the orbit line (the moon hides behind the planet). Sit the camera
        // just outside the moon's orbit, looking inward, so the planet falls
        // beyond the moon and never occludes it.
        const mp = moonPositionAt(moon, pp, jdRef.current);
        let ux = mp[0] - pp[0], uy = mp[1] - pp[1], uz = mp[2] - pp[2];
        const len = Math.hypot(ux, uy, uz);
        if (len > 1e-6) { ux /= len; uy /= len; uz /= len; } else { ux = 1; uy = 0; uz = 0; }
        const d = Math.max(moon.radius * 15, 0.015);
        return {
          pos: [mp[0] + ux * d, mp[1] + uy * d + d * 0.4, mp[2] + uz * d] as [number, number, number],
          look: mp,
        };
      }
    } else {
      const planet = ALL_BODIES[focusTarget.planetIdx];
      const moons = getMoonsForPlanet(focusTarget.planetIdx);
      const maxMoonA = moons.length > 0 ? Math.max(...moons.map(m => m.a)) : 0;
      const d = Math.max(planet.radius * 8, maxMoonA * 2.5);
      const [ox, oy, oz] = offsetFromAngle(d, 0.7, 0.4);
      return { pos: [pp[0] + ox, pp[1] + oy, pp[2] + oz] as [number, number, number], look: pp };
    }
    return undefined;
  }, [focusTarget, offsetFromAngle]);

  const computePresetFollowOffset = useCallback((pp: [number, number, number], preset: CamPreset) => {
    if (preset.observe) {
      return {
        pos: [pp[0] + 0.1, pp[1], pp[2]] as [number, number, number],
        look: pp,
      };
    }
    return {
      pos: [pp[0] + preset.pos[0], pp[1] + preset.pos[1], pp[2] + preset.pos[2]] as [number, number, number],
      look: pp,
    };
  }, []);

  const planAimAtSphere = useCallback((target: [number, number, number]) => {
    const [tx, ty, tz] = target;
    const len = Math.hypot(tx, ty, tz);
    if (len < 1e-6) return false;
    const back = 8;
    const k = Math.max(0, (len - back) / len);
    tLook.current.set(tx, ty, tz);
    tPos.current.set(tx * k, ty * k, tz * k);
    phaseRef.current = 'aiming';
    return true;
  }, []);

  useEffect(() => {
    settling.current = true;
    lastTargetChange.current = performance.now();
    frameSinceTargetRef.current = 0;

    if (aimAtSphere && planAimAtSphere(aimAtSphere)) {
      observeUserTook.current = false;
      // Snap orientation: camera looks at the celestial-sphere target instantly,
      // then drifts into position. This is the "pan first, travel second" rule.
      const ctrl = ctrlRef.current;
      if (ctrl) ctrl.target.copy(tLook.current);
      return;
    }

    if (focusTarget !== null) {
      const pp = positions.get(focusTarget.planetIdx);
      if (pp) {
        const off = computeFocusOffset(pp);
        if (off) {
          tLook.current.set(...off.look);
          tPos.current.set(...off.pos);
          prevTrackPos.current.set(...pp);
          const ctrl = ctrlRef.current;
          if (ctrl) ctrl.target.copy(tLook.current);
        }
      }
      phaseRef.current = 'settling';
    } else if (pointFocus) {
      const [ox, oy, oz] = offsetFromAngle(pointFocus.dist, 0.7, 0.4);
      tPos.current.set(pointFocus.pos[0] + ox, pointFocus.pos[1] + oy, pointFocus.pos[2] + oz);
      tLook.current.set(...pointFocus.pos);
      phaseRef.current = 'settling';
      const ctrl = ctrlRef.current;
      if (ctrl) ctrl.target.copy(tLook.current);
    } else if (camPreset?.follow !== undefined) {
      const pp = positions.get(camPreset.follow);
      if (pp) {
        const followView = computePresetFollowOffset(pp, camPreset);
        tLook.current.set(...followView.look);
        tPos.current.set(...followView.pos);
        presetTrackPos.current.set(...pp);
        phaseRef.current = camPreset.observe ? 'observing' : 'settling';
        const ctrl = ctrlRef.current;
        if (ctrl) ctrl.target.copy(tLook.current);
      } else {
        tPos.current.set(...camPreset.pos);
        tLook.current.set(...camPreset.tgt);
        phaseRef.current = 'settling';
        const ctrl = ctrlRef.current;
        if (ctrl) ctrl.target.copy(tLook.current);
      }
    } else if (camPreset) {
      tPos.current.set(...camPreset.pos);
      tLook.current.set(...camPreset.tgt);
      phaseRef.current = 'settling';
      const ctrl = ctrlRef.current;
      if (ctrl) ctrl.target.copy(tLook.current);
    } else {
      tPos.current.set(...HOME_POS);
      tLook.current.set(...HOME_TGT);
      phaseRef.current = 'settling';
      const ctrl = ctrlRef.current;
      if (ctrl) ctrl.target.copy(tLook.current);
    }
    // `positions` is intentionally NOT a dep: it's a new Map every sim tick, so
    // including it re-fired this effect every frame and kept resetting settling.
    // We only need the body's position at the moment the target changes; the
    // per-frame loop tracks the live position thereafter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget, camPreset, cinematic, computeFocusOffset, computePresetFollowOffset, aimAtSphere, planAimAtSphere, pointFocus, offsetFromAngle]);

  useEffect(() => {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;
    const stop = () => {
      if (cinematic) {
        observeUserTook.current = true;
        onUserGrabDuringCinematic?.();
        return;
      }
      settling.current = false;
      observeUserTook.current = true;
    };
    ctrl.addEventListener('start', stop);
    return () => ctrl.removeEventListener('start', stop);
  }, [cinematic, onUserGrabDuringCinematic]);

  useEffect(() => {
    observeUserTook.current = false;
  }, [camPreset]);

  useFrame((_, dt) => {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;
    // In XR the headset owns the camera; don't fight it.
    if (inXR) return;

    frameSinceTargetRef.current += 1;
    diagFramesRef.current += 1;
    const diagNow = performance.now();
    if (diagNow - diagLastTRef.current >= 1000) {
      diagFpsRef.current = diagFramesRef.current;
      diagFramesRef.current = 0;
      diagLastTRef.current = diagNow;
    }

    const trackIdx = interactiveFreePreset && !cinematic
      ? focusTarget?.planetIdx ?? null
      : focusTarget?.planetIdx ?? camPreset?.follow ?? null;

    const remainDist = camera.position.distanceTo(tPos.current);
    const observeMode = camPreset?.observe ?? false;

    let phase: CamPhase = phaseRef.current;
    if (cinematic) phase = 'cinematic';
    else if (aimAtSphere) phase = 'aiming';
    else if (observeMode) phase = observeUserTook.current ? 'tracking' : 'observing';
    else if (trackIdx !== null) phase = settling.current ? 'settling' : 'tracking';
    else if (settling.current) phase = 'settling';
    else phase = 'idle';
    phaseRef.current = phase;

    const smoothBase = cinematic ? 0.6 : observeMode ? 0.5 : 1.0;

    const smoothBoost = cinematic
      ? (remainDist > 10000 ? 0.35 : remainDist > 1000 ? 0.2 : remainDist > 100 ? 0.1 : 0)
      : observeMode
        ? 0
        : (remainDist > 10000 ? 0.8 : remainDist > 1000 ? 0.5 : remainDist > 100 ? 0.2 : 0);
    // Reduced motion: snap to the destination instead of easing toward it.
    const posAlpha = PREFERS_REDUCED_MOTION ? 1 : 1 - Math.exp(-(smoothBase + smoothBoost) * dt);
    // Look-at converges ~5x faster than position so the camera always faces
    // its destination during the travel — pan/tilt finishes long before the
    // dolly does. Without this the camera arrives "from the side" of the target.
    const lookAlpha = PREFERS_REDUCED_MOTION ? 1 : 1 - Math.exp(-(smoothBase + smoothBoost) * 5 * dt);
    const settleThreshold = remainDist > 10000 ? 120 : remainDist > 1000 ? 32 : remainDist > 100 ? 3 : 0.035;

    const dampingWhileSettling = settling.current || cinematic || (observeMode && !observeUserTook.current);
    ctrl.dampingFactor = dampingWhileSettling ? 0.04 : 0.08;

    if (phase === 'cinematic' || cinematic) {
      if (trackIdx !== null) {
        const pp = positions.get(trackIdx);
        if (pp) {
          const off = focusTarget !== null ? computeFocusOffset(pp) : camPreset ? computePresetFollowOffset(pp, camPreset) : null;
          if (off) {
            tPos.current.set(...off.pos);
            tLook.current.set(...off.look);
          } else {
            tLook.current.set(...pp);
          }
        }
      }
      camera.position.lerp(tPos.current, posAlpha);
      ctrl.target.lerp(tLook.current, lookAlpha);
    } else if (trackIdx !== null) {
      const pp = positions.get(trackIdx);
      if (pp) {
        const newTarget = newTargetRef.current.set(...pp);

        if (settling.current || (observeMode && !observeUserTook.current)) {
          const off = focusTarget !== null ? computeFocusOffset(pp) : camPreset ? computePresetFollowOffset(pp, camPreset) : null;
          if (off) {
            tPos.current.set(...off.pos);
            tLook.current.set(...off.look);
          } else {
            tLook.current.copy(newTarget);
          }

          camera.position.lerp(tPos.current, posAlpha);
          ctrl.target.lerp(tLook.current, lookAlpha);
          if (!observeMode && camera.position.distanceTo(tPos.current) < settleThreshold) {
            settling.current = false;
            prevTrackPos.current.copy(newTarget);
            presetTrackPos.current.copy(newTarget);
          }
        } else {
          const prevTrackedPos = focusTarget !== null ? prevTrackPos.current : presetTrackPos.current;
          const delta = newTarget.clone().sub(prevTrackedPos);
          if (delta.length() > 0.00001) {
            camera.position.add(delta);
            ctrl.target.add(delta);
          }
        }
        if (focusTarget !== null) prevTrackPos.current.copy(newTarget);
        else presetTrackPos.current.copy(newTarget);
      }
    } else if (phase === 'aiming' || settling.current) {
      camera.position.lerp(tPos.current, posAlpha);
      ctrl.target.lerp(tLook.current, lookAlpha);
      if (camera.position.distanceTo(tPos.current) < settleThreshold) {
        settling.current = false;
      }
    }

    if (onCameraDistance) {
      const distance = camera.position.length();
      const now = performance.now();
      if (
        now - lastDistanceReportRef.current > 120 &&
        Math.abs(distance - lastDistanceValueRef.current) > Math.max(0.05, distance * 0.01)
      ) {
        lastDistanceReportRef.current = now;
        lastDistanceValueRef.current = distance;
        onCameraDistance(distance);
      }
    }

    if (isOrreryDiagEnabled()) {
      publishOrreryDiag({
        fps: diagFpsRef.current,
        rendersPerSec: diagFpsRef.current,
        cameraDistance: camera.position.length(),
        remainDist,
        settling: settling.current,
        tPosMag: tPos.current.length(),
        framesSinceTargetChange: frameSinceTargetRef.current,
        positionsUpdatesPerSec: getPositionsUpdatesPerSec(),
        phase: phaseRef.current,
        cinematic,
      });
      // Dev-only canvas probe for headless repro of click/focus bugs. Gated on the
      // diag flag so the default Orrery path is untouched in production. Exposes the
      // live focus state and a world→CSS-pixel projector so a test harness can click
      // a body by index without guessing coordinates. Remove with the harness.
      const rect = gl.domElement.getBoundingClientRect();
      (window as unknown as { __orreryProbe?: unknown }).__orreryProbe = {
        focusPlanetIdx: focusTarget?.planetIdx ?? null,
        focusMoonIdx: focusTarget?.moonIdx ?? null,
        pointFocus: pointFocus ? { pos: pointFocus.pos, dist: pointFocus.dist } : null,
        phase: phaseRef.current,
        cameraDistance: camera.position.length(),
        camPos: [camera.position.x, camera.position.y, camera.position.z],
        bodyScreen: (idx: number) => {
          const p = positions.get(idx);
          if (!p) return null;
          const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera);
          if (v.z > 1) return null; // behind camera
          return {
            x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
            y: rect.top + (-v.y * 0.5 + 0.5) * rect.height,
            onscreen: v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1,
          };
        },
        raycastAt: (cssX: number, cssY: number) => {
          const ndc = new THREE.Vector2(
            ((cssX - rect.left) / rect.width) * 2 - 1,
            -(((cssY - rect.top) / rect.height) * 2 - 1),
          );
          raycaster.setFromCamera(ndc, camera);
          const hits = raycaster.intersectObjects(scene.children, true);
          return hits.slice(0, 6).map((h) => ({
            dist: Math.round(h.distance * 1000) / 1000,
            order: h.object.renderOrder,
            type: h.object.type,
            hasClick: typeof (h.object as unknown as { __r3f?: { handlers?: { onClick?: unknown } } }).__r3f?.handlers?.onClick === 'function',
          }));
        },
        moonScreen: (planetIdx: number, moonIdx: number) => {
          const pp = positions.get(planetIdx);
          if (!pp) return null;
          const moons = getMoonsForPlanet(planetIdx);
          const moon = moons[moonIdx];
          if (!moon) return null;
          const mp = moonPositionAt(moon, pp, jdRef.current);
          const v = new THREE.Vector3(mp[0], mp[1], mp[2]).project(camera);
          if (v.z > 1) return null;
          return {
            name: moon.name,
            x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
            y: rect.top + (-v.y * 0.5 + 0.5) * rect.height,
            onscreen: v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1,
          };
        },
      };
    }

    ctrl.update();
  });

  return (
    <OrbitControls
      ref={ctrlRef}
      enabled={!inXR}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.05}
      maxDistance={200000}
      autoRotate={!inXR && !PREFERS_REDUCED_MOTION && (cinematic || camPreset?.autoRotate || false)}
      autoRotateSpeed={cinematic ? cinematicRotateSpeed * 0.78 : camPreset?.autoRotate ? 0.1 : 0}
      rotateSpeed={OBSERVATORY_MODE ? -1 : 1}
    />
  );
}
