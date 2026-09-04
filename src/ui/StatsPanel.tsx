import { formatDuration } from '../engine/scoring';
import type { DerivedStats } from '../lib/stats';
import { Modal } from './Modal';

interface StatsPanelProps {
  stats: DerivedStats;
  onClose: () => void;
}

export function StatsPanel({ stats, onClose }: StatsPanelProps) {
  return (
    <Modal title="Your stats" onClose={onClose}>
      <div className="stat-grid">
        <div className="stat">
          <b>{stats.played}</b>
          <span>Played</span>
        </div>
        <div className="stat">
          <b>{stats.perfectSolves}</b>
          <span>Perfect</span>
        </div>
        <div className="stat">
          <b>{stats.currentStreak}</b>
          <span>Streak</span>
        </div>
        <div className="stat">
          <b>{stats.maxStreak}</b>
          <span>Best</span>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat">
          <b>{stats.averageScore.toLocaleString()}</b>
          <span>Avg score</span>
        </div>
        <div className="stat">
          <b>{stats.bestScore.toLocaleString()}</b>
          <span>Best score</span>
        </div>
        <div className="stat">
          <b>{stats.averageWrongGuesses}</b>
          <span>Avg misses</span>
        </div>
      </div>

      {stats.recent.length > 0 && (
        <div className="history">
          {stats.recent.map((entry) => (
            <div className="history-row" key={entry.date}>
              <span className="num">#{entry.number}</span>
              <span>{entry.solved ? `${entry.wrongGuesses} misses` : 'unsolved'}</span>
              <span>{formatDuration(entry.elapsedMs)}</span>
              <span className="pts">{entry.solved ? entry.score.toLocaleString() : '—'}</span>
            </div>
          ))}
        </div>
      )}

      <div className="notice">
        <b>Rankings are coming.</b> Right now these numbers live only in this browser. Once accounts
        land you will see where today&apos;s score puts you against everyone else who played, plus
        country boards and streak leaderboards — and this history comes with you.
      </div>
    </Modal>
  );
}
