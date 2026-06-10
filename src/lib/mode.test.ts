import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('OBSERVATORY_MODE URL contract', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { pathname: '/' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false on root path', async () => {
    vi.resetModules();
    const { OBSERVATORY_MODE } = await import('./mode');
    expect(OBSERVATORY_MODE).toBe(false);
  });

  it('is true under /observatory', async () => {
    vi.stubGlobal('window', { location: { pathname: '/observatory/' } });
    vi.resetModules();
    const { OBSERVATORY_MODE } = await import('./mode');
    expect(OBSERVATORY_MODE).toBe(true);
  });
});
