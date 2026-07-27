import { describe, expect, it } from 'vitest';
import { claimFirstVisitCinematic } from './launchExperience';

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
  it('claims the automatic tour before it starts so an interruption cannot replay it', () => {
    const storage = new MemoryStorage();
    const options = { observatoryMode: false, prefersReducedMotion: false };

    expect(claimFirstVisitCinematic(storage, options)).toBe(true);
    // Simulate a relaunch before the first cinematic reached its exit handler.
    expect(claimFirstVisitCinematic(storage, options)).toBe(false);
  });

  it('handles a reduced-motion first visit without replaying after the preference changes', () => {
    const storage = new MemoryStorage();

    expect(claimFirstVisitCinematic(storage, {
      observatoryMode: false,
      prefersReducedMotion: true,
    })).toBe(false);
    expect(claimFirstVisitCinematic(storage, {
      observatoryMode: false,
      prefersReducedMotion: false,
    })).toBe(false);
  });

  it('does not let Observatory mode consume the main experience first visit', () => {
    const storage = new MemoryStorage();

    expect(claimFirstVisitCinematic(storage, {
      observatoryMode: true,
      prefersReducedMotion: false,
    })).toBe(false);
    expect(claimFirstVisitCinematic(storage, {
      observatoryMode: false,
      prefersReducedMotion: false,
    })).toBe(true);
  });

  it('skips the automatic tour when handled state cannot be persisted', () => {
    const storage = {
      getItem: () => { throw new Error('unavailable'); },
      setItem: () => { throw new Error('unavailable'); },
    };

    expect(claimFirstVisitCinematic(storage, {
      observatoryMode: false,
      prefersReducedMotion: false,
    })).toBe(false);
  });

});
