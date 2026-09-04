import {
  CHAIN_LENGTH,
  HIDDEN_ROWS,
  type GameState,
  type GuessOutcome,
  type Puzzle,
  type PuzzleView,
  type RowState,
} from './types';

/** Strip everything but letters and lowercase. "Fire-Engine!" -> "fireengine" */
export function normalizeGuess(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z]/g, '');
}

/** Redact a puzzle down to what a client may hold. */
export function toPuzzleView(puzzle: Puzzle): PuzzleView {
  assertValidChain(puzzle.chain);
  return {
    id: puzzle.id,
    number: puzzle.number,
    date: puzzle.date,
    top: puzzle.chain[0]!,
    bottom: puzzle.chain[CHAIN_LENGTH - 1]!,
    answerLengths: answersOf(puzzle).map((w) => w.length),
  };
}

/** The five hidden words, top to bottom. */
export function answersOf(puzzle: Puzzle): string[] {
  return puzzle.chain.slice(1, CHAIN_LENGTH - 1);
}

export function assertValidChain(chain: string[]): void {
  if (chain.length !== CHAIN_LENGTH) {
    throw new Error(`chain must have ${CHAIN_LENGTH} words, got ${chain.length}`);
  }
  const seen = new Set<string>();
  for (const word of chain) {
    if (!/^[a-z]+$/.test(word)) {
      throw new Error(`chain word "${word}" must be lowercase letters only`);
    }
    if (seen.has(word)) {
      throw new Error(`chain repeats the word "${word}"`);
    }
    seen.add(word);
  }
}

export function createGame(puzzle: PuzzleView, startedAt: number): GameState {
  if (puzzle.answerLengths.length !== HIDDEN_ROWS) {
    throw new Error(`expected ${HIDDEN_ROWS} answer lengths, got ${puzzle.answerLengths.length}`);
  }
  const rows: RowState[] = puzzle.answerLengths.map((length, index) => ({
    index,
    length,
    revealedPrefix: '',
    solved: false,
    word: null,
    wrongGuesses: [],
  }));
  return {
    puzzle,
    rows,
    focusedRow: 0,
    status: 'playing',
    startedAt,
    finishedAt: null,
    totalWrongGuesses: 0,
    totalLettersRevealed: 0,
  };
}

/**
 * Decide a guess against the real answers.
 *
 * This is the only function that needs the answers, which is why it is isolated:
 * in P1 the Edge Function calls exactly this and returns the `GuessOutcome`,
 * while the browser keeps calling `applyGuess` with the result.
 *
 * A correct guess for any unsolved row counts, not just the focused one — a
 * player who spots row 4 while staring at row 2 should be rewarded, not fined.
 */
export function adjudicate(puzzle: Puzzle, state: GameState, rowIndex: number, raw: string): GuessOutcome {
  const guess = normalizeGuess(raw);
  const base: GuessOutcome = {
    guess,
    correct: false,
    rowIndex,
    word: null,
    revealedPrefix: state.rows[rowIndex]?.revealedPrefix ?? '',
    duplicate: false,
    invalid: false,
  };

  const focused = state.rows[rowIndex];
  if (!guess || !focused || focused.solved || state.status === 'solved') {
    return { ...base, invalid: true };
  }

  const answers = answersOf(puzzle);

  // Credit any unsolved row this guess solves, preferring the focused one.
  const order = [rowIndex, ...state.rows.map((r) => r.index).filter((i) => i !== rowIndex)];
  for (const i of order) {
    const row = state.rows[i]!;
    if (!row.solved && answers[i] === guess) {
      return { ...base, correct: true, rowIndex: i, word: guess, revealedPrefix: guess };
    }
  }

  // Wrong. Re-guessing something already tried here costs nothing and buys nothing,
  // so a player cannot farm clues by spamming one word.
  if (focused.wrongGuesses.includes(guess)) {
    return { ...base, duplicate: true };
  }

  return { ...base, revealedPrefix: nextPrefix(answers[rowIndex]!, focused.revealedPrefix) };
}

/**
 * Reveal one more leading letter, never the whole word — the last letter is
 * always earned.
 */
export function nextPrefix(answer: string, current: string): string {
  const maxRevealed = Math.max(0, answer.length - 1);
  const next = Math.min(current.length + 1, maxRevealed);
  return answer.slice(0, next);
}

/** Apply an adjudicated guess. Pure: returns a new state, never mutates. */
export function applyGuess(state: GameState, outcome: GuessOutcome): GameState {
  if (outcome.invalid || outcome.duplicate || state.status === 'solved') {
    return state;
  }

  const rows = state.rows.map((row) => {
    if (row.index !== outcome.rowIndex) return row;
    return outcome.correct
      ? { ...row, solved: true, word: outcome.word, revealedPrefix: outcome.revealedPrefix }
      : {
          ...row,
          revealedPrefix: outcome.revealedPrefix,
          wrongGuesses: [...row.wrongGuesses, outcome.guess],
        };
  });

  const before = state.rows[outcome.rowIndex]!;
  const after = rows[outcome.rowIndex]!;
  const lettersGained = outcome.correct ? 0 : after.revealedPrefix.length - before.revealedPrefix.length;

  const solved = rows.every((row) => row.solved);

  // Solving a rung out of order must not abandon the rung the player was on:
  // stay put if it is still open, otherwise advance from the one just solved.
  const stillOnTask = state.focusedRow >= 0 && !rows[state.focusedRow]!.solved;
  const anchor = stillOnTask ? state.focusedRow : outcome.rowIndex;

  return {
    ...state,
    rows,
    focusedRow: solved ? -1 : nextFocus(rows, anchor),
    status: solved ? 'solved' : 'playing',
    finishedAt: solved ? state.finishedAt : null,
    totalWrongGuesses: state.totalWrongGuesses + (outcome.correct ? 0 : 1),
    totalLettersRevealed: state.totalLettersRevealed + lettersGained,
  };
}

/** First unsolved row at or after `from`, wrapping to the top. */
export function nextFocus(rows: RowState[], from: number): number {
  for (let step = 0; step < rows.length; step += 1) {
    const i = (from + step) % rows.length;
    if (!rows[i]!.solved) return i;
  }
  return -1;
}

/** Move focus to a specific row, ignoring solved rows. */
export function focusRow(state: GameState, rowIndex: number): GameState {
  const row = state.rows[rowIndex];
  if (!row || row.solved || state.status === 'solved') return state;
  return { ...state, focusedRow: rowIndex };
}

/** Stamp the finish time once solved. Server-supplied in P1. */
export function finish(state: GameState, finishedAt: number): GameState {
  if (state.status !== 'solved' || state.finishedAt !== null) return state;
  return { ...state, finishedAt };
}

export function elapsedMs(state: GameState, now: number): number {
  return Math.max(0, (state.finishedAt ?? now) - state.startedAt);
}
