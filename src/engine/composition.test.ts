import { describe, expect, it } from 'vitest';
import { adjudicate, applyGuess, createGame, toPuzzleView } from './engine';
import { nextSuffix } from '../ui/GuessTiles';
import type { GameState, Puzzle } from './types';

/**
 * The tile input holds only the letters the player still owes. These tests pin
 * the seam between that and the engine, which always wants the whole word.
 */

const PUZZLE: Puzzle = {
  id: 'test',
  number: 1,
  date: '2026-01-01',
  chain: ['fire', 'engine', 'room', 'service', 'desk', 'top', 'coat'],
  difficulty: 2,
};

function newGame(): GameState {
  return createGame(toPuzzleView(PUZZLE), 1_000);
}

/** What App does: rejoin the earned prefix with what was typed. */
function submit(state: GameState, typed: string): GameState {
  const row = state.rows[state.focusedRow]!;
  const remaining = row.length - row.revealedPrefix.length;
  const suffix = nextSuffix(typed, remaining);
  return applyGuess(state, adjudicate(PUZZLE, state, state.focusedRow, row.revealedPrefix + suffix));
}

describe('prefix + suffix composition', () => {
  it('solves a rung from the full word when nothing is revealed', () => {
    const game = submit(newGame(), 'engine');
    expect(game.rows[0]!.solved).toBe(true);
  });

  it('solves a rung from only the unlocked letters once a clue is earned', () => {
    // One miss reveals "e"; the player should now only owe "ngine".
    const afterMiss = submit(newGame(), 'zzzzz');
    expect(afterMiss.rows[0]!.revealedPrefix).toBe('e');

    const solved = submit(afterMiss, 'ngine');
    expect(solved.rows[0]!.solved).toBe(true);
    expect(solved.rows[0]!.word).toBe('engine');
    // Only the one miss is charged; finishing the word is not another guess.
    expect(solved.totalWrongGuesses).toBe(1);
  });

  it('re-bases against a longer prefix after each miss', () => {
    let game = newGame();
    for (const attempt of ['aaaaaa', 'bbbbb', 'cccc']) game = submit(game, attempt);
    expect(game.rows[0]!.revealedPrefix).toBe('eng');

    // The player now types only what is left of "engine".
    game = submit(game, 'ine');
    expect(game.rows[0]!.solved).toBe(true);
  });

  it('caps typing at the boxes that remain, so overtyping cannot compose a longer word', () => {
    const afterMiss = submit(newGame(), 'zzzzz');
    const row = afterMiss.rows[0]!;
    const remaining = row.length - row.revealedPrefix.length;
    expect(nextSuffix('ngineXXXX', remaining)).toBe('ngine');
  });

  it('does not let a bare prefix count as a guess', () => {
    const afterMiss = submit(newGame(), 'zzzzz');
    // App guards this before adjudicating; assert the engine would otherwise
    // have charged for it, which is exactly why the guard exists.
    const outcome = adjudicate(PUZZLE, afterMiss, 0, afterMiss.rows[0]!.revealedPrefix + '');
    expect(outcome.correct).toBe(false);
    expect(outcome.invalid).toBe(false);
  });

  it('still credits a different rung when the guess is composed', () => {
    // Nothing revealed on row 0, so the typed word stands alone: "desk" is row 3.
    const game = submit(newGame(), 'desk');
    expect(game.rows[3]!.solved).toBe(true);
    expect(game.focusedRow).toBe(0);
  });
});
