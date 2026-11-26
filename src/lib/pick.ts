/*
 * Picking and label sizing for bodies in the scene.
 *
 * Every body has an invisible pick sphere much larger than its disc, so a small
 * planet can be tapped from far away. At system scale those spheres overlap,
 * and the raycaster reports whichever sphere's surface is nearest the camera:
 * a click on the Sun selected Mercury, a click on Mercury from above selected
 * the Sun. A person aims at a body's center, so the body whose center is
 * closest to the click wins instead.
 */

import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

/** Marks a mesh as a body's pick sphere; the value is the body's name. */
export const PICK_BODY = 'pickBody';
/** On a moon's pick sphere: the name of the planet it orbits. */
export const PICK_PARENT = 'pickParent';

const center = new THREE.Vector3();

function distanceFromRay(ray: THREE.Ray, object: THREE.Object3D): number {
  return ray.distanceToPoint(object.getWorldPosition(center));
}

/**
 * True when this event's own pick sphere belongs to the body the person aimed
 * at: no rival under the pointer has its center nearer the ray. A handler that
 * loses returns without stopping propagation, so the event reaches the winner.
 *
 * Rivals are bodies of the same rank. The Sun and planets rival each other,
 * and every moon gives way to them, except to its own planet. Moons of one
 * planet rival each other. Between a planet and its own moons the first sphere
 * hit still decides, as it always did: seen from far away a moon is less than
 * a pixel from its planet, so "nearest center" there would hand a click on
 * Uranus to whichever moon the ray grazed.
 */
export function wonPick(e: ThreeEvent<MouseEvent>): boolean {
  const mine = e.eventObject;
  const myParent = mine.userData[PICK_PARENT];
  const myDistance = distanceFromRay(e.ray, mine);
  for (const hit of e.intersections) {
    const other = hit.eventObject;
    const otherName = other.userData[PICK_BODY];
    if (other === mine || !otherName) continue;
    const otherParent = other.userData[PICK_PARENT];
    const rival = otherParent ? otherParent === myParent : otherName !== myParent;
    if (rival && distanceFromRay(e.ray, other) < myDistance) return false;
  }
  return true;
}

/**
 * The factor that keeps a scene label from growing past `maxFontPx` on screen.
 * Labels scale with 1 / distance so they shrink with their body; close to a
 * small moon that made its name several times taller than the moon's planet.
 * `distanceFactor` and `fov` are what drei's Html uses for the same label.
 */
export function labelCap(fontPx: number, distanceFactor: number, distance: number, fovDeg: number, maxFontPx: number): number {
  if (!(distance > 0)) return 1;
  const cssScale = distanceFactor / (2 * Math.tan((fovDeg * Math.PI) / 360) * distance);
  const shown = fontPx * cssScale;
  return shown > maxFontPx ? maxFontPx / shown : 1;
}
