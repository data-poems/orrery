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
import { Sun, Planet, OrbitRing, Satellite as MoonSatellite, SatelliteOrbit } from './Bodies';
import { AsteroidBelt, RealAsteroidBelt, NeoDot, AsteroidOrbitLine } from './Asteroids';
import { StarField, ConstellationLines, ConstellationLabels } from './Stars';
import { CometField } from './Comets';
import { MeteorField } from './Meteors';
import { SatelliteField } from './Satellites';
import type { CometDef } from '../data/comets';
import type { MeteorShower } from './Meteors';
import type { SatellitePosition } from '../lib/satellites';

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
      const moons = getMoonsForPlanet(focusTarget.planetIdx);
      const maxMoonA = moons.length > 0 ? Math.max(...moons.map(m => m.a)) : 0;
      const d = Math.max(planet.radius * 8, maxMoonA * 2.5);
      const [ox, oy, oz] = offsetFromAngle(d, 0.7, 0.4);
      return { pos: [pp[0] + ox, pp[1] + oy, pp[2] + oz] as [number, number, number], look: pp };
    }
    return undefined;
  };

  // Trigger transition on focus or preset changes
  // Both cinematic and interactive use the same settling approach so the
  // zoom feel is identical (snappy lerp instead of floaty two-stage drift).
  useEffect(() => {
    settling.current = true;
    if (focusTarget !== null) {
      const pp = positions.get(focusTarget.planetIdx);
      if (pp) {
        const off = computeFocusOffset(pp);
        if (off) {
          tLook.current.set(...off.look);
          tPos.current.set(...off.pos);
          prevTrackPos.current.set(...pp);
        }
      }
    } else if (camPreset) {
      tPos.current.set(...camPreset.pos);
      tLook.current.set(...camPreset.tgt);
    } else {
      tPos.current.set(...HOME_POS);
      tLook.current.set(...HOME_TGT);
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

    // Distance-adaptive lerp: faster when far from target so deep-space
    // transitions (Oort→Galaxy) don't crawl through empty blackness.
    const remainDist = camera.position.distanceTo(tPos.current);
    const lerpFactor = cinematic
      ? (remainDist > 1000 ? 0.03 : remainDist > 100 ? 0.02 : 0.015)
      : (remainDist > 1000 ? 0.06 : remainDist > 100 ? 0.045 : 0.03);
    const settleThreshold = remainDist > 1000 ? 50 : remainDist > 100 ? 5 : 0.05;

    // In cinematic mode, always keep gliding (never settle)
    if (cinematic) {
      // Update target position for tracked planets
      if (trackIdx !== null) {
        const pp = positions.get(trackIdx);
        if (pp) {
          if (focusTarget !== null && focusTarget.moonIdx === undefined) {
            const planet = ALL_BODIES[trackIdx];
            const moons = getMoonsForPlanet(trackIdx);
            const maxMoonA = moons.length > 0 ? Math.max(...moons.map(m => m.a)) : 0;
            const d = Math.max(planet.radius * 8, maxMoonA * 2.5);
            const [ox, oy, oz] = offsetFromAngle(d, 0.7, 0.4);
            tPos.current.set(pp[0] + ox, pp[1] + oy, pp[2] + oz);
          }
          tLook.current.set(...pp);
        }
      }
      // Continuously glide toward current target
      camera.position.lerp(tPos.current, lerpFactor);
      if (ctrl) ctrl.target.lerp(tLook.current, lerpFactor);
    } else if (trackIdx !== null) {
      // Interactive planet tracking
      const pp = positions.get(trackIdx);
      if (pp) {
        const newTarget = new THREE.Vector3(...pp);

        if (settling.current) {
          if (focusTarget !== null && focusTarget.moonIdx === undefined) {
            const planet = ALL_BODIES[trackIdx];
            const moons = getMoonsForPlanet(trackIdx);
            const maxMoonA = moons.length > 0 ? Math.max(...moons.map(m => m.a)) : 0;
            const d = Math.max(planet.radius * 8, maxMoonA * 2.5);
            const [ox, oy, oz] = offsetFromAngle(d, 0.7, 0.4);
            tPos.current.set(pp[0] + ox, pp[1] + oy, pp[2] + oz);
          }
          tLook.current.copy(newTarget);
          camera.position.lerp(tPos.current, lerpFactor);
          if (ctrl) ctrl.target.lerp(tLook.current, lerpFactor);
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
        camera.position.lerp(tPos.current, lerpFactor);
        if (ctrl) ctrl.target.lerp(tLook.current, lerpFactor);
        if (camera.position.distanceTo(tPos.current) < settleThreshold) {
          settling.current = false;
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
  simTime: Date;
  neos: NEO[]; selNeo: NEO | null; setSelNeo: (n: NEO | null) => void;
  selPlanet: number | null; setSelPlanet: (i: number | null) => void;
  focusTarget: FocusTarget | null;
  onPositionsUpdate: (m: Map<number, [number, number, number]>) => void;
  showDwarf: boolean;
  showStars: boolean;
  showConstellations: boolean;
  showAsteroidBelt: boolean;
  showComets: boolean;
  showMeteors: boolean;
  showSatellites: boolean;
  constellationFocus: boolean;
  cinematic: boolean;
  onMoonSelect?: (planetIdx: number, moonIdx: number) => void;
  selMoonIdx?: number | null;
  onCameraDistance?: (d: number) => void;
  camPreset?: CamPreset | null;
  selComet: CometDef | null; setSelComet: (c: CometDef | null) => void;
  selMeteor: MeteorShower | null; setSelMeteor: (m: MeteorShower | null) => void;
  selSatellite: SatellitePosition | null; setSelSatellite: (s: SatellitePosition | null) => void;
}

export default function Scene({
  jd, T, simTime, neos, selNeo, setSelNeo, selPlanet, setSelPlanet,
  focusTarget, onPositionsUpdate, showDwarf,
  showStars, showConstellations, showAsteroidBelt,
  showComets, showMeteors, showSatellites,
  constellationFocus, cinematic, onMoonSelect, selMoonIdx, onCameraDistance, camPreset,
  selComet, setSelComet, selMeteor, setSelMeteor, selSatellite, setSelSatellite,
}: SceneProps) {
  const [hov, setHov] = useState<number | null>(null);
  const [hovMoon, setHovMoon] = useState<number | null>(null);
  const { scene } = useThree();
  useEffect(() => { scene.background = new THREE.Color('#000000'); }, [scene]);

  const positions = useMemo(() => {
    const m = new Map<number, [number, number, number]>();
    ALL_BODIES.forEach((p: PlanetDef, i: number) => m.set(i, planetXYZ(p, T)));
    return m;
  }, [T]);

  useEffect(() => { onPositionsUpdate(positions); }, [positions, onPositionsUpdate]);

  const visibleBodies = showDwarf ? ALL_BODIES : ALL_BODIES.filter(b => !b.isDwarf);

  const handleCameraDistance = onCameraDistance;

  return (
    <>
      <ambientLight intensity={0.15} />
      <Sun />
      <AUGrid />
      {showAsteroidBelt && !showComets && <AsteroidBelt />}
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
              moonFocused={focusTarget?.planetIdx === bodyIdx && focusTarget?.moonIdx !== undefined}
            />
          </group>
        );
      })}
      {/* Render moons for all visible bodies */}
      {visibleBodies.map((body) => {
        const bodyIdx = ALL_BODIES.indexOf(body);
        const moons = getMoonsForPlanet(bodyIdx);
        const parentPos = positions.get(bodyIdx);
        if (!parentPos || moons.length === 0) return null;
        const isFocused = selPlanet === bodyIdx;
        return moons.map((moon, mIdx) => (
          <group key={moon.name}>
            {isFocused && <SatelliteOrbit moon={moon} parentPos={parentPos} />}
            <MoonSatellite
              moon={moon}
              parentPos={parentPos}
              jd={jd}
              selected={isFocused && selMoonIdx === mIdx}
              onSelect={isFocused && onMoonSelect ? () => onMoonSelect(bodyIdx, mIdx) : undefined}
              hovered={isFocused && hovMoon === mIdx}
              onHover={isFocused ? (h => setHovMoon(h ? mIdx : null)) : undefined}
            />
          </group>
        ));
      })}
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
      <ConstellationLines visible={showConstellations} focus={constellationFocus} />
      <ConstellationLabels visible={showConstellations} focus={constellationFocus} />
      <CometField
        jd={jd}
        visible={showComets}
        selComet={selComet}
        setSelComet={setSelComet}
      />
      <MeteorField
        jd={jd}
        visible={showMeteors}
        selMeteor={selMeteor}
        setSelMeteor={setSelMeteor}
      />
      <SatelliteField
        visible={showSatellites}
        simTime={simTime}
        earthPos={positions.get(2) ?? null}
        selSatellite={selSatellite}
        setSelSatellite={setSelSatellite}
      />
      {showAsteroidBelt && <RealAsteroidBelt jd={jd} />}
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
