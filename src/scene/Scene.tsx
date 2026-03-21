/*
 * Scene composition — camera, lighting, all 3D elements
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ALL_BODIES } from '../data/planets';
import { getMoonsForPlanet } from '../data/moons';
import type { PlanetDef, NEO, FocusTarget, CamPreset } from '../lib/kepler';
import { planetXYZ } from '../lib/kepler';
import { Sun, Planet, OrbitRing, Satellite, SatelliteOrbit } from './Bodies';
import { AsteroidBelt, NeoDot, AsteroidOrbitLine } from './Asteroids';
import { StarField, ConstellationLines, ConstellationLabels, MilkyWayBand } from './Stars';
import { ScaleMarkers, OortCloud, GalaxyDisc } from './DeepSpace';
import { useTheme } from '../lib/themes';

// Default home camera position (replaces CAMS[1] "System" view)
const HOME_POS: [number, number, number] = [0, 30, 40];
const HOME_TGT: [number, number, number] = [0, 0, 0];

// ─── AU reference grid ──────────────────────────────────────────────────────────

function AUGrid() {
  return (
    <group>
      {[1, 2, 5, 10, 20, 30, 50, 100].map(r => (
        <mesh key={r} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.003, r + 0.003, 128]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.025} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Camera controller ──────────────────────────────────────────────────────────

function CamCtrl({ focusTarget, positions, cinematic, camPreset, onCameraDistance }: {
  focusTarget: FocusTarget | null;
  positions: Map<number, [number, number, number]>;
  cinematic: boolean;
  camPreset?: CamPreset | null;
  onCameraDistance?: (d: number) => void;
}) {
  const { camera } = useThree();
  const ctrlRef = useRef<any>(null);
  const tPos = useRef(new THREE.Vector3(...HOME_POS));
  const tLook = useRef(new THREE.Vector3(...HOME_TGT));
  const settling = useRef(true);
  const prevTrackPos = useRef(new THREE.Vector3());
  // Goal refs for cinematic — tPos/tLook smoothly drift toward these
  const goalPos = useRef(new THREE.Vector3(...HOME_POS));
  const goalLook = useRef(new THREE.Vector3(...HOME_TGT));

  // Compute camera offset from angle/elevation/distance
  const offsetFromAngle = (dist: number, angle: number, elevation: number): [number, number, number] => [
    dist * Math.cos(elevation) * Math.cos(angle),
    dist * Math.sin(elevation),
    dist * Math.cos(elevation) * Math.sin(angle),
  ];

  // Compute focus offset for a planet or moon
  const computeFocusOffset = (pp: [number, number, number]) => {
    if (focusTarget === null) return;
    if (focusTarget.moonIdx !== undefined) {
      const moons = getMoonsForPlanet(focusTarget.planetIdx);
      const moon = moons[focusTarget.moonIdx];
      if (moon) {
        const d = moon.radius * 15;
        const [ox, oy, oz] = offsetFromAngle(d, 0.7, 0.4);
        return { pos: [pp[0] + ox, pp[1] + oy, pp[2] + oz] as [number, number, number], look: pp };
      }
    } else {
      const planet = ALL_BODIES[focusTarget.planetIdx];
      const d = planet.radius * 8 + planet.a * 0.15;
      const [ox, oy, oz] = offsetFromAngle(d, 0.7, 0.4);
      return { pos: [pp[0] + ox, pp[1] + oy, pp[2] + oz] as [number, number, number], look: pp };
    }
    return undefined;
  };

  // Trigger transition on focus or preset changes
  useEffect(() => {
    settling.current = true;
    if (focusTarget !== null) {
      const pp = positions.get(focusTarget.planetIdx);
      if (pp) {
        const off = computeFocusOffset(pp);
        if (off) {
          if (cinematic) {
            goalLook.current.set(...off.look);
            goalPos.current.set(...off.pos);
          } else {
            tLook.current.set(...off.look);
            tPos.current.set(...off.pos);
            prevTrackPos.current.set(...pp);
          }
        }
      }
    } else if (camPreset) {
      if (cinematic) {
        goalPos.current.set(...camPreset.pos);
        goalLook.current.set(...camPreset.tgt);
      } else {
        tPos.current.set(...camPreset.pos);
        tLook.current.set(...camPreset.tgt);
      }
    } else {
      if (cinematic) {
        goalPos.current.set(...HOME_POS);
        goalLook.current.set(...HOME_TGT);
      } else {
        tPos.current.set(...HOME_POS);
        tLook.current.set(...HOME_TGT);
      }
    }
  }, [focusTarget, camPreset, cinematic]);

  // Stop transition when user grabs orbit controls
  useEffect(() => {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;
    const stop = () => { if (!cinematic) settling.current = false; };
    ctrl.addEventListener('start', stop);
    return () => ctrl.removeEventListener('start', stop);
  });

  useFrame(() => {
    const ctrl = ctrlRef.current;
    const trackIdx = focusTarget?.planetIdx ?? null;

    if (cinematic) {
      // ── Cinematic: two-stage smooth interpolation ──
      // Stage 1: goalPos/goalLook are the destination (set on step change).
      //          tPos/tLook drift smoothly toward goals — no snapping.
      // Stage 2: Camera drifts toward the smoothly-moving tPos.
      // Result: smooth curves between viewpoints, no abrupt direction changes.

      // Update goal to track planet if focused
      if (trackIdx !== null) {
        const pp = positions.get(trackIdx);
        if (pp) {
          const off = computeFocusOffset(pp);
          if (off) {
            goalPos.current.set(...off.pos);
            goalLook.current.set(...off.look);
          }
        }
      }

      // Stage 1: smooth goal tracking (adaptive rate based on distance)
      const goalDist = tPos.current.distanceTo(goalPos.current);
      const goalRate = goalDist > 1000 ? 0.025 : goalDist > 50 ? 0.012 : 0.006;
      tPos.current.lerp(goalPos.current, goalRate);
      tLook.current.lerp(goalLook.current, goalRate);

      // Stage 2: camera follows the smoothly-moving waypoint
      camera.position.lerp(tPos.current, 0.035);
      if (ctrl) ctrl.target.lerp(tLook.current, 0.035);

    } else {
      // ── Interactive mode: existing behavior ──
      if (trackIdx !== null) {
        const pp = positions.get(trackIdx);
        if (pp) {
          const newTarget = new THREE.Vector3(...pp);

          if (settling.current) {
            if (focusTarget !== null && focusTarget.moonIdx === undefined) {
              const planet = ALL_BODIES[trackIdx];
              const d = planet.radius * 8 + planet.a * 0.15;
              const [ox, oy, oz] = offsetFromAngle(d, 0.7, 0.4);
              tPos.current.set(pp[0] + ox, pp[1] + oy, pp[2] + oz);
            }
            tLook.current.copy(newTarget);
            camera.position.lerp(tPos.current, 0.03);
            if (ctrl) ctrl.target.lerp(tLook.current, 0.03);
            if (camera.position.distanceTo(tPos.current) < 0.1) {
              settling.current = false;
            }
          } else {
            const delta = newTarget.clone().sub(prevTrackPos.current);
            if (delta.length() > 0.00001) {
              camera.position.add(delta);
              if (ctrl) ctrl.target.add(delta);
            }
          }
          prevTrackPos.current.copy(newTarget);
        }
      } else {
        if (settling.current) {
          camera.position.lerp(tPos.current, 0.03);
          if (ctrl) ctrl.target.lerp(tLook.current, 0.03);
          if (camera.position.distanceTo(tPos.current) < 0.05) {
            settling.current = false;
          }
        }
      }
    }

    // Report camera distance for UI (scale indicator)
    if (onCameraDistance) {
      onCameraDistance(camera.position.length());
    }

    if (ctrl) ctrl.update();
  });

  return (
    <OrbitControls
      ref={ctrlRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={0.05}
      maxDistance={100000}
      autoRotate={cinematic || camPreset?.autoRotate || false}
      autoRotateSpeed={cinematic ? 0.5 : camPreset?.autoRotate ? 0.15 : 0}
    />
  );
}

// ─── Scene ──────────────────────────────────────────────────────────────────────

export interface SceneProps {
  jd: number; T: number;
  neos: NEO[]; selNeo: NEO | null; setSelNeo: (n: NEO | null) => void;
  selPlanet: number | null; setSelPlanet: (i: number | null) => void;
  focusTarget: FocusTarget | null;
  onPositionsUpdate: (m: Map<number, [number, number, number]>) => void;
  showDwarf: boolean;
  showStars: boolean;
  showConstellations: boolean;
  showAsteroidBelt: boolean;
  showMilkyWay: boolean;
  showDeepSpace: boolean;
  constellationFocus: boolean;
  cinematic: boolean;
  onMoonSelect?: (planetIdx: number, moonIdx: number) => void;
  selMoonIdx?: number | null;
  onCameraDistance?: (d: number) => void;
  camPreset?: CamPreset | null;
}

export default function Scene({
  jd, T, neos, selNeo, setSelNeo, selPlanet, setSelPlanet,
  focusTarget, onPositionsUpdate, showDwarf,
  showStars, showConstellations, showAsteroidBelt, showMilkyWay, showDeepSpace,
  constellationFocus, cinematic, onMoonSelect, selMoonIdx, onCameraDistance, camPreset,
}: SceneProps) {
  const [hov, setHov] = useState<number | null>(null);
  const [hovMoon, setHovMoon] = useState<number | null>(null);
  const { scene } = useThree();
  const { theme } = useTheme();
  useEffect(() => { scene.background = new THREE.Color('#000000'); }, [scene]);

  const positions = useMemo(() => {
    const m = new Map<number, [number, number, number]>();
    ALL_BODIES.forEach((p: PlanetDef, i: number) => m.set(i, planetXYZ(p, T)));
    return m;
  }, [T]);

  useEffect(() => { onPositionsUpdate(positions); }, [positions, onPositionsUpdate]);

  const ep = (positions.get(2) || [1, 0, 0]) as [number, number, number];

  const visibleBodies = showDwarf ? ALL_BODIES : ALL_BODIES.filter(b => !b.isDwarf);

  // Moons for the focused planet (only rendered when planet is selected)
  const focusedMoons = selPlanet !== null ? getMoonsForPlanet(selPlanet) : [];
  const focusedParentPos = selPlanet !== null ? positions.get(selPlanet) : null;

  const handleCameraDistance = onCameraDistance;

  return (
    <>
      <ambientLight intensity={0.15} />
      <Sun />
      <AUGrid />
      {showAsteroidBelt && <AsteroidBelt />}
      {visibleBodies.map((p) => {
        const bodyIdx = ALL_BODIES.indexOf(p);
        return (
          <group key={p.name}>
            <OrbitRing
              planet={p} T={T}
              dim={selPlanet !== null && selPlanet !== bodyIdx}
              highlighted={selPlanet === bodyIdx}
            />
            <Planet
              planet={p} T={T}
              selected={selPlanet === bodyIdx}
              onSelect={() => setSelPlanet(selPlanet === bodyIdx ? null : bodyIdx)}
              hovered={hov === bodyIdx}
              onHover={h => setHov(h ? bodyIdx : null)}
            />
          </group>
        );
      })}
      {/* Render moons for focused planet */}
      {focusedParentPos && focusedMoons.map((moon, mIdx) => (
        <group key={moon.name}>
          <SatelliteOrbit moon={moon} parentPos={focusedParentPos} />
          <Satellite
            moon={moon}
            parentPos={focusedParentPos}
            jd={jd}
            selected={selMoonIdx === mIdx}
            onSelect={onMoonSelect ? () => onMoonSelect(selPlanet!, mIdx) : undefined}
            hovered={hovMoon === mIdx}
            onHover={h => setHovMoon(h ? mIdx : null)}
          />
        </group>
      ))}
      {/* Always render Earth's Moon even when Earth isn't focused */}
      {selPlanet !== 2 && (() => {
        const earthMoons = getMoonsForPlanet(2);
        return earthMoons.map(moon => (
          <Satellite key={moon.name} moon={moon} parentPos={ep} jd={jd} />
        ));
      })()}
      {neos.map(neo => (
        <group key={neo.id}>
          <NeoDot
            neo={neo} jd={jd}
            selected={selNeo?.id === neo.id}
            onSelect={() => setSelNeo(selNeo?.id === neo.id ? null : neo)}
          />
          {selNeo?.id === neo.id && <AsteroidOrbitLine neo={neo} />}
        </group>
      ))}
      <StarField visible={showStars} />
      <ConstellationLines visible={showConstellations} theme={theme} focus={constellationFocus} />
      <ConstellationLabels visible={showConstellations} focus={constellationFocus} />
      <MilkyWayBand visible={showMilkyWay} theme={theme} />
      {showDeepSpace && <ScaleMarkers />}
      {showDeepSpace && <OortCloud />}
      {showDeepSpace && <GalaxyDisc />}
      <CamCtrl
        focusTarget={focusTarget}
        positions={positions}
        cinematic={cinematic}
        camPreset={camPreset}
        onCameraDistance={handleCameraDistance}
      />
    </>
  );
}
