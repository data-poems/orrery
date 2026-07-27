import { describe, expect, it, vi } from 'vitest';
import {
  ReviewPromptCoordinator,
  canonicalManualTargetKey,
  emptyReviewPromptState,
  markReviewRequested,
  parseReviewPromptState,
  recordManualExploration,
  reviewEligibility,
} from './reviewPrompt';

const DAY_MS = 24 * 60 * 60 * 1000;
const VERSION = '1.2.1';

class MemoryStorage {
  value: string | null = null;

  getItem(): string | null {
    return this.value;
  }

  setItem(_key: string, value: string): void {
    this.value = value;
  }
}

function dateAfter(start: Date, days: number): Date {
  return new Date(start.getTime() + days * DAY_MS);
}

describe('review prompt policy', () => {
  it('counts distinct manual targets and meaningful sessions', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    let state = emptyReviewPromptState();
    state = recordManualExploration(state, 'planet:2', 'session-a', start);
    state = recordManualExploration(state, 'planet:2', 'session-a', start);
    state = recordManualExploration(state, 'moon:2:0', 'session-b', dateAfter(start, 1));

    expect(state.manualTargetKeys).toEqual(['planet:2', 'moon:2:0']);
    expect(state.manualSessionIds).toEqual(['session-a', 'session-b']);
    expect(state.firstManualExplorationAt).toBe(start.toISOString());
  });

  it('canonicalizes direct and preset Sun visits as one destination', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    let state = emptyReviewPromptState();
    state = recordManualExploration(state, 'preset:Sun', 'session-a', start);
    state = recordManualExploration(state, 'sun', 'session-a', start);

    expect(canonicalManualTargetKey('preset:Sun')).toBe('sun');
    expect(state.manualTargetKeys).toEqual(['sun']);
    expect(parseReviewPromptState(JSON.stringify({
      ...state,
      manualTargetKeys: ['preset:Sun', 'sun'],
    })).manualTargetKeys).toEqual(['sun']);
  });

  it('becomes eligible after four targets, three sessions, and seven days', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    let state = emptyReviewPromptState();
    state = recordManualExploration(state, 'planet:2', 'session-a', start);
    state = recordManualExploration(state, 'planet:3', 'session-a', start);
    state = recordManualExploration(state, 'moon:2:0', 'session-b', dateAfter(start, 2));
    state = recordManualExploration(state, 'preset:Outer', 'session-c', dateAfter(start, 7));

    expect(reviewEligibility(state, VERSION, dateAfter(start, 6))).toEqual({
      eligible: false,
      reason: 'not-enough-time',
    });
    expect(reviewEligibility(state, VERSION, dateAfter(start, 7))).toEqual({
      eligible: true,
      reason: 'eligible',
    });
  });

  it('allows only one request per version', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    const eligibleState = {
      ...emptyReviewPromptState(),
      firstManualExplorationAt: start.toISOString(),
      manualTargetKeys: ['planet:0', 'planet:1', 'planet:2', 'planet:3'],
      manualSessionIds: ['session-a', 'session-b', 'session-c'],
    };
    const requested = markReviewRequested(eligibleState, VERSION, dateAfter(start, 8));

    expect(reviewEligibility(requested, VERSION, dateAfter(start, 130))).toEqual({
      eligible: false,
      reason: 'already-requested-version',
    });
  });

  it('enforces the 120-day cooldown across app versions', () => {
    const start = new Date('2026-01-01T12:00:00Z');
    const eligibleState = {
      ...emptyReviewPromptState(),
      firstManualExplorationAt: start.toISOString(),
      manualTargetKeys: ['planet:0', 'planet:1', 'planet:2', 'planet:3'],
      manualSessionIds: ['session-a', 'session-b', 'session-c'],
    };
    const requested = markReviewRequested(eligibleState, VERSION, dateAfter(start, 8));

    expect(reviewEligibility(requested, '1.2.2', dateAfter(start, 127))).toEqual({
      eligible: false,
      reason: 'cooldown',
    });
    expect(reviewEligibility(requested, '1.2.2', dateAfter(start, 128))).toEqual({
      eligible: true,
      reason: 'eligible',
    });
  });

  it('recovers safely from invalid persisted state', () => {
    expect(parseReviewPromptState('{not json')).toEqual(emptyReviewPromptState());
    expect(parseReviewPromptState(JSON.stringify({ schemaVersion: 2 })))
      .toEqual(emptyReviewPromptState());
  });

  it('persists a request only after the native boundary reports dispatch', async () => {
    const now = new Date('2026-06-01T12:00:00Z');
    const storage = new MemoryStorage();
    storage.value = JSON.stringify({
      ...emptyReviewPromptState(),
      firstManualExplorationAt: '2026-01-01T12:00:00.000Z',
      manualTargetKeys: ['planet:0', 'planet:1', 'planet:2', 'planet:3'],
      manualSessionIds: ['session-a', 'session-b', 'session-c'],
    });
    const requestReview = vi.fn()
      .mockResolvedValueOnce({ dispatched: false })
      .mockResolvedValueOnce({ dispatched: true });
    const coordinator = new ReviewPromptCoordinator(storage, VERSION, 'session-d', {
      isNativeIOS: true,
      isVisible: () => true,
      now: () => now,
      requestReview,
    });

    expect(await coordinator.requestIfEligible()).toBe(false);
    expect(parseReviewPromptState(storage.value).requestedVersions).toEqual([]);
    expect(await coordinator.requestIfEligible()).toBe(true);
    expect(parseReviewPromptState(storage.value).requestedVersions).toEqual([VERSION]);
    expect(requestReview).toHaveBeenCalledTimes(2);
  });

  it('allows only one native request while dispatch is in flight', async () => {
    const now = new Date('2026-06-01T12:00:00Z');
    const storage = new MemoryStorage();
    storage.value = JSON.stringify({
      ...emptyReviewPromptState(),
      firstManualExplorationAt: '2026-01-01T12:00:00.000Z',
      manualTargetKeys: ['planet:0', 'planet:1', 'planet:2', 'planet:3'],
      manualSessionIds: ['session-a', 'session-b', 'session-c'],
    });
    let resolveDispatch!: (result: { dispatched: boolean }) => void;
    const requestReview = vi.fn(() => new Promise<{ dispatched: boolean }>((resolve) => {
      resolveDispatch = resolve;
    }));
    const coordinator = new ReviewPromptCoordinator(storage, VERSION, 'session-d', {
      isNativeIOS: true,
      isVisible: () => true,
      now: () => now,
      requestReview,
    });

    const firstRequest = coordinator.requestIfEligible();
    expect(await coordinator.requestIfEligible()).toBe(false);
    resolveDispatch({ dispatched: true });
    expect(await firstRequest).toBe(true);
    expect(requestReview).toHaveBeenCalledTimes(1);
  });
});
