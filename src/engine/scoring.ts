import type { GameState } from './types';

/**
 * Scoring exists so the leaderboard ranks something meaningful. Guesses and
 * clues are the real skill signal; the time bonus is capped so a fast sloppy
 * solve cannot beat a careful one, but a player who sits on a finished board
 * still loses ground to one who commits.
 */
export const SCORING = {
  base: 1000,
  costPerWrongGuess: 25,
  costPerLetterRevealed: 60,
  /** Max seconds-derived bonus. Reached by solving in under ~1s, gone at 10 min. */
  maxTimeBonus: 300,
  /** Seconds of elapsed time that burn one point of time bonus. */
  secondsPerBonusPoint: 2,
} as const;

export interface ScoreBreakdown {
  base: number;
  guessCost: number;
  hintCost: number;
  timeBonus: number;
  score: number;
  wrongGuesses: number;
  lettersRevealed: number;
  elapsedMs: number;
}

export function scoreGame(state: GameState, elapsedMs: number): ScoreBreakdown {
  const wrongGuesses = state.totalWrongGuesses;
  const lettersRevealed = state.totalLettersRevealed;
  const guessCost = SCORING.costPerWrongGuess * wrongGuesses;
  const hintCost = SCORING.costPerLetterRevealed * lettersRevealed;
  const timeBonus = computeTimeBonus(elapsedMs);

  // Penalties floor at zero before the bonus so a disastrous solve still
  // rewards finishing quickly rather than landing everyone on 0.
  const earned = Math.max(0, SCORING.base - guessCost - hintCost);

  return {
    base: SCORING.base,
    guessCost,
    hintCost,
    timeBonus,
    score: earned + timeBonus,
    wrongGuesses,
    lettersRevealed,
    elapsedMs,
  };
}

export function computeTimeBonus(elapsedMs: number): number {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  return Math.max(0, SCORING.maxTimeBonus - Math.floor(seconds / SCORING.secondsPerBonusPoint));
}

/** "1:32" / "12:04" / "1:02:15" */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  return hours > 0
    ? `${hours}:${mm}:${String(seconds).padStart(2, '0')}`
    : `${mm}:${String(seconds).padStart(2, '0')}`;
}
