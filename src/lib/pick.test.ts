import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import {
  PICK_BODY, PICK_PARENT, PICK_RADIUS, PICK_RANK, PICK_SELECT,
  RANK_DWARF, RANK_MOON, RANK_PLANET, RANK_SUN,
  RANK_REACH_PX_MOUSE, RANK_REACH_PX_TOUCH,
  choosePick, labelCap, resolvePick, selectPicked,
} from './pick';

const HEIGHT = 800;
const FOV = 55;
/** Scene units per screen pixel at a distance, for the test camera. */
const unitsPerPx = (distance: number) => (2 * distance * Math.tan((FOV * Math.PI) / 360)) / HEIGHT;

function body(name: string, x: number, y: number, z: number, opts: { parent?: string; rank?: number; radius?: number } = {}): THREE.Object3D {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  o.userData[PICK_BODY] = name;
  o.userData[PICK_SELECT] = () => {};
  o.userData[PICK_RANK] = opts.rank ?? (opts.parent ? RANK_MOON : RANK_PLANET);
  o.userData[PICK_RADIUS] = opts.radius ?? 0.05;
  if (opts.parent) o.userData[PICK_PARENT] = opts.parent;
  o.updateMatrixWorld();
  return o;
}

/** A tap from a camera at `eye` aimed at the world point `at`, with these pick spheres under it. */
function tap(eye: [number, number, number], at: [number, number, number], hits: THREE.Object3D[], delta = 0): ThreeEvent<MouseEvent> {
  const camera = new THREE.PerspectiveCamera(FOV, 1.6, 0.01, 1e6);
  camera.position.set(...eye);
  camera.updateMatrixWorld();
  const direction = new THREE.Vector3(...at).sub(camera.position).normalize();
  return {
    camera, delta,
    ray: new THREE.Ray(camera.position.clone(), direction),
    eventObject: hits[0],
    intersections: hits.map(eventObject => ({ eventObject })),
    nativeEvent: { target: { clientHeight: HEIGHT } },
    stopPropagation() {},
  } as unknown as ThreeEvent<MouseEvent>;
}

const picked = (e: ThreeEvent<MouseEvent>) => resolvePick(e).userData[PICK_BODY];

