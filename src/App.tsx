import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Board } from './ui/Board';
import { HowToPlay } from './ui/HowToPlay';
import { ResultCard } from './ui/ResultCard';
import { StatsPanel } from './ui/StatsPanel';
import { adjudicate, applyGuess, createGame, elapsedMs, finish, focusRow, toPuzzleView } from './engine/engine';
import { scoreGame, type ScoreBreakdown } from './engine/scoring';
import type { GameState } from './engine/types';
import { puzzleForDate } from './data/puzzleBank';
import { REPO_URL } from './lib/brand';
import { activePuzzleDate, devShouldResetStats } from './lib/devOptions';
import { EMPTY_STATS, deriveStats, loadStats, recordResult, saveStats, type StatsState } from './lib/stats';

export function App() {
  // `activePuzzleDate` is today's date in production; in dev it honours ?date= / ?puzzle=.
  const today = useMemo(() => activePuzzleDate(), []);
  // P0 holds the full chain client-side. In P1 this becomes a redacted view
  // fetched from the server and `adjudicate` runs in an Edge Function instead.
  const puzzle = useMemo(() => puzzleForDate(today), [today]);

  const [state, setState] = useState<GameState>(() => createGame(toPuzzleView(puzzle), Date.now()));
  const [guess, setGuess] = useState('');
  const [toast, setToast] = useState('');
  const [shaking, setShaking] = useState(false);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [stats, setStats] = useState<StatsState>(() => {
    if (devShouldResetStats()) {
      saveStats(EMPTY_STATS);
      return EMPTY_STATS;
    }
    return loadStats();
  });
  const [modal, setModal] = useState<'help' | 'stats' | null>(null);

  const recorded = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setGuess('');
  }, [state.focusedRow]);

  useEffect(() => {
    if (!shaking) return;
    const timer = setTimeout(() => setShaking(false), 340);
    return () => clearTimeout(timer);
  }, [shaking]);

  const submit = useCallback(() => {
    setState((current) => {
      if (current.status === 'solved' || current.focusedRow < 0) return current;

      // The tiles hold only the unlocked letters; the earned prefix is implied.
      // Guard the empty case first: a bare prefix is not a guess, and submitting
      // one must not cost a miss.
      const row = current.rows[current.focusedRow]!;
      if (!guess) {
        setToast(row.revealedPrefix ? 'Finish the word first' : 'Type a word first');
        return current;
      }

      const outcome = adjudicate(puzzle, current, current.focusedRow, row.revealedPrefix + guess);

      if (outcome.invalid) {
        setToast('Type a word first');
        return current;
      }
      if (outcome.duplicate) {
        setToast('Already tried on this rung');
        return current;
      }

      setGuess('');
      if (!outcome.correct) {
        setShaking(true);
        // The newly locked tile already shows the clue, so don't repeat it here.
        setToast('Not it');
      } else {
        setToast(outcome.rowIndex !== current.focusedRow ? `Solved rung ${outcome.rowIndex + 1}` : '');
      }

      const next = applyGuess(current, outcome);
      return next.status === 'solved' ? finish(next, Date.now()) : next;
    });
  }, [guess, puzzle]);

  // Score and persist exactly once, the moment the board is complete.
  useEffect(() => {
    if (state.status !== 'solved' || state.finishedAt === null || recorded.current) return;
    recorded.current = true;

    const result = scoreGame(state, elapsedMs(state, state.finishedAt));
    setBreakdown(result);
    setStats((current) => {
      const updated = recordResult(current, {
        date: puzzle.date,
        number: puzzle.number,
        score: result.score,
        wrongGuesses: result.wrongGuesses,
        lettersRevealed: result.lettersRevealed,
        elapsedMs: result.elapsedMs,
        solved: true,
      });
      saveStats(updated);
      return updated;
    });
  }, [state, puzzle]);

  const derived = useMemo(() => deriveStats(stats, today), [stats, today]);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Word Chain</h1>
          <p className="sub">
            #{puzzle.number} · {puzzle.date}
          </p>
        </div>
        <div className="spacer" />
        <button className="icon-button" onClick={() => setModal('help')} aria-label="How to play">
          ?
        </button>
        <button className="icon-button" onClick={() => setModal('stats')} aria-label="Your stats">
          ▤
        </button>
      </header>

      <Board
        state={state}
        value={guess}
        shaking={shaking}
        onChange={setGuess}
        onSubmit={submit}
        onFocusRow={(index) => setState((current) => focusRow(current, index))}
      />

      <p className="toast" role="status">
        {toast}
      </p>

      {state.status === 'playing' && (
        <p className="counters">
          <span>
            <b>{state.rows.filter((row) => row.solved).length}</b>/5 solved
          </span>
          <span>
            <b>{state.totalWrongGuesses}</b> {state.totalWrongGuesses === 1 ? 'miss' : 'misses'}
          </span>
        </p>
      )}

      {breakdown && (
        <ResultCard
          state={state}
          breakdown={breakdown}
          chain={puzzle.chain}
          onShowStats={() => setModal('stats')}
        />
      )}

      <footer className="footer">
        A new word ladder every day · <a href={REPO_URL}>source</a>
      </footer>

      {modal === 'help' && <HowToPlay onClose={() => setModal(null)} />}
      {modal === 'stats' && <StatsPanel stats={derived} onClose={() => setModal(null)} />}
    </div>
  );
}
