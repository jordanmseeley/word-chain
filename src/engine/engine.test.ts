import { describe, expect, it } from 'vitest';
import {
  adjudicate,
  answersOf,
  applyGuess,
  assertValidChain,
  createGame,
  elapsedMs,
  finish,
  focusRow,
  nextFocus,
  nextPrefix,
  normalizeGuess,
  toPuzzleView,
} from './engine';
import type { GameState, Puzzle } from './types';

const PUZZLE: Puzzle = {
  id: 'test',
  number: 1,
  date: '2026-01-01',
  chain: ['fire', 'engine', 'room', 'service', 'desk', 'top', 'coat'],
  difficulty: 2,
};
const ANSWERS = ['engine', 'room', 'service', 'desk', 'top'];

function newGame(): GameState {
  return createGame(toPuzzleView(PUZZLE), 1_000);
}

/** Guess against the currently focused row. */
function guess(state: GameState, word: string): GameState {
  return applyGuess(state, adjudicate(PUZZLE, state, state.focusedRow, word));
}

describe('normalizeGuess', () => {
  it('lowercases and strips non-letters', () => {
    expect(normalizeGuess('  Fire-Engine! ')).toBe('fireengine');
    expect(normalizeGuess('ROOM')).toBe('room');
    expect(normalizeGuess('123')).toBe('');
  });
});

describe('toPuzzleView', () => {
  it('exposes only the ends and the answer lengths', () => {
    const view = toPuzzleView(PUZZLE);
    expect(view.top).toBe('fire');
    expect(view.bottom).toBe('coat');
    expect(view.answerLengths).toEqual([6, 4, 7, 4, 3]);
    // The redacted view must not carry any answer.
    expect(JSON.stringify(view)).not.toContain('engine');
    expect(JSON.stringify(view)).not.toContain('service');
  });

  it('extracts the five hidden answers', () => {
    expect(answersOf(PUZZLE)).toEqual(ANSWERS);
  });
});

describe('assertValidChain', () => {
  it('rejects wrong length, repeats, and non-letters', () => {
    expect(() => assertValidChain(['a', 'b'])).toThrow(/7 words/);
    expect(() => assertValidChain(['a', 'b', 'c', 'd', 'e', 'f', 'a'])).toThrow(/repeats/);
    expect(() => assertValidChain(['a', 'b', 'c', 'd', 'e', 'f', 'G1'])).toThrow(/lowercase/);
  });
});

describe('createGame', () => {
  it('starts with every row hidden and focus on the first', () => {
    const game = newGame();
    expect(game.rows).toHaveLength(5);
    expect(game.rows.every((r) => !r.solved && r.revealedPrefix === '')).toBe(true);
    expect(game.focusedRow).toBe(0);
    expect(game.status).toBe('playing');
  });
});

describe('nextPrefix', () => {
  it('reveals one more leading letter each time', () => {
    expect(nextPrefix('engine', '')).toBe('e');
    expect(nextPrefix('engine', 'e')).toBe('en');
    expect(nextPrefix('engine', 'engi')).toBe('engin');
  });

  it('never reveals the final letter', () => {
    expect(nextPrefix('engine', 'engin')).toBe('engin');
    expect(nextPrefix('up', 'u')).toBe('u');
    expect(nextPrefix('up', '')).toBe('u');
  });
});

