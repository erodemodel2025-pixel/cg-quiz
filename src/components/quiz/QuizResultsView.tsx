import React, { useState } from 'react';
import { arcadeAudio } from '../../audio/arcadeAudio.ts';
import { useArcade } from '../../context/ArcadeContext.tsx';
import type { ExamResultSummary, ExamSettings } from '../../../shared/types.ts';
import { PixelIcon, PixelIllustration } from '../pixel/PixelArtAssets.tsx';
import { SmartExplanationCard } from './SmartExplanationCard.tsx';

interface QuizResultsViewProps {
  result: ExamResultSummary;
  onPlayAgain: () => void;
  onRetryWrong: (wrongIds: string[]) => void;
  onPracticeSimilar: (preset: Partial<ExamSettings>) => void;
  onBackToStudio: () => void;
  onViewAnalytics: () => void;
}

export const QuizResultsView: React.FC<QuizResultsViewProps> = ({
  result,
  onPlayAgain,
  onRetryWrong,
  onPracticeSimilar,
  onBackToStudio,
  onViewAnalytics,
}) => {
  const { bookmarkedIds, toggleBookmark } = useArcade();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'wrong' | 'correct'>('all');

  const wrongIds = result.details.filter((d) => !d.isCorrect).map((d) => d.questionId);
  const filteredDetails = result.details.filter((d) => {
    if (filterMode === 'wrong') return !d.isCorrect;
    if (filterMode === 'correct') return d.isCorrect;
    return true;
  });

  const totalQuestions = result.details.length || result.correctCount + result.wrongCount + result.skippedCount;
  const verdict =
    result.accuracy >= 85
      ? 'Legendary run! Great work!'
      : result.accuracy >= 60
        ? 'Great work! Keep leveling up!'
        : 'Good effort! Practice makes sharper!';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      {/* Simple Clean Game Celebration Card */}
      <div className="exam-card p-7 sm:p-10 text-center space-y-5">
        <PixelIllustration name="trophy" size={72} className="mx-auto animate-pixel-bob" />

        <div className="space-y-2">
          <h1 className="font-pixel text-lg sm:text-2xl text-[var(--voxel-gold)] tracking-wide">
            QUIZ COMPLETE!
          </h1>

          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-[var(--exam-surface-alt)] border-3 border-[var(--exam-border)] font-pixel text-xl sm:text-2xl text-[var(--exam-text)] tabular-nums">
            <span className="text-[var(--voxel-gold)]">
              <PixelIcon name="score" size={22} />
            </span>
            <span>
              {result.correctCount} / {totalQuestions}
            </span>
          </div>

          <p className="font-display-pixel text-sm sm:text-base text-[var(--exam-text-secondary)]">
            {verdict}
          </p>
        </div>

        {/* Minimal Primary Action + Clean Secondary Controls */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('gameStart');
              onPlayAgain();
            }}
            className="exam-btn exam-btn-primary px-8 py-3.5 text-sm sm:text-base"
          >
            <PixelIcon name="play" size={16} /> PLAY AGAIN
          </button>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
            <button
              type="button"
              onClick={() => {
                arcadeAudio.playSfx('click');
                setDetailsOpen((v) => !v);
              }}
              className="exam-btn exam-btn-secondary text-xs px-4 min-h-[38px]"
            >
              {detailsOpen ? 'HIDE DETAILS ▲' : 'VIEW DETAILS ▼'}
            </button>

            <button
              type="button"
              onClick={() => {
                arcadeAudio.playSfx('click');
                onBackToStudio();
              }}
              className="font-display-pixel text-xs sm:text-sm text-[var(--exam-accent)] hover:underline cursor-pointer"
            >
              Back to Categories
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Full Diagnostic Breakdown & Explanations */}
      {detailsOpen && (
        <div className="space-y-6">
          {/* Compact Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="exam-card p-3.5">
              <div className="font-display-pixel text-[11px] text-[var(--exam-text-muted)]">ACCURACY</div>
              <div className="font-pixel text-base text-[var(--exam-success)] mt-1 tabular-nums">
                {result.accuracy}%
              </div>
            </div>
            <div className="exam-card p-3.5">
              <div className="font-display-pixel text-[11px] text-[var(--exam-text-muted)]">SCORE</div>
              <div className="font-pixel text-base text-[var(--exam-text)] mt-1 tabular-nums">
                {result.score}/{result.maxScore}
              </div>
            </div>
            <div className="exam-card p-3.5">
              <div className="font-display-pixel text-[11px] text-[var(--exam-text-muted)]">TIME</div>
              <div className="font-pixel text-base text-[var(--exam-text)] mt-1 tabular-nums">
                {result.timeSpentSeconds}s
              </div>
            </div>
            <div className="exam-card p-3.5">
              <div className="font-display-pixel text-[11px] text-[var(--exam-text-muted)]">
                {result.rank ? 'RANK' : 'XP EARNED'}
              </div>
              <div className="font-pixel text-base text-[var(--voxel-gold)] mt-1 tabular-nums">
                {result.rank ? `#${result.rank}` : `+${result.xpEarned}`}
              </div>
            </div>
          </div>

          {/* Targeted Next Actions */}
          <div className="exam-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2.5">
              {wrongIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => onRetryWrong(wrongIds)}
                  className="exam-btn exam-btn-gold text-xs"
                >
                  <PixelIcon name="refresh" size={14} /> Retry Wrong ({wrongIds.length})
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
                className="exam-btn exam-btn-secondary text-xs"
              >
                <PixelIcon name="target" size={14} /> Practice Similar
              </button>
            </div>

            <button
              type="button"
              onClick={onViewAnalytics}
              className="font-display-pixel text-xs text-[var(--exam-accent)] hover:underline cursor-pointer"
            >
              View Full Progress →
            </button>
          </div>

          {/* Diagnostic Insights Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="exam-card p-5 space-y-3">
              <h2 className="font-display-pixel text-xs font-bold text-[var(--exam-success)] flex items-center gap-2">
                <PixelIcon name="check" size={15} /> WHAT YOU DID WELL
              </h2>
              <ul className="space-y-2 text-sm text-[var(--exam-text-secondary)]">
                {result.didWell.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[var(--exam-success)] font-bold">▪</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t-2 border-[var(--exam-border)] flex items-center gap-4 text-xs font-code text-[var(--exam-text-muted)]">
                <span className="flex items-center gap-1 text-[var(--exam-warning)]">
                  <PixelIcon name="flame" size={13} /> Streak: {result.streaks.dailyStreak}
                </span>
                <span>Level: {result.streaks.examLevel}</span>
              </div>
            </div>

            <div className="exam-card p-5 space-y-3">
              <h2 className="font-display-pixel text-xs font-bold text-[var(--exam-warning)] flex items-center gap-2">
                <PixelIcon name="target" size={15} /> NEEDS IMPROVEMENT
              </h2>
              <ul className="space-y-2 text-sm text-[var(--exam-text-secondary)]">
                {result.needsImprovement.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[var(--exam-warning)] font-bold">▪</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {result.examStrategyNote && (
                <div className="text-xs bg-[var(--exam-warning-soft)] border-2 border-[var(--exam-warning)] px-3 py-2 text-[var(--exam-text)]">
                  <strong>Tip:</strong> {result.examStrategyNote}
                </div>
              )}
            </div>
          </div>

          {/* Topic Analysis & Speed Matrix */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="exam-card p-5">
              <h3 className="font-display-pixel text-xs font-bold text-[var(--exam-text)] mb-3">
                TOPIC ANALYSIS
              </h3>
              <div className="space-y-2.5">
                {result.topicBreakdown.map((t) => (
                  <div key={t.topic} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-[var(--exam-text)]">
                        {t.topic} <span className="text-[var(--exam-text-muted)]">({t.subject})</span>
                      </span>
                      <span className="font-code tabular-nums text-[var(--exam-text-secondary)]">
                        {t.correct}/{t.attempted} ({t.accuracy}%)
                      </span>
                    </div>
                    <div className="h-2.5 bg-[var(--exam-surface-alt)] border border-[var(--exam-border)]">
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
              <h3 className="font-display-pixel text-xs font-bold text-[var(--exam-text)] mb-3">
                SPEED MATRIX
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
            </div>
          </div>

          {/* Question-by-Question Review */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display-pixel text-sm font-bold text-[var(--exam-text)]">
                QUESTION BREAKDOWN ({filteredDetails.length})
              </h2>
              <div className="flex gap-2 text-xs">
                {(
                  [
                    { id: 'all', label: `All (${result.details.length})` },
                    { id: 'wrong', label: `Missed (${result.details.length - result.correctCount})` },
                    { id: 'correct', label: `Correct (${result.correctCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterMode(tab.id)}
                    className={`px-3 py-1.5 border-2 font-display-pixel cursor-pointer ${
                      filterMode === tab.id
                        ? 'bg-[var(--exam-accent)] text-[#0B0F1A] border-[#0B0F1A]'
                        : 'bg-[var(--exam-surface)] border-[var(--exam-border)] text-[var(--exam-text-secondary)]'
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
                      className={`p-1.5 border-2 text-xs shrink-0 cursor-pointer ${
                        isSaved
                          ? 'border-[var(--exam-warning)] text-[var(--exam-warning)]'
                          : 'border-[var(--exam-border)] text-[var(--exam-text-muted)]'
                      }`}
                      aria-label="Toggle bookmark"
                    >
                      <PixelIcon name="bookmark" size={14} />
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
      )}
    </div>
  );
};
