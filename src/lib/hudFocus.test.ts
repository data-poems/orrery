// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { restoreHudControlFocus } from './hudFocus';

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('HUD focus restoration', () => {
  it('reveals the HUD before focusing its control', () => {
    vi.useFakeTimers();
    const events: string[] = [];
    const hud = document.createElement('nav');
    const button = document.createElement('button');
    button.id = 'open-controls';
    hud.style.opacity = '0';
    hud.style.pointerEvents = 'none';
    button.addEventListener('focus', () => events.push('focus'));
    hud.append(button);
    document.body.append(hud);

    restoreHudControlFocus(button.id, () => {
      events.push('wake');
      hud.style.opacity = '1';
      hud.style.pointerEvents = 'auto';
    });

    expect(document.activeElement).not.toBe(button);
    vi.runAllTimers();
    expect(events).toEqual(['wake', 'focus']);
    expect(hud.style.opacity).toBe('1');
    expect(hud.style.pointerEvents).toBe('auto');
    expect(document.activeElement).toBe(button);
  });
});
