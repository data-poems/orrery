import { Capacitor } from '@capacitor/core';

/*
 * Android detection for the GPU perf profile. Tiled mobile GPUs (Adreno/Mali)
 * pay heavily for big blended points, MSAA, and log-depth — the same scene
 * that runs fine on Apple GPUs needs a lighter profile there. Applies to both
 * Chrome-on-Android and the Capacitor WebView (same bundle).
 */
export const IS_ANDROID: boolean =
  typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

/*
 * iOS / iPadOS detection. iPad reports a desktop-class viewport (so the
 * useIsMobile() breakpoint treats it as desktop and would load 4K textures —
 * ~48MB+ of GPU memory that can get the Safari tab OOM-killed). Detect iOS
 * independently of viewport width to force the 2K texture tier. iPadOS 13+
 * masquerades as MacIntel, so also check for a touch-capable "Mac".
 */
export const IS_IOS: boolean =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/** True only inside the installed Capacitor iOS shell, never mobile Safari. */
export const IS_NATIVE_IOS: boolean =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
