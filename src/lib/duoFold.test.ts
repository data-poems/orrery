import { describe, expect, it } from 'vitest';
import { duoLayoutFor, rightPage, sameDuoLayout, type DuoFoldState } from './duoFold';

// The Duo simulator's regions: 40 pt bands at 455.5.
const tabletop: DuoFoldState = { hinge: true, pose: 'laptop', fold: { x: 0, y: 455.5, width: 669, height: 40 } };
const book: DuoFoldState = { hinge: true, pose: 'book', fold: { x: 455.5, y: 0, width: 40, height: 669 } };

describe('duoLayoutFor', () => {
  it('stands the scene above a fold across the screen', () => {
    expect(duoLayoutFor(tabletop, { width: 669, height: 951 })).toEqual({ kind: 'tabletop', foldTop: 455.5, foldBottom: 495.5 });
  });

  it('keeps the full width across a fold down the screen', () => {
    expect(duoLayoutFor(book, { width: 951, height: 669 })).toEqual({ kind: 'book', foldLeft: 455.5, foldRight: 495.5, width: 951 });
  });

  it('leaves every device without a hinge alone', () => {
    for (const viewport of [{ width: 402, height: 874 }, { width: 951, height: 669 }, { width: 1280, height: 800 }]) {
      expect(duoLayoutFor(undefined, viewport)).toBeNull();
      expect(duoLayoutFor({ hinge: false, pose: null, fold: null }, viewport)).toBeNull();
    }
  });

  it('keeps the normal layout when folded shut', () => {
    expect(duoLayoutFor({ hinge: true, pose: 'flat', axis: null, fold: null }, { width: 466, height: 678 })).toBeNull();
  });

  it('keeps the book placement while a sideways inner screen lies flat', () => {
    expect(duoLayoutFor({ hinge: true, pose: 'flat', axis: 'vertical', fold: null }, { width: 951, height: 669 }))
      .toEqual({ kind: 'book', foldLeft: 455.5, foldRight: 495.5, width: 951 });
  });

  it('fills the screen with the scene while an upright inner screen lies flat', () => {
    expect(duoLayoutFor({ hinge: true, pose: 'flat', axis: 'horizontal', fold: null }, { width: 669, height: 951 })).toBeNull();
  });

  it('refuses halves too small for the scene or the controls', () => {
    const low = { ...tabletop, fold: { x: 0, y: 700, width: 669, height: 40 } };
    expect(duoLayoutFor(low, { width: 669, height: 951 })).toBeNull();
    const narrow = { ...book, fold: { x: 640, y: 0, width: 40, height: 669 } };
    expect(duoLayoutFor(narrow, { width: 951, height: 669 })).toBeNull();
  });

  it('ignores a fold whose direction does not match the pose', () => {
    expect(duoLayoutFor({ ...tabletop, pose: 'book' }, { width: 669, height: 951 })).toBeNull();
  });
});

describe('rightPage', () => {
  it('centers on the page right of the fold', () => {
    expect(rightPage({ foldRight: 495.5, width: 951 })).toEqual({ center: 723.25, width: 455.5 });
  });
});

describe('sameDuoLayout', () => {
  it('compares by value', () => {
    expect(sameDuoLayout(null, null)).toBe(true);
    expect(sameDuoLayout({ kind: 'tabletop', foldTop: 1, foldBottom: 2 }, { kind: 'tabletop', foldTop: 1, foldBottom: 2 })).toBe(true);
    expect(sameDuoLayout({ kind: 'tabletop', foldTop: 1, foldBottom: 2 }, null)).toBe(false);
  });
});
