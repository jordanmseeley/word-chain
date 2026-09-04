import { describe, expect, it } from 'vitest';
import { puzzleForDate } from './puzzleBank';
import { SEED_PUZZLES } from './seedPuzzles';
import { assertValidChain, toPuzzleView } from '../engine/engine';
import { EPOCH_DATE, daysSinceEpoch } from '../lib/dates';

describe('seed bank', () => {
  it('holds only well-formed chains', () => {
    for (const seed of SEED_PUZZLES) {
      expect(() => assertValidChain(seed.chain)).not.toThrow();
      for (const word of seed.chain) {
        expect(word.length).toBeGreaterThanOrEqual(2);
        expect(word.length).toBeLessThanOrEqual(9);
      }
      expect(seed.difficulty).toBeGreaterThanOrEqual(1);
      expect(seed.difficulty).toBeLessThanOrEqual(5);
    }
  });
});

describe('puzzleForDate', () => {
  it('is deterministic and numbers puzzles from the epoch', () => {
    const a = puzzleForDate('2026-03-14');
    const b = puzzleForDate('2026-03-14');
    expect(a).toEqual(b);
    expect(a.number).toBe(daysSinceEpoch('2026-03-14') + 1);
  });

  it('cycles the bank and gives consecutive days different chains', () => {
    expect(puzzleForDate(EPOCH_DATE).chain).toEqual(SEED_PUZZLES[0]!.chain);
    expect(puzzleForDate('2026-01-02').chain).toEqual(SEED_PUZZLES[1]!.chain);
    expect(puzzleForDate('2026-01-31').chain).toEqual(SEED_PUZZLES[0]!.chain);
  });

  it('handles dates before the epoch without crashing', () => {
    const puzzle = puzzleForDate('2025-12-30');
    expect(puzzle.chain).toHaveLength(7);
    expect(puzzle.number).toBeLessThan(1);
  });

  it('produces a view with five answer lengths for every day of a year', () => {
    for (let day = 0; day < 365; day += 1) {
      const date = new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10);
      const view = toPuzzleView(puzzleForDate(date));
      expect(view.answerLengths).toHaveLength(5);
    }
  });
});
