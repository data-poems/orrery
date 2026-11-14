/*
 * DuoViewOffset — iPhone Duo book pose: center the scene on the left page.
 *
 * The canvas keeps the full width; a camera view offset moves the optical axis
 * to the left page's center (see bookViewOffset in lib/duoFold), so the Sun is
 * not on the crease and the right page holds the controls and readout. Picking
 * and scene labels follow the projection matrix, so they stay aligned. While the
 * offset is on, the camera is marked manual so the canvas resize handler doesn't
 * reset its aspect; leaving book pose restores the normal camera.
 */
import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { bookViewOffset, type DuoLayout } from '../lib/duoFold';

export default function DuoViewOffset({ layout }: { layout: DuoLayout }) {
  // The camera only as a dependency: it is read through get() inside the effect,
  // because three.js objects are mutated in place.
  const camera = useThree((s) => s.camera);
  const get = useThree((s) => s.get);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    const current = get().camera;
    if (layout?.kind !== 'book' || !(current instanceof THREE.PerspectiveCamera) || width <= 0 || height <= 0) return;
    const cam = current as THREE.PerspectiveCamera & { manual?: boolean };
    const o = bookViewOffset(layout, { width, height });
    cam.manual = true;
    cam.aspect = o.fullWidth / o.fullHeight;
    cam.setViewOffset(o.fullWidth, o.fullHeight, o.x, o.y, width, height);
    cam.updateProjectionMatrix();
    invalidate();
    return () => {
      cam.clearViewOffset();
      cam.manual = false;
      cam.aspect = width / height;
      cam.updateProjectionMatrix();
      invalidate();
    };
  }, [camera, get, layout, width, height, invalidate]);

  return null;
}
