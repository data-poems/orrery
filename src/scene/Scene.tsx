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
import { StarField, ConstellationLines, ConstellationLabels } from './Stars';
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

  // Trigger transition on focus or preset changes
  useEffect(() => {
    settling.current = true;
    if (focusTarget !== null) {
      const pp = positions.get(focusTarget.planetIdx);
      if (pp) {
        if (focusTarget.moonIdx !== undefined) {
          const moons = getMoonsForPlanet(focusTarget.planetIdx);
          const moon = moons[focusTarget.moonIdx];
          if (moon) {
            const offset = moon.radius * 15;
            tLook.current.set(...pp);
            tPos.current.set(pp[0] + offset, pp[1] + offset * 0.4, pp[2] + offset);
            prevTrackPos.current.set(...pp);
          }
        } else {
          const planet = ALL_BODIES[focusTarget.planetIdx];
          const offset = planet.radius * 8 + planet.a * 0.15;
          tLook.current.set(...pp);
          tPos.current.set(pp[0] + offset, pp[1] + offset * 0.4, pp[2] + offset);
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
  }, [focusTarget, camPreset]);

  // Stop transition when user grabs orbit controls
  useEffect(() => {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;
    const stop = () => { settling.current = false; };
    ctrl.addEventListener('start', stop);
    return () => ctrl.removeEventListener('start', stop);
  });

  useFrame(() => {
    const ctrl = ctrlRef.current;
    const trackIdx = focusTarget?.planetIdx ?? null;

    if (trackIdx !== null) {
      const pp = positions.get(trackIdx);
      if (pp) {
        const newTarget = new THREE.Vector3(...pp);

        if (settling.current) {
          if (focusTarget !== null && focusTarget.moonIdx === undefined) {
            const planet = ALL_BODIES[trackIdx];
            const offset = planet.radius * 8 + planet.a * 0.15;
            tPos.current.set(pp[0] + offset, pp[1] + offset * 0.4, pp[2] + offset);
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
      autoRotateSpeed={cinematic ? 0.15 : camPreset?.autoRotate ? 0.15 : 0}
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
  cinematic: boolean;
  onMoonSelect?: (planetIdx: number, moonIdx: number) => void;
  selMoonIdx?: number | null;
  onCameraDistance?: (d: number) => void;
  camPreset?: CamPreset | null;
}

export default function Scene({
  jd, T, neos, selNeo, setSelNeo, selPlanet, setSelPlanet,
  focusTarget, onPositionsUpdate, showDwarf,
  showStars, showConstellations, cinematic,
  onMoonSelect, selMoonIdx, onCameraDistance, camPreset,
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
      <ambientLight intensity={0.05} />
      <Sun />
      <AUGrid />
      <AsteroidBelt />
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
      <ConstellationLines visible={showConstellations} theme={theme} />
      <ConstellationLabels visible={showConstellations} />
      <ScaleMarkers />
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
