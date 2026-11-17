import React, { useCallback, useEffect, useState } from 'react';
import { arcadeAudio } from '../audio/arcadeAudio.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import { safeFetchJson } from '../utils/apiClient.ts';
import {
  CLASS_OPTIONS,
  type AnalyticsSummary,
  type ExamLeaderboardRow,
  type LeaderboardEntry,
} from '../../shared/types.ts';
import {
  PixelIcon,
  PixelIllustration,
  PixelLoader,
  PixelMascot,
  PixelTorch,
  type PixelIllustrationName,
} from '../components/pixel/PixelArtAssets.tsx';

interface LeaderboardPageProps {
  onPlayCompete: () => void;
}

interface TrophyDef {
  id: string;
  name: string;
  req: string;
  art: PixelIllustrationName;
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

  // Real earned trophies computed strictly from real player + exam progress
  const totalXp = (analytics?.streaks.examXp ?? 0) + (player?.xp ?? 0);
  const totalRuns = (analytics?.totalQuizzes ?? 0) + (player?.gamesPlayed ?? 0);
  const bestStreak = Math.max(analytics?.streaks.dailyStreak ?? 0, player?.streakBest ?? 0);
  const bestAccuracy = analytics?.overallAccuracy ?? 0;

  const trophies: TrophyDef[] = [
    {
      id: 'first_spark',
      name: 'First Spark',
      req: 'Complete 1 Engineering Quiz',
      art: 'medal_bronze',
      earned: totalRuns >= 1,
    },
    {
      id: 'bronze_cup',
      name: 'Bronze Gear Cup',
      req: 'Earn 100+ Total XP',
      art: 'trophy',
      earned: totalXp >= 100,
    },
    {
      id: 'silver_crest',
      name: 'Silver Circuit Crest',
      req: 'Earn 300+ Total XP',
      art: 'medal_silver',
      earned: totalXp >= 300,
    },
    {
      id: 'gold_crown',
      name: 'Grand Gold Crown',
      req: 'Earn 600+ Total XP',
      art: 'crown',
      earned: totalXp >= 600,
    },
    {
      id: 'diamond_relic',
      name: 'Diamond Architect',
      req: 'Earn 1,200+ Total XP',
      art: 'diamond_trophy',
      earned: totalXp >= 1200,
    },
    {
      id: 'sharpshooter',
      name: 'Precision Shield',
      req: 'Reach 80%+ Overall Accuracy',
      art: 'shield',
      earned: totalRuns >= 1 && bestAccuracy >= 80,
    },
    {
      id: 'streak_master',
      name: 'Overclock Flame',
      req: 'Hit a 3+ Combo / Streak',
      art: 'medal_gold',
      earned: bestStreak >= 3 || (analytics?.streaks.perfectStreak ?? 0) >= 1,
    },
    {
      id: 'veteran_builder',
      name: 'Grand Builder',
      req: 'Complete 5+ Runs',
      art: 'circuit',
      earned: totalRuns >= 5,
    },
  ];

  const earnedCount = trophies.filter((t) => t.earned).length;

