/**
 * Meteor shower radiants on the celestial sphere.
 *
 * Time-aware: uses solar longitude to determine active showers.
 * Shape: starburst (6-pointed cross), distinct from all other object types.
 * Color: #ffbb33 (amber, colorblind-safe).
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { solarLongitude, raDecTo3D, ECLIPTIC_TILT, DEG } from '../lib/kepler';

const BASE_PATH = import.meta.env.BASE_URL + 'data/';
const METEOR_COLOR = '#ffbb33';
const SPHERE_RADIUS = 295; // Slightly inside star sphere

interface MeteorShower {
  iauNo: number;
  code: string;
  name: string;
  ra: number;
  dec: number;
  solarLonPeak: number;
  solarLonStart: number;
  solarLonEnd: number;
  vg: number;
  parent: string;
}

/** Check if a solar longitude falls within a shower's activity window */
function isActive(shower: MeteorShower, solLon: number): boolean {
  const { solarLonStart: s, solarLonEnd: e } = shower;
  if (s <= e) return solLon >= s && solLon <= e;
  // Wraps around 360°
  return solLon >= s || solLon <= e;
}

// ─── Individual radiant marker ───────────────────────────────────────────────

function RadiantMarker({ shower, active, selected, onSelect }: {
  shower: MeteorShower; active: boolean;
  selected: boolean; onSelect: () => void;
}) {
  const pos = useMemo(() => raDecTo3D(shower.ra, shower.dec, SPHERE_RADIUS, false), [shower.ra, shower.dec]);
  const size = active ? 2.5 : 1.2;
  const opacity = active ? 0.9 : 0.15;

  return (
    <group position={pos}>
      {/* 6-pointed starburst: 3 crossed rectangles */}
      {[0, 60, 120].map(angle => (
        <mesh
          key={angle}
          rotation={[0, 0, angle * DEG]}
          onClick={e => { e.stopPropagation(); onSelect(); }}
        >
          <planeGeometry args={[size * 0.3, size * 1.5]} />
          <meshBasicMaterial
            color={METEOR_COLOR}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
      {/* Label */}
      {(selected || active) && (
        <Html
          center
          distanceFactor={80}
          style={{ pointerEvents: 'none' }}
          zIndexRange={[1, 0]}
        >
          <div style={{
            color: METEOR_COLOR,
            fontSize: active ? 7 : 6,
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: selected ? 600 : 300,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            textShadow: '0 0 8px rgba(255,187,51,0.4)',
            opacity: active ? (selected ? 1 : 0.7) : 0.3,
          }}>
            {shower.code}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Meteor field ────────────────────────────────────────────────────────────

export interface MeteorFieldProps {
  jd: number;
  visible: boolean;
  selMeteor: MeteorShower | null;
  setSelMeteor: (m: MeteorShower | null) => void;
  onLoad?: () => void;
}

export type { MeteorShower };

export function MeteorField({ jd, visible, selMeteor, setSelMeteor, onLoad }: MeteorFieldProps) {
  const [showers, setShowers] = useState<MeteorShower[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (!visible) { onLoad?.(); return; }
    fetch(BASE_PATH + 'meteor-showers.json')
      .then(r => r.json())
      .then(d => {
        setShowers(d);
        onLoad?.();
      })
      .catch(() => {});
  }, [visible, onLoad]);

  const solLon = useMemo(() => solarLongitude(jd), [jd]);

  const activeShowers = useMemo(
    () => showers.filter(s => isActive(s, solLon)),
    [showers, solLon],
  );

  // Camera-following group
  useFrame(() => {
    if (!visible || !groupRef.current) return;
    groupRef.current.position.copy(camera.position);
  });

  if (!visible || showers.length === 0) return null;

  return (
    <group ref={groupRef}>
      <group rotation={[ECLIPTIC_TILT, 0, 0]}>
        {showers.map(shower => (
          <RadiantMarker
            key={shower.iauNo}
            shower={shower}
            active={activeShowers.includes(shower)}
            selected={selMeteor?.iauNo === shower.iauNo}
            onSelect={() => setSelMeteor(
              selMeteor?.iauNo === shower.iauNo ? null : shower,
            )}
          />
        ))}
      </group>
    </group>
  );
}
