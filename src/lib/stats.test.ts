import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATS,
  type StatsState,
  type StoredResult,
  currentStreak,
  deriveStats,
  hasPlayed,
  loadStats,
  maxStreak,
  recordResult,
  saveStats,
} from './stats';

function result(date: string, overrides: Partial<StoredResult> = {}): StoredResult {
  return {
    date,
    number: 1,
    score: 1000,
    wrongGuesses: 2,
    lettersRevealed: 1,
    elapsedMs: 60_000,
    solved: true,
    ...overrides,
  };
}

function stateOf(...results: StoredResult[]): StatsState {
  return { results: Object.fromEntries(results.map((r) => [r.date, r])) };
}

/** Minimal in-memory Storage stand-in. */
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

describe('recordResult', () => {
  it('stores a result and keeps the first one for a day', () => {
    const first = recordResult(EMPTY_STATS, result('2026-01-01', { score: 900 }));
    const replay = recordResult(first, result('2026-01-01', { score: 1200 }));
    expect(replay).toBe(first);
    expect(replay.results['2026-01-01']!.score).toBe(900);
  });

  it('does not mutate the input', () => {
    const before = EMPTY_STATS;
    recordResult(before, result('2026-01-01'));
    expect(Object.keys(before.results)).toHaveLength(0);
  });

  it('reports whether a day has been played', () => {
    const stats = recordResult(EMPTY_STATS, result('2026-01-01'));
    expect(hasPlayed(stats, '2026-01-01')).toBe(true);
    expect(hasPlayed(stats, '2026-01-02')).toBe(false);
  });
});

describe('currentStreak', () => {
  const today = '2026-01-10';

  it('counts consecutive days ending today', () => {
    const wins = ['2026-01-08', '2026-01-09', '2026-01-10'].map((d) => result(d));
    expect(currentStreak(wins, today)).toBe(3);
  });

  it('survives today being unplayed', () => {
    const wins = ['2026-01-08', '2026-01-09'].map((d) => result(d));
    expect(currentStreak(wins, today)).toBe(2);
  });

  it('breaks when the gap reaches two days', () => {
    const wins = ['2026-01-07', '2026-01-08'].map((d) => result(d));
    expect(currentStreak(wins, today)).toBe(0);
  });

  it('stops at the first gap', () => {
    const wins = ['2026-01-01', '2026-01-02', '2026-01-09', '2026-01-10'].map((d) => result(d));
    expect(currentStreak(wins, today)).toBe(2);
  });

  it('is zero with no wins', () => {
    expect(currentStreak([], today)).toBe(0);
  });

  it('counts across a DST boundary as ordinary days', () => {
    const wins = ['2026-03-07', '2026-03-08', '2026-03-09'].map((d) => result(d));
    expect(currentStreak(wins, '2026-03-09')).toBe(3);
  });
});

describe('maxStreak', () => {
  it('finds the longest run anywhere in history', () => {
    const wins = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-09', '2026-01-10'].map((d) =>
      result(d),
    );
    expect(maxStreak(wins)).toBe(3);
  });

  it('handles one win and no wins', () => {
    expect(maxStreak([result('2026-01-01')])).toBe(1);
    expect(maxStreak([])).toBe(0);
  });
});

describe('deriveStats', () => {
  it('summarises wins and losses separately', () => {
    const stats = stateOf(
      result('2026-01-08', { score: 800, wrongGuesses: 4 }),
      result('2026-01-09', { score: 1000, wrongGuesses: 2 }),
      result('2026-01-10', { solved: false, score: 0, wrongGuesses: 9 }),
    );
    const derived = deriveStats(stats, '2026-01-10');

    expect(derived.played).toBe(3);
    expect(derived.solved).toBe(2);
    expect(derived.winRate).toBeCloseTo(2 / 3);
    // Averages describe solves only — an abandoned puzzle is not a 0-point game.
    expect(derived.averageScore).toBe(900);
    expect(derived.bestScore).toBe(1000);
    expect(derived.averageWrongGuesses).toBe(3);
    // The unsolved day does not extend the streak.
    expect(derived.currentStreak).toBe(2);
  });

  it('counts perfect solves separately from ordinary ones', () => {
    const stats = stateOf(
      result('2026-01-08', { wrongGuesses: 0 }),
      result('2026-01-09', { wrongGuesses: 3 }),
      result('2026-01-10', { wrongGuesses: 0 }),
    );
    expect(deriveStats(stats, '2026-01-10').perfectSolves).toBe(2);
  });

  it('does not count an unsolved zero-miss day as perfect', () => {
    const stats = stateOf(result('2026-01-10', { wrongGuesses: 0, solved: false }));
    expect(deriveStats(stats, '2026-01-10').perfectSolves).toBe(0);
  });

  it('returns zeroes for an empty history without dividing by zero', () => {
    const derived = deriveStats(EMPTY_STATS, '2026-01-10');
    expect(derived).toMatchObject({
      played: 0,
      solved: 0,
      winRate: 0,
      perfectSolves: 0,
      currentStreak: 0,
      maxStreak: 0,
      averageScore: 0,
      bestScore: 0,
    });
    expect(derived.recent).toEqual([]);
  });

  it('lists the ten most recent days, newest first', () => {
    const days = Array.from({ length: 14 }, (_, i) => result(`2026-01-${String(i + 1).padStart(2, '0')}`));
    const derived = deriveStats(stateOf(...days), '2026-01-14');
    expect(derived.recent).toHaveLength(10);
    expect(derived.recent[0]!.date).toBe('2026-01-14');
    expect(derived.recent[9]!.date).toBe('2026-01-05');
  });
});

describe('persistence', () => {
  it('round-trips through storage', () => {
    const storage = memoryStorage();
    const stats = recordResult(EMPTY_STATS, result('2026-01-01'));
    saveStats(stats, storage);
    expect(loadStats(storage)).toEqual(stats);
  });

  it('falls back to empty stats on missing, corrupt, or wrong-shaped data', () => {
    expect(loadStats(memoryStorage())).toEqual(EMPTY_STATS);
    expect(loadStats(memoryStorage({ 'wordchain:stats:v1': 'not json' }))).toEqual(EMPTY_STATS);
    expect(loadStats(memoryStorage({ 'wordchain:stats:v1': '{"nope":1}' }))).toEqual(EMPTY_STATS);
    expect(loadStats(memoryStorage({ 'wordchain:stats:v1': 'null' }))).toEqual(EMPTY_STATS);
  });

  it('survives storage that throws', () => {
    const hostile = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    } as unknown as Storage;
    expect(loadStats(hostile)).toEqual(EMPTY_STATS);
    expect(() => saveStats(EMPTY_STATS, hostile)).not.toThrow();
  });

  it('is a no-op when storage is unavailable', () => {
    expect(loadStats(undefined)).toEqual(EMPTY_STATS);
    expect(() => saveStats(EMPTY_STATS, undefined)).not.toThrow();
  });
});
