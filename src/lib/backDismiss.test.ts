import { describe, expect, it, vi } from 'vitest';
import { dismissTopForBack, registerBackDismiss } from './backDismiss';

describe('backDismiss', () => {
  it('reports nothing to close when no dialog is open', () => {
    expect(dismissTopForBack()).toBe(false);
  });

  it('closes the most recently opened dialog first', () => {
    const about = vi.fn();
    const shortcuts = vi.fn();
    const removeAbout = registerBackDismiss(about);
    const removeShortcuts = registerBackDismiss(shortcuts);

    expect(dismissTopForBack()).toBe(true);
    expect(shortcuts).toHaveBeenCalledTimes(1);
    expect(about).not.toHaveBeenCalled();

    removeShortcuts();
    expect(dismissTopForBack()).toBe(true);
    expect(about).toHaveBeenCalledTimes(1);

    removeAbout();
    expect(dismissTopForBack()).toBe(false);
  });
});