describe('guessing', () => {
  it('solves the focused row and advances focus', () => {
    const game = guess(newGame(), 'Engine');
    expect(game.rows[0]!.solved).toBe(true);
    expect(game.rows[0]!.word).toBe('engine');
    expect(game.focusedRow).toBe(1);
    expect(game.totalWrongGuesses).toBe(0);
    expect(game.totalLettersRevealed).toBe(0);
  });

  it('penalises a wrong guess and reveals a letter', () => {
    const game = guess(newGame(), 'motor');
    expect(game.totalWrongGuesses).toBe(1);
    expect(game.totalLettersRevealed).toBe(1);
    expect(game.rows[0]!.revealedPrefix).toBe('e');
    expect(game.rows[0]!.wrongGuesses).toEqual(['motor']);
    expect(game.focusedRow).toBe(0);
  });

  it('credits a word that belongs to a different unsolved row', () => {
    // Focused on row 0, but "desk" is row 3's answer.
    const game = guess(newGame(), 'desk');
    expect(game.rows[3]!.solved).toBe(true);
    expect(game.rows[0]!.solved).toBe(false);
    expect(game.totalWrongGuesses).toBe(0);
  });

  it('keeps focus on the rung being worked when another is solved out of order', () => {
    const game = guess(newGame(), 'desk');
    expect(game.focusedRow).toBe(0);
  });

  it('advances past the solved rung when it was the focused one', () => {
    const game = guess(newGame(), 'engine');
    expect(game.focusedRow).toBe(1);
  });

  it('advances to the next open rung when the focused one is solved out of order', () => {
    // Focus row 2, then solve it by name while standing on it.
    let game = focusRow(newGame(), 2);
    game = applyGuess(game, adjudicate(PUZZLE, game, 2, 'service'));
    expect(game.rows[2]!.solved).toBe(true);
    expect(game.focusedRow).toBe(3);
  });

  it('charges nothing and reveals nothing for a repeated wrong guess', () => {
    const once = guess(newGame(), 'motor');
    const twice = guess(once, 'MOTOR');
    expect(twice).toBe(once);
    expect(twice.totalWrongGuesses).toBe(1);
    expect(twice.rows[0]!.revealedPrefix).toBe('e');
  });

  it('ignores empty and non-letter guesses', () => {
    const start = newGame();
    expect(guess(start, '   ')).toBe(start);
    expect(guess(start, '42')).toBe(start);
  });

  it('stops revealing once the clue reaches the last letter', () => {
    let game = newGame();
    // "engine" is 6 letters, so at most 5 can be revealed.
    for (const word of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      game = guess(game, word);
    }
    expect(game.rows[0]!.revealedPrefix).toBe('engin');
    expect(game.totalWrongGuesses).toBe(8);
    expect(game.totalLettersRevealed).toBe(5);
  });
});

describe('focus', () => {
  it('skips solved rows when advancing and wraps around', () => {
    const rows = [true, true, false, true, false].map((solved, index) => ({
      index,
      length: 4,
      revealedPrefix: '',
      solved,
      word: null,
      wrongGuesses: [],
    }));
    expect(nextFocus(rows, 0)).toBe(2);
    expect(nextFocus(rows, 3)).toBe(4);
    expect(nextFocus(rows, 4)).toBe(4);
    expect(nextFocus(rows.map((r) => ({ ...r, solved: true })), 0)).toBe(-1);
  });

  it('refuses to focus a solved row', () => {
    const game = guess(newGame(), 'engine');
    expect(focusRow(game, 0)).toBe(game);
    expect(focusRow(game, 2).focusedRow).toBe(2);
  });
});

describe('completion', () => {
  it('marks the game solved after all five rows and freezes further guesses', () => {
    let game = newGame();
    for (const answer of ANSWERS) game = guess(game, answer);

    expect(game.status).toBe('solved');
    expect(game.focusedRow).toBe(-1);
    expect(game.rows.every((r) => r.solved)).toBe(true);

    const frozen = applyGuess(game, adjudicate(PUZZLE, game, 0, 'anything'));
    expect(frozen).toBe(game);
  });

  it('stamps the finish time once and measures elapsed from the server clock', () => {
    let game = newGame();
    for (const answer of ANSWERS) game = guess(game, answer);

    const done = finish(game, 5_000);
    expect(done.finishedAt).toBe(5_000);
    expect(elapsedMs(done, 9_999)).toBe(4_000);
    // A second stamp must not move the clock.
    expect(finish(done, 60_000).finishedAt).toBe(5_000);
  });

  it('reports live elapsed time while still playing', () => {
    expect(elapsedMs(newGame(), 4_000)).toBe(3_000);
  });
});

describe('immutability', () => {
  it('never mutates the state it is given', () => {
    const before = newGame();
    const snapshot = JSON.stringify(before);
    guess(before, 'engine');
    guess(before, 'wrong');
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});
