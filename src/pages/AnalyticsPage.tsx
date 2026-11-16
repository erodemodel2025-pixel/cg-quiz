import React, { useCallback, useEffect, useState } from 'react';
import { Award, BarChart3, Clock, Flame, Play, Target, TrendingUp } from 'lucide-react';
import { computeExamLevel } from '../../shared/progression.ts';
import type { AnalyticsSummary, ExamResultSummary, ExamSettings } from '../../shared/types.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import { readOfflineCache, updateOfflineCache } from '../utils/storageMigration.ts';
import { QuizResultsView } from '../components/quiz/QuizResultsView.tsx';

interface AnalyticsPageProps {
  onStartQuiz: (preset?: Partial<ExamSettings>, customIds?: string[]) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onStartQuiz }) => {
  const { examUserId, isOnline, setMusicMode, reportError } = useArcade();
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [openedAttempt, setOpenedAttempt] = useState<ExamResultSummary | null>(null);

  useEffect(() => {
    setMusicMode('home');
  }, [setMusicMode]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      if (!isOnline) {
        const cached = readOfflineCache().analytics;
        if (cached) setData(cached);
        setLoading(false);
        return;
      }

      const res = await fetch(
        `/api/exam/analytics?userId=${encodeURIComponent(examUserId)}&range=${range}`
      );
      if (res.ok) {
        const d = (await res.json()) as AnalyticsSummary;
        setData(d);
        updateOfflineCache({ analytics: d });
      }
    } catch (err) {
      reportError(String(err));
    } finally {
      setLoading(false);
    }
  }, [examUserId, isOnline, range, reportError]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const openHistoryAttempt = async (attemptId: string) => {
    const cached = readOfflineCache().historyResults[attemptId];
    if (!isOnline && cached) {
      setOpenedAttempt(cached);
      return;
    }
    try {
      const res = await fetch(`/api/exam/history/${encodeURIComponent(attemptId)}`);
      if (res.ok) {
        const summary = (await res.json()) as ExamResultSummary;
        setOpenedAttempt(summary);
      }
    } catch (err) {
      reportError(String(err));
    }
  };

  if (openedAttempt) {
    return (
      <div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
          <button
            type="button"
            onClick={() => setOpenedAttempt(null)}
            className="exam-btn exam-btn-secondary text-xs"
          >
            Back to Analytics & History
          </button>
        </div>
        <QuizResultsView
          result={openedAttempt}
          onRetryWrong={(wrongIds) => onStartQuiz({ mode: 'revision' }, wrongIds)}
          onPracticeSimilar={(preset) => onStartQuiz(preset)}
          onBackToStudio={() => setOpenedAttempt(null)}
          onViewAnalytics={() => setOpenedAttempt(null)}
        />
      </div>
    );
  }

  const levelInfo = computeExamLevel(data?.streaks.examXp ?? 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header + Date Range Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--exam-text)]">Performance Analytics</h1>
          <p className="text-sm text-[var(--exam-text-secondary)]">
            Computed exclusively from your recorded quiz and mock test attempts.
          </p>
        </div>

        <div className="flex gap-1.5 bg-[var(--exam-surface)] p-1 rounded-lg border border-[var(--exam-border)]">
          {(
            [
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'all', label: 'All Time' },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                range === r.id
                  ? 'bg-[var(--exam-accent)] text-white'
                  : 'text-[var(--exam-text-secondary)] hover:text-[var(--exam-text)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Streaks & Lightweight XP Row */}
      {data && (
        <div className="exam-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-[var(--exam-warning)]" />
              <div>
                <div className="text-xs text-[var(--exam-text-muted)]">Daily Streak</div>
                <div className="font-code font-bold text-[var(--exam-text)] tabular-nums">
                  {data.streaks.dailyStreak} day(s)
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--exam-text-muted)]">Quiz Streak</div>
              <div className="font-code font-bold text-[var(--exam-text)] tabular-nums">
                {data.streaks.quizStreak}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--exam-text-muted)]">Perfect Streak</div>
              <div className="font-code font-bold text-[var(--exam-success)] tabular-nums">
                {data.streaks.perfectStreak}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 min-w-[210px]">
            <Award size={18} className="text-[var(--exam-accent)] shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="font-bold text-[var(--exam-text)]">{levelInfo.title}</span>
                <span className="font-code text-[var(--exam-text-muted)] tabular-nums">
                  {data.streaks.examXp} XP
                </span>
              </div>
              <div className="h-1.5 bg-[var(--exam-surface-alt)] rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-[var(--exam-accent)]"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="exam-card p-8 text-center text-sm text-[var(--exam-text-muted)]">
          Calculating real performance metrics...
        </div>
      ) : !data || !data.hasData ? (
        <div className="exam-card p-8 sm:p-12 text-center space-y-4">
          <BarChart3 size={36} className="mx-auto text-[var(--exam-accent)]" />
          <h2 className="text-lg font-bold text-[var(--exam-text)]">No quiz attempts recorded yet</h2>
          <p className="text-sm text-[var(--exam-text-secondary)] max-w-md mx-auto">
            Complete your first Quick Quiz or Mock Test to unlock real accuracy trends, speed classification, subject breakdowns, and weak-topic insights.
          </p>
          <button
            type="button"
            onClick={() => onStartQuiz({ mode: 'quick' })}
            className="exam-btn exam-btn-primary text-sm"
          >
            <Play size={16} fill="currentColor" /> Take Your First Quick Quiz
          </button>
        </div>
      ) : (
        <>
          {/* Primary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="exam-card p-4">
              <div className="text-xs text-[var(--exam-text-muted)]">Total Quizzes</div>
              <div className="text-xl font-bold font-code tabular-nums text-[var(--exam-text)] mt-1">
                {data.totalQuizzes}
              </div>
            </div>
            <div className="exam-card p-4">
              <div className="text-xs text-[var(--exam-text-muted)]">Attempted Qs</div>
              <div className="text-xl font-bold font-code tabular-nums text-[var(--exam-text)] mt-1">
                {data.totalAttempted}
              </div>
            </div>
            <div className="exam-card p-4">
              <div className="text-xs text-[var(--exam-text-muted)]">Accuracy</div>
              <div className="text-xl font-bold font-code tabular-nums text-[var(--exam-success)] mt-1">
                {data.overallAccuracy}%
              </div>
            </div>
            <div className="exam-card p-4">
              <div className="text-xs text-[var(--exam-text-muted)]">Correct / Wrong</div>
              <div className="text-xl font-bold font-code tabular-nums text-[var(--exam-text)] mt-1">
                {data.totalCorrect} / {data.totalWrong}
              </div>
            </div>
            <div className="exam-card p-4">
              <div className="text-xs text-[var(--exam-text-muted)]">Avg Time / Q</div>
              <div className="text-xl font-bold font-code tabular-nums text-[var(--exam-text)] mt-1">
                {data.avgTimePerQuestion}s
              </div>
            </div>
            <div className="exam-card p-4">
              <div className="text-xs text-[var(--exam-text-muted)]">Best Score</div>
              <div className="text-xl font-bold font-code tabular-nums text-[var(--exam-accent)] mt-1">
                {data.bestScore}
              </div>
            </div>
          </div>

          {/* Accuracy Over Time SVG Chart + Subject Performance */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="exam-card p-5">
              <h2 className="text-sm font-bold text-[var(--exam-text)] flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-[var(--exam-accent)]" /> Accuracy Trend
              </h2>
              {data.chartSeries.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <svg viewBox="0 0 420 170" className="w-full h-44">
                    {[0, 50, 100].map((pct) => {
                      const y = 135 - (pct / 100) * 110;
                      return (
                        <g key={pct}>
                          <line
                            x1="36"
                            y1={y}
                            x2="405"
                            y2={y}
                            stroke="currentColor"
                            className="text-[var(--exam-border)]"
                            strokeDasharray="3 3"
                          />
                          <text
                            x="6"
                            y={y + 4}
                            fontSize="10"
                            fill="currentColor"
                            className="text-[var(--exam-text-muted)] font-code"
                          >
                            {pct}%
                          </text>
                        </g>
                      );
                    })}
                    {data.chartSeries.map((pt, i) => {
                      const barW = Math.min(28, Math.floor(340 / Math.max(1, data.chartSeries.length)) - 6);
                      const x = 44 + i * ((355) / Math.max(1, data.chartSeries.length));
                      const h = Math.max(4, (pt.accuracy / 100) * 110);
                      const y = 135 - h;
                      return (
                        <g key={pt.date}>
                          <rect
                            x={x}
                            y={y}
                            width={barW}
                            height={h}
                            rx="3"
                            fill="var(--exam-accent)"
                          />
                          <text
                            x={x + barW / 2}
                            y={y - 5}
                            textAnchor="middle"
                            fontSize="9"
                            fill="currentColor"
                            className="text-[var(--exam-text-secondary)] font-code"
                          >
                            {pt.accuracy}%
                          </text>
                          <text
                            x={x + barW / 2}
                            y={152}
                            textAnchor="middle"
                            fontSize="9"
                            fill="currentColor"
                            className="text-[var(--exam-text-muted)] font-code"
                          >
                            {pt.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              ) : (
                <div className="text-sm text-[var(--exam-text-muted)]">Not enough points yet.</div>
              )}
            </div>

            <div className="exam-card p-5">
              <h2 className="text-sm font-bold text-[var(--exam-text)] mb-4">Subject Performance</h2>
              <div className="space-y-3">
                {data.subjectPerformance.map((s) => (
                  <div key={s.subject} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-[var(--exam-text)]">{s.subject}</span>
                      <span className="font-code text-[var(--exam-text-secondary)] tabular-nums">
                        {s.correct}/{s.attempted} ({s.accuracy}%)
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--exam-surface-alt)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--exam-accent)]"
                        style={{ width: `${s.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strong Topics / Weak Topics / Speed Classification */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="exam-card p-5 space-y-2.5">
              <h3 className="text-sm font-bold text-[var(--exam-success)]">Strong Topics</h3>
              {data.strongTopics.length === 0 ? (
                <p className="text-xs text-[var(--exam-text-muted)]">
                  Score 70%+ accuracy in topics to list strengths here.
                </p>
              ) : (
                data.strongTopics.map((t) => (
                  <div key={t.topic} className="flex justify-between text-xs">
                    <span className="text-[var(--exam-text)] font-medium">{t.topic}</span>
                    <span className="font-code text-[var(--exam-success)] tabular-nums">
                      {t.accuracy}%
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="exam-card p-5 space-y-2.5">
              <h3 className="text-sm font-bold text-[var(--exam-warning)] flex items-center gap-1.5">
                <Target size={15} /> Weak Topics & Mistakes
              </h3>
              {data.weakTopics.length === 0 && data.mistakenConcepts.length === 0 ? (
                <p className="text-xs text-[var(--exam-text-muted)]">No weak topics detected yet.</p>
              ) : (
                <>
                  {data.weakTopics.map((t) => (
                    <div key={t.topic} className="flex justify-between items-center text-xs">
                      <span className="text-[var(--exam-text)] font-medium">{t.topic}</span>
                      <button
                        type="button"
                        onClick={() => onStartQuiz({ mode: 'weak', subject: t.subject })}
                        className="font-code text-[var(--exam-accent)] hover:underline cursor-pointer"
                      >
                        {t.accuracy}% · Drill
                      </button>
                    </div>
                  ))}
                  {data.mistakenConcepts.map((m) => (
                    <div key={m.topic} className="flex justify-between text-xs text-[var(--exam-text-muted)]">
                      <span>{m.topic} ({m.topCategory})</span>
                      <span className="font-code">{m.count} misses</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="exam-card p-5">
              <h3 className="text-sm font-bold text-[var(--exam-text)] flex items-center gap-1.5 mb-3">
                <Clock size={15} /> Speed Breakdown
              </h3>
              <div className="space-y-1.5 text-xs font-code tabular-nums">
                <div className="flex justify-between">
                  <span className="text-[var(--exam-success)]">FAST + CORRECT</span>
                  <span>{data.speedMatrix['FAST+CORRECT'] || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--exam-accent)]">SLOW + CORRECT</span>
                  <span>{data.speedMatrix['SLOW+CORRECT'] || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--exam-warning)]">FAST + WRONG</span>
                  <span>{data.speedMatrix['FAST+WRONG'] || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--exam-danger)]">SLOW + WRONG</span>
                  <span>{data.speedMatrix['SLOW+WRONG'] || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* My Quiz History Table */}
          <div className="exam-card p-5">
            <h2 className="text-base font-bold text-[var(--exam-text)] mb-4">My Quiz History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-[var(--exam-border)] text-[var(--exam-text-muted)]">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Mode</th>
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4 text-right">Score</th>
                    <th className="py-2 pr-4 text-right">Accuracy</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentAttempts.map((a) => (
                    <tr
                      key={a.attemptId}
                      className="border-b border-[var(--exam-border)] last:border-0 hover:bg-[var(--exam-surface-alt)]"
                    >
                      <td className="py-2.5 pr-4 font-code text-xs text-[var(--exam-text-muted)]">
                        {a.createdAt.slice(0, 10)}
                      </td>
                      <td className="py-2.5 pr-4 uppercase font-semibold text-[var(--exam-accent)]">
                        {a.mode}
                      </td>
                      <td className="py-2.5 pr-4 text-[var(--exam-text)]">
                        {a.subject === 'all' ? 'Mixed' : a.subject}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-code font-bold text-[var(--exam-text)]">
                        {a.score}/{a.maxScore}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-code text-[var(--exam-success)]">
                        {a.accuracy}%
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => void openHistoryAttempt(a.attemptId)}
                          className="text-xs font-semibold text-[var(--exam-accent)] hover:underline cursor-pointer"
                        >
                          View Analysis
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
