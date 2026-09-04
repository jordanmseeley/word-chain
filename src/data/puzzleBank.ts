import type { Puzzle } from '../engine/types';
import { assertValidChain } from '../engine/engine';
import { daysSinceEpoch, puzzleNumberFor } from '../lib/dates';
import { SEED_PUZZLES } from './seedPuzzles';

/**
 * P0 puzzle source: cycles the hand-authored bank so any date resolves to a
 * puzzle. In P1 this is replaced by a `puzzles` row fetched from the server,
 * and the client stops seeing full chains at all.
 */
export function puzzleForDate(date: string): Puzzle {
  const day = daysSinceEpoch(date);
  // Modulo that stays positive for dates before the epoch.
  const index = ((day % SEED_PUZZLES.length) + SEED_PUZZLES.length) % SEED_PUZZLES.length;
  const seed = SEED_PUZZLES[index]!;
  assertValidChain(seed.chain);
  return {
    id: `seed-${date}`,
    number: puzzleNumberFor(date),
    date,
    chain: seed.chain,
    difficulty: seed.difficulty,
  };
}
