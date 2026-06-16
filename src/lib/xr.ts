/*
 * WebXR immersive mode (Apple Vision Pro Safari, Meta Quest browser, etc.).
 *
 * Immersive WebXR is supported in Safari on visionOS 2+ (and in WebXR-capable
 * browsers generally) but NOT inside WKWebView — so this only lights up when
 * the app is opened in a real browser on a headset, never in the Capacitor iOS
 * shell. The "Enter VR" button is feature-detected (see useImmersiveVrSupported)
 * and stays hidden everywhere it can't work, so this is fully additive: the
 * phone/desktop/iOS/Android experience is unchanged.
 *
 * @react-three/xr v6 handles Vision Pro's gaze + pinch (transient-pointer)
 * input out of the box, so existing R3F onClick raycasting keeps working in the
 * immersive session.
 */
import { useEffect, useState } from 'react';
import { createXRStore } from '@react-three/xr';

// Single shared store: the <XR> provider inside <Canvas> and the "Enter VR"
// button outside it must reference the same instance.
export const xrStore = createXRStore({
  // No emulated controller rays — Vision Pro uses transient-pointer (pinch),
  // and we want gaze/pinch selection to map onto the existing onClick handlers.
  controller: false,
  hand: false,
});

/**
 * True only once the browser confirms an `immersive-vr` session is available.
 * Returns false during the async check and on every non-XR platform, so the
 * UI can gate the entry point without flashing it where it can't work.
 */
export function useImmersiveVrSupported(): boolean {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr?.isSessionSupported) return;
    xr.isSessionSupported('immersive-vr')
      .then((ok) => { if (!cancelled) setSupported(ok); })
      .catch(() => { /* unsupported — leave false */ });
    return () => { cancelled = true; };
  }, []);

  return supported;
}
