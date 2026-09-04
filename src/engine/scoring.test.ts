import { describe, expect, it } from 'vitest';
import { SCORING, computeTimeBonus, formatDuration, scoreGame } from './scoring';
import type { GameState } from './types';

function state(wrongGuesses: number, lettersRevealed: number): GameState {
  return {
    totalWrongGuesses: wrongGuesses,
    totalLettersRevealed: lettersRevealed,
  } as GameState;
}

describe('computeTimeBonus', () => {
  it('is full at zero and decays one point per two seconds', () => {
    expect(computeTimeBonus(0)).toBe(SCORING.maxTimeBonus);
    expect(computeTimeBonus(2_000)).toBe(SCORING.maxTimeBonus - 1);
    expect(computeTimeBonus(60_000)).toBe(SCORING.maxTimeBonus - 30);
  });

  it('floors at zero and never goes negative', () => {
    expect(computeTimeBonus(600_000)).toBe(0);
    expect(computeTimeBonus(86_400_000)).toBe(0);
    expect(computeTimeBonus(-1)).toBe(SCORING.maxTimeBonus);
  });
});

describe('scoreGame', () => {
  it('gives a flawless instant solve base plus the full bonus', () => {
    const result = scoreGame(state(0, 0), 0);
    expect(result.score).toBe(SCORING.base + SCORING.maxTimeBonus);
    expect(result.guessCost).toBe(0);
    expect(result.hintCost).toBe(0);
  });

  it('charges 25 per wrong guess and 60 per revealed letter', () => {
    const result = scoreGame(state(4, 2), 60_000);
    expect(result.guessCost).toBe(100);
    expect(result.hintCost).toBe(120);
    expect(result.timeBonus).toBe(270);
    expect(result.score).toBe(1000 - 100 - 120 + 270);
  });

  it('floors the penalty half at zero rather than the whole score', () => {
    // 100 wrong guesses and 20 hints vastly exceed the base.
    const result = scoreGame(state(100, 20), 10_000);
    expect(result.score).toBe(computeTimeBonus(10_000));
    expect(result.score).toBeGreaterThan(0);
  });

  it('bottoms out at exactly zero when slow and disastrous', () => {
    expect(scoreGame(state(100, 20), 600_000).score).toBe(0);
  });

  it('ranks a careful solve above a fast sloppy one', () => {
    const careful = scoreGame(state(1, 0), 240_000);
    const sloppy = scoreGame(state(12, 6), 30_000);
    expect(careful.score).toBeGreaterThan(sloppy.score);
  });

  it('carries the raw counters through for the leaderboard', () => {
    const result = scoreGame(state(3, 5), 12_345);
    expect(result.wrongGuesses).toBe(3);
    expect(result.lettersRevealed).toBe(5);
    expect(result.elapsedMs).toBe(12_345);
  });
});

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(92_000)).toBe('1:32');
    expect(formatDuration(9_000)).toBe('0:09');
    expect(formatDuration(724_000)).toBe('12:04');
  });

  it('adds hours and zero-pads minutes past the hour', () => {
    expect(formatDuration(3_735_000)).toBe('1:02:15');
  });

  it('clamps negatives to zero', () => {
    expect(formatDuration(-5_000)).toBe('0:00');
  });
});
