import { describe, it, expect } from 'vitest';
import {
  CINEMATIC_DURATION,
  CINEMATIC_PHASES,
  FOCUS_ELEVATION,
  alignAzimuth,
  blendPose,
  cameraToPose,
  cinematicEntrySeconds,
  cinematicLandingAzimuth,
  cinematicPhaseAt,
  cinematicPose,
  cinematicViewFor,
  monotoneSpline,
  orbitOffset,
  planetFocusDistance,
  portraitFit,
  poseToCamera,
  sunlitAzimuth,
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

describe('narrow screens', () => {
  const PHONE = 390 / 844;
  const TAN = Math.tan((55 * Math.PI) / 360);

  it('portraitFit is 1 on wide screens and grows as the screen narrows, up to 3', () => {
    expect(portraitFit(16 / 10)).toBe(1);
    expect(portraitFit(1.25)).toBe(1);
    expect(portraitFit(1)).toBeCloseTo(1.25, 9);
    expect(portraitFit(PHONE)).toBeCloseTo(1.25 / PHONE, 9);
    expect(portraitFit(0.2)).toBe(3);
    expect(portraitFit(0)).toBe(1);
  });

  it('the Outer view fits Neptune\'s orbit across a phone', () => {
    // Outer preset: 108 units out. Half the screen's width, in scene units, at the Sun.
    const halfWidth = (fit: number) => 108 * fit * TAN * PHONE;
    expect(halfWidth(1)).toBeLessThan(30.07);
    expect(halfWidth(portraitFit(PHONE))).toBeGreaterThan(30.07 * 1.3);
  });

  it('a planet\'s close-up fits its moons across a phone without shrinking the planet away', () => {
    for (let idx = 0; idx < 8; idx++) {
      const wide = planetFocusDistance(idx);
      const narrow = planetFocusDistance(idx, PHONE);
      expect(planetFocusDistance(idx, 1.6)).toBe(wide);
      expect(narrow).toBeGreaterThanOrEqual(wide);
      // The planet stays at least a fifth of the screen's width across.
      const halfWidth = narrow * TAN * PHONE;
      const radius = [0.035, 0.055, 0.06, 0.045, 0.16, 0.13, 0.09, 0.085][idx];
      if (narrow > wide) expect(radius / halfWidth).toBeGreaterThanOrEqual(0.2 - 1e-9);
    }
    // Earth: the Moon's orbit (0.10) fits with room for its name.
    expect(planetFocusDistance(2, PHONE) * TAN * PHONE).toBeGreaterThan(0.10 * 1.3);
  });

  it('the tour stands further back on a phone and still lands at the phone close-up', () => {
    const view = cinematicViewFor(PHONE);
    expect(view.fit).toBeCloseTo(portraitFit(PHONE), 9);
    expect(cinematicPose(0, EARTH, view).dist).toBeCloseTo(cinematicPose(0, EARTH).dist * view.fit, 6);
    expect(cinematicPose(CINEMATIC_DURATION, EARTH, view).dist).toBeCloseTo(planetFocusDistance(2, PHONE), 9);
    // Still one continuous dive: always inward, never stopped, no rush.
    let prev = cinematicPose(0.5 - FRAME, EARTH, view).dist;
    for (let t = 0.5; t <= CINEMATIC_DURATION - 0.5; t += FRAME) {
      const d = cinematicPose(t, EARTH, view).dist;
      const rate = (Math.log10(prev) - Math.log10(d)) / FRAME;
      expect(rate).toBeGreaterThan(0.1);
      expect(rate).toBeLessThan(0.6);
      prev = d;
    }
  });
});

describe('sunlit view', () => {
  it('views a body from its Sun-facing side wherever it is', () => {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 9) {
      for (const r of [0.39, 1, 5.2, 30]) {
        const body: Vec3 = [r * Math.cos(a), 0, r * Math.sin(a)];
        const off = orbitOffset(1, sunlitAzimuth(body), FOCUS_ELEVATION);
        const toSun: Vec3 = [-body[0] / r, 0, -body[2] / r];
        // cos of the phase angle; 1 is fully lit, below 0 is the night side.
        expect(off[0] * toSun[0] + off[1] * toSun[1] + off[2] * toSun[2]).toBeGreaterThan(0.6);
      }
    }
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

  it('blendPose blends distance in log space and ends on its target', () => {
    const a = { center: [0, 0, 0] as Vec3, dist: 1, az: 0.2, el: 0.2 };
    const b = { center: [1, 0, 0] as Vec3, dist: 100, az: 0.6, el: 0.4 };
    expect(blendPose(a, b, 0)).toBe(a);
    expect(blendPose(a, b, 1)).toBe(b);
    const mid = blendPose(a, b, 0.5);
    expect(mid.dist).toBeCloseTo(10, 9);
    expect(mid.az).toBeCloseTo(0.4, 9);
  });

  it('alignAzimuth takes the short way round, once', () => {
    const pose = { center: [0, 0, 0] as Vec3, dist: 1, az: 3.0, el: 0.2 };
    // -3.0 is 0.283 rad from 3.0 through pi, not 6 rad back through zero.
    expect(alignAzimuth(pose, -3.0).az).toBeCloseTo(3.0 - 2 * Math.PI, 9);
    expect(alignAzimuth(pose, 2.5)).toBe(pose);
  });

  it('a replay from the far side of the path never flips direction', () => {
    // Start a replay from every direction around Earth, including directly
    // opposite the opening view, and follow the blended camera frame by frame.
    for (let az = -Math.PI; az < Math.PI; az += Math.PI / 16) {
      const raw = cameraToPose(
        [EARTH[0] + 0.5 * Math.cos(0.4) * Math.cos(az), EARTH[1] + 0.5 * Math.sin(0.4), EARTH[2] + 0.5 * Math.cos(0.4) * Math.sin(az)],
        EARTH,
      );
      const entry = alignAzimuth(raw, cinematicPose(0, EARTH).az);
      const seconds = cinematicEntrySeconds(entry);
      let prev = poseToCamera(entry);
      for (let t = FRAME; t <= seconds + 0.5; t += FRAME) {
        const k = Math.max(0, Math.min(1, t / seconds));
        const cam = poseToCamera(blendPose(entry, cinematicPose(t, EARTH), k * k * (3 - 2 * k)));
        expect(angleBetween(forward(prev.pos, prev.look), forward(cam.pos, cam.look))).toBeLessThan(4);
        prev = cam;
      }
    }
  });
});
