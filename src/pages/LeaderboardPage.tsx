import React, { useCallback, useEffect, useState } from 'react';
import { Award, Crown, Drum, Medal, Play, Shield, Trophy, Volume2 } from 'lucide-react';
import {
  CLASS_OPTIONS,
  type AnalyticsSummary,
  type ExamLeaderboardRow,
  type LeaderboardEntry,
} from '../../shared/types.ts';
import { arcadeAudio } from '../audio/arcadeAudio.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import { safeFetchJson } from '../utils/apiClient.ts';

interface LeaderboardPageProps {
  onPlayCompete: () => void;
}

interface TrophyDef {
  id: string;
  name: string;
  req: string;
  earned: boolean;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ onPlayCompete }) => {
  const { player, examUserId, setMusicMode, reportError } = useArcade();

  const [hallView, setHallView] = useState<'vault' | 'rankings'>('vault');
  const [tab, setTab] = useState<'exam' | 'competitive' | 'practice' | 'arcade'>('exam');
  const [period, setPeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [className, setClassName] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [examRows, setExamRows] = useState<ExamLeaderboardRow[]>([]);
  const [arcadeRows, setArcadeRows] = useState<LeaderboardEntry[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayNameInput, setDisplayNameInput] = useState(player?.name || '');
  const [nameSavedMsg, setNameSavedMsg] = useState('');
  const [celebratingTrophy, setCelebratingTrophy] = useState<string | null>(null);

  useEffect(() => {
    setMusicMode('trophy');
  }, [setMusicMode]);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const aRes = await safeFetchJson<AnalyticsSummary>(
        `/api/exam/analytics?userId=${encodeURIComponent(examUserId)}&range=all`
      );
      if (aRes.ok && aRes.data) setAnalytics(aRes.data);

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
  }, [tab, period, className, search, examUserId, reportError]);

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

  const totalXp = (analytics?.streaks.examXp ?? 0) + (player?.xp ?? 0);
  const totalRuns = (analytics?.totalQuizzes ?? 0) + (player?.gamesPlayed ?? 0);
  const bestStreak = Math.max(analytics?.streaks.dailyStreak ?? 0, player?.streakBest ?? 0);
  const bestAccuracy = analytics?.overallAccuracy ?? 0;

  const trophies: TrophyDef[] = [
    { id: 'first_spark', name: 'First Spark', req: 'Complete 1 Quiz or Game Run', earned: totalRuns >= 1 },
    { id: 'bronze_cup', name: 'Bronze Gear Cup', req: 'Earn 100+ Total XP', earned: totalXp >= 100 },
    { id: 'silver_crest', name: 'Silver Circuit Crest', req: 'Earn 300+ Total XP', earned: totalXp >= 300 },
    { id: 'gold_crown', name: 'Grand Gold Crown', req: 'Earn 600+ Total XP', earned: totalXp >= 600 },
    { id: 'diamond_relic', name: 'Diamond Architect', req: 'Earn 1,200+ Total XP', earned: totalXp >= 1200 },
    {
      id: 'sharpshooter',
      name: 'Precision Shield',
      req: 'Reach 80%+ Overall Accuracy',
      earned: totalRuns >= 1 && bestAccuracy >= 80,
    },
    {
      id: 'streak_master',
      name: 'Overclock Flame',
      req: 'Hit a 3+ Combo / Streak',
      earned: bestStreak >= 3 || (analytics?.streaks.perfectStreak ?? 0) >= 1,
    },
    { id: 'veteran_builder', name: 'Grand Builder', req: 'Complete 5+ Runs', earned: totalRuns >= 5 },
  ];

  const earnedCount = trophies.filter((t) => t.earned).length;

  const podiumEntries =
    tab === 'exam'
      ? examRows.slice(0, 3).map((r) => ({
          rank: r.rank,
          name: r.displayName,
          sub: r.levelTitle,
          metric: `${r.xp} XP`,
        }))
      : arcadeRows.slice(0, 3).map((e, i) => ({
          rank: i + 1,
          name: e.playerName,
          sub: e.className,
          metric: `${e.bestScore} PTS`,
        }));

  const firstPlace = podiumEntries[0];
  const secondPlace = podiumEntries[1];
  const thirdPlace = podiumEntries[2];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* GRAND HALL BANNER */}
      <section className="studio-card p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#D97706] text-white flex items-center justify-center shrink-0 shadow-lg">
              <Trophy size={28} />
            </div>
            <div>
              <div className="font-mono-tech text-xs font-bold text-[var(--studio-amber-text)] tracking-widest uppercase">
                Hall of Studio Champions
              </div>
              <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[var(--studio-text)] mt-0.5">
                Leaderboard &amp; Trophy Room
              </h1>
              <p className="text-xs sm:text-sm text-[var(--studio-text-secondary)] mt-0.5">
                {earnedCount} / {trophies.length} Studio Trophies Unlocked · {totalXp} Total XP
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => arcadeAudio.playSfx('drumRoll')}
              className="studio-btn studio-btn-ghost text-xs px-3.5"
            >
              <Drum size={14} className="text-[var(--studio-amber-text)]" /> Drum Roll
            </button>
            <button
              type="button"
              onClick={() => arcadeAudio.playSfx('airhorn')}
              className="studio-btn studio-btn-ghost text-xs px-3.5"
            >
              <Volume2 size={14} className="text-[var(--studio-accent-text)]" /> Fanfare
            </button>
            <button
              type="button"
              onClick={() => {
                arcadeAudio.playSfx('gameStart');
                onPlayCompete();
              }}
              className="studio-btn studio-btn-primary text-xs px-4"
            >
              <Play size={14} fill="currentColor" /> Compete Now
            </button>
          </div>
        </div>
      </section>

      {/* View Switcher & Division Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              setHallView('vault');
            }}
            className={`studio-btn text-xs sm:text-sm px-4 ${
              hallView === 'vault' ? 'studio-btn-primary' : 'studio-btn-ghost'
            }`}
          >
            <Crown size={15} /> Podium &amp; Vault
          </button>
          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              setHallView('rankings');
            }}
            className={`studio-btn text-xs sm:text-sm px-4 ${
              hallView === 'rankings' ? 'studio-btn-primary' : 'studio-btn-ghost'
            }`}
          >
            <Award size={15} /> Full Rankings
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'exam', label: 'Quiz XP' },
              { id: 'competitive', label: 'Ranked' },
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
              className={`studio-btn text-xs px-3.5 py-1.5 min-h-[36px] ${
                tab === t.id ? 'studio-btn-cyan' : 'studio-btn-ghost'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* CHAMPIONSHIP PODIUM */}
      <section className="studio-card-solid p-6 sm:p-8">
        <h2 className="font-heading font-bold text-lg text-[var(--studio-text)] flex items-center gap-2 mb-6">
          <Crown size={18} className="text-[var(--studio-amber-text)]" /> Top 3 Champions
        </h2>

        <div className="grid grid-cols-3 items-end gap-3 sm:gap-5 max-w-3xl mx-auto pt-2">
          {/* #2 SILVER */}
          <div className="flex flex-col items-center text-center">
            <Medal size={28} className="text-[var(--studio-text-muted)] mb-2" />
            <div className="font-sora text-xs sm:text-sm font-bold text-[var(--studio-text)] truncate max-w-full px-1">
              {secondPlace ? secondPlace.name : 'Open #2'}
            </div>
            <div className="font-mono-tech text-[11px] font-bold text-[var(--studio-text-muted)] mb-2">
              {secondPlace ? secondPlace.metric : '—'}
            </div>
            <div className="w-full h-24 sm:h-28 rounded-t-xl bg-[#475569] border-2 border-[#94A3B8] text-white flex flex-col items-center justify-center">
              <span className="font-heading font-bold text-xl">#2</span>
              <span className="font-mono-tech text-[10px] font-bold">SILVER</span>
            </div>
          </div>

          {/* #1 GOLD */}
          <div className="flex flex-col items-center text-center">
            <Crown size={34} className="text-[var(--studio-amber-text)] mb-2" />
            <div className="font-sora text-xs sm:text-base font-bold text-[var(--studio-amber-text)] truncate max-w-full px-1">
              {firstPlace ? firstPlace.name : 'Claim #1'}
            </div>
            <div className="font-mono-tech text-xs font-bold text-[var(--studio-emerald-text)] mb-2">
              {firstPlace ? firstPlace.metric : 'Play Now'}
            </div>
            <div className="w-full h-32 sm:h-36 rounded-t-xl bg-[#D97706] border-2 border-[#FDE68A] text-white flex flex-col items-center justify-center shadow-lg">
              <span className="font-heading font-bold text-2xl">#1</span>
              <span className="font-mono-tech text-[10px] font-bold">CHAMPION</span>
            </div>
          </div>

          {/* #3 BRONZE */}
          <div className="flex flex-col items-center text-center">
            <Shield size={28} className="text-[#EA580C] mb-2" />
            <div className="font-sora text-xs sm:text-sm font-bold text-[var(--studio-text)] truncate max-w-full px-1">
              {thirdPlace ? thirdPlace.name : 'Open #3'}
            </div>
            <div className="font-mono-tech text-[11px] font-bold text-[var(--studio-text-muted)] mb-2">
              {thirdPlace ? thirdPlace.metric : '—'}
            </div>
            <div className="w-full h-20 sm:h-24 rounded-t-xl bg-[#9A3412] border-2 border-[#FB923C] text-white flex flex-col items-center justify-center">
              <span className="font-heading font-bold text-xl">#3</span>
              <span className="font-mono-tech text-[10px] font-bold">BRONZE</span>
            </div>
          </div>
        </div>
      </section>

      {hallView === 'vault' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading font-bold text-lg text-[var(--studio-text)]">Studio Trophy Vault</h2>
            <span className="font-mono-tech text-xs font-bold text-[var(--studio-text-muted)]">
              Click unlocked trophies to celebrate
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {trophies.map((t) => {
              const popping = celebratingTrophy === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (t.earned) {
                      arcadeAudio.playSfx('wow');
                      setCelebratingTrophy(t.id);
                      window.setTimeout(() => setCelebratingTrophy(null), 600);
                    } else {
                      arcadeAudio.playSfx('bonk');
                    }
                  }}
                  className={`studio-card-interactive p-4 text-center flex flex-col items-center gap-2 cursor-pointer ${
                    t.earned ? 'border-2 border-[#F59E0B]' : 'opacity-70'
                  } ${popping ? 'scale-105' : ''}`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      t.earned
                        ? 'bg-[#D97706] text-white'
                        : 'bg-[var(--studio-surface-2)] text-[var(--studio-text-muted)] border border-[var(--studio-border)]'
                    }`}
                  >
                    <Trophy size={24} />
                  </div>
                  <div className="font-sora font-bold text-xs sm:text-sm text-[var(--studio-text)]">
                    {t.name}
                  </div>
                  <div className="text-xs text-[var(--studio-text-secondary)]">{t.req}</div>
                  <span
                    className={`font-mono-tech text-[10px] font-bold mt-auto px-2 py-0.5 rounded ${
                      t.earned
                        ? 'bg-[#059669] text-white'
                        : 'bg-[var(--studio-surface-2)] text-[var(--studio-text-muted)]'
                    }`}
                  >
                    {t.earned ? 'UNLOCKED' : 'LOCKED'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <form
            onSubmit={saveDisplayName}
            className="studio-card-solid p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <label
              htmlFor="scoreboard-player-name"
              className="font-mono-tech text-xs font-bold text-[var(--studio-accent-text)] uppercase"
            >
              Leaderboard Plaque Name
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="scoreboard-player-name"
                type="text"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                maxLength={32}
                placeholder="Anonymous Builder"
                className="studio-input px-3 py-2 text-sm w-44 sm:w-56"
              />
              <button type="submit" className="studio-btn studio-btn-primary text-xs min-h-[38px] py-1.5">
                Save
              </button>
              {nameSavedMsg && (
                <span className="font-mono-tech text-xs font-bold text-[var(--studio-emerald-text)]">
                  {nameSavedMsg}
                </span>
              )}
            </div>
          </form>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search creator name..."
              className="studio-input flex-1 px-3.5 py-2 text-sm"
            />

            {tab === 'exam' ? (
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
                    className={`studio-btn text-xs px-3 py-1.5 min-h-[38px] ${
                      period === p.id ? 'studio-btn-primary' : 'studio-btn-ghost'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            ) : (
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                aria-label="Filter by class"
                className="studio-input px-3 py-2 text-sm"
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

          {loading ? (
            <div className="studio-card-solid p-8 text-center font-mono-tech text-xs font-bold text-[var(--studio-accent-text)]">
              Loading leaderboard rankings...
            </div>
          ) : tab === 'exam' ? (
            examRows.length === 0 ? (
              <div className="studio-card-solid p-8 text-center space-y-4">
                <Trophy size={40} className="mx-auto text-[var(--studio-amber-text)]" />
                <div className="font-heading font-bold text-lg text-[var(--studio-text)]">
                  No Champions Yet
                </div>
                <p className="text-sm text-[var(--studio-text-secondary)]">
                  Finish a quiz to claim your spot on the Golden Podium!
                </p>
                <button type="button" onClick={onPlayCompete} className="studio-btn studio-btn-primary text-xs">
                  Start Quiz
                </button>
              </div>
            ) : (
              <div className="studio-card-solid overflow-x-auto">
                <table className="w-full text-left text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-[var(--studio-border)] font-mono-tech text-xs text-[var(--studio-text-muted)]">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">PLAYER</th>
                      <th className="py-3 px-4 hidden sm:table-cell">RANK TITLE</th>
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
                          className={`border-b border-[var(--studio-border)] last:border-0 ${
                            isMe ? 'bg-[var(--studio-surface-2)]' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono-tech text-xs font-bold text-[var(--studio-amber-text)]">
                            {r.rank}
                          </td>
                          <td className="py-3 px-4 font-sora font-bold text-[var(--studio-text)]">
                            {r.displayName} {isMe ? '★' : ''}
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell font-mono-tech text-xs font-bold text-[var(--studio-accent-text)]">
                            {r.levelTitle}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tech text-xs font-bold text-[var(--studio-text)]">
                            {r.xp}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tech font-bold text-[var(--studio-emerald-text)]">
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
            <div className="studio-card-solid p-8 text-center space-y-4">
              <Trophy size={40} className="mx-auto text-[var(--studio-amber-text)]" />
              <div className="font-heading font-bold text-lg text-[var(--studio-text)]">
                No Runs Recorded
              </div>
              <button type="button" onClick={onPlayCompete} className="studio-btn studio-btn-primary text-xs">
                Start Playing
              </button>
            </div>
          ) : (
            <div className="studio-card-solid overflow-x-auto">
              <table className="w-full text-left text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-[var(--studio-border)] font-mono-tech text-xs text-[var(--studio-text-muted)]">
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
                      className={`border-b border-[var(--studio-border)] last:border-0 ${
                        player?.id === e.playerId ? 'bg-[var(--studio-surface-2)]' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono-tech text-xs font-bold text-[var(--studio-amber-text)]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-sora font-bold text-[var(--studio-text)]">{e.playerName}</div>
                        <div className="text-xs text-[var(--studio-text-muted)]">{e.title}</div>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell text-[var(--studio-text-secondary)]">
                        {e.className}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tech text-xs font-bold text-[var(--studio-accent-text)]">
                        {e.bestScore}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tech font-bold text-[var(--studio-emerald-text)]">
                        {Math.round(e.accuracy)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
