import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Flame,
  Gamepad2,
  Play,
  ShieldCheck,
  Target,
  TrendingUp,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { arcadeAudio } from '../audio/arcadeAudio.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import { computeExamLevel } from '../../shared/progression.ts';
import type {
  AnalyticsSummary,
  DailyExamStatus,
  ExamSettings,
  GameModeId,
} from '../../shared/types.ts';
import { loadActiveQuizDraft, type ActiveQuizDraft } from '../utils/storageMigration.ts';

interface HomePageProps {
  onPlay: () => void;
  onStartExamPreset: (preset: Partial<ExamSettings>) => void;
  onResumeDraft: (draft: ActiveQuizDraft) => void;
  onOpenMistakes: () => void;
  onOpenAnalytics: () => void;
  onLaunchGame: (game: GameModeId) => void;
  onLeaderboard: () => void;
  onOpenRegister: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onPlay,
  onStartExamPreset,
  onResumeDraft,
  onOpenMistakes,
  onOpenAnalytics,
  onLaunchGame,
  onLeaderboard,
  onOpenRegister,
}) => {
  const { examUserId, player, soundEnabled, toggleSound, setMusicMode } = useArcade();

  const [dailyStatus, setDailyStatus] = useState<DailyExamStatus | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [draft] = useState(() => loadActiveQuizDraft());

  useEffect(() => {
    setMusicMode('home');
  }, [setMusicMode]);

  useEffect(() => {
    fetch(`/api/exam/daily-status?userId=${encodeURIComponent(examUserId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setDailyStatus(d);
      })
      .catch(() => {});

    fetch(`/api/exam/analytics?userId=${encodeURIComponent(examUserId)}&range=7d`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setAnalytics(d);
      })
      .catch(() => {});
  }, [examUserId]);

  const recentAttempt = analytics?.recentAttempts?.[0] || null;
  const topWeak = analytics?.weakTopics?.[0] || null;
  const levelInfo = computeExamLevel(analytics?.streaks.examXp ?? 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      {/* Smart Minimal Hero */}
      <section className="exam-card p-6 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--exam-accent)]">
            CGQUIZ · Competitive Quiz & Exam Platform
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleSound()}
              aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
              className="px-2.5 py-1.5 rounded-md border border-[var(--exam-border-strong)] text-xs font-medium text-[var(--exam-text-secondary)] flex items-center gap-1.5 cursor-pointer"
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>{soundEnabled ? 'Audio On' : 'Muted'}</span>
            </button>
            {!player && (
              <button
                type="button"
                onClick={onOpenRegister}
                className="px-3 py-1.5 rounded-md border border-[var(--exam-border-strong)] text-xs font-semibold text-[var(--exam-text)] cursor-pointer"
              >
                Set Display Name
              </button>
            )}
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--exam-text)] mb-2">
          Test your knowledge.
        </h1>
        <p className="text-sm sm:text-base text-[var(--exam-text-secondary)] max-w-xl mb-7">
          Adaptive practice, full mock exams, smart mistake breakdowns, and real performance analytics across JEE, NEET, NDA, TNPSC, School, Science, and Engineering.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {draft && draft.questions?.length > 0 && (
            <button
              type="button"
              onClick={() => onResumeDraft(draft)}
              className="exam-btn exam-btn-primary px-5 text-sm"
            >
              <Play size={16} fill="currentColor" /> Continue Quiz ({draft.mode})
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              onStartExamPreset({ mode: 'quick', questionCount: 10, timeLimitMinutes: 8 });
            }}
            className={`exam-btn px-5 text-sm ${draft ? 'exam-btn-secondary' : 'exam-btn-primary'}`}
          >
            <Zap size={16} /> Quick Quiz
          </button>

          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              onStartExamPreset({
                mode: 'daily',
                questionCount: 10,
                timeLimitMinutes: 8,
              });
            }}
            disabled={Boolean(dailyStatus?.completed)}
            className="exam-btn exam-btn-secondary px-5 text-sm"
          >
            <Award size={16} className="text-[var(--exam-warning)]" />
            {dailyStatus?.completed ? 'Daily Done' : 'Daily Challenge'}
          </button>

          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              onStartExamPreset({
                mode: 'mock',
                questionCount: 20,
                timeLimitMinutes: 25,
                negativeMarking: 1,
              });
            }}
            className="exam-btn exam-btn-secondary px-5 text-sm"
          >
            <ShieldCheck size={16} className="text-[var(--exam-accent)]" /> Mock Test
          </button>

          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              onPlay();
            }}
            className="exam-btn exam-btn-secondary px-4 text-sm"
          >
            All Modes <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* 3 Compact Contextual Cards: Today's Progress, Recent Quiz, Weak Topic */}
      <section className="grid md:grid-cols-3 gap-4">
        <div className="exam-card p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--exam-text-muted)] mb-2 flex items-center justify-between">
              <span>Today’s Progress</span>
              <Flame size={15} className="text-[var(--exam-warning)]" />
            </div>
            <div className="text-xl font-bold font-code tabular-nums text-[var(--exam-text)]">
              {analytics?.streaks.dailyStreak ?? 0} Day Streak
            </div>
            <p className="text-xs text-[var(--exam-text-secondary)] mt-1">
              {levelInfo.title} · {analytics?.streaks.examXp ?? 0} XP ·{' '}
              {analytics?.hasData ? `${analytics.overallAccuracy}% 7d accuracy` : 'Start 1st quiz today'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAnalytics}
            className="text-xs font-semibold text-[var(--exam-accent)] flex items-center gap-1 mt-4 cursor-pointer hover:underline"
          >
            <TrendingUp size={13} /> View Analytics
          </button>
        </div>

        <div className="exam-card p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--exam-text-muted)] mb-2">
              Recent Quiz
            </div>
            {recentAttempt ? (
              <>
                <div className="text-xl font-bold font-code tabular-nums text-[var(--exam-text)]">
                  {recentAttempt.score}/{recentAttempt.maxScore}{' '}
                  <span className="text-sm font-medium text-[var(--exam-success)]">
                    ({recentAttempt.accuracy}%)
                  </span>
                </div>
                <p className="text-xs text-[var(--exam-text-secondary)] mt-1 uppercase">
                  {recentAttempt.mode} · {recentAttempt.subject === 'all' ? 'Mixed' : recentAttempt.subject}
                </p>
              </>
            ) : (
              <>
                <div className="text-base font-bold text-[var(--exam-text)]">No quizzes yet</div>
                <p className="text-xs text-[var(--exam-text-secondary)] mt-1">
                  Your latest attempt score and accuracy will appear here.
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenAnalytics}
            className="text-xs font-semibold text-[var(--exam-accent)] flex items-center gap-1 mt-4 cursor-pointer hover:underline"
          >
            Quiz History <ArrowRight size={13} />
          </button>
        </div>

        <div className="exam-card p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--exam-text-muted)] mb-2 flex items-center justify-between">
              <span>Weak Topic Focus</span>
              <Target size={15} className="text-[var(--exam-warning)]" />
            </div>
            {topWeak ? (
              <>
                <div className="text-base font-bold text-[var(--exam-text)]">{topWeak.topic}</div>
                <p className="text-xs text-[var(--exam-text-secondary)] mt-1">
                  {topWeak.subject} · {topWeak.accuracy}% accuracy
                </p>
              </>
            ) : (
              <>
                <div className="text-base font-bold text-[var(--exam-text)]">Mistake Book Ready</div>
                <p className="text-xs text-[var(--exam-text-secondary)] mt-1">
                  Missed questions are saved automatically for targeted revision.
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              topWeak
                ? onStartExamPreset({
                    mode: 'weak',
                    subject: topWeak.subject,
                    questionCount: 10,
                  })
                : onOpenMistakes()
            }
            className="text-xs font-semibold text-[var(--exam-accent)] flex items-center gap-1 mt-4 cursor-pointer hover:underline"
          >
            {topWeak ? `Practice ${topWeak.topic}` : 'Open My Mistakes'} <ArrowRight size={13} />
          </button>
        </div>
      </section>

      {/* Preserved Arcade & Leaderboard Compact Footer Strip */}
      <section className="exam-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--exam-accent-soft)] text-[var(--exam-accent)] flex items-center justify-center shrink-0">
            <Gamepad2 size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--exam-text)]">
              Engineering Arcade · 6 Interactive Mini-Games
            </div>
            <div className="text-xs text-[var(--exam-text-secondary)]">
              Circuit Rush · Code Breaker · Boss Battle · Logic Lab · Component Match · IQ Quiz
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onLaunchGame('circuit-rush')}
            className="exam-btn exam-btn-secondary text-xs min-h-[38px] py-2"
          >
            Play Arcade
          </button>
          <button
            type="button"
            onClick={onLeaderboard}
            className="exam-btn exam-btn-secondary text-xs min-h-[38px] py-2"
          >
            Rankings
          </button>
        </div>
      </section>
    </div>
  );
};
