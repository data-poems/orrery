/*
 * Android detection for the GPU perf profile. Tiled mobile GPUs (Adreno/Mali)
 * pay heavily for big blended points, MSAA, and log-depth — the same scene
 * that runs fine on Apple GPUs needs a lighter profile there. Applies to both
 * Chrome-on-Android and the Capacitor WebView (same bundle).
 */
export const IS_ANDROID: boolean =
  typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
