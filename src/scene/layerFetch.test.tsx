// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { RealAsteroidBelt } from './Asteroids';
import { CometField } from './Comets';
import { SatelliteField } from './Satellites';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('layer data loading', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetches once while a layer stays visible, although Scene passes a new onLoad each render', async () => {
    // Never resolves, so no layer reaches its three.js output in this DOM test.
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    const root = createRoot(document.createElement('div'));
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        root.render(
          <>
            <RealAsteroidBelt jd={2461330 + i} visible onLoad={() => {}} />
            <CometField jd={2461330 + i} visible selComet={null} setSelComet={() => {}} onLoad={() => {}} />
            <SatelliteField
              visible simTime={new Date(0)} earthPos={null} cameraDistance={0}
              selSatellite={null} setSelSatellite={() => {}} onLoad={() => {}}
            />
          </>,
        );
      });
    }
    // One request per layer: asteroid belt, comets, CelesTrak.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    act(() => root.unmount());
  });

  it('keeps re-reporting readiness, so a loading reset after context loss recovers', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
    const onLoad = vi.fn();
    const root = createRoot(document.createElement('div'));
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        root.render(<RealAsteroidBelt jd={2461330} visible={false} onLoad={() => onLoad()} />);
      });
    }
    expect(onLoad).toHaveBeenCalledTimes(3);
    act(() => root.unmount());
  });
});
