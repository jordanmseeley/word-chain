import { daysSinceEpoch, puzzleDateAt } from './dates';

/**
 * Local stats.
 *
 * In P0 this is the whole stats story. Once accounts land these same records
 * become the offline mirror of the server's `results` table, and the anonymous
 * history a player accumulates here is what gets carried into their account.
 */
const STORAGE_KEY = 'wordchain:stats:v1';

export interface StoredResult {
  date: string;
  number: number;
  score: number;
  wrongGuesses: number;
  lettersRevealed: number;
  elapsedMs: number;
  solved: boolean;
}

export interface StatsState {
  /** Keyed by game-day so a replay can never double-count. */
  results: Record<string, StoredResult>;
}

export interface DerivedStats {
  played: number;
  solved: number;
  winRate: number;
  /** Solves with no wrong guesses at all. */
  perfectSolves: number;
  currentStreak: number;
  maxStreak: number;
  averageScore: number;
  bestScore: number;
  averageWrongGuesses: number;
  /** Most recent first. */
  recent: StoredResult[];
}

export const EMPTY_STATS: StatsState = { results: {} };

export function loadStats(storage: Storage | undefined = safeStorage()): StatsState {
  if (!storage) return EMPTY_STATS;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATS;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || !('results' in parsed)) return EMPTY_STATS;
    const results = (parsed as StatsState).results;
    return results && typeof results === 'object' ? { results } : EMPTY_STATS;
  } catch {
    // Corrupt or unreadable storage must never break the game.
    return EMPTY_STATS;
  }
}

export function saveStats(stats: StatsState, storage: Storage | undefined = safeStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Quota or private-mode failures are not worth interrupting play for.
  }
}

/** Record a result, keeping the first one for a given day. */
export function recordResult(stats: StatsState, result: StoredResult): StatsState {
  if (stats.results[result.date]) return stats;
  return { results: { ...stats.results, [result.date]: result } };
}

export function hasPlayed(stats: StatsState, date: string): boolean {
  return Boolean(stats.results[date]);
}

export function deriveStats(stats: StatsState, today: string = puzzleDateAt()): DerivedStats {
  const all = Object.values(stats.results).sort((a, b) => a.date.localeCompare(b.date));
  const wins = all.filter((r) => r.solved);
  const played = all.length;

  const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);
  const mean = (values: number[]): number => (values.length ? sum(values) / values.length : 0);

  return {
    played,
    solved: wins.length,
    winRate: played ? wins.length / played : 0,
    perfectSolves: wins.filter((r) => r.wrongGuesses === 0).length,
    currentStreak: currentStreak(wins, today),
    maxStreak: maxStreak(wins),
    averageScore: Math.round(mean(wins.map((r) => r.score))),
    bestScore: wins.length ? Math.max(...wins.map((r) => r.score)) : 0,
    averageWrongGuesses: Number(mean(wins.map((r) => r.wrongGuesses)).toFixed(1)),
    recent: [...all].reverse().slice(0, 10),
  };
}

/**
 * Consecutive solved days ending today or yesterday. Today being unplayed does
 * not break a streak — the day is not over yet — but any older gap does.
 */
export function currentStreak(wins: StoredResult[], today: string): number {
  if (wins.length === 0) return 0;
  const days = new Set(wins.map((r) => daysSinceEpoch(r.date)));
  const todayIndex = daysSinceEpoch(today);

  let cursor = days.has(todayIndex) ? todayIndex : todayIndex - 1;
  if (!days.has(cursor)) return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}

export function maxStreak(wins: StoredResult[]): number {
  if (wins.length === 0) return 0;
  const days = [...new Set(wins.map((r) => daysSinceEpoch(r.date)))].sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    run = days[i]! === days[i - 1]! + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    // Blocked site data throws on access, not just on read.
    return undefined;
  }
}
