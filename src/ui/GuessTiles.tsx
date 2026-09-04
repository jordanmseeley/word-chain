import { useEffect, useRef } from 'react';
import { normalizeGuess } from '../engine/engine';
import type { RowState } from '../engine/types';

/**
 * Letters the player still has to type, given what they typed and how many
 * boxes are left. Pure so it can be tested without a DOM.
 */
export function nextSuffix(raw: string, remaining: number): string {
  return normalizeGuess(raw).slice(0, Math.max(0, remaining));
}

interface GuessTilesProps {
  row: RowState;
  /** The unlocked part of the guess only — never the revealed prefix. */
  value: string;
  shaking: boolean;
  onChange: (suffix: string) => void;
  onSubmit: () => void;
}

/**
 * One box per letter, with the earned prefix locked.
 *
 * The input deliberately holds only the suffix. Because the revealed letters
 * are never in the field, backspace physically cannot reach them — no key
 * interception, no caret arithmetic. `App` rejoins prefix + suffix before
 * adjudicating, so the engine never learns this component exists.
 */
export function GuessTiles({ row, value, shaking, onChange, onSubmit }: GuessTilesProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const prefix = row.revealedPrefix;
  const remaining = Math.max(0, row.length - prefix.length);

  // Follow focus as it moves between rungs, and re-focus after each guess.
  useEffect(() => {
    inputRef.current?.focus();
  }, [row.index, prefix.length]);

  const boxes = Array.from({ length: row.length }, (_, i) => {
    const locked = i < prefix.length;
    const letter = locked ? prefix[i]! : (value[i - prefix.length] ?? '');
    const isCaret = !locked && i === prefix.length + value.length;
    return { locked, letter, isCaret, key: i };
  });

  return (
    <div
      className={`tiles${shaking ? ' tiles--shake' : ''}`}
      onMouseDown={(event) => {
        // Keep the keyboard up when tapping the strip itself.
        event.preventDefault();
        inputRef.current?.focus();
      }}
    >
      {boxes.map(({ locked, letter, isCaret, key }) => (
        <span
          key={key}
          aria-hidden="true"
          className={`tile${locked ? ' tile--locked' : ''}${isCaret ? ' tile--caret' : ''}`}
        >
          {letter}
        </span>
      ))}

      <label className="visually-hidden" htmlFor="guess">
        {prefix
          ? `Rung ${row.index + 1}. Starts with ${prefix.toUpperCase()}. Type the remaining ${remaining} letters.`
          : `Rung ${row.index + 1}. Type all ${row.length} letters.`}
      </label>
      <input
        id="guess"
        ref={inputRef}
        className="tile-input"
        value={value}
        maxLength={remaining}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="go"
        inputMode="text"
        onChange={(event) => onChange(nextSuffix(event.target.value, remaining))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
    </div>
  );
}
