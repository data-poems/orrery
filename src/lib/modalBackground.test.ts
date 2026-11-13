// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { hideBackgroundFromAssistiveTech } from './modalBackground';

function build() {
  document.body.innerHTML = `
    <div id="root">
      <div id="app">
        <canvas id="scene"></canvas>
        <nav id="hud"></nav>
        <div id="decor" aria-hidden="true"></div>
        <div id="overlay"><div id="dialog" role="dialog"></div><div id="beside"></div></div>
      </div>
    </div>`;
  return document.getElementById('dialog')!;
}

describe('hideBackgroundFromAssistiveTech', () => {
  it('hides everything outside the dialog and nothing on the path to it', () => {
    const restore = hideBackgroundFromAssistiveTech(build());
    for (const id of ['scene', 'hud', 'beside']) {
      expect(document.getElementById(id)!.getAttribute('aria-hidden')).toBe('true');
    }
    for (const id of ['dialog', 'overlay', 'app', 'root']) {
      expect(document.getElementById(id)!.hasAttribute('aria-hidden')).toBe(false);
    }
    restore();
  });

  it('restores only what it changed', () => {
    const restore = hideBackgroundFromAssistiveTech(build());
    restore();
    for (const id of ['scene', 'hud', 'beside']) {
      expect(document.getElementById(id)!.hasAttribute('aria-hidden')).toBe(false);
    }
    expect(document.getElementById('decor')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('does nothing without a dialog', () => {
    expect(() => hideBackgroundFromAssistiveTech(null)()).not.toThrow();
  });
});
