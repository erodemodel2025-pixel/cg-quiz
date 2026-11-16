import React, { useCallback, useEffect, useState } from 'react';
import { arcadeAudio } from '../audio/arcadeAudio.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import { safeFetchJson } from '../utils/apiClient.ts';
import {
  CLASS_OPTIONS,
  type ExamLeaderboardRow,
  type LeaderboardEntry,
} from '../../shared/types.ts';
import { PixelIcon, PixelIllustration, PixelLoader } from '../components/pixel/PixelArtAssets.tsx';

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
        const res = await safeFetchJson<{ entries?: ExamLeaderboardRow[] }>(
          `/api/exam/leaderboard?${qs.toString()}`
        );
        if (res.ok && res.data && Array.isArray(res.data.entries)) {
          setExamRows(res.data.entries);
        }
      } else {
        const qs = new URLSearchParams({ tab, className, search });
        const res = await safeFetchJson<{ entries?: LeaderboardEntry[] }>(
          `/api/leaderboard?${qs.toString()}`
        );
        if (res.ok && res.data && Array.isArray(res.data.entries)) {
          setArcadeRows(res.data.entries);
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
    arcadeAudio.playSfx('coin');
    const trimmed = displayNameInput.trim();
    const res = await safeFetchJson('/api/exam/profile/display-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: examUserId, displayName: trimmed }),
    });
    if (res.ok) {
      setNameSavedMsg('Saved!');
      void loadLeaderboard();
      window.setTimeout(() => setNameSavedMsg(''), 2500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-7 sm:py-9 space-y-6">
      <div className="exam-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <PixelIllustration name="trophy" size={48} />
          <div>
            <h1 className="font-pixel text-base sm:text-xl text-[var(--voxel-gold)]">
              SCOREBOARD
            </h1>
            <p className="text-sm text-[var(--exam-text-secondary)] mt-1">
              Top players across Quiz &amp; Arcade divisions.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            arcadeAudio.playSfx('gameStart');
            onPlayCompete();
          }}
          className="exam-btn exam-btn-primary text-xs sm:text-sm shrink-0"
        >
          <PixelIcon name="play" size={14} /> PLAY NOW
        </button>
      </div>

      {/* Blocky Game-Style Player Name Input */}
      <form
        onSubmit={saveDisplayName}
        className="exam-card p-4 flex flex-wrap items-center justify-between gap-3"
      >
        <label
          htmlFor="scoreboard-player-name"
          className="font-display-pixel text-xs sm:text-sm font-bold text-[var(--exam-text)]"
        >
          PLAYER NAME
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="scoreboard-player-name"
            type="text"
            value={displayNameInput}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            maxLength={32}
            placeholder="Anonymous Player"
            className="exam-input px-3 py-2 text-sm w-48 sm:w-56 font-display-pixel"
          />
          <button type="submit" className="exam-btn exam-btn-secondary text-xs min-h-[40px] py-1.5">
            SAVE
          </button>
          {nameSavedMsg && (
            <span className="font-display-pixel text-xs text-[var(--exam-success)]">
              {nameSavedMsg}
            </span>
          )}
        </div>
      </form>

      {/* Division Tabs & Time Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'exam', label: 'Quiz XP' },
              { id: 'competitive', label: 'Competitive' },
              { id: 'practice', label: 'Practice IQ' },
              { id: 'arcade', label: 'Mini-Games' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                arcadeAudio.playSfx('click');
                setTab(t.id);
              }}
              className={`px-3.5 py-2 border-2 font-display-pixel text-xs cursor-pointer ${
                tab === t.id
                  ? 'bg-[var(--voxel-gold)] text-[#0B0F1A] border-[#0B0F1A]'
                  : 'bg-[var(--exam-surface)] border-[var(--exam-border)] text-[var(--exam-text-secondary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'exam' && (
          <div className="flex gap-1.5">
            {(
              [
                { id: 'daily', label: 'Today' },
                { id: 'weekly', label: 'Week' },
                { id: 'monthly', label: 'Month' },
                { id: 'all', label: 'All' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1.5 border-2 font-display-pixel text-xs cursor-pointer ${
                  period === p.id
                    ? 'bg-[var(--exam-accent)] text-[#0B0F1A] border-[#0B0F1A]'
                    : 'bg-[var(--exam-surface)] border-[var(--exam-border)] text-[var(--exam-text-secondary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Compact Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search player name..."
          className="exam-input flex-1 px-3.5 py-2 text-sm"
        />

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
      </div>

      {/* Pixel Scoreboard Rows */}
      {loading ? (
        <div className="exam-card p-8">
          <PixelLoader label="LOADING SCORES..." />
        </div>
      ) : tab === 'exam' ? (
        examRows.length === 0 ? (
          <div className="exam-card p-8 text-center space-y-4">
            <PixelIllustration name="question_block" size={52} className="mx-auto" />
            <div className="font-pixel text-sm text-[var(--exam-text)]">NO SCORES YET</div>
            <p className="text-sm text-[var(--exam-text-secondary)]">
              Your adventure starts here. Claim rank #1!
            </p>
            <button type="button" onClick={onPlayCompete} className="exam-btn exam-btn-primary text-xs">
              START QUIZ
            </button>
          </div>
        ) : (
          <div className="exam-card overflow-x-auto">
            <table className="w-full text-left text-sm tabular-nums">
              <thead>
                <tr className="border-b-3 border-[var(--exam-border)] font-display-pixel text-xs text-[var(--exam-text-muted)]">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">PLAYER</th>
                  <th className="py-3 px-4 hidden sm:table-cell">LEVEL</th>
                  <th className="py-3 px-4 text-right">XP</th>
                  <th className="py-3 px-4 text-right">ACC</th>
                </tr>
              </thead>
              <tbody>
                {examRows.map((r) => {
                  const isMe = r.playerId === examUserId;
                  return (
                    <tr
                      key={r.playerId}
                      className={`border-b-2 border-[var(--exam-border)] last:border-0 ${
                        isMe ? 'bg-[var(--exam-accent-soft)]' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-pixel text-xs text-[var(--voxel-gold)]">
                        {r.rank}
                      </td>
                      <td className="py-3 px-4 font-display-pixel font-bold text-[var(--exam-text)]">
                        {r.displayName} {isMe ? '★' : ''}
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell font-display-pixel text-xs text-[var(--exam-accent)]">
                        {r.levelTitle}
                      </td>
                      <td className="py-3 px-4 text-right font-pixel text-xs text-[var(--exam-text)]">
                        {r.xp}
                      </td>
                      <td className="py-3 px-4 text-right font-code font-bold text-[var(--exam-success)]">
                        {r.accuracy}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : arcadeRows.length === 0 ? (
        <div className="exam-card p-8 text-center space-y-4">
          <PixelIllustration name="trophy" size={52} className="mx-auto" />
          <div className="font-pixel text-sm text-[var(--exam-text)]">NO RUNS RECORDED</div>
          <button type="button" onClick={onPlayCompete} className="exam-btn exam-btn-primary text-xs">
            START QUIZ
          </button>
        </div>
      ) : (
        <div className="exam-card overflow-x-auto">
          <table className="w-full text-left text-sm tabular-nums">
            <thead>
              <tr className="border-b-3 border-[var(--exam-border)] font-display-pixel text-xs text-[var(--exam-text-muted)]">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">PLAYER</th>
                <th className="py-3 px-4 hidden sm:table-cell">CLASS</th>
                <th className="py-3 px-4 text-right">SCORE</th>
                <th className="py-3 px-4 text-right">ACC</th>
              </tr>
            </thead>
            <tbody>
              {arcadeRows.map((e, idx) => (
                <tr
                  key={e.playerId}
                  className={`border-b-2 border-[var(--exam-border)] last:border-0 ${
                    player?.id === e.playerId ? 'bg-[var(--exam-accent-soft)]' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-pixel text-xs text-[var(--voxel-gold)]">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-display-pixel font-bold text-[var(--exam-text)]">
                      {e.playerName}
                    </div>
                    <div className="text-xs text-[var(--exam-text-muted)]">{e.title}</div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell text-[var(--exam-text-secondary)]">
                    {e.className}
                  </td>
                  <td className="py-3 px-4 text-right font-pixel text-xs text-[var(--exam-accent)]">
                    {e.bestScore}
                  </td>
                  <td className="py-3 px-4 text-right font-code font-bold text-[var(--exam-success)]">
                    {Math.round(e.accuracy)}%
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
