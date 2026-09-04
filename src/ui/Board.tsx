import type { GameState } from '../engine/types';
import { GuessTiles } from './GuessTiles';

interface BoardProps {
  state: GameState;
  /** Unlocked part of the current guess; the revealed prefix is not in here. */
  value: string;
  shaking: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFocusRow: (index: number) => void;
}

/** "en···" — revealed letters plus a dot per unknown letter, for unfocused rungs. */
function maskFor(revealedPrefix: string, length: number): string {
  return revealedPrefix + '·'.repeat(Math.max(0, length - revealedPrefix.length));
}

export function Board({ state, value, shaking, onChange, onSubmit, onFocusRow }: BoardProps) {
  const { puzzle, rows, focusedRow } = state;

  return (
    <div className="board">
      <div className="rung rung--given">{puzzle.top}</div>

      {rows.map((row) => {
        const isFocused = row.index === focusedRow;

        return (
          <div key={row.index}>
            <div className="link" aria-hidden="true" />

            {row.solved ? (
              <div className="rung rung--solved">{row.word}</div>
            ) : isFocused ? (
              <div className="rung rung--focused" data-row={row.index}>
                <GuessTiles
                  row={row}
                  value={value}
                  shaking={shaking}
                  onChange={onChange}
                  onSubmit={onSubmit}
                />
              </div>
            ) : (
              <button
                type="button"
                className="rung-button"
                onClick={() => onFocusRow(row.index)}
                aria-label={`Jump to rung ${row.index + 1}, ${row.length} letters`}
              >
                <div className="rung rung--hidden" data-row={row.index}>
                  {maskFor(row.revealedPrefix, row.length)}
                </div>
              </button>
            )}
          </div>
        );
      })}

      <div className="link" aria-hidden="true" />
      <div className="rung rung--given">{puzzle.bottom}</div>
    </div>
  );
}
