import { afterEach, describe, expect, it, vi } from 'vitest';
import { EPOCH_DATE } from './dates';

/**
 * These helpers are inert unless Vite is in dev mode, so each case stubs
 * `import.meta.env.DEV` and the query string, then re-imports the module.
 */
async function load(search: string, dev = true) {
  vi.resetModules();
  vi.stubEnv('DEV', dev);
  vi.stubGlobal('location', { search } as Location);
  return import('./devOptions');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('devPuzzleDate', () => {
  it('is null when no override is given', async () => {
    // Regression: Number(null) is 0, which used to pin dev to bank index 0.
    const { devPuzzleDate } = await load('');
    expect(devPuzzleDate()).toBeNull();
  });

  it('accepts a well-formed date', async () => {
    const { devPuzzleDate } = await load('?date=2026-03-14');
    expect(devPuzzleDate()).toBe('2026-03-14');
  });

  it('rejects a malformed or impossible date', async () => {
    expect((await load('?date=nonsense')).devPuzzleDate()).toBeNull();
    expect((await load('?date=2026-13-99')).devPuzzleDate()).toBeNull();
    expect((await load('?date=03-14-2026')).devPuzzleDate()).toBeNull();
  });

  it('maps a bank index onto its date', async () => {
    expect((await load('?puzzle=0')).devPuzzleDate()).toBe(EPOCH_DATE);
    expect((await load('?puzzle=5')).devPuzzleDate()).toBe('2026-01-06');
  });

  it('rejects an out-of-range or non-numeric index', async () => {
    expect((await load('?puzzle=999')).devPuzzleDate()).toBeNull();
    expect((await load('?puzzle=-1')).devPuzzleDate()).toBeNull();
    expect((await load('?puzzle=abc')).devPuzzleDate()).toBeNull();
    expect((await load('?puzzle=')).devPuzzleDate()).toBeNull();
  });

  it('ignores every override outside dev, so production cannot be steered', async () => {
    const { devPuzzleDate, devShouldResetStats } = await load('?date=2026-03-14&reset=1', false);
    expect(devPuzzleDate()).toBeNull();
    expect(devShouldResetStats()).toBe(false);
  });
});

describe('devShouldResetStats', () => {
  it('only fires on reset=1', async () => {
    expect((await load('?reset=1')).devShouldResetStats()).toBe(true);
    expect((await load('?reset=0')).devShouldResetStats()).toBe(false);
    expect((await load('')).devShouldResetStats()).toBe(false);
  });
});
