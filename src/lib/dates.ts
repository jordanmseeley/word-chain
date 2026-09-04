/**
 * Daily rollover.
 *
 * The whole field plays the same puzzle at the same time — that is what makes a
 * daily percentile mean anything — so "today" is a single global value anchored
 * to midnight in one timezone rather than each player's local midnight.
 */
export const GAME_TIMEZONE = 'America/New_York';

/** Puzzle #1's date. Used to number puzzles and index the seed bank. */
export const EPOCH_DATE = '2026-01-01';

const MS_PER_DAY = 86_400_000;

/**
 * Offset of `tz` from UTC at a given instant, in ms. Positive east of UTC.
 * Derived from Intl rather than hardcoded so DST transitions are handled.
 */
function timezoneOffsetMs(tz: string, at: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(at));

  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');

  // en-US with hour12:false renders midnight as hour 24, hence the modulo.
  const asIfUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour') % 24,
    read('minute'),
    read('second'),
  );
  return asIfUtc - Math.floor(at / 1000) * 1000;
}

/** The game-day (YYYY-MM-DD) that the instant `at` falls in. */
export function puzzleDateAt(at: number = Date.now()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: GAME_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(at));
}

/** UTC instant of midnight starting the given game-day. */
export function startOfGameDayUtc(date: string): number {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const naive = Date.UTC(year, month - 1, day);
  // Two passes: the first offset lookup can land on the wrong side of a DST
  // boundary, the second settles it.
  let instant = naive;
  for (let i = 0; i < 2; i += 1) {
    instant = naive - timezoneOffsetMs(GAME_TIMEZONE, instant);
  }
  return instant;
}

/** Whole days from EPOCH_DATE to `date`. Puzzle #1 is day 0. */
export function daysSinceEpoch(date: string): number {
  return Math.round((startOfGameDayUtc(date) - startOfGameDayUtc(EPOCH_DATE)) / MS_PER_DAY);
}

/** 1-based puzzle number for a game-day. */
export function puzzleNumberFor(date: string): number {
  return daysSinceEpoch(date) + 1;
}

/** Milliseconds until the next daily rollover. */
export function msUntilNextPuzzle(at: number = Date.now()): number {
  const today = startOfGameDayUtc(puzzleDateAt(at));
  // Step ~26h forward then snap back to that day's start, so DST-shortened and
  // DST-lengthened days both resolve to the correct next midnight.
  const nextDay = puzzleDateAt(today + 26 * 3_600_000);
  return Math.max(0, startOfGameDayUtc(nextDay) - at);
}

/** "07:12:45" countdown text. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
