import { describe, expect, it } from 'vitest';
import {
  hasSeenCinematic,
  markCinematicSeen,
  shouldStartCinematic,
} from './launchExperience';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('cinematic launch experience', () => {
  it('auto-plays once, then leaves returning visitors in the interactive view', () => {
    const storage = new MemoryStorage();
    const options = { observatoryMode: false, prefersReducedMotion: false };

    expect(shouldStartCinematic(storage, options)).toBe(true);
    markCinematicSeen(storage);
    expect(hasSeenCinematic(storage)).toBe(true);
    expect(shouldStartCinematic(storage, options)).toBe(false);
  });

  it('does not auto-play in observatory or reduced-motion contexts', () => {
    const storage = new MemoryStorage();

    expect(shouldStartCinematic(storage, {
      observatoryMode: true,
      prefersReducedMotion: false,
    })).toBe(false);
    expect(shouldStartCinematic(storage, {
      observatoryMode: false,
      prefersReducedMotion: true,
    })).toBe(false);
  });

  it('fails open when persistent storage is unavailable', () => {
    const storage = {
      getItem: () => { throw new Error('unavailable'); },
    };

    expect(shouldStartCinematic(storage, {
      observatoryMode: false,
      prefersReducedMotion: false,
    })).toBe(true);
  });
});
