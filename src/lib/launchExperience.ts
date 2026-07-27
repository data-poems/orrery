const CINEMATIC_SEEN_STORAGE_ID = 'orrery.cinematic-seen.v1';

type LaunchStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface CinematicLaunchOptions {
  observatoryMode: boolean;
  prefersReducedMotion: boolean;
}

/**
 * Claims the one automatic cinematic opportunity before React mounts. Persisting
 * first keeps an interrupted tour, or a first launch with Reduce Motion enabled,
 * from turning into an unexpected automatic tour on a later visit.
 *
 * If storage is unavailable, skip the automatic tour. That is the only way to
 * preserve the at-most-once promise when the handled state cannot be persisted.
 */
export function claimFirstVisitCinematic(
  storage: LaunchStorage | null,
  options: CinematicLaunchOptions,
): boolean {
  if (options.observatoryMode || !storage) return false;
  try {
    // Keep the original key so people who completed the cinematic in an older
    // build are treated as returning visitors after this lifecycle fix.
    if (storage.getItem(CINEMATIC_SEEN_STORAGE_ID) === '1') return false;
    storage.setItem(CINEMATIC_SEEN_STORAGE_ID, '1');
    return !options.prefersReducedMotion;
  } catch {
    // Private browsing and managed devices can reject persistent storage.
    return false;
  }
}
