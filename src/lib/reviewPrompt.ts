import { registerPlugin } from '@capacitor/core';
import { IS_NATIVE_IOS } from './platform';

const REVIEW_STATE_KEY = 'orrery.review-prompt.v1';
const DAY_MS = 24 * 60 * 60 * 1000;
const MINIMUM_DISTINCT_TARGETS = 4;
const MINIMUM_EXPLORATION_SESSIONS = 3;
const MINIMUM_AGE_MS = 7 * DAY_MS;
const COOLDOWN_MS = 120 * DAY_MS;

interface NativeReviewPromptPlugin {
  requestReview(options: { force: boolean }): Promise<{
    dispatched: boolean;
    reason?: string;
  }>;
}

const NativeReviewPrompt = registerPlugin<NativeReviewPromptPlugin>('OrreryReviewPrompt');

export interface ReviewPromptState {
  schemaVersion: 1;
  firstManualExplorationAt: string | null;
  manualTargetKeys: string[];
  manualSessionIds: string[];
  requestedVersions: string[];
  lastRequestedAt: string | null;
}

export interface ReviewEligibility {
  eligible: boolean;
  reason:
    | 'eligible'
    | 'not-enough-targets'
    | 'not-enough-sessions'
    | 'not-enough-time'
    | 'already-requested-version'
    | 'cooldown';
}

type ReviewStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function emptyReviewPromptState(): ReviewPromptState {
  return {
    schemaVersion: 1,
    firstManualExplorationAt: null,
    manualTargetKeys: [],
    manualSessionIds: [],
    requestedVersions: [],
    lastRequestedAt: null,
  };
}

function validDateString(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is string =>
    typeof entry === 'string' && entry.length > 0))];
}

export function parseReviewPromptState(raw: string | null): ReviewPromptState {
  if (!raw) return emptyReviewPromptState();
  try {
    const value = JSON.parse(raw) as Partial<ReviewPromptState>;
    if (value.schemaVersion !== 1) return emptyReviewPromptState();
    return {
      schemaVersion: 1,
      firstManualExplorationAt: validDateString(value.firstManualExplorationAt)
        ? value.firstManualExplorationAt
        : null,
      manualTargetKeys: stringArray(value.manualTargetKeys),
      manualSessionIds: stringArray(value.manualSessionIds),
      requestedVersions: stringArray(value.requestedVersions),
      lastRequestedAt: validDateString(value.lastRequestedAt)
        ? value.lastRequestedAt
        : null,
    };
  } catch {
    return emptyReviewPromptState();
  }
}

export function recordManualExploration(
  state: ReviewPromptState,
  targetKey: string,
  sessionId: string,
  now: Date,
): ReviewPromptState {
  const normalizedTarget = targetKey.trim();
  if (!normalizedTarget || !sessionId) return state;

  return {
    ...state,
    firstManualExplorationAt: state.firstManualExplorationAt ?? now.toISOString(),
    manualTargetKeys: [...new Set([...state.manualTargetKeys, normalizedTarget])],
    manualSessionIds: [...new Set([...state.manualSessionIds, sessionId])],
  };
}

export function reviewEligibility(
  state: ReviewPromptState,
  appVersion: string,
  now: Date,
): ReviewEligibility {
  if (state.manualTargetKeys.length < MINIMUM_DISTINCT_TARGETS) {
    return { eligible: false, reason: 'not-enough-targets' };
  }
  if (state.manualSessionIds.length < MINIMUM_EXPLORATION_SESSIONS) {
    return { eligible: false, reason: 'not-enough-sessions' };
  }
  const firstExplorationAt = state.firstManualExplorationAt
    ? Date.parse(state.firstManualExplorationAt)
    : Number.NaN;
  if (!Number.isFinite(firstExplorationAt) || now.getTime() - firstExplorationAt < MINIMUM_AGE_MS) {
    return { eligible: false, reason: 'not-enough-time' };
  }
  if (state.requestedVersions.includes(appVersion)) {
    return { eligible: false, reason: 'already-requested-version' };
  }
  const lastRequestedAt = state.lastRequestedAt ? Date.parse(state.lastRequestedAt) : Number.NaN;
  if (Number.isFinite(lastRequestedAt) && now.getTime() - lastRequestedAt < COOLDOWN_MS) {
    return { eligible: false, reason: 'cooldown' };
  }
  return { eligible: true, reason: 'eligible' };
}

export function markReviewRequested(
  state: ReviewPromptState,
  appVersion: string,
  now: Date,
): ReviewPromptState {
  return {
    ...state,
    requestedVersions: [...new Set([...state.requestedVersions, appVersion])],
    lastRequestedAt: now.toISOString(),
  };
}

function makeSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function browserStorage(): ReviewStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export class ReviewPromptCoordinator {
  private requestInFlight = false;
  private readonly storage: ReviewStorage | null;
  private readonly appVersion: string;
  private readonly sessionId: string;

  constructor(
    storage: ReviewStorage | null,
    appVersion: string,
    sessionId = makeSessionId(),
  ) {
    this.storage = storage;
    this.appVersion = appVersion;
    this.sessionId = sessionId;
  }

  recordManualExploration(targetKey: string, now = new Date()): void {
    const state = this.readState();
    this.writeState(recordManualExploration(state, targetKey, this.sessionId, now));
  }

  async requestIfEligible(options: { force?: boolean } = {}): Promise<boolean> {
    if (!IS_NATIVE_IOS || document.visibilityState !== 'visible' || this.requestInFlight) {
      return false;
    }

    const force = options.force === true;
    const state = this.readState();
    if (!force && !reviewEligibility(state, this.appVersion, new Date()).eligible) {
      return false;
    }

    this.requestInFlight = true;
    try {
      const result = await NativeReviewPrompt.requestReview({ force });
      if (!result.dispatched) return false;

      // Store the request only after the native call has reached StoreKit.
      this.writeState(markReviewRequested(this.readState(), this.appVersion, new Date()));
      return true;
    } catch {
      return false;
    } finally {
      this.requestInFlight = false;
    }
  }

  private readState(): ReviewPromptState {
    if (!this.storage) return emptyReviewPromptState();
    try {
      return parseReviewPromptState(this.storage.getItem(REVIEW_STATE_KEY));
    } catch {
      return emptyReviewPromptState();
    }
  }

  private writeState(state: ReviewPromptState): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(REVIEW_STATE_KEY, JSON.stringify(state));
    } catch {
      // Prompt policy must never interrupt the exploration experience.
    }
  }
}

export function createReviewPromptCoordinator(): ReviewPromptCoordinator {
  return new ReviewPromptCoordinator(browserStorage(), __ORRERY_APP_VERSION__);
}
