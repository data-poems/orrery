/*
 * Scene composition — camera, lighting, all 3D elements
 */

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import * as THREE from 'three';
import { ALL_BODIES } from '../data/planets';
import { getMoonsForPlanet } from '../data/moons';
import type { PlanetDef, NEO, FocusTarget, CamPreset } from '../lib/kepler';
import { planetXYZ } from '../lib/kepler';
import { Sun, Planet, OrbitRing, Satellite as MoonSatellite, SatelliteOrbit } from './Bodies';
import { RealAsteroidBelt, NeoDot, AsteroidOrbitLine } from './Asteroids';
import { StarField, ConstellationLines, ConstellationLabels } from './Stars';
import { AsterismField } from './Asterisms';
import { DeepSkyField } from './DeepSky';
import { OBSERVATORY_MODE } from '../lib/mode';
import { CometField } from './Comets';
import { MeteorField } from './Meteors';
import { SatelliteField } from './Satellites';
import { DeepSpaceField } from './DeepSpace';
import CamCtrl from './CamCtrl';
import { bumpPositionsUpdateCounter } from '../lib/orreryDiag';
import type { CometDef } from '../data/comets';
import type { MeteorShower } from './Meteors';
import type { SatellitePosition } from '../lib/satellites';
import type { Spacecraft, NearStar, GalaxyMarker } from '../data/deepspace';

// ─── AU reference grid ──────────────────────────────────────────────────────────

