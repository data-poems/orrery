// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import BodyStats from './BodyStats';

it('keeps explicitly opened details readable and closes without navigating', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const back = vi.fn();
  try {
    await act(async () => root.render(<BodyStats name="Sun" subtitle="Star" color="yellow"
      stats={[{ label: 'Type', value: 'G2V' }]} accent="white" accentRgb="255,255,255"
      onBack={back} compact hudVisible={false} />));
    const open = host.querySelector('button')!;
    await act(async () => open.click());
    expect(host.firstElementChild?.getAttribute('style')).toContain('opacity: 1');
    expect((host.firstElementChild as HTMLElement).style.bottom).toContain('100px');
    const close = host.querySelector<HTMLButtonElement>('[aria-label="Close details"]');
    expect(close).not.toBeNull();
    await act(async () => close!.click());
    expect(back).not.toHaveBeenCalled();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Sun — show details');
  } finally {
    await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals();
  }
});
