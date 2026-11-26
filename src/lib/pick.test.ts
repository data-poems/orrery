import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { PICK_BODY, PICK_PARENT, labelCap, wonPick } from './pick';

function body(name: string, x: number, y: number, z: number): THREE.Object3D {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  o.userData[PICK_BODY] = name;
  o.updateMatrixWorld();
  return o;
}

function click(ray: THREE.Ray, mine: THREE.Object3D, hits: THREE.Object3D[]): ThreeEvent<MouseEvent> {
  return { ray, eventObject: mine, intersections: hits.map(eventObject => ({ eventObject })) } as unknown as ThreeEvent<MouseEvent>;
}

describe('wonPick', () => {
  // Looking down the -z axis from above the system, as at System scale.
  const sun = body('Sun', 0, 0, 0);
  const mercury = body('Mercury', 0.39, 0, 0.2);

  it('a click on the Sun selects the Sun even when Mercury is nearer the camera', () => {
    const ray = new THREE.Ray(new THREE.Vector3(0, 0, 50), new THREE.Vector3(0, 0, -1));
    const hits = [mercury, sun];
    expect(wonPick(click(ray, mercury, hits))).toBe(false);
    expect(wonPick(click(ray, sun, hits))).toBe(true);
  });

  it('a click on Mercury selects Mercury even inside the Sun\'s pick sphere', () => {
    const ray = new THREE.Ray(new THREE.Vector3(0.38, 0, 50), new THREE.Vector3(0, 0, -1));
    const hits = [sun, mercury];
    expect(wonPick(click(ray, sun, hits))).toBe(false);
    expect(wonPick(click(ray, mercury, hits))).toBe(true);
  });

  it('a planet\'s own moon never outranks it by center distance', () => {
    // From far away Miranda is a fraction of a pixel from Uranus.
    const uranus = body('Uranus', 19, 0, 0);
    const miranda = body('Miranda', 19.02, 0, 0.01);
    miranda.userData[PICK_PARENT] = 'Uranus';
    const ray = new THREE.Ray(new THREE.Vector3(19.02, 0, 100), new THREE.Vector3(0, 0, -1));
    // Uranus's sphere is hit first; it wins although Miranda's center is nearer the ray.
    expect(wonPick(click(ray, uranus, [uranus, miranda]))).toBe(true);
  });

  it('a moon gives way to another planet the click was aimed at', () => {
    const earth = body('Earth', 1, 0, 0);
    const moon = body('Moon', 1.03, 0, 0);
    moon.userData[PICK_PARENT] = 'Earth';
    const sunRay = new THREE.Ray(new THREE.Vector3(0, 0, 50), new THREE.Vector3(0, 0, -1));
    expect(wonPick(click(sunRay, moon, [earth, moon, sun]))).toBe(false);
    // Aimed at the Moon itself, with only its own planet nearby, it keeps the click.
    const moonRay = new THREE.Ray(new THREE.Vector3(1.03, 0, 5), new THREE.Vector3(0, 0, -1));
    expect(wonPick(click(moonRay, moon, [moon, earth]))).toBe(true);
  });

  it('between two moons of one planet, the one aimed at wins', () => {
    // Ganymede's larger pick sphere sits in front of Amalthea on this ray.
    const amalthea = body('Amalthea', 5.2, 0, 0.2);
    const ganymede = body('Ganymede', 5.3, 0, 0.5);
    amalthea.userData[PICK_PARENT] = 'Jupiter';
    ganymede.userData[PICK_PARENT] = 'Jupiter';
    const ray = new THREE.Ray(new THREE.Vector3(5.2, 0, 5), new THREE.Vector3(0, 0, -1));
    expect(wonPick(click(ray, ganymede, [ganymede, amalthea]))).toBe(false);
    expect(wonPick(click(ray, amalthea, [ganymede, amalthea]))).toBe(true);
  });

  it('ignores things under the pointer that are not body pick spheres', () => {
    const ring = new THREE.Object3D();
    const ray = new THREE.Ray(new THREE.Vector3(0, 0, 50), new THREE.Vector3(0, 0, -1));
    expect(wonPick(click(ray, sun, [ring, sun]))).toBe(true);
  });
});

describe('labelCap', () => {
  it('leaves a label alone while it is under the limit', () => {
    expect(labelCap(9, 3, 5, 55, 40)).toBe(1);
  });

  it('holds a label at the limit when the camera is close', () => {
    const cap = labelCap(8, 1.5, 0.05, 55, 22);
    const shown = 8 * (1.5 / (2 * Math.tan((55 * Math.PI) / 360) * 0.05));
    expect(shown).toBeGreaterThan(22);
    expect(shown * cap).toBeCloseTo(22, 6);
  });

  it('does nothing for a degenerate distance', () => {
    expect(labelCap(8, 1.5, 0, 55, 22)).toBe(1);
  });
});
