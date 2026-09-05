import { useEffect, useEffectEvent } from 'react';

/** One immediate stop on activation, then one stop every ten seconds. */
export function useAmbientTourClock(enabled: boolean, advance: (restart: boolean) => void): void {
  // Navigation closures change with selection. Read their latest state without
  // treating that change as a request to restart the timer or shuffle again.
  const tick = useEffectEvent(advance);
  useEffect(() => {
    if (!enabled) return;
    tick(true);
    const timer = setInterval(() => tick(false), 10000);
    return () => clearInterval(timer);
  }, [enabled]);
}
