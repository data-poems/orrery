const CINEMATIC_SEEN_STORAGE_ID = 'orrery.cinematic-seen.v1';

type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'setItem'>;

export interface CinematicLaunchOptions {
  observatoryMode: boolean;
  prefersReducedMotion: boolean;
}

export function hasSeenCinematic(storage: StorageReader | null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(CINEMATIC_SEEN_STORAGE_ID) === '1';
  } catch {
    return false;
  }
}

export function shouldStartCinematic(
  storage: StorageReader | null,
  options: CinematicLaunchOptions,
): boolean {
  return !options.observatoryMode &&
    !options.prefersReducedMotion &&
    !hasSeenCinematic(storage);
}

export function markCinematicSeen(storage: StorageWriter | null): void {
  if (!storage) return;
  try {
    storage.setItem(CINEMATIC_SEEN_STORAGE_ID, '1');
  } catch {
    // Private browsing and managed devices can reject persistent storage.
  }
}
