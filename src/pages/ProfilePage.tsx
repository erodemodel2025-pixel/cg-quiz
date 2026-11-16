import React, { useEffect, useState } from 'react';
import { Award, Check, Flame, Lock, Palette, Trophy, UserPlus } from 'lucide-react';
import { arcadeAudio } from '../audio/arcadeAudio.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import {
  ACHIEVEMENTS,
  computeLevelFromXp,
  PIXEL_THEMES,
} from '../../shared/progression.ts';
import type { SubmissionRecord } from '../../shared/types.ts';

interface ProfilePageProps {
  onOpenRegister: () => void;
  onPlay: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onOpenRegister, onPlay }) => {
  const { player, activeTheme, equipTheme, clearPlayerSession, setMusicMode, reportError } =
    useArcade();
  const [history, setHistory] = useState<SubmissionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    setMusicMode('home');
  }, [setMusicMode]);

  useEffect(() => {
    if (!player) return;
    setLoadingHistory(true);
    fetch(`/api/players/${encodeURIComponent(player.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.history)) setHistory(d.history);
      })
      .catch((err) => reportError(String(err)))
      .finally(() => setLoadingHistory(false));
  }, [player, reportError]);

  if (!player) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 relative z-10">
        <div className="pixel-panel p-8 text-center">
          <UserPlus size={40} className="mx-auto text-[#00F0FF] mb-4" />
          <h1 className="font-pixel text-base sm:text-lg text-[#FFE600] mb-3">
            NO PILOT REGISTERED YET
          </h1>
          <p className="text-base text-[var(--text-secondary)] mb-6">
            Register your player handle and class to track XP, unlock pixel themes, collect achievement badges, and store competition history.
          </p>
          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              onOpenRegister();
            }}
            className="pixel-btn pixel-btn-cyan px-6 py-3.5 text-xs"
          >
            Register Player
          </button>
        </div>
      </div>
    );
  }

  const lvl = computeLevelFromXp(player.xp);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 relative z-10 space-y-6">
      {/* Pilot Card */}
      <div className="pixel-panel p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="font-code text-xs text-[#22FF66] mb-1">
            {player.className} · {player.gamesPlayed} RUNS COMPLETED
          </div>
          <h1 className="font-pixel text-xl sm:text-2xl text-[#FFE600] mb-2">{player.name}</h1>
          <div className="font-pixel text-xs text-[#00F0FF]">
            LEVEL {lvl.level} — {lvl.title.toUpperCase()}
          </div>
        </div>

        <div className="w-full md:w-80">
          <div className="flex justify-between font-code text-xs text-[var(--text-secondary)] mb-1.5 tabular-nums">
            <span>{player.xp} XP</span>
            <span>{lvl.nextLevelXp ? `NEXT LVL: ${lvl.nextLevelXp} XP` : 'MAX RANK'}</span>
          </div>
          <div className="h-4 bg-[var(--bg-deep)] border-2 border-[var(--border-pixel)] mb-3">
            <div className="h-full bg-[#22FF66]" style={{ width: `${lvl.progressPercent}%` }} />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs font-code">
            <span className="text-[#FF6B00] flex items-center gap-1">
              <Flame size={14} /> Best Streak: {player.streakBest}
            </span>
            <button
              type="button"
              onClick={() => {
                arcadeAudio.playSfx('click');
                clearPlayerSession();
              }}
              className="text-[var(--text-muted)] hover:text-[#FF6B6B] underline cursor-pointer"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>

      {/* Unlockable Pixel Themes */}
      <div className="pixel-panel p-6">
        <h2 className="font-pixel text-xs sm:text-sm text-[#00F0FF] flex items-center gap-2 mb-4">
          <Palette size={16} /> UNLOCKABLE PIXEL THEMES
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PIXEL_THEMES.map((theme) => {
            const unlocked = player.unlockedThemes.includes(theme.id) || lvl.level >= theme.unlockLevel;
            const equipped = activeTheme === theme.id;

            return (
              <button
                key={theme.id}
                type="button"
                disabled={!unlocked}
                onClick={() => void equipTheme(theme.id)}
                className={`p-4 border-3 text-left flex flex-col justify-between cursor-pointer transition-colors ${
                  equipped
                    ? 'bg-[var(--bg-panel-alt)] border-[#FFE600]'
                    : unlocked
                      ? 'bg-[var(--bg-deep)] border-[var(--border-pixel)] hover:border-[#00F0FF]'
                      : 'bg-[#060812] border-[#1A213A] opacity-60 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex gap-1">
                      {theme.swatches.map((hex, i) => (
                        <span
                          key={i}
                          className="w-4 h-4 border border-white/40 inline-block"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                    {equipped ? (
                      <Check size={14} className="text-[#FFE600]" />
                    ) : !unlocked ? (
                      <Lock size={14} className="text-[var(--text-muted)]" />
                    ) : null}
                  </div>
                  <div className="font-pixel text-[10px] text-[var(--text-primary)] mb-1">
                    {theme.name}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">{theme.description}</p>
                </div>
                <div className="font-code text-[11px] mt-3 text-[#00F0FF]">
                  {equipped
                    ? 'EQUIPPED'
                    : unlocked
                      ? 'Click to Equip'
                      : `Unlocks at Level ${theme.unlockLevel}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="pixel-panel p-6">
        <h2 className="font-pixel text-xs sm:text-sm text-[#FFE600] flex items-center gap-2 mb-4">
          <Award size={16} /> ACHIEVEMENT BADGES ({player.achievements.length}/{ACHIEVEMENTS.length})
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((ach) => {
            const has = player.achievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`p-3.5 border-2 ${
                  has
                    ? 'bg-[#0B2E1A] border-[#22FF66]'
                    : 'bg-[var(--bg-deep)] border-[var(--border-pixel)] opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`font-pixel text-[10px] ${
                      has ? 'text-[#22FF66]' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {ach.name}
                  </span>
                  <span className="font-code text-xs text-[#FFE600]">+{ach.xpBonus} XP</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{ach.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Competition & Practice History */}
      <div className="pixel-panel p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-pixel text-xs sm:text-sm text-[#A855F7] flex items-center gap-2">
            <Trophy size={16} /> RECENT RUN HISTORY
          </h2>
          <button
            type="button"
            onClick={onPlay}
            className="pixel-btn pixel-btn-cyan px-4 py-2 text-[10px]"
          >
            Play Again
          </button>
        </div>

        {loadingHistory ? (
          <div className="text-sm text-[var(--text-muted)]">Loading runs...</div>
        ) : history.length === 0 ? (
          <div className="text-sm text-[var(--text-secondary)]">
            No games recorded yet. Launch any arcade mode to build your engineering record!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-code text-xs sm:text-sm tabular-nums">
              <thead>
                <tr className="border-b-2 border-[var(--border-pixel)] text-[var(--text-muted)]">
                  <th className="py-2 pr-4">GAME</th>
                  <th className="py-2 pr-4">MODE</th>
                  <th className="py-2 pr-4 text-right">SCORE</th>
                  <th className="py-2 pr-4 text-right">ACC</th>
                  <th className="py-2 text-right">XP</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-[var(--border-pixel)] last:border-0">
                    <td className="py-2.5 pr-4 font-bold text-[var(--text-primary)]">{h.gameType}</td>
                    <td className="py-2.5 pr-4 uppercase text-[#00F0FF]">{h.mode}</td>
                    <td className="py-2.5 pr-4 text-right text-[#FFE600]">{h.score}</td>
                    <td className="py-2.5 pr-4 text-right text-[#22FF66]">{Math.round(h.accuracy)}%</td>
                    <td className="py-2.5 text-right text-[#A855F7]">+{h.xpEarned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
