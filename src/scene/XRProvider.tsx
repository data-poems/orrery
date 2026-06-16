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

// Created once when this lazy module first loads (headset only). No emulated
// controller rays — Vision Pro uses transient-pointer (pinch), which
// @react-three/xr v6 maps onto the existing onClick raycasting.
const xrStore = createXRStore({ controller: false, hand: false });

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
