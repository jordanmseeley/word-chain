import { formatDuration } from '../engine/scoring';
import type { GameState } from '../engine/types';
import { SITE_ORIGIN } from './brand';

/**
 * Spoiler-free share text: the squares say how cleanly each rung fell, never
 * which words they were.
 */
export function buildShareText(
  state: GameState,
  score: number,
  elapsedMs: number,
  origin = SITE_ORIGIN,
): string {
  const squares = state.rows.map((row) => {
    if (!row.solved) return '⬛';
    if (row.wrongGuesses.length === 0) return '🟩';
    return row.wrongGuesses.length <= 2 ? '🟨' : '🟧';
  });

  const misses = state.totalWrongGuesses;
  const missText = misses === 1 ? '1 miss' : `${misses} misses`;

  return [
    `Word Chain #${state.puzzle.number}`,
    `🔗${squares.join('')}🔗`,
    `${missText} · ${formatDuration(elapsedMs)} · ${score.toLocaleString()} pts`,
    origin,
  ].join('\n');
}

/** Copy to clipboard, falling back to a hidden textarea on older browsers. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or insecure context — fall through.
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