  // Extract Top 3 champions cleanly for the Grand Podium
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-7 sm:py-9 space-y-6">
      {/* GRAND ROYAL TORCH-LIT HALL BANNER */}
      <section className="exam-card p-6 sm:p-8 border-[var(--voxel-gold)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <PixelTorch size={46} className="hidden sm:block" />
            <PixelIllustration name="diamond_trophy" size={58} className="animate-pixel-bob" />
            <div>
              <div className="font-code text-xs text-[var(--voxel-gold)] tracking-widest uppercase">
                HALL OF ENGINEERING CHAMPIONS
              </div>
              <h1 className="font-pixel text-lg sm:text-2xl text-[var(--voxel-gold)] mt-1">
                GRAND TROPHY ROOM
              </h1>
              <p className="text-xs sm:text-sm text-[var(--exam-text-secondary)] mt-1">
                {earnedCount} / {trophies.length} Engineering Trophies Unlocked · {totalXp} Total XP
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => arcadeAudio.playSfx('drumRoll')}
              className="exam-btn exam-btn-gold text-xs px-3.5 min-h-[40px]"
            >
              DRUM ROLL
            </button>
            <button
              type="button"
              onClick={() => arcadeAudio.playSfx('airhorn')}
              className="exam-btn exam-btn-secondary text-xs px-3.5 min-h-[40px]"
            >
              AIRHORN
            </button>
            <button
              type="button"
              onClick={() => {
                arcadeAudio.playSfx('gameStart');
                onPlayCompete();
              }}
              className="exam-btn exam-btn-primary text-xs px-4 min-h-[40px]"
            >
              <PixelIcon name="play" size={14} /> COMPETE
            </button>
          </div>
        </div>
      </section>

      {/* Clean Hall View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              setHallView('vault');
            }}
            className={`exam-btn text-xs sm:text-sm px-5 min-h-[42px] ${
              hallView === 'vault' ? 'exam-btn-gold' : 'exam-btn-secondary'
            }`}
          >
            <PixelIcon name="trophy" size={15} /> PODIUM &amp; VAULT
          </button>
          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              setHallView('rankings');
            }}
            className={`exam-btn text-xs sm:text-sm px-5 min-h-[42px] ${
              hallView === 'rankings' ? 'exam-btn-gold' : 'exam-btn-secondary'
            }`}
          >
            <PixelIcon name="score" size={15} /> FULL RANKINGS
          </button>
        </div>

        {/* Division Selector */}
        <div className="flex flex-wrap gap-1.5">
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
              className={`px-3 py-1.5 border-2 font-display-pixel text-xs cursor-pointer ${
                tab === t.id
                  ? 'bg-[var(--exam-accent)] text-[#0B0F1A] border-[#0B0F1A]'
                  : 'bg-[var(--exam-surface)] border-[var(--exam-border)] text-[var(--exam-text-secondary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRAND 3-TIER CHAMPIONSHIP PODIUM */}
      <section className="exam-card p-6 sm:p-8">
        <div className="flex items-center justify-between gap-2 mb-6">
          <h2 className="font-pixel text-xs sm:text-sm text-[var(--exam-text)] flex items-center gap-2">
            <PixelIcon name="trophy" size={16} className="text-[var(--voxel-gold)]" />
            GRAND CHAMPIONSHIP PODIUM
          </h2>
          <PixelMascot mood="excited" size={44} />
        </div>

        <div className="grid grid-cols-3 items-end gap-3 sm:gap-5 max-w-3xl mx-auto pt-2">
          {/* #2 SILVER */}
          <div className="flex flex-col items-center text-center">
            <PixelIllustration name="medal_silver" size={44} className="mb-2" />
            <div className="font-display-pixel text-xs sm:text-sm font-bold text-[var(--exam-text)] truncate max-w-full px-1">
              {secondPlace ? secondPlace.name : 'Open #2'}
            </div>
            <div className="font-code text-[11px] text-[var(--exam-text-muted)] mb-2">
              {secondPlace ? secondPlace.metric : '—'}
            </div>
            <div className="w-full h-24 sm:h-28 bg-slate-400/25 border-3 border-[#94A3B8] flex flex-col items-center justify-center shadow-[4px_4px_0_#000]">
              <span className="font-pixel text-lg sm:text-xl text-slate-200">#2</span>
              <span className="font-code text-[10px] text-slate-300">SILVER</span>
            </div>
          </div>

          {/* #1 GOLD CROWN CHAMPION */}
          <div className="flex flex-col items-center text-center">
            <PixelIllustration name="crown" size={56} className="mb-1 animate-pixel-bob" />
            <div className="font-display-pixel text-xs sm:text-base font-bold text-[var(--voxel-gold)] truncate max-w-full px-1">
              {firstPlace ? firstPlace.name : 'Claim #1'}
            </div>
            <div className="font-code text-xs font-bold text-[var(--exam-success)] mb-2">
              {firstPlace ? firstPlace.metric : 'Play Now'}
            </div>
            <div className="w-full h-32 sm:h-36 bg-[#FACC15]/25 border-3 border-[#FACC15] flex flex-col items-center justify-center shadow-[5px_5px_0_#000]">
              <span className="font-pixel text-xl sm:text-2xl text-[var(--voxel-gold)]">#1</span>
              <span className="font-code text-[10px] font-bold text-[var(--voxel-gold)]">CHAMPION</span>
            </div>
          </div>

          {/* #3 BRONZE */}
          <div className="flex flex-col items-center text-center">
            <PixelIllustration name="medal_bronze" size={44} className="mb-2" />
            <div className="font-display-pixel text-xs sm:text-sm font-bold text-[var(--exam-text)] truncate max-w-full px-1">
              {thirdPlace ? thirdPlace.name : 'Open #3'}
            </div>
            <div className="font-code text-[11px] text-[var(--exam-text-muted)] mb-2">
              {thirdPlace ? thirdPlace.metric : '—'}
            </div>
            <div className="w-full h-20 sm:h-24 bg-orange-500/20 border-3 border-[#FB923C] flex flex-col items-center justify-center shadow-[4px_4px_0_#000]">
              <span className="font-pixel text-lg sm:text-xl text-[#FB923C]">#3</span>
              <span className="font-code text-[10px] text-[#FDBA74]">BRONZE</span>
            </div>
          </div>
        </div>
      </section>

      {hallView === 'vault' ? (
        /* COLLECTIBLE TROPHY CABINET */
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-pixel text-xs sm:text-sm text-[var(--exam-text)]">
              ROYAL ENGINEERING TROPHY VAULT
            </h2>
            <span className="font-code text-xs text-[var(--exam-text-muted)]">
              Click any earned trophy to celebrate
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
                  className={`voxel-tile p-4 text-center flex flex-col items-center gap-2 cursor-pointer ${
                    t.earned
                      ? 'border-[var(--voxel-gold)] bg-[var(--voxel-gold)]/10'
                      : 'opacity-55'
                  } ${popping ? 'animate-pixel-pop' : ''}`}
                >
                  <PixelIllustration
                    name={t.art}
                    size={52}
                    className={t.earned ? '' : 'grayscale'}
                  />
                  <div className="font-display-pixel text-xs sm:text-sm font-bold text-[var(--exam-text)]">
                    {t.name}
                  </div>
                  <div className="text-[11px] text-[var(--exam-text-secondary)]">{t.req}</div>
                  <span
                    className={`font-pixel text-[9px] mt-auto pt-1 ${
                      t.earned ? 'text-[var(--voxel-green)]' : 'text-[var(--exam-text-muted)]'
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
        /* FULL HALL RANKINGS & PLAYER HANDLE BAR */
        <section className="space-y-4">
          <form
            onSubmit={saveDisplayName}
            className="exam-card p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <label
              htmlFor="scoreboard-player-name"
              className="font-display-pixel text-xs font-bold text-[var(--exam-text)]"
            >
              YOUR PLAQUE NAME
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="scoreboard-player-name"
                type="text"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                maxLength={32}
                placeholder="Anonymous Builder"
                className="exam-input px-3 py-2 text-sm w-44 sm:w-56 font-display-pixel"
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

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search engineer name..."
              className="exam-input flex-1 px-3.5 py-2 text-sm"
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
                    className={`px-3 py-2 border-2 font-display-pixel text-xs cursor-pointer ${
                      period === p.id
                        ? 'bg-[var(--exam-accent)] text-[#0B0F1A] border-[#0B0F1A]'
                        : 'bg-[var(--exam-surface)] border-[var(--exam-border)] text-[var(--exam-text-secondary)]'
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

          {loading ? (
            <div className="exam-card p-8">
              <PixelLoader label="POLISHING TROPHIES..." />
            </div>
          ) : tab === 'exam' ? (
            examRows.length === 0 ? (
              <div className="exam-card p-8 text-center space-y-4">
                <PixelIllustration name="trophy" size={56} className="mx-auto" />
                <div className="font-pixel text-sm text-[var(--exam-text)]">NO CHAMPIONS YET</div>
                <p className="text-sm text-[var(--exam-text-secondary)]">
                  Finish an Engineering Quiz to etch your name onto the Golden Podium!
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
                      <th className="py-3 px-4">ENGINEER</th>
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
              <PixelIllustration name="trophy" size={56} className="mx-auto" />
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
                    <th className="py-3 px-4">ENGINEER</th>
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
        </section>
      )}
    </div>
  );
};
