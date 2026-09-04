/**
 * Core Word Chain types.
 *
 * The split that matters here: `Puzzle` contains the answers and must never
 * reach the browser once the backend lands (P1). `PuzzleView` is the redacted
 * shape the client is allowed to hold. Everything in `engine.ts` that touches
 * answers takes a `Puzzle`; everything else takes a `PuzzleView`.
 */

/** A full puzzle, answers included. Server-side only once P1 lands. */
export interface Puzzle {
  id: string;
  /** Sequential puzzle number shown to players, e.g. "Word Chain #142". */
  number: number;
  /** ISO date (YYYY-MM-DD) in the game's rollover timezone. */
  date: string;
  /** Exactly 7 lowercase words. chain[0] and chain[6] are given to the player. */
  chain: string[];
  /** 1 (easiest) to 5 (hardest). */
  difficulty: number;
}

/** What a client may know about a puzzle: the ends and the answer lengths. */
export interface PuzzleView {
  id: string;
  number: number;
  date: string;
  top: string;
  bottom: string;
  /** Letter counts for the 5 hidden rows, top to bottom. */
  answerLengths: number[];
}

export interface RowState {
  /** 0-4, top to bottom, over the five hidden rows. */
  index: number;
  length: number;
  /** Leading letters of the answer that have been revealed as clues. */
  revealedPrefix: string;
  solved: boolean;
  /** The answer, once solved. Null while hidden. */
  word: string | null;
  /** Normalized wrong guesses made against this row, in order. */
  wrongGuesses: string[];
}

export type GameStatus = 'playing' | 'solved';

export interface GameState {
  puzzle: PuzzleView;
  rows: RowState[];
  /** Index of the row the next guess targets. -1 once solved. */
  focusedRow: number;
  status: GameStatus;
  /** Epoch ms. Authoritative value comes from the server in P1. */
  startedAt: number;
  finishedAt: number | null;
  totalWrongGuesses: number;
  totalLettersRevealed: number;
}

/**
 * The adjudication of a single guess. Produced by `adjudicate` locally in P0
 * and by the `guess` Edge Function in P1 — the shape is identical so the
 * reducer never learns which one it is talking to.
 */
export interface GuessOutcome {
  /** The guess after normalization. */
  guess: string;
  /** True when the guess matched some unsolved row. */
  correct: boolean;
  /**
   * The row the guess resolved against. For a correct guess this may differ
   * from the focused row: guessing a word that belongs to a different unsolved
   * row credits that row instead of penalising the player.
   */
  rowIndex: number;
  /** Set when correct. */
  word: string | null;
  /** Revealed prefix for `rowIndex` after this guess. */
  revealedPrefix: string;
  /** True when the guess was already tried on this row: no penalty, no clue. */
  duplicate: boolean;
  /** True when the guess was rejected before adjudication (empty, bad chars). */
  invalid: boolean;
}

export const CHAIN_LENGTH = 7;
export const HIDDEN_ROWS = 5;
// Short function words like "up" and "out" are legitimate chain links, so the
// floor is 2. The 9-letter ceiling matches the reference game.
export const MIN_WORD_LENGTH = 2;
export const MAX_WORD_LENGTH = 9;
