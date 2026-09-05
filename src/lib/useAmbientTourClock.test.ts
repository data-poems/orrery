// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { useAmbientTourClock } from './useAmbientTourClock';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
function Harness({ enabled, advance }: { enabled: boolean; advance: (restart: boolean) => void }) {
  useAmbientTourClock(enabled, advance);
  return null;
}
it('does not restart the tour when planet selection changes the navigation callback', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const root = createRoot(document.createElement('div'));
  const first = vi.fn();
  const latest = vi.fn();
  try {
    await act(async () => root.render(createElement(Harness, { enabled: true, advance: first })));
    expect(first).toHaveBeenCalledExactlyOnceWith(true);
    // Real navigation changes selPlanet, rebuilding handlePlanetSelect/goToTarget.
    await act(async () => root.render(createElement(Harness, { enabled: true, advance: latest })));
    expect(latest).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(9999));
    expect(latest).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(latest).toHaveBeenCalledExactlyOnceWith(false);
    await act(async () => root.render(createElement(Harness, { enabled: false, advance: latest })));
    await act(async () => vi.advanceTimersByTime(30000));
    expect(latest).toHaveBeenCalledTimes(1);
    await act(async () => root.render(createElement(Harness, { enabled: true, advance: latest })));
    expect(latest).toHaveBeenLastCalledWith(true);
  } finally { await act(async () => root.unmount()); }
  expect(vi.getTimerCount()).toBe(0);
});
