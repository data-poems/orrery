import { describe, it, expect } from 'vitest';
import {
  CINEMATIC_DURATION,
  CINEMATIC_PHASES,
  FOCUS_ELEVATION,
  blendPose,
  cameraToPose,
  cinematicEntrySeconds,
  cinematicLandingAzimuth,
  cinematicPhaseAt,
  cinematicPose,
  monotoneSpline,
  orbitOffset,
  planetFocusDistance,
  poseToCamera,
  type Vec3,
} from './cinematicPath';

const EARTH: Vec3 = [0.42, 0.0, 0.9];
const FRAME = 1 / 60;

function forward(pos: Vec3, look: Vec3): Vec3 {
  const d: Vec3 = [look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]];
  const len = Math.hypot(...d);
  return [d[0] / len, d[1] / len, d[2] / len];
}

function angleBetween(a: Vec3, b: Vec3): number {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return (Math.acos(dot) * 180) / Math.PI;
}

describe('cinematic flight path', () => {
  it('starts in deep space, at rest, looking at the Sun', () => {
    const start = cinematicPose(0, EARTH);
    expect(start.center).toEqual([0, 0, 0]);
    expect(start.dist).toBeGreaterThan(1000);
    const next = cinematicPose(FRAME, EARTH);
    expect(Math.abs(Math.log10(next.dist) - Math.log10(start.dist))).toBeLessThan(1e-4);
  });

  it('lands looking at Earth from the focus distance, on its sunlit side', () => {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const earth: Vec3 = [Math.cos(a), 0, Math.sin(a)];
      const pose = cinematicPose(CINEMATIC_DURATION, earth);
      expect(pose.center).toEqual(earth);
      expect(pose.dist).toBeCloseTo(planetFocusDistance(2), 9);
      expect(pose.el).toBeCloseTo(FOCUS_ELEVATION, 9);
      expect(pose.az).toBeCloseTo(cinematicLandingAzimuth(earth), 9);
      // The camera sits sunward of Earth: the face it sees is mostly lit.
      const off = orbitOffset(pose.dist, pose.az, pose.el);
      const toSun: Vec3 = [-earth[0], -earth[1], -earth[2]];
      const cosPhase = (off[0] * toSun[0] + off[1] * toSun[1] + off[2] * toSun[2]) / pose.dist;
      expect(cosPhase).toBeGreaterThan(0.6);
    }
  });

  it('only ever moves inward: no reversals, no stops before the landing', () => {
    let prev = cinematicPose(0, EARTH).dist;
    for (let t = 0.5; t <= CINEMATIC_DURATION - 0.5; t += FRAME) {
      const d = cinematicPose(t, EARTH).dist;
      expect(d).toBeLessThan(prev);
      // Never slower than a tenth of a decade per second mid-flight.
      expect((Math.log10(prev) - Math.log10(d)) / FRAME).toBeGreaterThan(0.1);
      prev = d;
    }
  });

  it('never cuts: frame-to-frame zoom and turn stay small', () => {
    let prev = poseToCamera(cinematicPose(0, EARTH));
    let prevDist = cinematicPose(0, EARTH).dist;
    let prevTurn = 0;
    for (let t = FRAME; t <= CINEMATIC_DURATION; t += FRAME) {
      const pose = cinematicPose(t, EARTH);
      const cam = poseToCamera(pose);
      // Under 0.55 decades per second of zoom.
      expect(Math.abs(Math.log10(pose.dist) - Math.log10(prevDist))).toBeLessThan(0.55 * FRAME);
      // Under 25 degrees per second of turn, and no sudden change in turn rate.
      const turn = angleBetween(forward(prev.pos, prev.look), forward(cam.pos, cam.look));
      expect(turn).toBeLessThan(25 * FRAME);
      expect(Math.abs(turn - prevTurn)).toBeLessThan(0.05);
      prev = cam; prevDist = pose.dist; prevTurn = turn;
    }
  });

  it('circles as it descends', () => {
    const a = cinematicPose(0, EARTH).az;
    const b = cinematicPose(CINEMATIC_DURATION, EARTH).az;
    expect(b - a).toBeGreaterThan(1);
    for (let t = 1; t < CINEMATIC_DURATION - 1; t += 0.25) {
      expect(cinematicPose(t + 0.25, EARTH).az).toBeGreaterThan(cinematicPose(t, EARTH).az);
    }
  });

  it('passes beside the Sun, never over it, wherever Earth is', () => {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      const earth: Vec3 = [Math.cos(a), 0, Math.sin(a)];
      for (let t = 0; t <= CINEMATIC_DURATION; t += 0.05) {
        const { pos } = poseToCamera(cinematicPose(t, earth));
        // The Sun's radius is 0.15.
        expect(Math.hypot(...pos)).toBeGreaterThan(0.55);
      }
    }
  });

  it('phases run in order and cover the whole flight', () => {
    expect(CINEMATIC_PHASES[0].start).toBe(0);
    for (let i = 1; i < CINEMATIC_PHASES.length; i++) {
      expect(CINEMATIC_PHASES[i].start).toBeGreaterThan(CINEMATIC_PHASES[i - 1].start);
      expect(CINEMATIC_PHASES[i].start).toBeLessThan(CINEMATIC_DURATION);
    }
    expect(cinematicPhaseAt(0)).toBe(0);
    expect(cinematicPhaseAt(CINEMATIC_DURATION)).toBe(CINEMATIC_PHASES.length - 1);
    CINEMATIC_PHASES.forEach((p, i) => expect(cinematicPhaseAt(p.still)).toBe(i));
  });
});

describe('pose helpers', () => {
  it('monotoneSpline passes through its keys without overshoot', () => {
    const ts = [0, 1, 3, 4], vs = [5, 3, 2.5, 0];
    ts.forEach((t, i) => expect(monotoneSpline(ts, vs, t)).toBeCloseTo(vs[i], 12));
    for (let t = 0; t <= 4; t += 0.01) {
      const v = monotoneSpline(ts, vs, t);
      expect(v).toBeLessThanOrEqual(5 + 1e-12);
      expect(v).toBeGreaterThanOrEqual(-1e-12);
    }
  });

  it('cameraToPose and poseToCamera are inverses', () => {
    const pos: Vec3 = [3, 2, -5], look: Vec3 = [0.5, 0, 1];
    const back = poseToCamera(cameraToPose(pos, look));
    back.pos.forEach((v, i) => expect(v).toBeCloseTo(pos[i], 9));
    expect(back.look).toEqual(look);
  });

  it('a replay pulls back for longer the closer in it starts', () => {
    const near = cinematicEntrySeconds({ center: [1, 0, 0], dist: 0.5, az: 0, el: 0.4 });
    const far = cinematicEntrySeconds({ center: [0, 0, 0], dist: 1400, az: 0, el: 0.4 });
    expect(near).toBeGreaterThan(far);
    expect(near).toBeLessThanOrEqual(4.5);
    expect(far).toBe(1.5);
  });

  it('blendPose goes the short way round and ends on its target', () => {
    const a = { center: [0, 0, 0] as Vec3, dist: 1, az: 3.0, el: 0.2 };
    const b = { center: [1, 0, 0] as Vec3, dist: 100, az: -3.0, el: 0.4 };
    expect(blendPose(a, b, 0)).toBe(a);
    expect(blendPose(a, b, 1)).toBe(b);
    const mid = blendPose(a, b, 0.5);
    expect(mid.dist).toBeCloseTo(10, 9);
    // 3.0 to -3.0 is 0.283 rad through pi, not 6 rad back through zero.
    expect(Math.abs(mid.az)).toBeGreaterThan(3.0);
  });
});
