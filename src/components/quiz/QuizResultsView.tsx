import React, { useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clock,
  Flame,
  RotateCcw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useArcade } from '../../context/ArcadeContext.tsx';
import type { ExamResultSummary, ExamSettings } from '../../../shared/types.ts';
import { SmartExplanationCard } from './SmartExplanationCard.tsx';

interface QuizResultsViewProps {
  result: ExamResultSummary;
  onRetryWrong: (wrongIds: string[]) => void;
  onPracticeSimilar: (preset: Partial<ExamSettings>) => void;
  onBackToStudio: () => void;
  onViewAnalytics: () => void;
}

export const QuizResultsView: React.FC<QuizResultsViewProps> = ({
  result,
  onRetryWrong,
  onPracticeSimilar,
  onBackToStudio,
  onViewAnalytics,
}) => {
  const { bookmarkedIds, toggleBookmark } = useArcade();
  const [filterMode, setFilterMode] = useState<'all' | 'wrong' | 'correct'>('all');

  const wrongIds = result.details.filter((d) => !d.isCorrect).map((d) => d.questionId);
  const filteredDetails = result.details.filter((d) => {
    if (filterMode === 'wrong') return !d.isCorrect;
    if (filterMode === 'correct') return d.isCorrect;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Score & Action Summary */}
      <div className="exam-card p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--exam-border)]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--exam-accent)] mb-1">
              {result.mode.toUpperCase()} MODE · COMPLETED
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--exam-text)] tabular-nums">
              {result.score} / {result.maxScore}{' '}
              <span className="text-base font-medium text-[var(--exam-text-muted)]">marks</span>
            </h1>
            <p className="text-sm text-[var(--exam-text-secondary)] mt-1">
              {result.correctCount} correct · {result.wrongCount} wrong · {result.skippedCount} skipped
              {result.negativeMarking > 0 ? ` · −${result.negativeMarking} negative` : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="exam-card-subtle px-4 py-3">
              <div className="text-xs text-[var(--exam-text-muted)]">Accuracy</div>
              <div className="text-lg font-bold font-code text-[var(--exam-success)] tabular-nums">
                {result.accuracy}%
              </div>
            </div>
            <div className="exam-card-subtle px-4 py-3">
              <div className="text-xs text-[var(--exam-text-muted)]">Time</div>
              <div className="text-lg font-bold font-code text-[var(--exam-text)] tabular-nums">
                {result.timeSpentSeconds}s
              </div>
            </div>
            <div className="exam-card-subtle px-4 py-3">
              <div className="text-xs text-[var(--exam-text-muted)]">Avg / Q</div>
              <div className="text-lg font-bold font-code text-[var(--exam-text)] tabular-nums">
                {result.avgTimePerQuestion}s
              </div>
            </div>
            <div className="exam-card-subtle px-4 py-3">
              <div className="text-xs text-[var(--exam-text-muted)]">
                {result.rank ? 'Daily Rank' : 'XP Earned'}
              </div>
              <div className="text-lg font-bold font-code text-[var(--exam-accent)] tabular-nums">
                {result.rank ? `#${result.rank}` : `+${result.xpEarned}`}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Retry Wrong + Practice Similar + Next Recommendation */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5">
          <div className="flex flex-wrap gap-2.5">
            {wrongIds.length > 0 && (
              <button
                type="button"
                onClick={() => onRetryWrong(wrongIds)}
                className="exam-btn exam-btn-primary text-sm"
              >
                <RotateCcw size={16} /> Retry Wrong Questions ({wrongIds.length})
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                onPracticeSimilar({
                  mode: 'practice',
                  categoryId: result.nextRecommendation.categoryId,
                  subject: result.nextRecommendation.subject,
                  difficulty: result.nextRecommendation.difficulty,
                })
              }
              className="exam-btn exam-btn-secondary text-sm"
            >
              <Target size={16} /> Practice Similar
            </button>
            <button
              type="button"
              onClick={onViewAnalytics}
              className="exam-btn exam-btn-secondary text-sm"
            >
              <TrendingUp size={16} /> Full Analytics
            </button>
          </div>

          <button
            type="button"
            onClick={onBackToStudio}
            className="text-sm font-semibold text-[var(--exam-text-secondary)] hover:text-[var(--exam-text)] cursor-pointer"
          >
            All Quiz Modes
          </button>
        </div>
      </div>

      {/* Diagnostic Insights Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="exam-card p-5 space-y-3">
          <h2 className="text-sm font-bold text-[var(--exam-success)] flex items-center gap-2">
            <CheckCircle2 size={16} /> What You Did Well
          </h2>
          <ul className="space-y-2 text-sm text-[var(--exam-text-secondary)]">
            {result.didWell.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-[var(--exam-success)] font-bold">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t border-[var(--exam-border)] flex items-center gap-4 text-xs font-code text-[var(--exam-text-muted)]">
            <span className="flex items-center gap-1 text-[var(--exam-warning)]">
              <Flame size={14} /> Daily Streak: {result.streaks.dailyStreak}
            </span>
            <span>Level: {result.streaks.examLevel}</span>
          </div>
        </div>

        <div className="exam-card p-5 space-y-3">
          <h2 className="text-sm font-bold text-[var(--exam-warning)] flex items-center gap-2">
            <Target size={16} /> What Needs Improvement
          </h2>
          <ul className="space-y-2 text-sm text-[var(--exam-text-secondary)]">
            {result.needsImprovement.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-[var(--exam-warning)] font-bold">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {result.examStrategyNote && (
            <div className="text-xs bg-[var(--exam-warning-soft)] border border-[var(--exam-warning)]/40 rounded-md px-3 py-2 text-[var(--exam-text)]">
              <strong>Exam Strategy:</strong> {result.examStrategyNote}
            </div>
          )}
          <div className="pt-2 border-t border-[var(--exam-border)] flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--exam-text-muted)]">
              Recommended Next:
            </span>
            <button
              type="button"
              onClick={() =>
                onPracticeSimilar({
                  mode: 'practice',
                  categoryId: result.nextRecommendation.categoryId,
                  subject: result.nextRecommendation.subject,
                  difficulty: result.nextRecommendation.difficulty,
                })
              }
              className="text-xs font-bold text-[var(--exam-accent)] flex items-center gap-1 cursor-pointer hover:underline"
            >
              {result.nextRecommendation.label} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Topic Analysis & Speed Matrix */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="exam-card p-5">
          <h3 className="text-sm font-bold text-[var(--exam-text)] mb-3">Topic Analysis</h3>
          <div className="space-y-2.5">
            {result.topicBreakdown.map((t) => (
              <div key={t.topic} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[var(--exam-text)]">
                    {t.topic} <span className="text-[var(--exam-text-muted)]">({t.subject})</span>
                  </span>
                  <span className="font-code tabular-nums text-[var(--exam-text-secondary)]">
                    {t.correct}/{t.attempted} ({t.accuracy}%) · {t.avgTimeSec}s
                  </span>
                </div>
                <div className="h-2 bg-[var(--exam-surface-alt)] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      t.accuracy >= 70
                        ? 'bg-[var(--exam-success)]'
                        : t.accuracy >= 45
                          ? 'bg-[var(--exam-warning)]'
                          : 'bg-[var(--exam-danger)]'
                    }`}
                    style={{ width: `${t.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="exam-card p-5">
          <h3 className="text-sm font-bold text-[var(--exam-text)] mb-3 flex items-center gap-2">
            <Clock size={15} /> Speed Analysis Matrix
          </h3>
          <div className="grid grid-cols-2 gap-2.5 text-xs font-code">
            <div className="exam-card-subtle p-3">
              <div className="text-[var(--exam-success)] font-bold">FAST + CORRECT</div>
              <div className="text-xl font-bold mt-1 tabular-nums text-[var(--exam-text)]">
                {result.speedMatrix['FAST+CORRECT'] || 0}
              </div>
            </div>
            <div className="exam-card-subtle p-3">
              <div className="text-[var(--exam-accent)] font-bold">SLOW + CORRECT</div>
              <div className="text-xl font-bold mt-1 tabular-nums text-[var(--exam-text)]">
                {result.speedMatrix['SLOW+CORRECT'] || 0}
              </div>
            </div>
            <div className="exam-card-subtle p-3">
              <div className="text-[var(--exam-warning)] font-bold">FAST + WRONG</div>
              <div className="text-xl font-bold mt-1 tabular-nums text-[var(--exam-text)]">
                {result.speedMatrix['FAST+WRONG'] || 0}
              </div>
            </div>
            <div className="exam-card-subtle p-3">
              <div className="text-[var(--exam-danger)] font-bold">SLOW + WRONG</div>
              <div className="text-xl font-bold mt-1 tabular-nums text-[var(--exam-text)]">
                {result.speedMatrix['SLOW+WRONG'] || 0}
              </div>
            </div>
          </div>
          {result.mistakesSavedCount > 0 && (
            <p className="text-xs text-[var(--exam-text-muted)] mt-3">
              {result.mistakesSavedCount} incorrect question(s) automatically added to My Mistakes for revision.
            </p>
          )}
        </div>
      </div>

      {/* Question-by-Question Review */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[var(--exam-text)]">
            Question Breakdown ({filteredDetails.length})
          </h2>
          <div className="flex gap-2 text-xs">
            {(
              [
                { id: 'all', label: `All (${result.details.length})` },
                { id: 'wrong', label: `Wrong/Skipped (${result.details.length - result.correctCount})` },
                { id: 'correct', label: `Correct (${result.correctCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-3 py-1.5 rounded-md border font-semibold cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-[var(--exam-accent)] text-white border-[var(--exam-accent)]'
                    : 'bg-[var(--exam-surface)] border-[var(--exam-border-strong)] text-[var(--exam-text-secondary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredDetails.map((d, idx) => {
          const isSaved = bookmarkedIds.includes(d.questionId);
          return (
            <div key={d.questionId} className="space-y-2">
              <div className="flex items-start justify-between gap-3 px-1">
                <div className="text-sm font-semibold text-[var(--exam-text)]">
                  <span className="font-code text-[var(--exam-text-muted)] mr-2">
                    #{idx + 1} · {d.speedClass} · {(d.timeMs / 1000).toFixed(1)}s
                  </span>
                  {d.question}
                </div>
                <button
                  type="button"
                  onClick={() => void toggleBookmark(d.questionId)}
                  className={`p-1.5 rounded border text-xs shrink-0 cursor-pointer ${
                    isSaved
                      ? 'border-[var(--exam-warning)] text-[var(--exam-warning)]'
                      : 'border-[var(--exam-border-strong)] text-[var(--exam-text-muted)]'
                  }`}
                  aria-label="Toggle bookmark"
                >
                  <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
                </button>
              </div>
              <SmartExplanationCard
                isCorrect={d.isCorrect}
                isSkipped={d.isSkipped}
                questionType={d.questionType}
                options={d.options}
                matchRight={d.matchPairs?.right}
                userAnswer={d.userAnswer}
                correctAnswer={d.correctAnswer}
                explanation={d.explanation}
                defaultExpanded={!d.isCorrect}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
