import { describe, expect, it } from 'vitest';
import { nextSuffix } from './GuessTiles';

describe('nextSuffix', () => {
  it('lowercases and strips anything that is not a letter', () => {
    expect(nextSuffix('Gi-Ne!', 9)).toBe('gine');
    expect(nextSuffix('  a b  ', 9)).toBe('ab');
    expect(nextSuffix('123', 9)).toBe('');
  });

  it('truncates to the boxes that are left', () => {
    expect(nextSuffix('ngine', 3)).toBe('ngi');
    expect(nextSuffix('abc', 3)).toBe('abc');
  });

  it('returns nothing when no boxes remain', () => {
    // Only reachable if a clue somehow filled the word; must not throw.
    expect(nextSuffix('abc', 0)).toBe('');
    expect(nextSuffix('abc', -1)).toBe('');
  });

  it('is idempotent, so re-feeding its own output changes nothing', () => {
    const once = nextSuffix('En-Gine', 6);
    expect(nextSuffix(once, 6)).toBe(once);
  });
});
