/*
 * Picking and label sizing for bodies in the scene.
 *
 * Every body has an invisible pick sphere much larger than its disc, so a small
 * planet can be tapped from far away. At system scale those spheres overlap,
 * and the raycaster reports whichever sphere's surface is nearest the camera:
 * a click on the Sun selected Mercury, a click on Mercury from above selected
 * the Sun. The spheres only say which bodies are in reach of the pointer;
 * which one was meant is decided on screen, in pixels (choosePick).
 */

import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

/** Marks a mesh as a body's pick sphere; the value is the body's name. */
export const PICK_BODY = 'pickBody';
/** On a moon's pick sphere: the name of the planet it orbits. */
export const PICK_PARENT = 'pickParent';
/** The function that selects the body. */
export const PICK_SELECT = 'pickSelect';
/** The body's drawn radius, in scene units. */
export const PICK_RADIUS = 'pickRadius';
/** Which body wins when two are too close on screen to tell apart. */
export const PICK_RANK = 'pickRank';
export const RANK_SUN = 3;
export const RANK_PLANET = 2;
export const RANK_DWARF = 1;
export const RANK_MOON = 0;

/** Furthest the pointer may travel between press and release and still count as a tap. */
const TAP_SLOP_PX = 8;
/**
 * Bodies whose centers are closer than this on screen cannot be told apart:
 * with a mouse, 10 pixels; with a finger, the 18-pixel minimum target every
 * body is given. At the System scale on a phone Earth is 11 pixels from the
 * Sun, and a finger 7 pixels off the Sun got Earth.
 */
export const UNRESOLVED_PX_MOUSE = 10;
export const UNRESOLVED_PX_TOUCH = 18;
/**
 * Over its planet's disc, a tap means the moon only if it lands on the moon's
 * own dot, give or take this many pixels. Anything looser and a moon one pixel
 * wide claims a third of a small planet's disc.
 */
const MOON_ON_DISC_SLOP_PX = 4;

/** One body under the pointer, measured in screen pixels. */
export interface PickCandidate {
  name: string;
  parent?: string;
  rank: number;
  /** Pointer to the body's center. */
  px: number;
  /** The body's drawn radius. */
  discPx: number;
  /** Unit direction from the camera to the body's center. */
  dir: THREE.Vector3;
  /** Camera to the body's center, in scene units. */
  distance: number;
}

/**
 * Which of the bodies under the pointer the person aimed at.
 *
 * 0. A moon hidden behind its planet's disc is out: nobody can aim at it.
 * 1. The body whose center is nearest the pointer.
 * 2. Unless that is a moon and the tap is on its planet's disc and not on the
 *    moon's own dot: a moon's target is much larger than its dot, and a tap
 *    on a small Jupiter kept selecting Europa.
 * 3. Unless a more important body sits too close to it on screen to tell
 *    apart (`unresolvedPx`), in which case that one: on a phone at the Outer
 *    scale Mercury is 3 pixels from the Sun, and a finger on the Sun got
 *    Mercury. A planet and its own moons are left to rule 2.
 */
export function choosePick(
  candidates: PickCandidate[],
  pxPerRadian: number,
  unresolvedPx: number = UNRESOLVED_PX_MOUSE,
): PickCandidate | null {
  const hidden = (moon: PickCandidate) => {
    const planet = candidates.find(c => c.name === moon.parent);
    return !!planet && moon.distance > planet.distance
      && moon.dir.angleTo(planet.dir) * pxPerRadian < planet.discPx;
  };
  candidates = candidates.filter(c => !(c.parent && hidden(c)));
  if (candidates.length === 0) return null;
  let best = candidates[0];
  for (const c of candidates) if (c.px < best.px) best = c;

  if (best.parent && best.px > best.discPx + MOON_ON_DISC_SLOP_PX) {
    const planet = candidates.find(c => c.name === best.parent);
    if (planet && planet.px <= planet.discPx) best = planet;
  }

  const related = (a: PickCandidate, b: PickCandidate) => a.parent === b.name || b.parent === a.name;
  const anchor = best;
  for (const c of candidates) {
    if (c === anchor || related(c, anchor)) continue;
    const apartPx = c.dir.angleTo(anchor.dir) * pxPerRadian;
    if (apartPx > unresolvedPx) continue;
    if (c.rank > best.rank || (c.rank === best.rank && c.rank > anchor.rank && c.px < best.px)) best = c;
  }
  return best;
}

const center = new THREE.Vector3();
const cameraPosition = new THREE.Vector3();

/** Whether this click came from a finger. Safari's click carries no pointer type. */
function isTouch(e: ThreeEvent<MouseEvent>): boolean {
  const pointerType = (e.nativeEvent as PointerEvent | undefined)?.pointerType;
  if (pointerType) return pointerType === 'touch';
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
}

/** The pick sphere of the body the person aimed at (see choosePick). */
export function resolvePick(e: ThreeEvent<MouseEvent>): THREE.Object3D {
  const camera = e.camera as THREE.PerspectiveCamera;
  const target = e.nativeEvent?.target as HTMLElement | undefined;
  const height = target?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 800);
  const fov = Number.isFinite(camera.fov) ? camera.fov : 55;
  const pxPerRadian = height / 2 / Math.tan((fov * Math.PI) / 360);
  camera.getWorldPosition(cameraPosition);

  const objects: THREE.Object3D[] = [];
  const candidates: PickCandidate[] = [];
  for (const object of [e.eventObject, ...e.intersections.map(hit => hit.eventObject)]) {
    const name = object.userData[PICK_BODY] as string | undefined;
    if (!name || !object.userData[PICK_SELECT] || objects.includes(object)) continue;
    object.getWorldPosition(center);
    const dir = center.clone().sub(cameraPosition);
    const distance = dir.length();
    if (!(distance > 0)) continue;
    dir.divideScalar(distance);
    const radius = (object.userData[PICK_RADIUS] as number | undefined) ?? 0;
    objects.push(object);
    candidates.push({
      name,
      parent: object.userData[PICK_PARENT] as string | undefined,
      rank: (object.userData[PICK_RANK] as number | undefined) ?? RANK_MOON,
      px: dir.angleTo(e.ray.direction) * pxPerRadian,
      discPx: Math.asin(Math.min(1, radius / distance)) * pxPerRadian,
      dir,
      distance,
    });
  }
  const chosen = choosePick(candidates, pxPerRadian, isTouch(e) ? UNRESOLVED_PX_TOUCH : UNRESOLVED_PX_MOUSE);
  return chosen ? objects[candidates.indexOf(chosen)] : e.eventObject;
}

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
