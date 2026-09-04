import { useEffect, useState } from 'react';
import { formatDuration, type ScoreBreakdown } from '../engine/scoring';
import type { GameState } from '../engine/types';
import { formatCountdown, msUntilNextPuzzle } from '../lib/dates';
import { buildShareText, copyToClipboard } from '../lib/share';

interface ResultCardProps {
  state: GameState;
  breakdown: ScoreBreakdown;
  chain: string[];
  onShowStats: () => void;
}

export function ResultCard({ state, breakdown, chain, onShowStats }: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState(() => msUntilNextPuzzle());

  useEffect(() => {
    const timer = setInterval(() => setRemaining(msUntilNextPuzzle()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const share = async (): Promise<void> => {
    const text = buildShareText(state, breakdown.score, breakdown.elapsedMs);
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Dismissed or unsupported — fall back to copying.
      }
    }
    setCopied(await copyToClipboard(text));
  };

  return (
    <section className="result" aria-live="polite">
      <h2>Chain complete</h2>
      <div className="score">{breakdown.score.toLocaleString()}</div>

      <div className="breakdown">
        <div>
          <span>Base</span>
          <span>{breakdown.base.toLocaleString()}</span>
        </div>
        <div>
          <span>
            {breakdown.wrongGuesses} wrong {breakdown.wrongGuesses === 1 ? 'guess' : 'guesses'}
          </span>
          <span className={breakdown.guessCost ? 'neg' : ''}>−{breakdown.guessCost}</span>
        </div>
        <div>
          <span>
            {breakdown.lettersRevealed} {breakdown.lettersRevealed === 1 ? 'letter' : 'letters'} revealed
          </span>
          <span className={breakdown.hintCost ? 'neg' : ''}>−{breakdown.hintCost}</span>
        </div>
        <div>
          <span>Time bonus ({formatDuration(breakdown.elapsedMs)})</span>
          <span className={breakdown.timeBonus ? 'pos' : ''}>+{breakdown.timeBonus}</span>
        </div>
        <div>
          <span>Score</span>
          <span>{breakdown.score.toLocaleString()}</span>
        </div>
      </div>

      <div className="chain-reveal">{chain.join(' · ')}</div>

      <button className="button" onClick={share}>
        {copied ? 'Copied to clipboard' : 'Share result'}
      </button>
      <button className="button button--ghost" onClick={onShowStats}>
        View stats
      </button>

      <p className="countdown">Next chain in {formatCountdown(remaining)}</p>
    </section>
  );
}
