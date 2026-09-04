import { SEED_PUZZLES } from '../data/seedPuzzles';
import { EPOCH_DATE, puzzleDateAt, startOfGameDayUtc } from './dates';

/**
 * Development escape hatches for reviewing the puzzle bank without waiting a
 * day per chain.
 *
 * Everything here is inert outside `vite dev`, so a production URL cannot be
 * steered with a query string — which matters once scores are ranked.
 */

const MS_PER_DAY = 86_400_000;

function params(): URLSearchParams | null {
  if (!import.meta.env.DEV || typeof location === 'undefined') return null;
  return new URLSearchParams(location.search);
}

/** `?date=YYYY-MM-DD`, or `?puzzle=N` to jump to bank index N. */
export function devPuzzleDate(): string | null {
  const query = params();
  if (!query) return null;

  const date = query.get('date');
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date))) {
    return date;
  }

  // Guard the empty cases explicitly: Number(null) and Number('') are both 0,
  // which would silently pin dev sessions to bank index 0 instead of today.
  const raw = query.get('puzzle');
  const index = raw === null || raw.trim() === '' ? Number.NaN : Number(raw);
  if (Number.isInteger(index) && index >= 0 && index < SEED_PUZZLES.length) {
    // The bank cycles from the epoch, so bank index N is epoch + N days.
    return new Date(startOfGameDayUtc(EPOCH_DATE) + index * MS_PER_DAY).toISOString().slice(0, 10);
  }

  return null;
}

/** `?reset=1` clears stored stats before the app reads them. */
export function devShouldResetStats(): boolean {
  return params()?.get('reset') === '1';
}

/** Today, unless a dev override says otherwise. */
export function activePuzzleDate(): string {
  return devPuzzleDate() ?? puzzleDateAt();
}
