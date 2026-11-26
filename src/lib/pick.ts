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
/** The function that selects the body. */
export const PICK_SELECT = 'pickSelect';

const center = new THREE.Vector3();

function distanceFromRay(ray: THREE.Ray, object: THREE.Object3D): number {
  return ray.distanceToPoint(object.getWorldPosition(center));
}

/**
 * The pick sphere of the body the person aimed at. Starts from the sphere the
 * raycaster reported and moves to any other body under the pointer whose
 * center is nearer the click, until there is none.
 *
 * The one exception is a planet and its own moons: between those the first
 * sphere hit still decides, as it always did. Seen from far away a moon is
 * less than a pixel from its planet, so "nearest center" there would hand a
 * click on Uranus to whichever moon the ray grazed.
 */
export function resolvePick(e: ThreeEvent<MouseEvent>): THREE.Object3D {
  let winner = e.eventObject;
  // Each step moves strictly closer to the ray, so this ends; the bound is a
  // backstop, not a limit anyone reaches.
  for (let step = 0; step < 16; step++) {
    const name = winner.userData[PICK_BODY];
    const parent = winner.userData[PICK_PARENT];
    let best: THREE.Object3D | null = null;
    let bestDistance = distanceFromRay(e.ray, winner);
    for (const hit of e.intersections) {
      const other = hit.eventObject;
      const otherName = other.userData[PICK_BODY];
      if (other === winner || !otherName || !other.userData[PICK_SELECT]) continue;
      // My planet, or one of my moons: hit order decided that already.
      if (otherName === parent || other.userData[PICK_PARENT] === name) continue;
      const d = distanceFromRay(e.ray, other);
      if (d < bestDistance) { best = other; bestDistance = d; }
    }
    if (!best) break;
    winner = best;
  }
  return winner;
}

/** Furthest the pointer may travel between press and release and still count as a tap. */
const TAP_SLOP_PX = 8;

/**
 * Click handler for every body's pick sphere. Whichever sphere gets the event
 * first settles it: it works out who was aimed at and selects that body
 * itself. Passing the event along for the winner's own handler to pick up
 * would drop the click whenever the pointer moved a fraction of a pixel
 * between press and release, because a handler only receives a click on a
 * sphere that was also under the press.
 *
 * A drag is not a tap: orbiting the view and letting go over a planet used to
 * select it and fly the camera there.
 */
export function selectPicked(e: ThreeEvent<MouseEvent>): void {
  e.stopPropagation();
  if (e.delta > TAP_SLOP_PX) return;
  const select = resolvePick(e).userData[PICK_SELECT] as (() => void) | undefined;
  select?.();
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
