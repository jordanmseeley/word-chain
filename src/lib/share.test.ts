import { describe, expect, it } from 'vitest';
import { buildShareText } from './share';
import { SITE_ORIGIN } from './brand';
import type { GameState, RowState } from '../engine/types';

function row(index: number, solved: boolean, wrongGuesses: number): RowState {
  return {
    index,
    length: 4,
    revealedPrefix: '',
    solved,
    word: solved ? 'word' : null,
    wrongGuesses: Array.from({ length: wrongGuesses }, (_, i) => `bad${i}`),
  };
}

function game(rows: RowState[], totalWrongGuesses: number): GameState {
  return {
    puzzle: { number: 142 },
    rows,
    totalWrongGuesses,
  } as unknown as GameState;
}

describe('buildShareText', () => {
  it('grades each rung by how many misses it took', () => {
    const state = game(
      [row(0, true, 0), row(1, true, 2), row(2, true, 3), row(3, true, 0), row(4, false, 1)],
      6,
    );
    const text = buildShareText(state, 1085, 92_000);
    expect(text).toContain('🔗🟩🟨🟧🟩⬛🔗');
    expect(text).toContain('Word Chain #142');
    expect(text).toContain('6 misses · 1:32 · 1,085 pts');
  });

  it('never leaks a word from the chain', () => {
    const rows = [0, 1, 2, 3, 4].map((i) => ({ ...row(i, true, 0), word: 'engine' }));
    expect(buildShareText(game(rows, 0), 1300, 30_000)).not.toContain('engine');
  });

  it('signs the card with the site origin by default', () => {
    const rows = [0, 1, 2, 3, 4].map((i) => row(i, true, 0));
    expect(buildShareText(game(rows, 0), 1300, 30_000).split('\n').at(-1)).toBe(SITE_ORIGIN);
  });

  it('singularises a lone miss', () => {
    const rows = [0, 1, 2, 3, 4].map((i) => row(i, true, 0));
    expect(buildShareText(game(rows, 1), 1275, 5_000)).toContain('1 miss ·');
  });

  it('reports a flawless solve as all green', () => {
    const rows = [0, 1, 2, 3, 4].map((i) => row(i, true, 0));
    expect(buildShareText(game(rows, 0), 1300, 1_000)).toContain('🔗🟩🟩🟩🟩🟩🔗');
  });
});
