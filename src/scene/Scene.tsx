/*
 * Scene composition — camera, lighting, all 3D elements
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ALL_BODIES } from '../data/planets';
import type { PlanetDef, NEO, CamPreset, FocusTarget } from '../lib/kepler';
import { planetXYZ } from '../lib/kepler';
import { Sun, Planet, Moon, OrbitRing } from './Bodies';
import { AsteroidBelt, NeoDot, AsteroidOrbitLine } from './Asteroids';
import { StarField, ConstellationLines, ConstellationLabels, MilkyWayBand } from './Stars';
import { useTheme } from '../lib/themes';

// ─── AU reference grid ──────────────────────────────────────────────────────────

function AUGrid() {
  return (
    <group>
      {[1, 2, 5, 10, 20, 30].map(r => (
        <mesh key={r} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.003, r + 0.003, 128]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.025} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Camera controller ──────────────────────────────────────────────────────────

function CamCtrl({ preset, focusTarget, positions }: {
  preset: CamPreset;
  focusTarget: FocusTarget | null;
  positions: Map<number, [number, number, number]>;
}) {
  const { camera } = useThree();
  const ctrlRef = useRef<any>(null);
  const tPos = useRef(new THREE.Vector3(...preset.pos));
  const tLook = useRef(new THREE.Vector3(...preset.tgt));

  useEffect(() => {
    if (focusTarget !== null) {
      const pp = positions.get(focusTarget.planetIdx);
      if (pp) {
        const planet = ALL_BODIES[focusTarget.planetIdx];
        const offset = planet.radius * 8 + planet.a * 0.15;
        tLook.current = new THREE.Vector3(...pp);
        tPos.current = new THREE.Vector3(pp[0] + offset, pp[1] + offset * 0.4, pp[2] + offset);
      }
    } else {
      let p = new THREE.Vector3(...preset.pos);
      let l = new THREE.Vector3(...preset.tgt);
      if (preset.follow !== undefined) {
        const pp = positions.get(preset.follow);
        if (pp) { l = new THREE.Vector3(...pp); p = l.clone().add(new THREE.Vector3(0.3, 0.25, 0.5)); }
      }
      tPos.current = p;
      tLook.current = l;
    }
  }, [preset, focusTarget, positions]);

  useFrame(() => {
    if (focusTarget !== null) {
      const pp = positions.get(focusTarget.planetIdx);
      if (pp) {
        const planet = ALL_BODIES[focusTarget.planetIdx];
        const offset = planet.radius * 8 + planet.a * 0.15;
        tLook.current.set(...pp);
        tPos.current.set(pp[0] + offset, pp[1] + offset * 0.4, pp[2] + offset);
      }
    }
    camera.position.lerp(tPos.current, 0.03);
    if (ctrlRef.current) {
      ctrlRef.current.target.lerp(tLook.current, 0.03);
      ctrlRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={ctrlRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={0.05}
      maxDistance={200}
      autoRotate={!focusTarget && !!preset.autoRotate}
      autoRotateSpeed={0.25}
    />
  );
}

// ─── Scene ──────────────────────────────────────────────────────────────────────

export interface SceneProps {
  jd: number; T: number;
  neos: NEO[]; selNeo: NEO | null; setSelNeo: (n: NEO | null) => void;
  selPlanet: number | null; setSelPlanet: (i: number | null) => void;
  camPreset: CamPreset;
  focusTarget: FocusTarget | null;
  onPositionsUpdate: (m: Map<number, [number, number, number]>) => void;
  showDwarf: boolean;
  showStars: boolean;
  showConstellations: boolean;
}

export default function Scene({
  jd, T, neos, selNeo, setSelNeo, selPlanet, setSelPlanet,
  camPreset, focusTarget, onPositionsUpdate, showDwarf,
  showStars, showConstellations,
}: SceneProps) {
  const [hov, setHov] = useState<number | null>(null);
  const { scene } = useThree();
  const { theme } = useTheme();

  // Set black background
  useEffect(() => { scene.background = new THREE.Color('#000000'); }, [scene]);

  const positions = useMemo(() => {
    const m = new Map<number, [number, number, number]>();
    ALL_BODIES.forEach((p: PlanetDef, i: number) => m.set(i, planetXYZ(p, T)));
    return m;
  }, [T]);

  useEffect(() => { onPositionsUpdate(positions); }, [positions, onPositionsUpdate]);

  const ep = (positions.get(2) || [1, 0, 0]) as [number, number, number];

  // Filter bodies based on dwarf toggle
  const visibleBodies = showDwarf ? ALL_BODIES : ALL_BODIES.filter(b => !b.isDwarf);

  return (
    <>
      <ambientLight intensity={0.05} />
      <Sun />
      <Moon earthPos={ep} jd={jd} />
      <AUGrid />
      <AsteroidBelt />
      {visibleBodies.map((p) => {
        // Map back to ALL_BODIES index for consistent selection
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
      <CamCtrl preset={camPreset} focusTarget={focusTarget} positions={positions} />
    </>
  );
}
