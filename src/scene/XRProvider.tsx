/*
 * Lazy WebXR provider — the sole importer of @react-three/xr.
 *
 * Orrery React.lazy()-loads this only when a headset is detected
 * (useImmersiveVrSupported), so @react-three/xr and its bundled room
 * environments stay out of the chunk everyone else downloads. It wraps the
 * scene in <XR> and seats the immersive viewer at the default 'Inner' vantage,
 * and hands the store back up so the "Enter VR" button can start a session.
 */
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { XR, XROrigin, createXRStore } from '@react-three/xr';

// Created once when this lazy module first loads (headset only). Every WebXR
// input modality is enabled so the scene is interactive on any headset, not
// just Vision Pro:
//   • controller       — Quest, Pico, HTC Vive, PCVR motion controllers
//   • hand             — Quest & Vision Pro articulated hand tracking
//   • transientPointer — Vision Pro (and Quest) pinch / tap-to-select
//   • gaze             — fallback for devices with no controllers or hands
// @react-three/xr only instantiates the input sources the live session
// actually reports, so turning them all on is purely additive — a Vision Pro
// (no controllers) renders no controller ray, a Quest gets its controllers,
// and each modality maps its select onto the existing onClick raycasting.
const xrStore = createXRStore({
  controller: true,
  hand: true,
  transientPointer: true,
  gaze: true,
});

export type XRStore = typeof xrStore;

export default function XRProvider({
  children,
  onStoreReady,
}: {
  children: ReactNode;
  onStoreReady?: (store: XRStore) => void;
}) {
  useEffect(() => { onStoreReady?.(xrStore); }, [onStoreReady]);
  return (
    <XR store={xrStore}>
      {/* Seat the viewer at the default vantage so an entering headset frames
          the system. Comfort scale/placement needs tuning on a real device. */}
      <XROrigin position={[0, 3, 4]} />
      {children}
    </XR>
  );
}
