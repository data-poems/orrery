/*
 * Asterism lines — informal star patterns rendered as dashed gold lines
 * on the celestial sphere. Shares visibility with constellations.
 */

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ASTERISMS } from '../data/asterisms';
import { raDecTo3D, ECLIPTIC_TILT } from '../lib/kepler';
import { OBSERVATORY_MODE } from '../lib/mode';

const SPHERE_RADIUS = 300;

export function AsterismField({ visible, onSelect }: { visible: boolean; onSelect?: (name: string) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Build all line geometries once
  const { lineGeo, centroids } = useMemo(() => {
    const segments: number[] = [];
    const cents: { name: string; pos: [number, number, number] }[] = [];

    for (const ast of ASTERISMS) {
      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < ast.stars.length - 1; i++) {
        const [x1, y1, z1] = raDecTo3D(ast.stars[i][0], ast.stars[i][1], SPHERE_RADIUS, false);
        const [x2, y2, z2] = raDecTo3D(ast.stars[i + 1][0], ast.stars[i + 1][1], SPHERE_RADIUS, false);
        segments.push(x1, y1, z1, x2, y2, z2);
        cx += x1; cy += y1; cz += z1;
      }
      // Add last vertex to centroid
      const last = ast.stars[ast.stars.length - 1];
      const [lx, ly, lz] = raDecTo3D(last[0], last[1], SPHERE_RADIUS, false);
      cx += lx; cy += ly; cz += lz;

      const n = ast.stars.length;
      cents.push({ name: ast.name, pos: [cx / n, cy / n, cz / n] });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segments), 3));
    return { lineGeo: geo, centroids: cents };
  }, []);

  const matRef = useRef<THREE.LineDashedMaterial>(null);

  // Camera follow + distance fade
  useFrame(() => {
    if (!visible || !groupRef.current) return;
    groupRef.current.position.copy(camera.position);
    if (matRef.current) {
      if (OBSERVATORY_MODE) {
        matRef.current.opacity = 0.25;
      } else {
        const dist = camera.position.length();
        matRef.current.opacity = dist > 500 ? Math.max(0.02, 0.25 * (1 - (dist - 500) / 500)) : 0.25;
      }
    }
  });

  // Compute dash distances when geometry is ready
  useMemo(() => {
    if (lineGeo) lineGeo.computeBoundingSphere();
  }, [lineGeo]);

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <group rotation={[ECLIPTIC_TILT, 0, 0]}>
        <lineSegments geometry={lineGeo}>
          <lineDashedMaterial
            ref={matRef}
            color={new THREE.Color(1.0, 0.86, 0.63)}
            transparent
            opacity={0.25}
            dashSize={4}
            gapSize={3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </lineSegments>
        {/* Asterism labels at centroids */}
        {centroids.map(c => (
          <group key={c.name} position={c.pos}>
            <Html
              center
              distanceFactor={80}
              style={{ pointerEvents: onSelect ? 'auto' : 'none' }}
              zIndexRange={[1, 0]}
            >
              <div
                role={onSelect ? 'button' : undefined}
                tabIndex={onSelect ? 0 : undefined}
                onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(c.name); } : undefined}
                onKeyDown={onSelect ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(c.name); } } : undefined}
                style={{
                  color: 'rgba(255,220,160,0.5)',
                  fontSize: 9,
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 300,
                  fontStyle: 'italic',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  letterSpacing: 0.5,
                  textShadow: '0 0 8px rgba(255,180,60,0.25)',
                  cursor: onSelect ? 'pointer' : 'default',
                  padding: '6px 10px',
                  borderRadius: 3,
                }}
              >
                {c.name}
              </div>
            </Html>
          </group>
        ))}
      </group>
    </group>
  );
}
