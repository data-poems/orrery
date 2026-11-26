import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { PICK_BODY, PICK_PARENT, PICK_SELECT, labelCap, resolvePick, selectPicked } from './pick';

function body(name: string, x: number, y: number, z: number, parent?: string): THREE.Object3D {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  o.userData[PICK_BODY] = name;
  o.userData[PICK_SELECT] = () => {};
  if (parent) o.userData[PICK_PARENT] = parent;
  o.updateMatrixWorld();
  return o;
}

/** A click whose ray hit these pick spheres, nearest the camera first. */
function click(ray: THREE.Ray, hits: THREE.Object3D[]): ThreeEvent<MouseEvent> {
  return { ray, eventObject: hits[0], intersections: hits.map(eventObject => ({ eventObject })), stopPropagation() {} } as unknown as ThreeEvent<MouseEvent>;
}

const picked = (ray: THREE.Ray, hits: THREE.Object3D[]) => resolvePick(click(ray, hits)).userData[PICK_BODY];
const down = (x: number, y: number, z: number) => new THREE.Ray(new THREE.Vector3(x, y, z), new THREE.Vector3(0, 0, -1));

describe('resolvePick', () => {
  // Looking down the -z axis from above the system, as at System scale.
  const sun = body('Sun', 0, 0, 0);
  const mercury = body('Mercury', 0.39, 0, 0.2);

  it('a click on the Sun selects the Sun even when Mercury is nearer the camera', () => {
    expect(picked(down(0, 0, 50), [mercury, sun])).toBe('Sun');
  });

  it('a click on Mercury selects Mercury even inside the Sun\'s pick sphere', () => {
    expect(picked(down(0.38, 0, 50), [sun, mercury])).toBe('Mercury');
  });

  it('a planet\'s own moon never outranks it by center distance', () => {
    // From far away Miranda is a fraction of a pixel from Uranus. Uranus's
    // sphere is hit first; it wins although Miranda's center is nearer the ray.
    const uranus = body('Uranus', 19, 0, 0);
    const miranda = body('Miranda', 19.02, 0, 0.01, 'Uranus');
    expect(picked(down(19.02, 0, 100), [uranus, miranda])).toBe('Uranus');
    // A moon in front of its planet, hit first, keeps the click.
    expect(picked(down(19.02, 0, 100), [miranda, uranus])).toBe('Miranda');
  });

  it('a moon gives way to another planet the click was aimed at', () => {
    const earth = body('Earth', 1, 0, 0);
    const moon = body('Moon', 1.03, 0, 0, 'Earth');
    expect(picked(down(0, 0, 50), [moon, earth, sun])).toBe('Sun');
    expect(picked(down(1.03, 0, 5), [moon, earth])).toBe('Moon');
  });

  it('a click on a moon wins over another planet\'s target in front of it', () => {
    // Zoomed in on Earth with Venus in the foreground: Venus's large pick
    // sphere is hit first, but the click is on the Moon.
    const venus = body('Venus', 1.2, 0, 3);
    const earth = body('Earth', 1, 0, 0);
    const moon = body('Moon', 1.1, 0, 0, 'Earth');
    expect(picked(down(1.1, 0, 5), [venus, moon, earth])).toBe('Moon');
    // And a click on Earth through the same foreground target is Earth.
    expect(picked(down(1, 0, 5), [venus, earth])).toBe('Earth');
  });

  it('between two moons of one planet, the one aimed at wins', () => {
    // Ganymede's larger pick sphere sits in front of Amalthea on this ray.
    const amalthea = body('Amalthea', 5.2, 0, 0.2, 'Jupiter');
    const ganymede = body('Ganymede', 5.3, 0, 0.5, 'Jupiter');
    expect(picked(down(5.2, 0, 5), [ganymede, amalthea])).toBe('Amalthea');
  });

  it('ignores things under the pointer that are not selectable bodies', () => {
    const ring = new THREE.Object3D();
    const unselectable = body('Ghost', 0, 0, 0);
    delete unselectable.userData[PICK_SELECT];
    expect(picked(down(0.38, 0, 50), [mercury, ring, unselectable])).toBe('Mercury');
  });

  it('selectPicked settles the click itself, whichever sphere received it', () => {
    let selected = '';
    const a = body('Sun', 0, 0, 0);
    const b = body('Mercury', 0.39, 0, 0.2);
    a.userData[PICK_SELECT] = () => { selected = 'Sun'; };
    b.userData[PICK_SELECT] = () => { selected = 'Mercury'; };
    let stopped = false;
    const e = { ...click(down(0, 0, 50), [b, a]), delta: 1, stopPropagation() { stopped = true; } } as unknown as ThreeEvent<MouseEvent>;
    selectPicked(e);
    // Mercury's sphere got the event; the Sun was aimed at and is selected.
    expect(selected).toBe('Sun');
    expect(stopped).toBe(true);
  });

  it('letting go of a drag over a body selects nothing', () => {
    let selected = '';
    const a = body('Sun', 0, 0, 0);
    a.userData[PICK_SELECT] = () => { selected = 'Sun'; };
    selectPicked({ ...click(down(0, 0, 50), [a]), delta: 60 } as unknown as ThreeEvent<MouseEvent>);
    expect(selected).toBe('');
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
