import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search, Trophy } from 'lucide-react';
import { arcadeAudio } from '../audio/arcadeAudio.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import {
  CLASS_OPTIONS,
  type ExamLeaderboardRow,
  type LeaderboardEntry,
} from '../../shared/types.ts';

interface LeaderboardPageProps {
  onPlayCompete: () => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ onPlayCompete }) => {
  const { player, examUserId, setMusicMode, reportError } = useArcade();

  const [tab, setTab] = useState<'exam' | 'competitive' | 'practice' | 'arcade'>('exam');
  const [period, setPeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [className, setClassName] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [examRows, setExamRows] = useState<ExamLeaderboardRow[]>([]);
  const [arcadeRows, setArcadeRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayNameInput, setDisplayNameInput] = useState(player?.name || '');
  const [nameSavedMsg, setNameSavedMsg] = useState('');

  useEffect(() => {
    setMusicMode('home');
  }, [setMusicMode]);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'exam') {
        const qs = new URLSearchParams({ period, search });
        const res = await fetch(`/api/exam/leaderboard?${qs.toString()}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.entries)) {
          setExamRows(data.entries);
        }
      } else {
        const qs = new URLSearchParams({ tab, className, search });
        const res = await fetch(`/api/leaderboard?${qs.toString()}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.entries)) {
          setArcadeRows(data.entries);
        }
      }
    } catch (err) {
      reportError(String(err));
    } finally {
      setLoading(false);
    }
  }, [tab, period, className, search, reportError]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  const saveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayNameInput.trim();
    const res = await fetch('/api/exam/profile/display-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: examUserId, displayName: trimmed }),
    });
    if (res.ok) {
      setNameSavedMsg('Display name updated');
      void loadLeaderboard();
      window.setTimeout(() => setNameSavedMsg(''), 2500);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      <div className="exam-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--exam-text)] flex items-center gap-2">
            <Trophy size={22} className="text-[var(--exam-warning)]" /> Leaderboard
          </h1>
          <p className="text-sm text-[var(--exam-text-secondary)]">
            Rankings across Competitive Quizzes and Engineering Arcade divisions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            arcadeAudio.playSfx('gameStart');
            onPlayCompete();
          }}
          className="exam-btn exam-btn-primary text-sm shrink-0"
        >
          Compete Now
        </button>
      </div>

      {/* Optional Display Name Setter (No PII Required) */}
      <form
        onSubmit={saveDisplayName}
        className="exam-card p-4 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="text-xs sm:text-sm text-[var(--exam-text-secondary)]">
          Optional Display Name for Leaderboard (no email or phone required):
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={displayNameInput}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            maxLength={32}
            placeholder="Anonymous Learner"
            className="exam-input px-3 py-1.5 text-sm w-44 sm:w-56"
          />
          <button type="submit" className="exam-btn exam-btn-secondary text-xs min-h-[36px] py-1.5">
            Save Name
          </button>
          {nameSavedMsg && (
            <span className="text-xs font-semibold text-[var(--exam-success)]">{nameSavedMsg}</span>
          )}
        </div>
      </form>

      {/* Division Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'exam', label: 'Exam Rankings' },
              { id: 'competitive', label: 'Arcade Competitive' },
              { id: 'practice', label: 'Practice IQ' },
              { id: 'arcade', label: 'Mini-Games' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold cursor-pointer ${
                tab === t.id
                  ? 'bg-[var(--exam-accent)] text-white'
                  : 'bg-[var(--exam-surface)] border border-[var(--exam-border-strong)] text-[var(--exam-text-secondary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'exam' && (
          <div className="flex gap-1.5 bg-[var(--exam-surface)] p-1 rounded-lg border border-[var(--exam-border)]">
            {(
              [
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'all', label: 'All-Time' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                  period === p.id
                    ? 'bg-[var(--exam-accent)] text-white'
                    : 'text-[var(--exam-text-secondary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--exam-text-muted)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search display name..."
            className="exam-input w-full pl-9 pr-3 py-2 text-sm"
          />
        </div>

        {tab !== 'exam' && (
          <select
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            aria-label="Filter by class"
            className="exam-input px-3 py-2 text-sm"
          >
            <option value="all">All Classes</option>
            {CLASS_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => void loadLeaderboard()}
          className="exam-btn exam-btn-secondary text-xs min-h-[38px]"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Rankings Table */}
      {loading ? (
        <div className="exam-card p-8 text-center text-sm text-[var(--exam-text-muted)]">
          Loading rankings...
        </div>
      ) : tab === 'exam' ? (
        examRows.length === 0 ? (
          <div className="exam-card p-8 text-center text-sm text-[var(--exam-text-secondary)]">
            No exam quiz attempts recorded for this period yet. Complete a Quick Quiz or Mock Test to claim #1.
          </div>
        ) : (
          <div className="exam-card overflow-x-auto">
            <table className="w-full text-left text-sm tabular-nums">
              <thead>
                <tr className="border-b border-[var(--exam-border)] text-xs text-[var(--exam-text-muted)]">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Display Name</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4 text-right">XP</th>
                  <th className="py-3 px-4 text-right">Accuracy</th>
                  <th className="py-3 px-4 text-right">Quizzes</th>
                </tr>
              </thead>
              <tbody>
                {examRows.map((r) => {
                  const isMe = r.playerId === examUserId;
                  return (
                    <tr
                      key={r.playerId}
                      className={`border-b border-[var(--exam-border)] last:border-0 ${
                        isMe ? 'bg-[var(--exam-accent-soft)]' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-code font-bold text-[var(--exam-warning)]">
                        #{r.rank}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[var(--exam-text)]">
                        {r.displayName} {isMe ? '(You)' : ''}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-[var(--exam-accent)]">
                        {r.levelTitle}
                      </td>
                      <td className="py-3 px-4 text-right font-code font-bold text-[var(--exam-text)]">
                        {r.xp}
                      </td>
                      <td className="py-3 px-4 text-right font-code text-[var(--exam-success)]">
                        {r.accuracy}%
                      </td>
                      <td className="py-3 px-4 text-right font-code text-[var(--exam-text-secondary)]">
                        {r.quizzesCompleted}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : arcadeRows.length === 0 ? (
        <div className="exam-card p-8 text-center text-sm text-[var(--exam-text-secondary)]">
          No verified runs in this division yet.
        </div>
      ) : (
        <div className="exam-card overflow-x-auto">
          <table className="w-full text-left text-sm tabular-nums">
            <thead>
              <tr className="border-b border-[var(--exam-border)] text-xs text-[var(--exam-text-muted)]">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4 hidden sm:table-cell">Class</th>
                <th className="py-3 px-4 text-right">Best Score</th>
                <th className="py-3 px-4 text-right">Accuracy</th>
                <th className="py-3 px-4 text-right">Runs</th>
              </tr>
            </thead>
            <tbody>
              {arcadeRows.map((e, idx) => (
                <tr
                  key={e.playerId}
                  className={`border-b border-[var(--exam-border)] last:border-0 ${
                    player?.id === e.playerId ? 'bg-[var(--exam-accent-soft)]' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-code font-bold text-[var(--exam-warning)]">
                    #{idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[var(--exam-text)]">{e.playerName}</div>
                    <div className="text-xs text-[var(--exam-text-muted)]">{e.title}</div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell text-[var(--exam-text-secondary)]">
                    {e.className}
                  </td>
                  <td className="py-3 px-4 text-right font-code font-bold text-[var(--exam-accent)]">
                    {e.bestScore}
                  </td>
                  <td className="py-3 px-4 text-right font-code text-[var(--exam-success)]">
                    {Math.round(e.accuracy)}%
                  </td>
                  <td className="py-3 px-4 text-right font-code text-[var(--exam-text-secondary)]">
                    {e.gamesCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
