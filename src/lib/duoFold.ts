/*
 * iPhone Duo fold layout.
 *
 * The iOS shell reports the fold through DuoBridge.swift and the bundled
 * duo-fold.js shim, which publish `window.DuoFold.state` and a `duo:fold`
 * event. Browsers and Android never load the shim, so `window.DuoFold` is
 * absent there and every layout stays as it was.
 *
 * Two poses change the layout while the device is partly open:
 * - tabletop (fold across the screen): the scene stands on the upper half, and
 *   the controls and readouts sit on the half resting on the table;
 * - book (fold down the screen): the scene keeps the full width but centers on
 *   the left page (a camera view offset), and the control strip and planet chip
 *   move to the right page, off the fold.
 * Fully open, the system reports no active fold. Held sideways the controls stay
 * on the right page anyway (the crease is still down the middle, and moving them
 * as the hinge opens would be noise); held upright the scene fills the screen.
 */
import { useEffect, useState } from 'react';

export interface DuoFoldRect { x: number; y: number; width: number; height: number }

/** What `window.DuoFold.state` reports (the fields used here). */
export interface DuoFoldState {
  hinge: boolean;
  pose: 'book' | 'laptop' | 'flat' | null;
  /** Fold direction, reported even while the fold is inactive (lying flat). */
  axis?: 'vertical' | 'horizontal' | null;
  fold: DuoFoldRect | null;
}

declare global {
  interface Window {
    DuoFold?: { readonly state: DuoFoldState };
  }
}

export type DuoLayout =
  | { kind: 'tabletop'; foldTop: number; foldBottom: number }
  | { kind: 'book'; foldLeft: number; foldRight: number; width: number }
  | null;

/** The upper half must hold the scene; the lower one the chip and the strip. */
export const MIN_TABLETOP_HALF = 280;
/** The right page must hold the six-tile control strip (about 330 px). */
export const MIN_BOOK_PAGE = 340;
/** The inner screen's fold band is 40 pt down the middle; used while it lies flat. */
export const FOLD_BAND = 40;

export function duoLayoutFor(
  state: DuoFoldState | null | undefined,
  viewport: { width: number; height: number },
): DuoLayout {
  if (!state?.hinge) return null;
  const f = state.fold;
  if (!f) {
    // Lying flat: keep the book placement on a sideways inner screen.
    if (state.pose !== 'flat' || state.axis !== 'vertical') return null;
    const foldLeft = (viewport.width - FOLD_BAND) / 2;
    const foldRight = (viewport.width + FOLD_BAND) / 2;
    if (foldLeft < MIN_BOOK_PAGE) return null;
    return { kind: 'book', foldLeft, foldRight, width: viewport.width };
  }
  if (state.pose === 'laptop' && f.width > f.height) {
    const foldTop = f.y;
    const foldBottom = f.y + f.height;
    if (foldTop < MIN_TABLETOP_HALF || viewport.height - foldBottom < MIN_TABLETOP_HALF) return null;
    return { kind: 'tabletop', foldTop, foldBottom };
  }
  if (state.pose === 'book' && f.height > f.width) {
    const foldLeft = f.x;
    const foldRight = f.x + f.width;
    if (foldLeft < MIN_BOOK_PAGE || viewport.width - foldRight < MIN_BOOK_PAGE) return null;
    return { kind: 'book', foldLeft, foldRight, width: viewport.width };
  }
  return null;
}

export function sameDuoLayout(a: DuoLayout, b: DuoLayout): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * A camera view offset that puts the scene's center on the left page while the
 * canvas still fills the screen. The rendered canvas is a window into a wider
 * virtual view whose optical axis lands at the left page's center; the height,
 * and so the vertical field of view and every object's size, stay the same.
 */
export function bookViewOffset(layout: { foldLeft: number }, size: { width: number; height: number }) {
  const center = layout.foldLeft / 2;
  const fullWidth = 2 * (size.width - center);
  return { fullWidth, fullHeight: size.height, x: fullWidth / 2 - center, y: 0 };
}

/** Center and width of the page right of the fold, in viewport px. */
export function rightPage(layout: { foldRight: number; width: number }) {
  return { center: (layout.foldRight + layout.width) / 2, width: layout.width - layout.foldRight };
}

function readLayout(): DuoLayout {
  if (typeof window === 'undefined') return null;
  return duoLayoutFor(window.DuoFold?.state, { width: window.innerWidth, height: window.innerHeight });
}

/** The current fold layout, or null on every device and pose that keeps the normal layout. */
export function useDuoLayout(): DuoLayout {
  const [layout, setLayout] = useState<DuoLayout>(readLayout);
  useEffect(() => {
    const update = () => {
      const next = readLayout();
      setLayout(prev => (sameDuoLayout(prev, next) ? prev : next));
    };
    window.addEventListener('duo:fold', update);
    window.addEventListener('resize', update);
    update();
    return () => {
      window.removeEventListener('duo:fold', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return layout;
}