describe('resolvePick', () => {
  const sun = body('Sun', 0, 0, 0, { rank: RANK_SUN, radius: 0.15 });
  const mercury = body('Mercury', 0.39, 0, 0, { radius: 0.035 });
  const venus = body('Venus', -0.72, 0, 0, { radius: 0.055 });

  it('from close enough to tell them apart, the body nearest the tap wins', () => {
    // Inner scale: 5 units out, Mercury is about 60 px from the Sun.
    const eye: [number, number, number] = [0, 0, 5];
    expect(0.39 / unitsPerPx(5)).toBeGreaterThan(40);
    // Mercury's sphere is nearer the camera in the first case, the Sun's in the second.
    expect(picked(tap(eye, [0, 0, 0], [mercury, sun]))).toBe('Sun');
    expect(picked(tap(eye, [0.39, 0, 0], [sun, mercury]))).toBe('Mercury');
    expect(picked(tap(eye, [0.3, 0, 0], [sun, mercury]))).toBe('Mercury');
  });

  it('when a planet is too close to the Sun to tell apart, a tap there is the Sun', () => {
    // Outer scale on a phone: 108 units out, Mercury is 3 px from the Sun.
    const eye: [number, number, number] = [0, 0, 108];
    expect(0.39 / unitsPerPx(108)).toBeLessThan(4);
    for (const x of [0, 0.2, 0.39, 0.5]) {
      expect(picked(tap(eye, [x, 0, 0], [mercury, sun]))).toBe('Sun');
    }
    // Venus, 5.5 px away at this distance, is unresolved too.
    expect(picked(tap(eye, [-0.72, 0, 0], [venus, sun, mercury]))).toBe('Sun');
  });

  it('a finger near the Sun is the Sun; a mouse right on a planet beside it is the planet', () => {
    // System scale on a phone: Earth is about 11 px from the Sun.
    const earth = body('Earth', 0.68, 0, 0, { radius: 0.06 });
    const eye: [number, number, number] = [0, 0, 50];
    const px = unitsPerPx(50);
    // 9 px from the Sun, 2 px from Earth.
    const at: [number, number, number] = [9 * px, 0, 0];
    expect(9).toBeGreaterThan(RANK_REACH_PX_MOUSE);
    expect(9).toBeLessThan(RANK_REACH_PX_TOUCH);
    const mouse = tap(eye, at, [earth, sun]);
    (mouse.nativeEvent as unknown as { pointerType: string }).pointerType = 'mouse';
    const finger = tap(eye, at, [earth, sun]);
    (finger.nativeEvent as unknown as { pointerType: string }).pointerType = 'touch';
    expect(picked(mouse)).toBe('Earth');
    expect(picked(finger)).toBe('Sun');
  });

  it('a tap anywhere on a blob of bodies a few pixels across is the most important one', () => {
    // System scale on a phone standing back: Earth is 4 px from the Sun.
    const earth = body('Earth', 0.68, 0, 0, { radius: 0.06 });
    const eye: [number, number, number] = [0, 0, 135];
    const px = unitsPerPx(135);
    expect(0.68 / px).toBeLessThan(6);
    // 11 px from the Sun, on the far side of Earth: nearer Earth, out of the
    // Sun's reach for a finger, and still the Sun.
    const finger = tap(eye, [11 * px, 0, 0], [earth, sun]);
    (finger.nativeEvent as unknown as { pointerType: string }).pointerType = 'touch';
    expect(picked(finger)).toBe('Sun');
  });

  it('a planet 14 px from the Sun is still that planet when the tap lands on it', () => {
    // Outer scale on a phone standing back for the narrow screen.
    const jupiter = body('Jupiter', 5.2, 0, 0, { radius: 0.16 });
    const eye: [number, number, number] = [0, 0, 292];
    const apart = 5.2 / unitsPerPx(292);
    expect(apart).toBeGreaterThan(RANK_REACH_PX_TOUCH);
    expect(apart).toBeLessThan(18);
    const onJupiter = tap(eye, [5.2, 0, 0], [sun, jupiter]);
    (onJupiter.nativeEvent as unknown as { pointerType: string }).pointerType = 'touch';
    expect(picked(onJupiter)).toBe('Jupiter');
    const nearSun = tap(eye, [1.5, 0, 0], [sun, jupiter]);
    (nearSun.nativeEvent as unknown as { pointerType: string }).pointerType = 'touch';
    expect(picked(nearSun)).toBe('Sun');
  });

  it('two planets of equal standing: the one nearest the tap', () => {
    const mars = body('Mars', 1.5, 0, 0);
    const earth = body('Earth', 1.0, 0, 0);
    const eye: [number, number, number] = [1.2, 0, 108];
    expect(picked(tap(eye, [1.45, 0, 0], [earth, mars]))).toBe('Mars');
    expect(picked(tap(eye, [1.05, 0, 0], [mars, earth]))).toBe('Earth');
  });

  it('a tap on a planet\'s disc is the planet, unless it is right on a moon', () => {
    const jupiter = body('Jupiter', 5.2, 0, 0, { radius: 0.16 });
    const europa = body('Europa', 5.3, 0, 0.28, { parent: 'Jupiter', radius: 0.011 });
    // Close enough that Europa's orbit is about 60 px wide.
    const eye: [number, number, number] = [5.2, 0, 3.6];
    const px = unitsPerPx(3.6);
    expect(0.28 / px).toBeGreaterThan(50);
    // 14 px from Europa's center, well inside Jupiter's disc: Jupiter.
    expect(picked(tap(eye, [5.3 - 14 * px, 0, 0.28], [europa, jupiter]))).toBe('Jupiter');
    // 7 px from Europa's 2 px dot, nearer to it than to Jupiter's center: still Jupiter.
    expect(picked(tap(eye, [5.3 + 7 * px, 0, 0.28], [europa, jupiter]))).toBe('Jupiter');
    // 3 px from the dot: Europa.
    expect(picked(tap(eye, [5.3 + 3 * px, 0, 0.28], [europa, jupiter]))).toBe('Europa');
    // Right on Europa, in front of the disc: Europa.
    expect(picked(tap(eye, [5.3, 0, 0.28], [europa, jupiter]))).toBe('Europa');
    // Off the disc, inside Europa's large target: Europa.
    const callisto = body('Callisto', 5.2 + 0.5, 0, 0, { parent: 'Jupiter', radius: 0.016 });
    expect(picked(tap(eye, [5.7 + 14 * px, 0, 0], [callisto, jupiter]))).toBe('Callisto');
  });

  it('a moon behind its planet\'s disc cannot be picked through it', () => {
    const jupiter = body('Jupiter', 5.2, 0, 0, { radius: 0.16 });
    const io = body('Io', 5.25, 0, -0.24, { parent: 'Jupiter', radius: 0.012 });
    // The tap lands exactly where Io is, but Io is on the far side.
    expect(picked(tap([5.2, 0, 3.6], [5.25, 0, -0.24], [jupiter, io]))).toBe('Jupiter');
  });

  it('between two moons of one planet, the one aimed at wins', () => {
    const amalthea = body('Amalthea', 5.2, 0, 0.2, { parent: 'Jupiter' });
    const ganymede = body('Ganymede', 5.3, 0, 0.5, { parent: 'Jupiter' });
    expect(picked(tap([5.2, 0, 3], [5.2, 0, 0.2], [ganymede, amalthea]))).toBe('Amalthea');
  });

  it('a tap on a moon wins over another planet\'s target in front of it', () => {
    // Zoomed in on Earth with Venus's large pick sphere in the foreground.
    const near = body('Venus', 1.6, 0, 3);
    const earth = body('Earth', 1, 0, 0, { radius: 0.06 });
    const moon = body('Moon', 1.1, 0, 0, { parent: 'Earth', radius: 0.015 });
    expect(picked(tap([1, 0, 5], [1.1, 0, 0], [near, moon, earth]))).toBe('Moon');
    expect(picked(tap([1, 0, 5], [1, 0, 0], [near, earth, moon]))).toBe('Earth');
  });

  it('ignores things under the pointer that are not selectable bodies', () => {
    const ring = new THREE.Object3D();
    const ghost = body('Ghost', 0.39, 0, 0);
    delete ghost.userData[PICK_SELECT];
    expect(picked(tap([0, 0, 5], [0.39, 0, 0], [mercury, ring, ghost]))).toBe('Mercury');
  });

  it('selectPicked settles the click itself, whichever sphere received it', () => {
    let selected = '';
    const a = body('Sun', 0, 0, 0, { rank: RANK_SUN, radius: 0.15 });
    const b = body('Mercury', 0.39, 0, 0.2);
    a.userData[PICK_SELECT] = () => { selected = 'Sun'; };
    b.userData[PICK_SELECT] = () => { selected = 'Mercury'; };
    let stopped = false;
    const e = { ...tap([0, 0, 5], [0, 0, 0], [b, a], 1), stopPropagation() { stopped = true; } } as unknown as ThreeEvent<MouseEvent>;
    selectPicked(e);
    // Mercury's sphere got the event; the Sun was aimed at and is selected.
    expect(selected).toBe('Sun');
    expect(stopped).toBe(true);
  });

  it('letting go of a drag over a body selects nothing', () => {
    let selected = '';
    const a = body('Sun', 0, 0, 0, { rank: RANK_SUN });
    a.userData[PICK_SELECT] = () => { selected = 'Sun'; };
    selectPicked(tap([0, 0, 5], [0, 0, 0], [a], 60));
    expect(selected).toBe('');
  });
});

describe('choosePick', () => {
  const dir = (x: number) => new THREE.Vector3(x, 0, -1).normalize();
  it('returns nothing for nothing, and the only candidate when there is one', () => {
    expect(choosePick([], 1000)).toBeNull();
    const only = { name: 'Mars', rank: RANK_PLANET, px: 30, discPx: 4, dir: dir(0), distance: 50 };
    expect(choosePick([only], 1000)).toBe(only);
  });

  it('a dwarf planet lost in a planet\'s glare gives way to the planet', () => {
    const ceres = { name: 'Ceres', rank: RANK_DWARF, px: 1, discPx: 1, dir: dir(0), distance: 50 };
    const jupiter = { name: 'Jupiter', rank: RANK_PLANET, px: 6, discPx: 2, dir: dir(0.005), distance: 52 };
    expect(choosePick([ceres, jupiter], 1000)!.name).toBe('Jupiter');
    // 30 px apart, Ceres is its own target.
    const far = { ...jupiter, px: 31, dir: dir(0.03) };
    expect(choosePick([ceres, far], 1000)!.name).toBe('Ceres');
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
