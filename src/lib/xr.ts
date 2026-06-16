/*
 * WebXR immersive mode feature-detection (Apple Vision Pro Safari, Meta Quest
 * browser, etc.).
 *
 * This module deliberately does NOT import @react-three/xr — that whole library
 * (and its bundled room environments) is loaded lazily via scene/XRProvider,
 * and only when a headset is actually present. Keeping the detection here
 * dependency-free means the 99% of users on phones/desktops never download the
 * XR runtime. Immersive WebXR also only works in a real browser on a headset,
 * never inside the Capacitor WKWebView shell.
 */
import { useEffect, useState } from 'react';

/**
 * Tri-state immersive-vr support: `null` while the check is pending, then
 * `true`/`false`.
 *
 * The pending state matters: it lets the caller withhold the scene's first
 * mount until support is known, so the scene mounts ONCE in its final tree
 * position (bare, or wrapped in the lazy XR provider) rather than mounting bare
 * and then remounting under the provider when the async check resolves.
 *
 * Browsers with no `navigator.xr` resolve to `false` synchronously (via lazy
 * initial state), so the 99% of users on phones/desktops see zero delay.
 */
export function useImmersiveVrSupported(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(() => {
    const xr = typeof navigator !== 'undefined'
      ? (navigator as Navigator & { xr?: XRSystem }).xr
      : undefined;
    return xr?.isSessionSupported ? null : false;
  });

  useEffect(() => {
    if (supported !== null) return; // already resolved (no navigator.xr)
    let cancelled = false;
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    // Promise-wrap so every setState is async (no synchronous set in the effect
    // body); a missing API resolves to false rather than setting state inline.
    Promise.resolve(xr?.isSessionSupported?.('immersive-vr') ?? false)
      .then((ok) => { if (!cancelled) setSupported(!!ok); })
      .catch(() => { if (!cancelled) setSupported(false); });
    return () => { cancelled = true; };
  }, [supported]);

  return supported;
}
