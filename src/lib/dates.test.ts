import { describe, expect, it } from 'vitest';
import {
  EPOCH_DATE,
  daysSinceEpoch,
  formatCountdown,
  msUntilNextPuzzle,
  puzzleDateAt,
  puzzleNumberFor,
  startOfGameDayUtc,
} from './dates';

describe('puzzleDateAt', () => {
  it('uses the game timezone, not UTC', () => {
    // 03:30 UTC on Jan 2 is still Jan 1 in New York (UTC-5).
    expect(puzzleDateAt(Date.UTC(2026, 0, 2, 3, 30))).toBe('2026-01-01');
    expect(puzzleDateAt(Date.UTC(2026, 0, 2, 5, 30))).toBe('2026-01-02');
  });

  it('handles daylight saving time', () => {
    // In July New York is UTC-4, so the rollover is at 04:00 UTC.
    expect(puzzleDateAt(Date.UTC(2026, 6, 2, 3, 30))).toBe('2026-07-01');
    expect(puzzleDateAt(Date.UTC(2026, 6, 2, 4, 30))).toBe('2026-07-02');
  });
});

describe('startOfGameDayUtc', () => {
  it('resolves midnight in both standard and daylight time', () => {
    expect(startOfGameDayUtc('2026-01-01')).toBe(Date.UTC(2026, 0, 1, 5));
    expect(startOfGameDayUtc('2026-07-01')).toBe(Date.UTC(2026, 6, 1, 4));
  });

  it('round-trips with puzzleDateAt across a DST boundary', () => {
    for (const date of ['2026-03-07', '2026-03-08', '2026-03-09', '2026-11-01', '2026-11-02']) {
      expect(puzzleDateAt(startOfGameDayUtc(date))).toBe(date);
      // One second before midnight still belongs to the previous day.
      expect(puzzleDateAt(startOfGameDayUtc(date) - 1)).not.toBe(date);
    }
  });
});

describe('daysSinceEpoch / puzzleNumberFor', () => {
  it('numbers the epoch as puzzle #1', () => {
    expect(daysSinceEpoch(EPOCH_DATE)).toBe(0);
    expect(puzzleNumberFor(EPOCH_DATE)).toBe(1);
    expect(puzzleNumberFor('2026-01-02')).toBe(2);
  });

  it('counts whole days across DST shifts', () => {
    // March 8 2026 is a 23-hour day in New York; the count must still be exact.
    expect(daysSinceEpoch('2026-03-09') - daysSinceEpoch('2026-03-07')).toBe(2);
    // November 1 2026 is a 25-hour day.
    expect(daysSinceEpoch('2026-11-02') - daysSinceEpoch('2026-10-31')).toBe(2);
    expect(daysSinceEpoch('2027-01-01')).toBe(365);
  });

  it('goes negative before the epoch', () => {
    expect(daysSinceEpoch('2025-12-31')).toBe(-1);
  });
});

describe('msUntilNextPuzzle', () => {
  it('counts down to the next rollover', () => {
    const noon = Date.UTC(2026, 0, 1, 17); // 12:00 in New York
    expect(msUntilNextPuzzle(noon)).toBe(12 * 3_600_000);
  });

  it('is positive and under 25 hours on DST transition days', () => {
    for (const at of [Date.UTC(2026, 2, 8, 6), Date.UTC(2026, 10, 1, 6)]) {
      const ms = msUntilNextPuzzle(at);
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(25 * 3_600_000);
      // Landing exactly on the next day's start is the whole point.
      expect(puzzleDateAt(at + ms)).not.toBe(puzzleDateAt(at));
    }
  });
});

describe('formatCountdown', () => {
  it('zero-pads to hh:mm:ss', () => {
    expect(formatCountdown(3_600_000)).toBe('01:00:00');
    expect(formatCountdown(45_000)).toBe('00:00:45');
    expect(formatCountdown(-1)).toBe('00:00:00');
  });
});