function AUGrid({ cameraDistance = 0 }: { cameraDistance?: number }) {
  // Fade out at deep-space distances
  const fade = cameraDistance > 300 ? Math.max(0, 1 - (cameraDistance - 300) / 300) : 1;
  if (fade <= 0) return null;
  return (
    <group>
      {[1, 2, 5, 10, 20, 30, 50, 100].map(r => (
        <mesh key={r} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.003, r + 0.003, 128]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.025 * fade} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Scene ──────────────────────────────────────────────────────────────────────

export interface SceneProps {
  jd: number; T: number;
  simTime: Date;
  onLoadComplete?: (id: string) => void;
  neos: NEO[]; selNeo: NEO | null; setSelNeo: (n: NEO | null) => void;
  selPlanet: number | null; setSelPlanet: (i: number | null) => void;
  focusTarget: FocusTarget | null;
  onPositionsUpdate: (m: Map<number, [number, number, number]>) => void;
  showDwarf: boolean;
  showStars: boolean;
  showConstellations: boolean;
  constellationRevealTick: number;
  showAsterisms: boolean;
  showAsteroidBelt: boolean;
  showComets: boolean;
  showMeteors: boolean;
  showSatellites: boolean;
  showDeepSky: boolean;
  showDeepSpace: boolean;
  constellationFocus: boolean;
  cinematic: boolean;
  cinematicRotateSpeed: number;
  onMoonSelect?: (planetIdx: number, moonIdx: number) => void;
  selMoonIdx?: number | null;
  onCameraDistance?: (d: number) => void;
  cameraDistance: number;
  camPreset?: CamPreset | null;
  showBodyGlyphs?: boolean;
  selComet: CometDef | null; setSelComet: (c: CometDef | null) => void;
  selMeteor: MeteorShower | null; setSelMeteor: (m: MeteorShower | null) => void;
  selSatellite: SatellitePosition | null; setSelSatellite: (s: SatellitePosition | null) => void;
  selSpacecraft: Spacecraft | null; setSelSpacecraft: (s: Spacecraft | null) => void;
  selNearStar: NearStar | null; setSelNearStar: (s: NearStar | null) => void;
  selGalaxy: GalaxyMarker | null; setSelGalaxy: (g: GalaxyMarker | null) => void;
  onSunSelect?: () => void;
  onConstellationSelect?: (id: string) => void;
  onAsterismSelect?: (name: string) => void;
  onDeepSkySelect?: (id: string) => void;
  selConstellationId: string | null;
  accentColor: string;
  /**
   * Optional override for the camera's look target on the celestial sphere.
   * When set, the camera lerps to a vantage just inside the celestial sphere
   * pointing outward at this 3D point. Used by the random tour to actually
   * orient the user toward a rolled constellation.
   */
  aimAtSphere?: [number, number, number] | null;
  onUserGrabDuringCinematic?: () => void;
}

export default function Scene({
  jd, T, simTime, onLoadComplete, neos, selNeo, setSelNeo, selPlanet, setSelPlanet,
  focusTarget, onPositionsUpdate, showDwarf,
  showStars, showConstellations, constellationRevealTick, showAsterisms, showAsteroidBelt,
  showComets, showMeteors, showSatellites, showDeepSky, showDeepSpace,
  constellationFocus, cinematic, cinematicRotateSpeed, onMoonSelect, selMoonIdx, onCameraDistance, cameraDistance, camPreset,
  showBodyGlyphs = false,
  selComet, setSelComet, selMeteor, setSelMeteor, selSatellite, setSelSatellite,
  selSpacecraft, setSelSpacecraft, selNearStar, setSelNearStar, selGalaxy, setSelGalaxy, onSunSelect, aimAtSphere,
  onConstellationSelect, onAsterismSelect, onDeepSkySelect,
  selConstellationId, accentColor, onUserGrabDuringCinematic,
}: SceneProps) {
  const [hov, setHov] = useState<number | null>(null);
  const [hovMoon, setHovMoon] = useState<number | null>(null);

  const positionsRef = useRef(new Map<number, [number, number, number]>());
  const lastNotifyTRef = useRef(T);

  const positions = useMemo(() => {
    const m = new Map<number, [number, number, number]>();
    ALL_BODIES.forEach((p: PlanetDef, i: number) => m.set(i, planetXYZ(p, T)));
    return m;
  }, [T]);

  useEffect(() => {
    positionsRef.current = positions;
    bumpPositionsUpdateCounter();
    if (Math.abs(T - lastNotifyTRef.current) < 1 / 36525) return;
    lastNotifyTRef.current = T;
    onPositionsUpdate(new Map(positions));
  }, [T, positions, onPositionsUpdate]);

  const visibleBodies = showDwarf ? ALL_BODIES : ALL_BODIES.filter(b => !b.isDwarf);
  const immersiveSky = constellationFocus && selConstellationId === null;
  const dimSkyLayers = !constellationFocus || selConstellationId !== null;

  const handleCameraDistance = onCameraDistance;

  return (
    <>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.35} />
      {!OBSERVATORY_MODE && <Sun cameraDistance={cameraDistance} showGlyphOverlay={showBodyGlyphs} onSelect={onSunSelect} />}
      {!OBSERVATORY_MODE && <AUGrid cameraDistance={cameraDistance} />}
      <Suspense fallback={null}>
        <RealAsteroidBelt jd={jd} visible={showAsteroidBelt} onLoad={() => onLoadComplete?.('asteroids')} />
      </Suspense>
      {!OBSERVATORY_MODE && visibleBodies.map((p) => {
        const bodyIdx = ALL_BODIES.indexOf(p);
        return (
          <Suspense key={p.name} fallback={null}>
          <group>
            <OrbitRing
              planet={p} T={T}
              dim={selPlanet !== null && selPlanet !== bodyIdx}
              highlighted={selPlanet === bodyIdx}
              cameraDistance={cameraDistance}
            />
            <Planet
              planet={p} T={T}
              selected={selPlanet === bodyIdx}
              onSelect={() => setSelPlanet(bodyIdx)}
              hovered={hov === bodyIdx}
              onHover={h => setHov(h ? bodyIdx : null)}
              moonFocused={focusTarget?.planetIdx === bodyIdx && focusTarget?.moonIdx !== undefined}
              showGlyphOverlay={showBodyGlyphs}
            />
          </group>
          </Suspense>
        );
      })}
      {/* Render moons for all visible bodies */}
      {!OBSERVATORY_MODE && visibleBodies.map((body) => {
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
              onSelect={onMoonSelect ? () => onMoonSelect(bodyIdx, mIdx) : undefined}
              hovered={isFocused && hovMoon === mIdx}
              onHover={(h) => setHovMoon(h ? mIdx : null)}
            />
          </group>
        ));
      })}
      {!OBSERVATORY_MODE && neos.map(neo => (
        <group key={neo.id}>
          <NeoDot
            neo={neo} jd={jd}
            selected={selNeo?.id === neo.id}
            onSelect={() => setSelNeo(selNeo?.id === neo.id ? null : neo)}
          />
          {selNeo?.id === neo.id && <AsteroidOrbitLine neo={neo} />}
        </group>
      ))}
      <Suspense fallback={null}>
        <StarField
          visible={showStars}
          showDesignations={showConstellations}
          onLoad={() => onLoadComplete?.('stars')}
          selectedConstellation={selConstellationId}
          accent={accentColor}
          immersive={immersiveSky}
        />
        <ConstellationLines visible={showConstellations && cameraDistance < 600} focus={constellationFocus} revealTick={constellationRevealTick} onLoad={() => onLoadComplete?.('constellationLines')} selectedId={selConstellationId} />
        <ConstellationLabels visible={showConstellations && cameraDistance < 600} focus={constellationFocus} revealTick={constellationRevealTick} onSelect={onConstellationSelect} onLoad={() => onLoadComplete?.('constellations')} selectedId={selConstellationId} accent={accentColor} />
        <AsterismField visible={showAsterisms && cameraDistance < 600} onSelect={onAsterismSelect} />
      </Suspense>
      <Suspense fallback={null}>
        <DeepSkyField
          visible={showDeepSky}
          onLoad={() => onLoadComplete?.('deepsky')}
          onSelect={onDeepSkySelect}
          immersive={immersiveSky}
          dimmed={dimSkyLayers}
        />
      </Suspense>
      <CometField
        jd={jd}
        visible={showComets}
        selComet={selComet}
        setSelComet={setSelComet}
        onLoad={() => onLoadComplete?.('comets')}
      />
      <MeteorField
        jd={jd}
        visible={showMeteors}
        selMeteor={selMeteor}
        setSelMeteor={setSelMeteor}
        onLoad={() => onLoadComplete?.('meteors')}
      />
      <SatelliteField
        visible={showSatellites}
        simTime={simTime}
        earthPos={positions.get(2) ?? null}
        cameraDistance={cameraDistance}
        selSatellite={selSatellite}
        setSelSatellite={setSelSatellite}
        onLoad={() => onLoadComplete?.('satellites')}
      />
      <Suspense fallback={null}>
        <DeepSpaceField
          visible={showDeepSpace}
          selSpacecraft={selSpacecraft}
          setSelSpacecraft={setSelSpacecraft}
          selNearStar={selNearStar}
          setSelNearStar={setSelNearStar}
          selGalaxy={selGalaxy}
          setSelGalaxy={setSelGalaxy}
        />
      </Suspense>
      <CamCtrl
        focusTarget={focusTarget}
        positions={positions}
        cinematic={cinematic}
        camPreset={camPreset}
        cinematicRotateSpeed={cinematicRotateSpeed}
        onCameraDistance={handleCameraDistance}
        aimAtSphere={aimAtSphere}
        onUserGrabDuringCinematic={onUserGrabDuringCinematic}
      />
    </>
  );
}
